import type { BaseClient } from "../base-client.js";
import { encodePath } from "../utils/encode-path.js";

/** Abstract base class for API resource classes. */
export abstract class BaseResource {
  constructor(protected readonly client: BaseClient) {}

  /** URL-encode a single path segment to prevent path traversal. */
  protected encodePath(segment: string): string {
    return encodePath(segment);
  }
}
