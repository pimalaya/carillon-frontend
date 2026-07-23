// Single source of truth for build-time config; nothing else touches
// import.meta.env.

const rawBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const rawMocks = import.meta.env.VITE_ENABLE_MOCKS;

// Mock mode: explicit VITE_ENABLE_MOCKS wins; else a configured API base means a
// real server (mocks off); else dev defaults on, prod off.
function resolveMocks(): boolean {
  if (rawMocks !== undefined) return rawMocks !== "false";
  if (rawBase) return false;
  return import.meta.env.DEV;
}

export const config = {
  /** carillon-backend base URL. Empty = same-origin (self-host embed). A value
   *  (e.g. `http://127.0.0.1:3000`) needs the server's CORS origin set.
   *  Trailing slash trimmed. */
  apiBaseUrl: rawBase,

  mocksEnabled: resolveMocks(),

  /** Show the early-beta notice strip; flip to false at GA. */
  betaBanner: true,

  feedbackUrl: "mailto:carillon@pimalaya.org?subject=Carillon%20feedback",
} as const;

/** Join the API base with a path, keeping same-origin URLs relative. */
export function apiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${config.apiBaseUrl}${suffix}`;
}

export function connectionLabel(): string {
  if (config.mocksEnabled) return "mock data";
  // Same-origin (empty base) resolves to the actual host serving the app.
  return config.apiBaseUrl || window.location.origin;
}
