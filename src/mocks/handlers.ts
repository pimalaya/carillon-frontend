import { http, HttpResponse, delay } from "msw";

import { apiUrl } from "@/lib/config";
import {
  mockAuthenticate,
  mockDb,
  mockListMailboxes,
  mockTestConnect,
  mockTestWebhook,
} from "./db";

// MSW REST handlers over the in-memory mock DB, mirroring carillon-backend's
// routes and wire shapes (api.rs / openapi.yaml). The SSE /events stream is
// served by the synthetic generator in events.ts, not here. (PLAN §7)

const route = (path: string) => apiUrl(path);

function linkOf(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  return auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
}

function unauthorized() {
  return HttpResponse.json(
    { error: "invalid or missing capability link" },
    { status: 401 },
  );
}

export const handlers = [
  http.get(route("/health"), () => HttpResponse.text("ok")),

  // ── Onboarding / identity ──────────────────────────────────────────────────
  http.post(route("/test"), async ({ request }) => {
    const body = (await request.json()) as {
      login: string;
      password?: string;
      imap_host?: string;
    };
    await delay(700); // connect + auth + capability probe takes a beat
    return HttpResponse.json(mockTestConnect(body));
  }),

  http.post(route("/auth"), async ({ request }) => {
    const body = (await request.json()) as {
      login: string;
      password?: string;
      imap_host: string;
      imap_port?: number;
    };
    await delay(600);
    const result = mockAuthenticate({ ...body, existingLink: linkOf(request) });
    if (!result.watchable && body.password === "wrong") {
      return HttpResponse.json(
        { error: "authentication failed" },
        { status: 401 },
      );
    }
    return HttpResponse.json(result);
  }),

  http.post(route("/auth/magic/request"), async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    await delay(400);
    if (!body.email?.includes("@")) {
      return HttpResponse.json(
        { error: "a valid email is required" },
        { status: 400 },
      );
    }
    mockDb.magicRequest(body.email);
    return HttpResponse.json({ status: "sent" });
  }),

  http.post(route("/auth/magic/verify"), async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { token?: string };
    await delay(300);
    const result = body.token ? mockDb.magicVerify(body.token) : null;
    if (!result) {
      return HttpResponse.json(
        { error: "invalid or expired sign-in link" },
        { status: 401 },
      );
    }
    return HttpResponse.json(result);
  }),

  http.post(route("/mailboxes"), async () => {
    await delay(500);
    return HttpResponse.json(mockListMailboxes());
  }),

  http.post(route("/webhook/test"), async () => {
    await delay(500);
    return HttpResponse.json(mockTestWebhook());
  }),

  http.get(route("/me"), async ({ request }) => {
    const link = linkOf(request);
    if (!link) return unauthorized();
    await delay(250);
    return HttpResponse.json(mockDb.me(link));
  }),

  http.post(route("/signout"), ({ request }) => {
    const link = linkOf(request);
    if (!link) return unauthorized();
    return HttpResponse.json({ status: "ok", revoked: mockDb.signout(link) });
  }),

  // ── Watches ────────────────────────────────────────────────────────────────
  http.get(route("/watches"), async () => {
    await delay(200);
    return HttpResponse.json(mockDb.allWatches());
  }),

  http.post(route("/watches"), async ({ request }) => {
    const body = (await request.json()) as Parameters<
      typeof mockDb.createWatch
    >[0];
    await delay(400);
    const result = mockDb.createWatch(body);
    if (result === "duplicate")
      return HttpResponse.json(
        { error: "a service already watches that folder" },
        { status: 409 },
      );
    return HttpResponse.json(result, { status: 201 });
  }),

  http.delete(route("/watches/:id"), ({ params }) => {
    const ok = mockDb.deleteWatch(String(params.id));
    if (!ok)
      return HttpResponse.json({ error: "watch not found" }, { status: 404 });
    return HttpResponse.json({ status: "ok" });
  }),

  http.post(route("/watches/:id/pause"), ({ params }) => {
    const ok = mockDb.setActive(String(params.id), false);
    if (!ok)
      return HttpResponse.json({ error: "watch not found" }, { status: 404 });
    return HttpResponse.json({ status: "ok", active: false });
  }),

  http.post(route("/watches/:id/resume"), ({ params }) => {
    const ok = mockDb.setActive(String(params.id), true);
    if (!ok)
      return HttpResponse.json({ error: "watch not found" }, { status: 404 });
    return HttpResponse.json({ status: "ok", active: true });
  }),

  http.post(route("/watches/:id/rotate-secret"), ({ params }) => {
    const result = mockDb.rotateSecret(String(params.id));
    if (!result)
      return HttpResponse.json({ error: "watch not found" }, { status: 404 });
    return HttpResponse.json(result);
  }),

  http.post(route("/watches/:id/activate"), async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      credits?: number;
    };
    await delay(300);
    const result = mockDb.activate(String(params.id), body.credits ?? 1);
    if (result === "gone")
      return HttpResponse.json({ error: "watch not found" }, { status: 404 });
    if (result === "no_credits")
      return HttpResponse.json(
        { error: "no credits — buy a pack first" },
        { status: 402 },
      );
    return HttpResponse.json(result);
  }),

  http.post(route("/watches/:id/auto-renew"), async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      enabled?: boolean;
    };
    const ok = mockDb.setAutoRenew(String(params.id), !!body.enabled);
    if (!ok)
      return HttpResponse.json({ error: "watch not found" }, { status: 404 });
    return HttpResponse.json({
      status: "ok",
      id: String(params.id),
      auto_renew: !!body.enabled,
    });
  }),

  // ── Deliveries ─────────────────────────────────────────────────────────────
  http.get(route("/deliveries"), async ({ request }) => {
    const url = new URL(request.url);
    await delay(250);
    return HttpResponse.json(
      mockDb.deliveries(
        url.searchParams.get("account") ?? undefined,
        Number(url.searchParams.get("limit") ?? 100),
      ),
    );
  }),

  // ── Accounts (billing) ─────────────────────────────────────────────────────
  http.get(route("/accounts"), () => HttpResponse.json(mockDb.accountsList())),

  http.get(route("/accounts/:id"), ({ params }) => {
    const view = mockDb.getAccount(String(params.id));
    if (!view)
      return HttpResponse.json({ error: "account not found" }, { status: 404 });
    return HttpResponse.json(view);
  }),

  // ── Billing (credit packs) ─────────────────────────────────────────────────
  http.post(route("/billing/checkout"), async ({ request }) => {
    const link = linkOf(request);
    if (!link) return unauthorized();
    const body = (await request.json().catch(() => ({}))) as { packs?: number };
    await delay(400);
    const packs = Math.max(1, Math.floor(body.packs ?? 1));
    return HttpResponse.json(mockDb.checkout(link, packs));
  }),

  http.post(route("/billing/webhook"), () =>
    HttpResponse.json({
      status: "ignored",
      reason: "mock settles at checkout",
    }),
  ),
];
