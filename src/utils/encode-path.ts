/** URL-encode a single path segment to prevent path traversal. */
export function encodePath(segment: string): string {
  return encodeURIComponent(segment);
}
