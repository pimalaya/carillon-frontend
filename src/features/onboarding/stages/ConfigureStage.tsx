import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Rocket, Send, Webhook, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/Spinner';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAuthenticate, useListMailboxes, useTestWebhook } from '@/api/onboarding';
import { useCreateWatch } from '@/api/watches';
import type { WebhookTestResult } from '@/api/schemas';
import { isValidNotifyUrl, randomSecret, randomWatchId, type StageProps } from '../types';

export function ConfigureStage({ state, update, next, back }: StageProps) {
  const { hasAccount, addAccount } = useAuth();
  const authenticate = useAuthenticate();
  const createWatch = useCreateWatch();
  const listMailboxes = useListMailboxes();
  const testWebhook = useTestWebhook();
  const [webhookResult, setWebhookResult] = useState<WebhookTestResult | null>(null);

  const isOauth = state.auth?.kind.startsWith('oauth') ?? false;
  const urlValid = isValidNotifyUrl(state.notify_url);
  const busy = authenticate.isPending || createWatch.isPending;

  // On entry: make sure a signing secret exists (so the webhook test and the
  // eventual watch share it), then fetch the folder list for the picker.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!state.hmac_secret) update({ hmac_secret: randomSecret() });
    listMailboxes.mutate(
      {
        imap_host: state.imap_host,
        imap_port: state.imap_port,
        login: state.login,
        ...(isOauth ? { link: state.capabilityLink } : { password: state.password }),
      },
      {
        onSuccess: (res) => {
          const names = res.mailboxes.map((m) => m.name);
          if (names.length && !names.includes(state.mailbox)) update({ mailbox: names[0] });
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mailboxes = listMailboxes.data?.mailboxes ?? [];

  async function runWebhookTest() {
    if (!urlValid || !state.hmac_secret) return;
    setWebhookResult(null);
    try {
      const result = await testWebhook.mutateAsync({
        notify_url: state.notify_url,
        hmac_secret: state.hmac_secret,
      });
      setWebhookResult(result);
    } catch (err) {
      setWebhookResult({
        ok: false,
        status: null,
        error:
          err instanceof ApiError && err.isRateLimited
            ? 'Too many attempts — wait a moment before trying again.'
            : 'Could not reach the endpoint.',
      });
    }
  }

  async function activate() {
    try {
      // Password flow: auth here mints (or joins) the account and returns the
      // capability link. OAuth flow: that already happened on the sign-in step.
      let accountId = state.account_id;
      let link = state.capabilityLink;
      if (!isOauth) {
        const auth = await authenticate.mutateAsync({
          imap_host: state.imap_host,
          imap_port: state.imap_port,
          login: state.login,
          password: state.password,
          mailbox: state.mailbox,
          associate: hasAccount,
        });
        addAccount({ label: state.login, link: auth.link });
        accountId = auth.account_id;
        link = auth.link;
      }

      // The client owns the watch id and the HMAC secret (generated on entry),
      // so the next step can show the secret once and the webhook test signed
      // with the very secret the watch will use.
      const secret = state.hmac_secret ?? randomSecret();
      const id = randomWatchId();
      await createWatch.mutateAsync({
        id,
        imap_host: state.imap_host,
        imap_port: state.imap_port,
        login: state.login,
        ...(isOauth ? {} : { password: state.password }),
        mailbox: state.mailbox,
        notify_url: state.notify_url,
        hmac_secret: secret,
        account_id: accountId,
        active: true,
      });

      update({ capabilityLink: link, account_id: accountId, watchId: id, hmac_secret: secret });
      next();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error('This mailbox is already being watched — manage it from your watches.');
      } else {
        toast.error('Could not activate the watch. Please try again.');
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="mailbox">Folder to watch</Label>
        {listMailboxes.isError ? (
          <Input
            id="mailbox"
            value={state.mailbox}
            onChange={(e) => update({ mailbox: e.target.value })}
            placeholder="INBOX"
          />
        ) : (
          <Select
            id="mailbox"
            value={state.mailbox}
            disabled={listMailboxes.isPending}
            onChange={(e) => update({ mailbox: e.target.value })}
          >
            {/* Keep the current value selectable even before the list loads. */}
            {mailboxes.length === 0 && <option value={state.mailbox}>{state.mailbox}</option>}
            {mailboxes.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
                {m.role && m.role !== 'inbox' ? ` · ${m.role}` : ''}
              </option>
            ))}
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          {listMailboxes.isPending
            ? 'Loading your folders…'
            : listMailboxes.isError
              ? 'Couldn’t list folders — type the folder name to watch.'
              : 'Carillon watches one folder. The inbox is the usual choice.'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notify">Notify URL</Label>
        <div className="flex gap-2">
          <Input
            id="notify"
            type="url"
            placeholder="https://hooks.example.com/carillon"
            value={state.notify_url}
            onChange={(e) => {
              update({ notify_url: e.target.value });
              setWebhookResult(null);
            }}
          />
          <Button
            variant="secondary"
            onClick={runWebhookTest}
            disabled={!urlValid || testWebhook.isPending}
          >
            {testWebhook.isPending ? <Spinner /> : <Send />}
            Test
          </Button>
        </div>
        {state.notify_url && !urlValid && (
          <p className="text-xs text-destructive">
            Must be https:// (or http:// on localhost for a local sink).
          </p>
        )}
        {webhookResult &&
          (webhookResult.ok ? (
            <p className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="size-3.5" />
              Endpoint acknowledged{webhookResult.status ? ` (HTTP ${webhookResult.status})` : ''}.
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <XCircle className="size-3.5" />
              {webhookResult.error ?? 'Endpoint did not acknowledge.'}
            </p>
          ))}
      </div>

      <Alert>
        <Webhook />
        <AlertTitle>Signed, content-free webhooks</AlertTitle>
        <AlertDescription>
          Each change POSTs <code>{'{account, event, uid}'}</code> — never message content —
          signed with HMAC-SHA256. You’ll get the signing secret on the next step.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back} disabled={busy}>
          Back
        </Button>
        <Button onClick={activate} disabled={!urlValid || busy}>
          {busy ? <Spinner /> : <Rocket />}
          Activate watch
        </Button>
      </div>
    </div>
  );
}
