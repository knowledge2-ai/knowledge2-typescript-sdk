/** Configuration options for the Knowledge2 client. */
export interface Knowledge2Options {
  /** API key for authentication (prefix: `k2_`). Mutually preferred over bearer/admin tokens. */
  apiKey?: string;
  /** Base URL of the Knowledge2 API. Defaults to `https://api.knowledge2.ai`. */
  apiHost?: string;
  /** Organization ID. If omitted, auto-detected via `GET /v1/auth/whoami`. */
  orgId?: string;
  /** Bearer token for OAuth-based authentication. */
  bearerToken?: string;
  /** Admin token for administrative operations. */
  adminToken?: string;
  /** Request timeout in milliseconds. Defaults to 60000 (60s). */
  timeout?: number;
  /** Maximum number of retries for transient failures. Defaults to 2. */
  maxRetries?: number;
  /** Additional headers to include with every request. */
  headers?: Record<string, string>;
  /** Custom User-Agent string. */
  userAgent?: string;
}

/** Per-request options that can override client defaults. */
export interface RequestOptions {
  /** Additional headers for this request. */
  headers?: Record<string, string>;
  /** Query parameters. */
  params?: Record<string, string | number | boolean | undefined>;
  /** Request body (will be serialized to JSON with camelCase→snake_case conversion). */
  body?: unknown;
  /** AbortSignal for request cancellation. */
  signal?: AbortSignal;
  /** Override the client-level timeout for this request (ms). */
  timeout?: number;
}

/** Options for paginated list operations. */
export interface PaginateOptions {
  /** Page size. Defaults to 100. */
  limit?: number;
  /** Additional query parameters. */
  params?: Record<string, string | number | boolean | undefined>;
}

/** Options for job polling. */
export interface PollOptions {
  /** Polling interval in milliseconds. Defaults to 5000 (5s). */
  pollIntervalMs?: number;
  /** Maximum time to wait in milliseconds. Defaults to no limit. */
  timeoutMs?: number;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}
