// Single source of truth for build-time configuration. Everything reads from
// here — nothing else touches import.meta.env. (PLAN §3)

const rawBase = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const rawMocks = import.meta.env.VITE_ENABLE_MOCKS;

// Mock mode resolution:
//   1. explicit VITE_ENABLE_MOCKS wins,
//   2. else a configured API base implies you mean a real server → mocks off,
//   3. else dev defaults on (friendly first run), prod off.
// So to drive a real carillon-server, just set VITE_API_BASE_URL.
function resolveMocks(): boolean {
  if (rawMocks !== undefined) return rawMocks !== 'false';
  if (rawBase) return false;
  return import.meta.env.DEV;
}

export const config = {
  /**
   * carillon-server base URL. Empty = same-origin (self-host embed, where the
   * daemon serves this build). A value points at the API host — e.g.
   * `http://127.0.0.1:3000` for local server testing (needs the server's CORS
   * origin set). Trailing slash trimmed.
   */
  apiBaseUrl: rawBase,

  /** Talk to in-browser mocks instead of a real server. */
  mocksEnabled: resolveMocks(),
} as const;

/** Join the API base with a path, keeping same-origin URLs relative. */
export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${config.apiBaseUrl}${suffix}`;
}

/** Human label of what we're connected to, for the header indicator. */
export function connectionLabel(): string {
  if (config.mocksEnabled) return 'mock data';
  return config.apiBaseUrl || 'same-origin';
}
