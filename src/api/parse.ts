import type { ZodType } from 'zod';

// Validate a response at the boundary, but never let a schema drift take the UI
// down: on mismatch we warn and pass the raw value through. Tighten to a hard
// throw once the server's OpenAPI is the source of truth. (PLAN §1, §7)
export function parseOr<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  if (import.meta.env.DEV) {
    console.warn('[carillon] response validation failed', result.error.issues);
  }
  return data as T;
}
