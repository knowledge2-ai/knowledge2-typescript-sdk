/** Return true if `value` is a plain object (created by `{}` or `Object.create(null)`). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

/** Keys that must never be copied during deep conversion (prototype pollution defense). */
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Convert a camelCase string to snake_case.
 *
 * Handles consecutive uppercase letters (e.g., `graphRAG` → `graph_rag`).
 */
export function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

/** Convert a snake_case string to camelCase. */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z\d])/g, (_, char: string) => char.toUpperCase());
}

/** Recursively convert all object keys from camelCase to snake_case. */
export function deepCamelToSnake<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepCamelToSnake) as T;
  }

  // Pass through non-plain objects (Date, Map, Set, etc.) unchanged.
  if (!isPlainObject(obj)) {
    return obj;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    const converted = camelToSnake(key);
    if (DANGEROUS_KEYS.has(converted)) continue;
    result[converted] = deepCamelToSnake(value);
  }
  return result as T;
}

/** Recursively convert all object keys from snake_case to camelCase. */
export function deepSnakeToCamel<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepSnakeToCamel) as T;
  }

  // Pass through non-plain objects (Date, Map, Set, etc.) unchanged.
  if (!isPlainObject(obj)) {
    return obj;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    const converted = snakeToCamel(key);
    if (DANGEROUS_KEYS.has(converted)) continue;
    result[converted] = deepSnakeToCamel(value);
  }
  return result as T;
}
