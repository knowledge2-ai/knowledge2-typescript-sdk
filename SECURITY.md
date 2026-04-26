# Security Policy — @knowledge2/sdk

## Credential Management

- **Never hardcode credentials** in source code. Use environment variables:
  ```bash
  export K2_API_KEY=k2_your_api_key_here
  ```
  ```typescript
  const client = new Knowledge2({ apiKey: process.env.K2_API_KEY });
  ```
- Store credentials in `.env` files and add `.env*` to `.gitignore`.
- Rotate API keys regularly using `client.auth.rotateApiKey()`.
- Use the principle of least privilege — create API keys with only the scopes you need.

## HTTPS

The SDK connects to `https://api.knowledge2.ai` by default. If you override `apiHost`:

- **Always use `https://`** in production. The SDK emits a warning if `http://` is detected.
- `http://` may be used for local development (e.g., `http://localhost:8080`), but never in production — credentials are sent in cleartext over HTTP.

## Error Handling

- **5xx server errors**: The SDK sanitizes error `details` from 5xx responses to prevent accidental exposure of server internals (stack traces, database errors, etc.). Only the error `message` and `code` are preserved.
- **4xx client errors**: Error `details` are preserved in full, as these contain actionable information for the caller (validation errors, field-level issues, etc.).

## Debug Mode

When debug logging is enabled (`Knowledge2.setDebug(true)`):
- Auth headers (`X-API-Key`, `Authorization`, `X-Admin-Token`) are automatically redacted in log output.
- Only the first 4 characters of credentials are shown (e.g., `k2_s...REDACTED`).
- Debug logs are written to `stderr`, not `stdout`.

## Multi-Tenancy

The SDK allows callers to specify `orgId` in requests. **The server is responsible for validating** that the authenticated user has access to the specified organization. The SDK does not perform client-side authorization checks.

## Dependencies

This SDK has **zero runtime dependencies** — it uses only Node.js built-in APIs (`fetch`, `FormData`, `URL`, `AbortController`). This minimizes supply-chain risk.

DevDependencies are used for build and test only and are not shipped in the npm package.

## Reporting Vulnerabilities

If you discover a security vulnerability in this SDK, please report it responsibly:

1. **Do not** open a public GitHub issue.
2. Email security@knowledge2.ai with details of the vulnerability.
3. Include steps to reproduce if possible.
4. We will acknowledge receipt within 48 hours and provide a timeline for a fix.
