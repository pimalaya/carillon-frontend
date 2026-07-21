import { useEffect, useRef, useState } from 'react';

import { apiUrl, config } from './config';
import { getActiveLink, useAuth } from './auth';
import { streamEventSchema, type StreamEvent } from '@/api/schemas';

// Live stream: carillon-server's GET /events is a content-free SSE feed of
// named events — `delivery`, `status`, `notice` (plus `lagged`) — each data
// payload a JSON object tagged with `type`. It is **authenticated and scoped**:
// the server validates the account's capability link and forwards only that
// account's events (server-side, live.rs / D§5). Browsers' native EventSource
// cannot set an Authorization header, so we read /events as a fetch stream and
// parse the SSE frames ourselves, carrying the Bearer link. In mock mode a
// synthetic generator stands in so the "live log firing" moment works offline.

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'stale';

export interface StreamHandlers {
  onEvent: (event: StreamEvent) => void;
  onStatus?: (status: StreamStatus) => void;
}

// The named events we render; anything else (`lagged`, keep-alive comments) is
// ignored rather than surfaced.
const NAMED_EVENTS = new Set(['delivery', 'status', 'notice']);
// Reconnect backoff ceiling: 0.5s · 2^(n-1), capped so a dead server is retried
// at most every ~16s.
const MAX_RETRY_STEP = 6;

/**
 * Open the event stream. Returns a cleanup function. Chooses the synthetic mock
 * stream or a real authenticated fetch stream based on config.
 */
export function openEventStream(handlers: StreamHandlers): () => void {
  if (config.mocksEnabled) {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    // Dev-only; loaded lazily so it tree-shakes out of a production build.
    import('@/mocks/events').then(({ startMockStream }) => {
      if (cancelled) return;
      dispose = startMockStream(handlers);
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }

  const controller = new AbortController();
  let closed = false;
  let retry = 0;

  async function connect() {
    const link = getActiveLink();
    if (!link) {
      handlers.onStatus?.('idle');
      return;
    }
    handlers.onStatus?.('connecting');
    try {
      const res = await fetch(apiUrl('/events'), {
        headers: { Authorization: `Bearer ${link}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`stream failed (${res.status})`);

      handlers.onStatus?.('live');
      retry = 0;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE frames are separated by a blank line.
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          dispatchFrame(buffer.slice(0, sep), handlers);
          buffer = buffer.slice(sep + 2);
        }
      }
      // A clean end still means we lost the live feed: fall through to retry.
      throw new Error('stream ended');
    } catch {
      if (closed || controller.signal.aborted) return;
      handlers.onStatus?.('stale');
      retry = Math.min(retry + 1, MAX_RETRY_STEP);
      const wait = 500 * 2 ** (retry - 1);
      setTimeout(() => {
        if (!closed) connect();
      }, wait);
    }
  }

  connect();

  return () => {
    closed = true;
    controller.abort();
  };
}

/** Parse one SSE frame (`event:`/`data:` lines) and dispatch a known event. */
function dispatchFrame(frame: string, handlers: StreamHandlers) {
  let event = 'message';
  const dataLines: string[] = [];
  for (const raw of frame.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line.startsWith(':')) continue; // comment / keep-alive
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
  }
  if (!NAMED_EVENTS.has(event)) return;
  const parsed = streamEventSchema.safeParse(safeParse(dataLines.join('\n')));
  if (parsed.success) handlers.onEvent(parsed.data);
}

function safeParse(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * React binding: subscribe while `enabled` (and an account is active), exposing
 * the connection status. Re-subscribes when the active account (its link)
 * changes, so the stream is always scoped to what's on screen.
 */
export function useEventStream(enabled: boolean, onEvent: (event: StreamEvent) => void) {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const { activeLink } = useAuth();
  // Keep the latest callback without re-subscribing on every render.
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !activeLink) {
      setStatus('idle');
      return;
    }
    const cleanup = openEventStream({
      onEvent: (e) => handlerRef.current(e),
      onStatus: setStatus,
    });
    return cleanup;
  }, [enabled, activeLink]);

  return status;
}
