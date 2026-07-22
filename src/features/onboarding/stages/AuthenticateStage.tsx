import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  XCircle,
} from "lucide-react";

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

/** Whether the flow may proceed: the mailbox probed as watchable. */
function canContinue(v?: TestVerdict): boolean {
  return !!v?.ok;
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
    sync: false,
    missing,
    error: null,
  };
}

export function AuthenticateStage(props: StageProps) {
  // OAuth choices sign in with the provider; everything else holds a password.
  if (props.state.auth?.kind.startsWith("oauth")) {
    return <OauthAuthenticate {...props} />;
  }
  return <PasswordAuthenticate {...props} />;
}

/** OAuth sign-in: a popup to the provider; the server keeps the refresh token
 *  (the one credential still stored server-side, keyed to the mailbox) and joins
 *  it to this Carillon account on the callback. No password is held. */
function OauthAuthenticate({ state, update, next, back }: StageProps) {
  const { t } = useTranslation();
  const { hasAccount, addAccount } = useAuth();
  const qc = useQueryClient();
  const oauthStart = useOauthStart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provider = providerLabel(state.imap_host);
  const isContacts = state.service_type === "addressbook";

  async function signIn() {
    if (!state.auth) return;
    setError(null);
    update({ verdict: undefined });
    setBusy(true);
    try {
      const { authorization_url } = await oauthStart.mutateAsync({
        auth: state.auth,
        login: state.login,
        // For contacts, imap_host already carries the DAV host (set in Identify).
        imap_host: state.imap_host,
        imap_port: state.imap_port,
        mailbox: state.mailbox,
        source_kind: isContacts ? "carddav" : "imap",
        carddav_url: isContacts ? state.carddav_base : undefined,
        associate: hasAccount,
      });
      const result = await runOauthPopup(authorization_url);
      if (result.ok && result.link) {
        // Join keeps this under the same Carillon account (matched by accountId);
        // empty label preserves its email. Refresh /me so the mailbox shows.
        addAccount({
          label: "",
          link: result.link,
          accountId: result.account_id,
        });
        qc.invalidateQueries({ queryKey: queryKeys.me(result.link) });
        update({
          capabilityLink: result.link,
          account_id: result.account_id,
          verdict: verdictFromOauth(result),
        });
      } else {
        setError(result.error ?? t("onboarding.signInFailed"));
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.isRateLimited
          ? t("onboarding.tooManyAttempts")
          : t("onboarding.couldNotStart"),
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
        <AlertTitle>{t("onboarding.signInWith", { provider })}</AlertTitle>
        <AlertDescription>
          {t("onboarding.oauthBody", { provider })}
        </AlertDescription>
      </Alert>

      <Button onClick={signIn} disabled={busy}>
        {busy ? <Spinner /> : <ShieldCheck />}
        {signedIn
          ? t("onboarding.reauthorizeWith", { provider })
          : t("onboarding.signInWith", { provider })}
      </Button>

      {error && (
        <Alert variant="warning">
          <XCircle />
          <AlertTitle>{t("onboarding.notSignedIn")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {state.verdict && <Verdict v={state.verdict} />}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back}>
          {t("onboarding.back")}
        </Button>
        <Button onClick={next} disabled={!canContinue(state.verdict)}>
          {t("onboarding.continue")}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

/** Password sign-in: enter the app password and (for email) prove it watches
 *  over a read-only Test. Nothing is stored server-side here — the password is
 *  held in the wizard and rides through to the service on create (§ v3). For
 *  contacts the credential is checked when we list addressbooks in the next step. */
function PasswordAuthenticate({ state, update, next, back }: StageProps) {
  const { t } = useTranslation();
  const test = useTestConnect();

  const isContacts = state.service_type === "addressbook";

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
          ? t("onboarding.tooManyAttempts")
          : t("onboarding.testFailed");
      update({
        verdict: {
          ok: false,
          reachable: false,
          authenticated: false,
          idle: false,
          qresync: false,
          condstore: false,
          sync: false,
          missing: [],
          error: message,
        },
      });
    }
  }

  const hasCreds = state.login.trim().length > 0 && state.password.length > 0;
  // Email requires a green Test verdict; contacts proceed on creds (the
  // addressbook listing in the next step is the credential check).
  const canProceed = isContacts ? hasCreds : canContinue(state.verdict);

  return (
    <div className="space-y-5">
      <Alert>
        <KeyRound />
        <AlertTitle>{t("onboarding.appPwTitle")}</AlertTitle>
        <AlertDescription>
          {isContacts
            ? t("onboarding.appPwBodyContacts")
            : t("onboarding.appPwBodyEmail")}
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="login">{t("onboarding.emailLogin")}</Label>
        <Input
          id="login"
          placeholder="you@example.com"
          autoComplete="username"
          value={state.login}
          onChange={(e) => update({ login: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("onboarding.passwordLabel")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="off"
          placeholder="••••••••"
          value={state.password}
          onChange={(e) => update({ password: e.target.value })}
          onKeyDown={(e) =>
            e.key === "Enter" && hasCreds && !isContacts && runTest()
          }
        />
        {!isContacts && (
          <p className="text-xs text-muted-foreground">
            {t("onboarding.testingFree")}
          </p>
        )}
      </div>

      {!isContacts && (
        <Button
          variant="secondary"
          onClick={runTest}
          disabled={test.isPending || !hasCreds}
        >
          {test.isPending ? <Spinner /> : <ShieldCheck />}
          {t("onboarding.testConnection")}
        </Button>
      )}

      {!isContacts && state.verdict && <Verdict v={state.verdict} />}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back}>
          {t("onboarding.back")}
        </Button>
        <Button onClick={next} disabled={!canProceed}>
          {t("onboarding.continue")}
          <ArrowRight />
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
  const { t } = useTranslation();
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-2">
        <Check ok={v.reachable} label={t("onboarding.reachable")} />
        <Check ok={v.authenticated} label={t("onboarding.authenticated")} />
        <Check ok={v.idle} label={t("onboarding.idle")} />
        <Check ok={v.qresync} label={t("onboarding.qresync")} />
      </div>
      {v.ok ? (
        v.qresync ? (
          <Alert variant="success">
            <ShieldCheck />
            <AlertTitle>{t("onboarding.readyToWatch")}</AlertTitle>
            <AlertDescription>
              {t("onboarding.readyToWatchBody")}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="warning">
            <ShieldCheck />
            <AlertTitle>{t("onboarding.readyNewOnly")}</AlertTitle>
            <AlertDescription>
              {t("onboarding.readyNewOnlyBody")}
            </AlertDescription>
          </Alert>
        )
      ) : (
        <Alert variant="warning">
          <XCircle />
          <AlertTitle>{t("onboarding.cantWatch")}</AlertTitle>
          <AlertDescription>
            {v.error ??
              (v.missing.length
                ? t("onboarding.cantWatchMissing", {
                    missing: v.missing.join(", "),
                  })
                : t("onboarding.cantWatchGeneric"))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
