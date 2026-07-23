import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Brand } from "@/components/layout/Brand";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api";
import { parseOr } from "@/api/parse";
import { magicVerifyResultSchema } from "@/api/schemas";
import { useAuth } from "@/lib/auth";

/** A magic-link exchange is tiny; exceeding this means the API is unreachable
 *  (wrong base URL, server down, or CORS). */
const VERIFY_TIMEOUT_MS = 15_000;

/**
 * Exchanges the emailed magic-link token for a capability link, stores it, and
 * enters the app. (§ BILLING_MODEL magic-link flow)
 *
 * Uses a plain awaited `apiFetch`, not a React Query mutation: a mutation
 * observer hung this fire-once call under StrictMode (the observer that ran to
 * completion wasn't the one the component read).
 */
export function VerifyPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { addAccount } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const started = useRef(false);

  const run = useCallback(async () => {
    setError(null);
    setBusy(true);
    if (!token) {
      setError("This sign-in link is missing its token.");
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(),
      VERIFY_TIMEOUT_MS,
    );
    try {
      const data = await apiFetch<unknown>("/auth/magic/verify", {
        method: "POST",
        body: { token },
        token: null,
        signal: controller.signal,
      });
      const result = parseOr(magicVerifyResultSchema, data);
      // Placeholder label; the switcher syncs it to the account email once /me
      // loads. accountId ties this link to that account.
      addAccount({
        label: "my account",
        link: result.link,
        accountId: result.account_id,
      });
      navigate("/", { replace: true });
    } catch (err) {
      // Distinguish a bad/expired token (401) from an unreachable server.
      setError(
        err instanceof ApiError && err.status === 401
          ? "This sign-in link is invalid or has expired."
          : "Couldn’t reach Carillon to sign you in. Check the server is running and try again.",
      );
      setBusy(false);
    } finally {
      window.clearTimeout(timer);
    }
  }, [token, addAccount, navigate]);

  useEffect(() => {
    if (started.current) return; // token is single-use — fire exactly once
    started.current = true;
    void run();
  }, [run]);

  function retry() {
    void run();
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16 text-center">
      <Brand />
      {error ? (
        <>
          <p className="mt-8 text-sm text-muted-foreground">{error}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={retry} disabled={busy}>
              Try again
            </Button>
            <Button onClick={() => navigate("/welcome", { replace: true })}>
              Back to sign in
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Signing you in…
        </p>
      )}
    </div>
  );
}
