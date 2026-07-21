import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, LayoutDashboard, Radio, ShieldCheck, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/Spinner';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  runOauthPopup,
  useAuthenticate,
  useOauthStart,
  useTestConnect,
  type OauthResult,
} from '@/api/onboarding';
import type { TestVerdict } from '@/api/schemas';
import type { StageProps } from '../types';

/** A friendly provider name from the IMAP host, for the OAuth button. */
function providerLabel(host: string): string {
  const h = host.toLowerCase();
  if (h.includes('gmail') || h.includes('google')) return 'Google';
  if (h.includes('outlook') || h.includes('office') || h.includes('microsoft')) return 'Microsoft';
  if (h.includes('fastmail')) return 'Fastmail';
  return 'your provider';
}

/** Whether the wizard may advance: watchable AND not already watched. */
function canContinue(v?: TestVerdict): boolean {
  return !!v?.ok && !v.already_watched;
}

/** Synthesises a {@link TestVerdict} from an OAuth callback result, so the
 *  OAuth path shows the same connection panel as the password probe. */
function verdictFromOauth(r: OauthResult): TestVerdict {
  const missing = r.missing ?? [];
  return {
    ok: r.watchable ?? false,
    reachable: true,
    authenticated: true,
    idle: !missing.includes('IDLE'),
    qresync: r.qresync ?? false,
    condstore: r.qresync ?? false,
    missing,
    already_watched: r.already_watched ?? false,
    error: null,
  };
}

export function AuthenticateStage(props: StageProps) {
  // OAuth choices sign in with the provider; everything else probes over IMAP.
  if (props.state.auth?.kind.startsWith('oauth')) {
    return <OauthAuthenticate {...props} />;
  }
  return <PasswordAuthenticate {...props} />;
}

/** OAuth sign-in: a popup to the provider; the server keeps the refresh token
 *  and mints the capability link on the callback. No password is stored. */
function OauthAuthenticate({ state, update, next, back }: StageProps) {
  const { hasAccount, addAccount } = useAuth();
  const navigate = useNavigate();
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
        addAccount({ label: state.login, link: result.link });
        update({
          capabilityLink: result.link,
          account_id: result.account_id,
          verdict: verdictFromOauth(result),
        });
      } else {
        setError(result.error ?? 'Sign-in failed.');
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.isRateLimited
          ? 'Too many attempts — wait a moment before trying again.'
          : 'Could not start sign-in. Please try again.',
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
          A popup takes you to {provider} to authorize mail access. Carillon keeps a refresh token
          — never your password.
        </AlertDescription>
      </Alert>

      <Button onClick={signIn} disabled={busy}>
        {busy ? <Spinner /> : <ShieldCheck />}
        {signedIn ? `Re-authorize with ${provider}` : `Sign in with ${provider}`}
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
        {/* Already watched = you're signed in (the link is minted); recovering
            access from a new browser must not dead-end — go to the dashboard. */}
        {state.verdict?.already_watched && state.capabilityLink ? (
          <Button onClick={() => navigate('/')}>
            <LayoutDashboard />
            Go to my dashboard
          </Button>
        ) : (
          <Button onClick={next} disabled={!canContinue(state.verdict)}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

function PasswordAuthenticate({ state, update, next, back }: StageProps) {
  const { hasAccount, addAccount } = useAuth();
  const navigate = useNavigate();
  const test = useTestConnect();
  const authenticate = useAuthenticate();
  const [recovering, setRecovering] = useState(false);

  // Recovery from a new browser: the mailbox is already watched, so instead of
  // adding a second watch, prove control via /auth to re-mint the capability
  // link and drop the user on their dashboard.
  async function goToDashboard() {
    setRecovering(true);
    try {
      const auth = await authenticate.mutateAsync({
        imap_host: state.imap_host,
        imap_port: state.imap_port,
        login: state.login,
        password: state.password,
        mailbox: state.mailbox,
        associate: hasAccount,
      });
      addAccount({ label: state.login, link: auth.link });
      navigate('/');
    } catch {
      setRecovering(false);
    }
  }

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
          ? 'Too many attempts — wait a moment before trying again.'
          : 'The connection test failed. Check the settings and try again.';
      update({
        verdict: {
          ok: false,
          reachable: false,
          authenticated: false,
          idle: false,
          qresync: false,
          condstore: false,
          missing: [],
          already_watched: false,
          error: message,
        },
      });
    }
  }

  const canTest = state.login.trim().length > 0 && state.password.length > 0;

  return (
    <div className="space-y-5">
      <Alert>
        <KeyRound />
        <AlertTitle>Use an app password where possible</AlertTitle>
        <AlertDescription>
          The password is sent to the server only for this read-only probe; it’s encrypted at
          rest when you activate.
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
          onKeyDown={(e) => e.key === 'Enter' && canTest && runTest()}
        />
        <p className="text-xs text-muted-foreground">
          Testing is free and repeatable — nothing is charged.
        </p>
      </div>

      <Button variant="secondary" onClick={runTest} disabled={test.isPending || !canTest}>
        {test.isPending ? <Spinner /> : <ShieldCheck />}
        Test connection
      </Button>

      {state.verdict && <Verdict v={state.verdict} />}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back}>
          Back
        </Button>
        {/* Already watched = you already own this account; recover the link and
            go to the dashboard rather than adding a second watch. */}
        {state.verdict?.already_watched ? (
          <Button onClick={goToDashboard} disabled={recovering}>
            {recovering ? <Spinner /> : <LayoutDashboard />}
            Go to my dashboard
          </Button>
        ) : (
          <Button onClick={next} disabled={!canContinue(state.verdict)}>
            Continue
          </Button>
        )}
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
      <span className={cn(ok ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
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
      {v.already_watched ? (
        <Alert variant="warning">
          <Radio />
          <AlertTitle>You already watch this mailbox</AlertTitle>
          <AlertDescription>
            No need to add it again — head to your dashboard to manage the existing watch.
          </AlertDescription>
        </Alert>
      ) : v.ok ? (
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
              This provider doesn’t support QRESYNC, so only new messages will be watched — flag
              changes and deletions won’t be tracked.
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
                ? `The server is missing: ${v.missing.join(', ')}.`
                : 'One or more checks failed.')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
