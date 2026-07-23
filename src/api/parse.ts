import type { ZodType, output } from "zod";

// Validate a response at the boundary without letting schema drift break the UI:
// on mismatch, warn and pass the raw value through. TODO: hard-throw once the
// server's OpenAPI is the source of truth.
//
// Returns the schema's exact `output` type (defaults applied), not a widened
// generic, so callers' response types line up (no MutationFunction drift on
// schemas using `.default()`).
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
