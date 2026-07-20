import { useEffect, useRef, useState } from 'react';

import { apiUrl, config } from './config';
import { useAuth } from './auth';
import { streamEventSchema, type StreamEvent } from '@/api/schemas';

// Live stream: carillon-server's GET /events is a content-free SSE feed of
// named events — `delivery`, `status`, `notice` (plus `lagged`) — each data
// payload a JSON object tagged with `type`. It's unauthenticated and global
// (self-host: one box, one user). In mock mode a synthetic generator stands in
// so the "live log firing" moment works offline. (PLAN §8, live.rs)

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'stale';

export interface StreamHandlers {
  onEvent: (event: StreamEvent) => void;
  onStatus?: (status: StreamStatus) => void;
}

const NAMED_EVENTS = ['delivery', 'status', 'notice'] as const;

/**
 * Open the event stream. Returns a cleanup function. Chooses the synthetic mock
 * stream or a real EventSource based on config.
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

  handlers.onStatus?.('connecting');
  const source = new EventSource(apiUrl('/events'));

  const dispatch = (msg: MessageEvent) => {
    const parsed = streamEventSchema.safeParse(safeParse(msg.data));
    if (parsed.success) handlers.onEvent(parsed.data);
  };

  source.onopen = () => handlers.onStatus?.('live');
  for (const name of NAMED_EVENTS) source.addEventListener(name, dispatch);
  source.onerror = () => handlers.onStatus?.('stale');

  return () => {
    for (const name of NAMED_EVENTS) source.removeEventListener(name, dispatch);
    source.close();
  };
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
 * the connection status. The stream itself is global, but we only run it once
 * there's a signed-in account to render events for.
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
