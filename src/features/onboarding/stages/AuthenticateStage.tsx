import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/api/keys";
import {
  runOauthPopup,
  useAuthenticate,
  useOauthStart,
  useTestConnect,
  type OauthResult,
} from "@/api/onboarding";
import type { TestVerdict } from "@/api/schemas";
import type { StageProps } from "../types";

/** A friendly provider name from the IMAP host, for the OAuth button. */
function providerLabel(host: string): string {
  const h = host.toLowerCase();
  if (h.includes("gmail") || h.includes("google")) return "Google";
  if (h.includes("outlook") || h.includes("office") || h.includes("microsoft"))
    return "Microsoft";
  if (h.includes("fastmail")) return "Fastmail";
  return "your provider";
}

/** Whether the account may be added: the mailbox is watchable. Re-adding an
 *  account that already exists is fine — the server recovers it — so we no
 *  longer block on `already_watched` (service dedup lives at "Add service"). */
function canContinue(v?: TestVerdict): boolean {
  return !!v?.ok;
}

/** Surface the welcome-credit outcome for a freshly-attached PIM account. */
function toastFreeCredit(outcome?: string) {
  if (outcome === "granted") {
    toast.success("Welcome! 1 free credit added to your pool 🎁");
  } else if (outcome === "already_claimed") {
    toast("This mailbox’s free credit was already claimed by another account.");
  }
}

/** Synthesises a {@link TestVerdict} from an OAuth callback result, so the
 *  OAuth path shows the same connection panel as the password probe. */
function verdictFromOauth(r: OauthResult): TestVerdict {
  const missing = r.missing ?? [];
  return {
    ok: r.watchable ?? false,
    reachable: true,
    authenticated: true,
    idle: !missing.includes("IDLE"),
    qresync: r.qresync ?? false,
    condstore: r.qresync ?? false,
    missing,
    error: null,
  };
}

export function AuthenticateStage(props: StageProps) {
  // OAuth choices sign in with the provider; everything else probes over IMAP.
  if (props.state.auth?.kind.startsWith("oauth")) {
    return <OauthAuthenticate {...props} />;
  }
  return <PasswordAuthenticate {...props} />;
}

/** OAuth sign-in: a popup to the provider; the server keeps the refresh token,
 *  stores it on the PIM account, and mints the capability link on the callback.
 *  No password is stored. Signing in *is* adding the account. */
function OauthAuthenticate({ state, update, next, back }: StageProps) {
  const { hasAccount, addAccount } = useAuth();
  const qc = useQueryClient();
  const oauthStart = useOauthStart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provider = providerLabel(state.imap_host);

  async function signIn() {
    if (!state.auth) return;
    setError(null);
    update({ verdict: undefined });
    setBusy(true);
    try {
      const { authorization_url } = await oauthStart.mutateAsync({
        auth: state.auth,
        login: state.login,
        imap_host: state.imap_host,
        imap_port: state.imap_port,
        mailbox: state.mailbox,
        associate: hasAccount,
      });
      const result = await runOauthPopup(authorization_url);
      if (result.ok && result.link) {
        // Join keeps this under the same Carillon account (matched by accountId);
        // empty label preserves its email. Refresh /me so the PIM account shows.
        addAccount({
          label: "",
          link: result.link,
          accountId: result.account_id,
        });
        toastFreeCredit(result.free_credit);
        qc.invalidateQueries({ queryKey: queryKeys.me(result.link) });
        update({
          capabilityLink: result.link,
          account_id: result.account_id,
          verdict: verdictFromOauth(result),
        });
      } else {
        setError(result.error ?? "Sign-in failed.");
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.isRateLimited
          ? "Too many attempts — wait a moment before trying again."
          : "Could not start sign-in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const signedIn = !!state.verdict;

  return (
    <div className="space-y-5">
      <Alert>
        <ShieldCheck />
        <AlertTitle>Sign in with {provider}</AlertTitle>
        <AlertDescription>
          A popup takes you to {provider} to authorize mail access. Carillon
          keeps a refresh token — never your password.
        </AlertDescription>
      </Alert>

      <Button onClick={signIn} disabled={busy}>
        {busy ? <Spinner /> : <ShieldCheck />}
        {signedIn
          ? `Re-authorize with ${provider}`
          : `Sign in with ${provider}`}
      </Button>

      {error && (
        <Alert variant="warning">
          <XCircle />
          <AlertTitle>Not signed in yet</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {state.verdict && <Verdict v={state.verdict} />}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back}>
          Back
        </Button>
        <Button onClick={next} disabled={!canContinue(state.verdict)}>
          <UserPlus />
          Add account
        </Button>
      </div>
    </div>
  );
}

function PasswordAuthenticate({ state, update, next, back }: StageProps) {
  const { hasAccount, addAccount } = useAuth();
  const qc = useQueryClient();
  const test = useTestConnect();
  const authenticate = useAuthenticate();
  const [adding, setAdding] = useState(false);

  async function runTest() {
    update({ verdict: undefined });
    try {
      const verdict = await test.mutateAsync({
        imap_host: state.imap_host,
        imap_port: state.imap_port,
        login: state.login,
        password: state.password,
        mailbox: state.mailbox,
      });
      update({ verdict });
    } catch (err) {
      const message =
        err instanceof ApiError && err.isRateLimited
          ? "Too many attempts — wait a moment before trying again."
          : "The connection test failed. Check the settings and try again.";
      update({
        verdict: {
          ok: false,
          reachable: false,
          authenticated: false,
          idle: false,
          qresync: false,
          condstore: false,
          missing: [],
          error: message,
        },
      });
    }
  }

  // Adding the account: /auth proves control, stores the credential on the PIM
  // account, and mints (or recovers/joins) the capability link. The flow then
  // finishes — services are added afterwards, reusing this credential.
  async function addAccountNow() {
    setAdding(true);
    try {
      const auth = await authenticate.mutateAsync({
        imap_host: state.imap_host,
        imap_port: state.imap_port,
        login: state.login,
        password: state.password,
        mailbox: state.mailbox,
        associate: hasAccount,
      });
      // Same Carillon account (matched by accountId); empty label preserves its
      // email. Refresh /me so the freshly-attached PIM account appears.
      addAccount({ label: "", link: auth.link, accountId: auth.account_id });
      toastFreeCredit(auth.free_credit);
      qc.invalidateQueries({ queryKey: queryKeys.me(auth.link) });
      update({ capabilityLink: auth.link, account_id: auth.account_id });
      next();
    } catch (err) {
      setAdding(false);
      toast.error(
        err instanceof ApiError && err.status === 401
          ? "Authentication failed — check the password and try again."
          : "Could not add the account. Please try again.",
      );
    }
  }

  const canTest = state.login.trim().length > 0 && state.password.length > 0;

  return (
    <div className="space-y-5">
      <Alert>
        <KeyRound />
        <AlertTitle>Use an app password where possible</AlertTitle>
        <AlertDescription>
          The password is sent to the server only for this read-only probe; it’s
          encrypted at rest when you add the account.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="login">Email / login</Label>
        <Input
          id="login"
          placeholder="you@example.com"
          autoComplete="username"
          value={state.login}
          onChange={(e) => update({ login: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password or app password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="off"
          placeholder="••••••••"
          value={state.password}
          onChange={(e) => update({ password: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && canTest && runTest()}
        />
        <p className="text-xs text-muted-foreground">
          Testing is free and repeatable — nothing is charged.
        </p>
      </div>

      <Button
        variant="secondary"
        onClick={runTest}
        disabled={test.isPending || !canTest}
      >
        {test.isPending ? <Spinner /> : <ShieldCheck />}
        Test connection
      </Button>

      {state.verdict && <Verdict v={state.verdict} />}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back}>
          Back
        </Button>
        <Button
          onClick={addAccountNow}
          disabled={!canContinue(state.verdict) || adding}
        >
          {adding ? <Spinner /> : <UserPlus />}
          Add account
        </Button>
      </div>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="size-4 text-success" />
      ) : (
        <XCircle className="size-4 text-muted-foreground" />
      )}
      <span className={cn(ok ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}

/** The shared connection result panel — the same view for the password probe
 *  and the OAuth return. */
function Verdict({ v }: { v: TestVerdict }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-2">
        <Check ok={v.reachable} label="Reachable" />
        <Check ok={v.authenticated} label="Authenticated" />
        <Check ok={v.idle} label="IDLE" />
        <Check ok={v.qresync} label="QRESYNC" />
      </div>
      {v.ok ? (
        v.qresync ? (
          <Alert variant="success">
            <ShieldCheck />
            <AlertTitle>Ready to watch</AlertTitle>
            <AlertDescription>
              Reachable, authenticated, and IDLE + QRESYNC all check out.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="warning">
            <ShieldCheck />
            <AlertTitle>Ready to watch — new messages only</AlertTitle>
            <AlertDescription>
              This provider doesn’t support QRESYNC, so only new messages will
              be watched — flag changes and deletions won’t be tracked.
            </AlertDescription>
          </Alert>
        )
      ) : (
        <Alert variant="warning">
          <XCircle />
          <AlertTitle>Can’t watch this mailbox yet</AlertTitle>
          <AlertDescription>
            {v.error ??
              (v.missing.length
                ? `The server is missing: ${v.missing.join(", ")}.`
                : "One or more checks failed.")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
