import { useMutation, useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { apiUrl } from "@/lib/config";
import { queryKeys } from "./keys";
import { parseOr } from "./parse";
import {
  addressbooksResponseSchema,
  contactsDiscoverResponseSchema,
  discoverResponseSchema,
  mailboxesResponseSchema,
  testVerdictSchema,
  webhookTestResultSchema,
  type AuthMethod,
  type ContactsDiscoverResponse,
  type DiscoverResponse,
  type TestRequest,
  type TestVerdict,
  type WebhookTestResult,
} from "./schemas";

// Onboarding + identity flows. /discover, /test and /auth are public
// (pre-account) and rate-limited; /signout carries the capability link. (D§5)

/**
 * POST /discover — resolve an email/domain/server to candidate IMAP configs +
 * auth methods (via io-pim-discovery). Public, rate-limited per IP. An
 * unresolvable input returns an empty candidate list, not an error. (D§2)
 */
export function useDiscover() {
  return useMutation<DiscoverResponse, Error, string>({
    mutationFn: (input) =>
      apiFetch<unknown>("/discover", {
        method: "POST",
        body: { input, kind: "email" },
        token: null,
      }).then((d) => parseOr(discoverResponseSchema, d)),
  });
}

/** POST /discover kind=contacts — resolve an email/domain to CardDAV context
 *  roots (RFC 6764). The type-first "Contacts" branch of onboarding. */
export function useDiscoverContacts() {
  return useMutation<ContactsDiscoverResponse, Error, string>({
    mutationFn: (input) =>
      apiFetch<unknown>("/discover", {
        method: "POST",
        body: { input, kind: "contacts" },
        token: null,
      }).then((d) => parseOr(contactsDiscoverResponseSchema, d)),
  });
}

/** POST /test — probe credentials read-only (no credit spent). */
export function useTestConnect() {
  return useMutation<TestVerdict, Error, TestRequest>({
    mutationFn: (input) =>
      apiFetch<unknown>("/test", {
        method: "POST",
        body: input,
        token: null,
      }).then((d) => parseOr(testVerdictSchema, d)),
  });
}

export interface CardDavTestInput {
  /** The CardDAV collection URL to probe. */
  carddav_url: string;
  /** Identity host + login (for the rate-limit key / mailbox key). */
  imap_host: string;
  login: string;
  /** The password the wizard is holding — sent straight through (§ v3: the
   *  credential lives on the service, not a stored account credential). */
  password: string;
}

/**
 * POST /test with `source_kind=carddav` — PROPFIND the collection with the
 * entered password, so "Add service" can confirm an addressbook is reachable +
 * watchable before creating. Public + rate-limited (no capability link needed).
 */
export function useTestCardDav() {
  return useMutation<TestVerdict, Error, CardDavTestInput>({
    mutationFn: ({ carddav_url, imap_host, login, password }) =>
      apiFetch<unknown>("/test", {
        method: "POST",
        body: {
          source_kind: "carddav",
          carddav_url,
          imap_host,
          login,
          password,
        },
        token: null,
      }).then((d) => parseOr(testVerdictSchema, d)),
  });
}

/** POST /signout — revoke the presented capability link server-side. */
export function useSignout() {
  return useMutation<void, Error, void>({
    mutationFn: () => apiFetch<void>("/signout", { method: "POST" }),
  });
}

export interface MailboxesQueryInput {
  imap_host: string;
  imap_port: number;
  login: string;
  /** Password flow: probe with LOGIN (unauthenticated). */
  password?: string;
  /** Reuse flow: the capability link — the server resolves the PIM account's
   *  stored credential (password or OAuth). Sent instead of a password. */
  link?: string;
  /** Only fetch once the connection is known (e.g. a PIM account is chosen). */
  enabled: boolean;
}

/**
 * POST /mailboxes — authenticate and LIST the account's selectable folders for
 * the "Add service" picker. A *query* (keyed by the connection), not a mutation
 * fired from an effect: the latter desyncs its observer under StrictMode, so the
 * list would never appear. Fetches once per (link, login, host, port); switching
 * the PIM account re-keys and refetches. (Password flow sends the password
 * unauth; reuse flow sends the capability link so the server uses the stored cred.)
 */
export function useMailboxes({
  imap_host,
  imap_port,
  login,
  password,
  link,
  enabled,
}: MailboxesQueryInput) {
  return useQuery({
    queryKey: queryKeys.mailboxes(link ?? null, login, imap_host, imap_port),
    enabled,
    staleTime: Infinity,
    retry: false,
    queryFn: ({ signal }) =>
      apiFetch<unknown>("/mailboxes", {
        method: "POST",
        body: { imap_host, imap_port, login, password: password ?? "" },
        token: link ?? null,
        signal,
      }).then((d) => parseOr(mailboxesResponseSchema, d)),
  });
}

export interface AddressbooksQueryInput {
  /** The CardDAV context-root URL to enumerate collections under. */
  carddav_url: string;
  login: string;
  /** Password path: the held password — the listing doubles as its check (§ v3). */
  password?: string;
  /** OAuth path: the capability link — the server uses the stored refresh token
   *  (an empty password is sent), exactly like `useMailboxes`. */
  link?: string;
  enabled: boolean;
}

/**
 * POST /addressbooks — list the CardDAV collections under a context root, for
 * the target dropdown. Password path sends the entered password; OAuth path
 * sends the capability link (stored refresh token). A `useQuery` (not a mutation
 * in an effect) for the same StrictMode reason as `useMailboxes`. Keyed by
 * (link, carddav_url, login).
 */
export function useAddressbooks({
  carddav_url,
  login,
  password,
  link,
  enabled,
}: AddressbooksQueryInput) {
  return useQuery({
    queryKey: ["addressbooks", link ?? null, carddav_url, login],
    enabled,
    staleTime: Infinity,
    retry: false,
    queryFn: ({ signal }) =>
      apiFetch<unknown>("/addressbooks", {
        method: "POST",
        body: { carddav_url, login, password: password ?? "" },
        token: link ?? null,
        signal,
      }).then((d) => parseOr(addressbooksResponseSchema, d)),
  });
}

export interface TestWebhookInput {
  notify_url: string;
  hmac_secret: string;
}

/**
 * POST /webhook/test — POST one synthetic, signed `test` event to the URL so
 * onboarding can confirm the endpoint is reachable (and verifying signatures)
 * before activating. Public, rate-limited per IP.
 */
export function useTestWebhook() {
  return useMutation<WebhookTestResult, Error, TestWebhookInput>({
    mutationFn: (body) =>
      apiFetch<unknown>("/webhook/test", {
        method: "POST",
        body,
        token: null,
      }).then((d) => parseOr(webhookTestResultSchema, d)),
  });
}

// ── OAuth login (D§7 / M10) ────────────────────────────────────────────────────
//
// OAuth proves control of a mailbox *and* leaves the server holding a refresh
// token (never a password). /oauth/start returns a provider authorization URL;
// the browser opens it in a popup, the provider redirects to the server's
// /oauth/callback, and that page posts the result back to this window.

export interface OauthStartInput {
  /** The chosen OAuth method from discovery (issuer or endpoints). */
  auth: AuthMethod;
  login: string;
  /** IMAP host, or (for a CardDAV login) the DAV host — it keys the mailbox. */
  imap_host: string;
  imap_port: number;
  mailbox: string;
  /** What this OAuth login is for: `imap` (default) or `carddav`. */
  source_kind?: "imap" | "carddav";
  /** CardDAV context-root URL (when `source_kind` is `carddav`). */
  carddav_url?: string;
  /** Send the active link so the new mailbox joins that account. */
  associate?: boolean;
}

/** POST /oauth/start — get the provider authorization URL to open in a popup. */
export function useOauthStart() {
  return useMutation<{ authorization_url: string }, Error, OauthStartInput>({
    mutationFn: ({
      auth,
      associate,
      login,
      imap_host,
      imap_port,
      mailbox,
      source_kind,
      carddav_url,
    }) => {
      const body: Record<string, unknown> = {
        login,
        imap_host,
        imap_port,
        mailbox,
      };
      if (source_kind) body.source_kind = source_kind;
      if (carddav_url) body.carddav_url = carddav_url;
      if (auth.kind === "oauth_issuer") body.issuer = auth.issuer;
      else {
        body.authorization_endpoint = auth.authorization_endpoint;
        body.token_endpoint = auth.token_endpoint;
        body.scope = auth.scope;
      }
      return apiFetch<{ authorization_url: string }>("/oauth/start", {
        method: "POST",
        body,
        token: associate ? undefined : null,
      });
    },
  });
}

/** The result the /oauth/callback popup posts back. */
export interface OauthResult {
  type: "carillon-oauth";
  ok: boolean;
  error?: string;
  link?: string;
  account_id?: string;
  watchable?: boolean;
  /** Capabilities the mailbox is missing to be watchable (e.g. IDLE). */
  missing?: string[];
  /** Whether the server supports QRESYNC; false ⇒ new-messages-only watching. */
  qresync?: boolean;
  /** Welcome-credit outcome for the joined PIM account. */
  free_credit?: "granted" | "already_credited" | "already_claimed";
  login?: string;
  imap_host?: string;
  imap_port?: number;
  mailbox?: string;
}

/**
 * Opens the provider authorization URL in a popup and resolves with the result
 * the /oauth/callback page posts back (validated to come from the API origin).
 * Resolves `{ok:false}` if the popup is blocked or closed without completing.
 */
export function runOauthPopup(authorizationUrl: string): Promise<OauthResult> {
  const expectedOrigin = new URL(apiUrl("/")).origin;
  return new Promise((resolve) => {
    const popup = window.open(
      authorizationUrl,
      "carillon-oauth",
      "width=520,height=680",
    );
    if (!popup) {
      resolve({
        type: "carillon-oauth",
        ok: false,
        error: "Popup blocked — allow popups and retry.",
      });
      return;
    }
    let done = false;
    const finish = (result: OauthResult) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMessage);
      clearInterval(timer);
      resolve(result);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) return;
      const data = event.data as OauthResult | undefined;
      if (data?.type === "carillon-oauth") finish(data);
    };
    window.addEventListener("message", onMessage);
    const timer = window.setInterval(() => {
      if (popup.closed)
        finish({
          type: "carillon-oauth",
          ok: false,
          error: "Sign-in window was closed.",
        });
    }, 500);
  });
}
