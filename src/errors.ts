/**
 * Knowledge2 SDK exception hierarchy.
 *
 * All SDK exceptions inherit from {@link Knowledge2Error}, so callers can
 * use `catch (e) { if (e instanceof Knowledge2Error) ... }` as a catch-all.
 *
 * Hierarchy:
 *
 *   Knowledge2Error (base)
 *   ├── APIError (HTTP errors from the API)
 *   │   ├── AuthenticationError (401)
 *   │   ├── PermissionDeniedError (403)
 *   │   │   └── FeatureNotEnabledError (403 + code=feature_not_enabled)
 *   │   ├── NotFoundError (404)
 *   │   ├── ConflictError (409)
 *   │   ├── ValidationError (422)
 *   │   ├── RateLimitError (429)
 *   │   │   └── QuotaExceededError (429 + code=quota_exceeded)
 *   │   └── ServerError (500, 502, 503, 504)
 *   ├── APIConnectionError (network / DNS failures)
 *   └── APITimeoutError (request timeout)
 */

/** Base exception for all Knowledge2 SDK errors. */
export class Knowledge2Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Knowledge2Error";
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Whether the operation that caused this error can be retried. */
  get retryable(): boolean {
    return false;
  }
}

/** Error returned by the Knowledge2 API (HTTP 4xx / 5xx). */
export class APIError extends Knowledge2Error {
  readonly statusCode: number;
  readonly code: string | undefined;
  readonly details: unknown;
  readonly requestId: string | undefined;

  constructor(
    message: string,
    options: {
      statusCode: number;
      code?: string;
      details?: unknown;
      requestId?: string;
    },
  ) {
    super(message);
    this.name = "APIError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

/** HTTP 401 — invalid or missing API key / bearer token. */
export class AuthenticationError extends APIError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown; requestId?: string },
  ) {
    super(message, { statusCode: 401, ...options });
    this.name = "AuthenticationError";
  }
}

/** HTTP 403 — the API key lacks the required scopes. */
export class PermissionDeniedError extends APIError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown; requestId?: string },
  ) {
    super(message, { statusCode: 403, ...options });
    this.name = "PermissionDeniedError";
  }
}

/** HTTP 403 — a required feature flag is not enabled for the organization. */
export class FeatureNotEnabledError extends PermissionDeniedError {
  override readonly name = "FeatureNotEnabledError";

  get feature(): string | undefined {
    return typeof this.details === "object" && this.details !== null
      ? (this.details as Record<string, unknown>).feature as string | undefined
      : undefined;
  }

  get consoleUrl(): string | undefined {
    return typeof this.details === "object" && this.details !== null
      ? (this.details as Record<string, unknown>).console_url as string | undefined
      : undefined;
  }

  get contactEmail(): string | undefined {
    return typeof this.details === "object" && this.details !== null
      ? (this.details as Record<string, unknown>).contact_email as string | undefined
      : undefined;
  }
}

/** HTTP 404 — the requested resource does not exist. */
export class NotFoundError extends APIError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown; requestId?: string },
  ) {
    super(message, { statusCode: 404, ...options });
    this.name = "NotFoundError";
  }
}

/** HTTP 409 — resource conflict (e.g. duplicate idempotency key). */
export class ConflictError extends APIError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown; requestId?: string },
  ) {
    super(message, { statusCode: 409, ...options });
    this.name = "ConflictError";
  }
}

/** HTTP 422 — request validation failed. */
export class ValidationError extends APIError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown; requestId?: string },
  ) {
    super(message, { statusCode: 422, ...options });
    this.name = "ValidationError";
  }
}

/** HTTP 429 — too many requests. */
export class RateLimitError extends APIError {
  readonly retryAfter: number | undefined;

  constructor(
    message: string,
    options: {
      retryAfter?: number;
      code?: string;
      details?: unknown;
      requestId?: string;
    },
  ) {
    super(message, { statusCode: 429, ...options });
    this.name = "RateLimitError";
    this.retryAfter = options.retryAfter;
  }

  override get retryable(): boolean {
    return true;
  }
}

/** HTTP 429 — hard quota exceeded (not retryable). */
export class QuotaExceededError extends RateLimitError {
  override readonly name = "QuotaExceededError";

  override get retryable(): boolean {
    return false;
  }

  get quota(): string | undefined {
    return typeof this.details === "object" && this.details !== null
      ? (this.details as Record<string, unknown>).quota as string | undefined
      : undefined;
  }

  get current(): number | undefined {
    const v =
      typeof this.details === "object" && this.details !== null
        ? (this.details as Record<string, unknown>).current
        : undefined;
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }

  get limit(): number | undefined {
    const v =
      typeof this.details === "object" && this.details !== null
        ? (this.details as Record<string, unknown>).limit
        : undefined;
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }

  get consoleUrl(): string | undefined {
    return typeof this.details === "object" && this.details !== null
      ? (this.details as Record<string, unknown>).console_url as string | undefined
      : undefined;
  }
}

/** HTTP 500 / 502 / 503 / 504 — server-side failure. */
export class ServerError extends APIError {
  constructor(
    message: string,
    options: {
      statusCode: number;
      code?: string;
      details?: unknown;
      requestId?: string;
    },
  ) {
    super(message, options);
    this.name = "ServerError";
  }

  override get retryable(): boolean {
    return true;
  }
}

/** Network connectivity failure (DNS, connection refused, etc.). */
export class APIConnectionError extends Knowledge2Error {
  constructor(message: string) {
    super(message);
    this.name = "APIConnectionError";
  }

  override get retryable(): boolean {
    return true;
  }
}

/** The request timed out. */
export class APITimeoutError extends Knowledge2Error {
  constructor(message: string) {
    super(message);
    this.name = "APITimeoutError";
  }

  override get retryable(): boolean {
    return true;
  }
}

/** Map of HTTP status codes to their corresponding error classes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const STATUS_ERROR_MAP: Record<number, new (message: string, options: any) => APIError> = {
  401: AuthenticationError,
  403: PermissionDeniedError,
  404: NotFoundError,
  409: ConflictError,
  422: ValidationError,
  429: RateLimitError,
  500: ServerError,
  502: ServerError,
  503: ServerError,
  504: ServerError,
};
