import { CheckCircle2, KeyRound, ShieldCheck, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/Spinner';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import { useTestConnect } from '@/api/onboarding';
import type { TestVerdict } from '@/api/schemas';
import type { StageProps } from '../types';

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
        <Alert variant="success">
          <ShieldCheck />
          <AlertTitle>Ready to watch</AlertTitle>
          <AlertDescription>
            Reachable, authenticated, and IDLE + QRESYNC all check out.
          </AlertDescription>
        </Alert>
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

export function AuthenticateStage({ state, update, next, back }: StageProps) {
  const test = useTestConnect();

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
          error: message,
        },
      });
    }
  }

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
        <Label htmlFor="password">Password or app password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="off"
          placeholder="••••••••"
          value={state.password}
          onChange={(e) => update({ password: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && runTest()}
        />
        <p className="text-xs text-muted-foreground">
          Testing is free and repeatable — no credit is spent.
        </p>
      </div>

      <Button variant="secondary" onClick={runTest} disabled={test.isPending}>
        {test.isPending ? <Spinner /> : <ShieldCheck />}
        Test connection
      </Button>

      {state.verdict && <Verdict v={state.verdict} />}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back}>
          Back
        </Button>
        <Button onClick={next} disabled={!state.verdict?.ok}>
          Continue
        </Button>
      </div>
    </div>
  );
}
