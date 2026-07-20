import { http, HttpResponse, delay } from 'msw';

import { apiUrl } from '@/lib/config';
import { mockAuthenticate, mockDb, mockTestConnect } from './db';

// MSW REST handlers over the in-memory mock DB, mirroring carillon-server's
// routes and wire shapes (api.rs / openapi.yaml). The SSE /events stream is
// served by the synthetic generator in events.ts, not here. (PLAN §7)

const route = (path: string) => apiUrl(path);

function linkOf(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
}

function unauthorized() {
  return HttpResponse.json(
    { error: 'invalid or missing capability link' },
    { status: 401 },
  );
}

export const handlers = [
  http.get(route('/health'), () => HttpResponse.text('ok')),

  // ── Onboarding / identity ──────────────────────────────────────────────────
  http.post(route('/test'), async ({ request }) => {
    const body = (await request.json()) as { login: string; password?: string; imap_host?: string };
    await delay(700); // connect + auth + capability probe takes a beat
    return HttpResponse.json(mockTestConnect(body));
  }),

  http.post(route('/auth'), async ({ request }) => {
    const body = (await request.json()) as {
      login: string;
      password?: string;
      imap_host: string;
      imap_port?: number;
    };
    await delay(600);
    const result = mockAuthenticate({ ...body, existingLink: linkOf(request) });
    if (!result.watchable && body.password === 'wrong') {
      return HttpResponse.json({ error: 'authentication failed' }, { status: 401 });
    }
    return HttpResponse.json(result);
  }),

  http.get(route('/me'), async ({ request }) => {
    const link = linkOf(request);
    if (!link) return unauthorized();
    await delay(250);
    return HttpResponse.json(mockDb.me(link));
  }),

  http.post(route('/signout'), ({ request }) => {
    const link = linkOf(request);
    if (!link) return unauthorized();
    return HttpResponse.json({ status: 'ok', revoked: mockDb.signout(link) });
  }),

  // ── Watches ────────────────────────────────────────────────────────────────
  http.get(route('/watches'), async () => {
    await delay(200);
    return HttpResponse.json(mockDb.allWatches());
  }),

  http.post(route('/watches'), async ({ request }) => {
    const body = (await request.json()) as Parameters<typeof mockDb.createWatch>[0];
    await delay(400);
    return HttpResponse.json(mockDb.createWatch(body), { status: 201 });
  }),

  http.delete(route('/watches/:id'), ({ params }) => {
    const ok = mockDb.deleteWatch(String(params.id));
    if (!ok) return HttpResponse.json({ error: 'watch not found' }, { status: 404 });
    return HttpResponse.json({ status: 'ok' });
  }),

  http.post(route('/watches/:id/pause'), ({ params }) => {
    const ok = mockDb.setActive(String(params.id), false);
    if (!ok) return HttpResponse.json({ error: 'watch not found' }, { status: 404 });
    return HttpResponse.json({ status: 'ok', active: false });
  }),

  http.post(route('/watches/:id/resume'), ({ params }) => {
    const ok = mockDb.setActive(String(params.id), true);
    if (!ok) return HttpResponse.json({ error: 'watch not found' }, { status: 404 });
    return HttpResponse.json({ status: 'ok', active: true });
  }),

  http.post(route('/watches/:id/rotate-secret'), ({ params }) => {
    const result = mockDb.rotateSecret(String(params.id));
    if (!result) return HttpResponse.json({ error: 'watch not found' }, { status: 404 });
    return HttpResponse.json(result);
  }),

  // ── Deliveries ─────────────────────────────────────────────────────────────
  http.get(route('/deliveries'), async ({ request }) => {
    const url = new URL(request.url);
    await delay(250);
    return HttpResponse.json(
      mockDb.deliveries(
        url.searchParams.get('account') ?? undefined,
        Number(url.searchParams.get('limit') ?? 100),
      ),
    );
  }),

  // ── Accounts (billing) ─────────────────────────────────────────────────────
  http.get(route('/accounts'), () => HttpResponse.json(mockDb.accountsList())),

  http.get(route('/accounts/:id'), ({ params }) => {
    const view = mockDb.getAccount(String(params.id));
    if (!view) return HttpResponse.json({ error: 'account not found' }, { status: 404 });
    return HttpResponse.json(view);
  }),

  http.post(route('/accounts/:id/credit'), async ({ request, params }) => {
    const body = (await request.json()) as { secs: number; ttl_secs?: number };
    if (!(body.secs > 0)) return HttpResponse.json({ error: 'secs must be positive' }, { status: 400 });
    const view = mockDb.addCredit(String(params.id), body.secs, body.ttl_secs);
    if (!view) return HttpResponse.json({ error: 'account not found' }, { status: 404 });
    return HttpResponse.json(view);
  }),

  http.post(route('/accounts/:id/auto-refill'), async ({ request, params }) => {
    const body = (await request.json()) as {
      enabled: boolean;
      threshold_secs?: number;
      amount_secs?: number;
    };
    if (body.enabled && !(Number(body.amount_secs) > 0)) {
      return HttpResponse.json({ error: 'amount_secs must be positive when enabling' }, { status: 400 });
    }
    const ok = mockDb.setAutoRefill(String(params.id), body);
    if (!ok) return HttpResponse.json({ error: 'account not found' }, { status: 404 });
    return HttpResponse.json({ status: 'ok' });
  }),

  // ── Billing ────────────────────────────────────────────────────────────────
  http.get(route('/billing/packs'), () => HttpResponse.json(mockDb.packs())),

  http.post(route('/billing/checkout'), async ({ request }) => {
    const link = linkOf(request);
    if (!link) return unauthorized();
    const { pack } = (await request.json()) as { pack: string };
    await delay(400);
    const session = mockDb.checkout(link, pack);
    if (!session) return HttpResponse.json({ error: 'unknown pack' }, { status: 400 });
    return HttpResponse.json(session);
  }),

  http.post(route('/billing/webhook'), () =>
    HttpResponse.json({ status: 'ignored', reason: 'mock settles at checkout' }),
  ),
];
