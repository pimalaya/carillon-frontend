import type { ZodType, output } from "zod";

// Validate a response at the boundary, but never let a schema drift take the UI
// down: on mismatch we warn and pass the raw value through. Tighten to a hard
// throw once the server's OpenAPI is the source of truth. (PLAN §1, §7)
//
// Returns the schema's exact `output` type (defaults applied) rather than a
// widened generic, so callers' declared response types line up precisely (no
// MutationFunction-assignability drift on schemas that use `.default()`).
export function parseOr<S extends ZodType>(
  schema: S,
  data: unknown,
): output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  if (import.meta.env.DEV) {
    console.warn("[carillon] response validation failed", result.error.issues);
  }
  return data as output<S>;
}
