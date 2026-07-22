import { apiUrl } from "./config";
import { getActiveLink } from "./auth";

// Typed fetch wrapper: prefixes the API base, attaches the active account's
// capability link as `Authorization: Bearer`, and turns non-2xx responses into
// a structured ApiError. Every resource module builds on this. (PLAN §4)

export interface ApiErrorBody {
  code?: string;
  message?: string;
  /** The server's error shape is `{ "error": "..." }` (api.rs). */
  error?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorBody | string) {
    const parsed = typeof body === "string" ? { message: body } : body;
    super(
      parsed.message ?? parsed.error ?? `Request failed (${status})`,
    );
    this.name = "ApiError";
    this.status = status;
    this.code = parsed.code;
    this.details = parsed.details;
  }

  /** Rate-limited — the one oracle surface (test-connect, capability link). */
  get isRateLimited() {
    return this.status === 429;
  }

  get isUnauthorized() {
    return this.status === 401 || this.status === 403;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON body; serialized automatically. */
  body?: unknown;
  /** AbortSignal for cancellation (TanStack Query passes one). */
  signal?: AbortSignal;
  /**
   * Override the bearer token. Defaults to the active account's link. Pass
   * `null` to send no Authorization header (e.g. minting the first link).
   */
  token?: string | null;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = apiUrl(path);
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, signal, query } = opts;
  const token = opts.token === undefined ? getActiveLink() : opts.token;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeJson(text) : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, (data as ApiErrorBody) ?? text);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
