import {
  APIConnectionError,
  APIError,
  APITimeoutError,
  FeatureNotEnabledError,
  Knowledge2Error,
  QuotaExceededError,
  RateLimitError,
  ServerError,
  STATUS_ERROR_MAP,
} from "./errors.js";
import type { Knowledge2Options, RequestOptions } from "./types/options.js";
import {
  camelToSnake as camelToSnakeKey,
  deepCamelToSnake,
  deepSnakeToCamel,
} from "./utils/case-conversion.js";
import { encodePath } from "./utils/encode-path.js";
import { VERSION } from "./version.js";

const DEFAULT_BASE_URL = "https://api.knowledge2.ai";
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_RETRIES = 2;
const BACKOFF_INITIAL_MS = 500;
const BACKOFF_MAX_MS = 8_000;

/**
 * Code-based error overrides: refine the error class based on the
 * machine-readable `code` field returned by the API.
 */
const CODE_ERROR_OVERRIDE: Record<string, Record<string, typeof APIError>> = {
  "403": { feature_not_enabled: FeatureNotEnabledError },
  "429": { quota_exceeded: QuotaExceededError },
};

/** HTTP methods supported by the SDK. */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Low-level HTTP transport for the Knowledge2 API.
 *
 * Handles request execution, automatic retry with exponential backoff,
 * header management (including auth header safety), case-conversion at
 * the serialization boundary, and error mapping.
 */
export class BaseClient {
  readonly baseUrl: string;
  private readonly _apiKey: string | undefined;
  private readonly _bearerToken: string | undefined;
  private readonly _adminToken: string | undefined;
  readonly timeout: number;
  readonly maxRetries: number;

  private readonly _defaultHeaders: Record<string, string>;
  private readonly _userAgent: string;

  static debug = false;

  constructor(options: Knowledge2Options) {
    this.baseUrl = (options.apiHost ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    if (this.baseUrl.toLowerCase().startsWith("http://")) {
      console.warn(
        "[knowledge2] WARNING: apiHost uses http:// — credentials will be sent in cleartext. " +
        "Use https:// in production.",
      );
    }
    this._apiKey = options.apiKey;
    this._bearerToken = options.bearerToken;
    this._adminToken = options.adminToken;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    // Validate default headers for CRLF injection
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        if (/[\r\n]/.test(key) || /[\r\n]/.test(value)) {
          throw new Knowledge2Error(
            "Invalid header: header names and values must not contain CR or LF characters",
          );
        }
      }
    }
    this._defaultHeaders = { ...options.headers };
    const userAgent =
      options.userAgent ?? `knowledge2-ts/${VERSION} node/${process.version}`;
    if (/[\r\n]/.test(userAgent)) {
      throw new Knowledge2Error(
        "Invalid userAgent: value must not contain CR or LF characters",
      );
    }
    this._userAgent = userAgent;
  }

  /**
   * Send an HTTP request with automatic retry on transient failures.
   *
   * Request bodies are serialized from camelCase to snake_case.
   * Response bodies are deserialized from snake_case to camelCase.
   */
  async request<T = unknown>(
    method: HttpMethod,
    path: string,
    options?: RequestOptions,
  ): Promise<T | undefined> {
    const url = `${this.baseUrl}${path}`;
    const headers = this._buildHeaders(options?.headers);
    const queryString = this._buildQueryString(options?.params);
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    let body: BodyInit | undefined;
    if (options?.body !== undefined) {
      if (
        options.body instanceof FormData ||
        options.body instanceof Blob ||
        options.body instanceof Uint8Array ||
        options.body instanceof ArrayBuffer
      ) {
        // Raw bodies: pass through as-is without JSON serialization or
        // Content-Type — let fetch derive the correct header (e.g. the
        // multipart boundary for FormData).
        body = options.body as BodyInit;
      } else {
        body = JSON.stringify(deepCamelToSnake(options.body));
        headers["Content-Type"] = "application/json";
      }
    }

    let lastError: Error | undefined;
    const maxAttempts = 1 + this.maxRetries;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const requestTimeout = options?.timeout ?? this.timeout;
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

      // Merge external signal — clean up the listener when the request
      // completes (success or failure) to avoid leaking EventTarget refs.
      let signalCleanup: (() => void) | undefined;
      if (options?.signal) {
        if (options.signal.aborted) {
          clearTimeout(timeoutId);
          throw new APITimeoutError("Request aborted");
        }
        const onAbort = () => controller.abort();
        options.signal.addEventListener("abort", onAbort, { once: true });
        signalCleanup = () => options.signal!.removeEventListener("abort", onAbort);
      }

      try {
        this._debugLog(
          `${method} ${path} (attempt ${attempt + 1}/${maxAttempts})`,
          { headers: this._redactHeaders(headers) },
        );

        const response = await fetch(fullUrl, {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        signalCleanup?.();

        this._debugLog(`${method} ${path} → ${response.status}`);

        if (response.ok) {
          if (response.status === 204) {
            return undefined;
          }
          try {
            const data = await response.json();
            return deepSnakeToCamel(data) as T;
          } catch {
            throw new APIError("Invalid JSON in response body", {
              statusCode: response.status,
            });
          }
        }

        // Error response
        const error = await this._errorFromResponse(response);

        if (error.retryable && attempt < this.maxRetries) {
          const delay = this._backoffDelay(attempt, error);
          this._debugLog(
            `Retry ${attempt + 1}/${this.maxRetries} after ${delay.toFixed(0)}ms (status ${response.status})`,
          );
          await sleep(delay);
          lastError = error;
          continue;
        }

        throw error;
      } catch (err) {
        clearTimeout(timeoutId);
        signalCleanup?.();

        if (err instanceof APIError) {
          throw err;
        }

        if (err instanceof Knowledge2Error) {
          throw err;
        }

        // Network / abort errors
        const isAbort =
          err instanceof DOMException && err.name === "AbortError";
        const sdkError = isAbort
          ? new APITimeoutError(`Request timed out after ${options?.timeout ?? this.timeout}ms`)
          : new APIConnectionError(
              `Connection error: ${err instanceof Error ? err.message : String(err)}`,
            );

        if (sdkError.retryable && attempt < this.maxRetries) {
          const delay = this._backoffDelay(attempt);
          this._debugLog(
            `Retry ${attempt + 1}/${this.maxRetries} after ${delay.toFixed(0)}ms (${sdkError.name})`,
          );
          await sleep(delay);
          lastError = sdkError;
          continue;
        }

        throw sdkError;
      }
    }

    // Should not reach here, but satisfies the compiler
    if (lastError) throw lastError;
    return undefined;
  }

  /**
   * Paginate a list endpoint, yielding individual items.
   */
  async *paginate<T>(
    method: HttpMethod,
    path: string,
    itemsKey: string,
    options?: { limit?: number; params?: Record<string, string | number | boolean | undefined> },
  ): AsyncGenerator<T> {
    const limit = options?.limit ?? 100;
    let offset = 0;

    while (true) {
      const params = { ...options?.params, limit, offset };
      const data = await this.request<Record<string, unknown>>(method, path, {
        params: params as Record<string, string | number | boolean | undefined>,
      });

      if (!data || typeof data !== "object") break;

      const items = (data as Record<string, unknown>)[itemsKey];
      if (!Array.isArray(items)) break;

      for (const item of items) {
        yield item as T;
      }

      if (items.length < limit) break;
      offset += limit;
    }
  }

  /**
   * Poll a job until it reaches a terminal state.
   */
  async pollJob<T = unknown>(
    jobId: string,
    options?: {
      pollIntervalMs?: number;
      timeoutMs?: number;
      signal?: AbortSignal;
    },
  ): Promise<T> {
    const pollInterval = options?.pollIntervalMs ?? 5_000;
    const start = Date.now();

    while (true) {
      const job = await this.request<Record<string, unknown>>("GET", `/v1/jobs/${encodePath(jobId)}`, {
        signal: options?.signal,
      });

      const status = (job as Record<string, unknown> | undefined)?.status;
      if (status === "succeeded" || status === "failed" || status === "canceled") {
        if (status !== "succeeded") {
          const message =
            ((job as Record<string, unknown> | undefined)?.errorMessage as string) ??
            `Job ${jobId} ended with status=${String(status)}`;
          throw new Knowledge2Error(message);
        }
        return job as T;
      }

      if (
        options?.timeoutMs !== undefined &&
        Date.now() - start > options.timeoutMs
      ) {
        throw new APITimeoutError(`Timed out waiting for job ${jobId}`);
      }

      await sleep(pollInterval);
    }
  }

  // ------------------------------------------------------------------
  // Header helpers
  // ------------------------------------------------------------------

  private _buildHeaders(
    extra?: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = { ...this._defaultHeaders };

    if (
      !("User-Agent" in headers) &&
      !(extra && "User-Agent" in extra)
    ) {
      headers["User-Agent"] = this._userAgent;
    }

    // Merge caller-provided headers — reject CRLF injection attempts
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (/[\r\n]/.test(key) || /[\r\n]/.test(value)) {
          throw new Knowledge2Error(
            "Invalid header: header names and values must not contain CR or LF characters",
          );
        }
      }
      Object.assign(headers, extra);
    }

    // Auth headers always override — applied last so they win regardless of case
    if (this._apiKey) headers["X-API-Key"] = this._apiKey;
    if (this._bearerToken) headers["Authorization"] = `Bearer ${this._bearerToken}`;
    if (this._adminToken) headers["X-Admin-Token"] = this._adminToken;

    return headers;
  }

  private _buildQueryString(
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    if (!params) return "";
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(camelToSnakeKey(key), String(value));
      }
    }
    return searchParams.toString();
  }

  // ------------------------------------------------------------------
  // Error classification
  // ------------------------------------------------------------------

  private async _errorFromResponse(response: Response): Promise<APIError> {
    let requestId = response.headers.get("X-Request-Id") ?? undefined;
    let code: string | undefined;
    let details: unknown;
    let message = response.statusText || "Unknown error";

    try {
      const payload: unknown = await response.json();
      if (payload && typeof payload === "object") {
        const obj = payload as Record<string, unknown>;
        const error = obj.error;
        if (error && typeof error === "object") {
          const errObj = error as Record<string, unknown>;
          code = (errObj.code as string) ?? undefined;
          details = errObj.details;
          requestId = (errObj.request_id as string) ?? requestId;
          message = (errObj.message as string) ?? message;
        } else if ("detail" in obj) {
          const detail = obj.detail;
          if (typeof detail === "string") {
            message = detail;
          } else if (Array.isArray(detail)) {
            message = detail.map((d) => (typeof d === "object" && d !== null ? (d as Record<string, unknown>).msg : String(d))).join("; ");
          }
        }
      }
    } catch {
      // Response body is not JSON — use statusText
    }

    // Sanitize details for 5xx responses to prevent server internal leaks
    const sanitizedDetails = response.status >= 500 ? undefined : details;

    const ErrorClass = STATUS_ERROR_MAP[response.status];
    if (ErrorClass) {
      const statusOverrides = CODE_ERROR_OVERRIDE[String(response.status)];
      const OverrideClass =
        statusOverrides && code && code in statusOverrides
          ? statusOverrides[code]
          : undefined;

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfter = retryAfterHeader
          ? parseFloat(retryAfterHeader)
          : undefined;
        const Ctor = (OverrideClass ?? RateLimitError) as typeof RateLimitError;
        return new Ctor(message, {
          retryAfter:
            retryAfter !== undefined && !isNaN(retryAfter)
              ? retryAfter * 1000
              : undefined,
          code,
          details: sanitizedDetails,
          requestId,
        });
      }

      const FinalClass = OverrideClass ?? ErrorClass;
      return new FinalClass(message, {
        statusCode: response.status,
        code,
        details: sanitizedDetails,
        requestId,
      });
    }

    // 5xx not in the map → generic ServerError
    if (response.status >= 500) {
      return new ServerError(message, {
        statusCode: response.status,
        code,
        details: sanitizedDetails,
        requestId,
      });
    }

    return new APIError(message, {
      statusCode: response.status,
      code,
      details: sanitizedDetails,
      requestId,
    });
  }

  // ------------------------------------------------------------------
  // Retry helpers
  // ------------------------------------------------------------------

  private _backoffDelay(
    attempt: number,
    error?: APIError,
  ): number {
    if (error instanceof RateLimitError && error.retryAfter !== undefined) {
      return error.retryAfter;
    }
    const base = BACKOFF_INITIAL_MS * 2 ** attempt;
    const jitter = Math.random() * 100;
    return Math.min(base + jitter, BACKOFF_MAX_MS);
  }

  // ------------------------------------------------------------------
  // Debug logging
  // ------------------------------------------------------------------

  private _debugLog(message: string, data?: unknown): void {
    if (!BaseClient.debug) return;
    if (data !== undefined) {
      console.error(`[K2 SDK] ${message}`, data);
    } else {
      console.error(`[K2 SDK] ${message}`);
    }
  }

  private _redactHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const redacted: Record<string, string> = {};
    const sensitiveKeys = new Set([
      "x-api-key",
      "authorization",
      "x-admin-token",
    ]);

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        const prefix = value.length > 4 ? value.substring(0, 4) : "";
        redacted[key] = prefix + "...REDACTED";
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
