import { Rocket, Webhook } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/lib/auth';
import { useAuthenticate } from '@/api/onboarding';
import { useCreateWatch } from '@/api/watches';
import {
  isValidNotifyUrl,
  randomSecret,
  randomWatchId,
  type StageProps,
} from '../types';

export function ConfigureStage({ state, update, next, back }: StageProps) {
  const { hasAccount, addAccount } = useAuth();
  const authenticate = useAuthenticate();
  const createWatch = useCreateWatch();

  const urlValid = isValidNotifyUrl(state.notify_url);
  const busy = authenticate.isPending || createWatch.isPending;

  async function activate() {
    try {
      // Auth mints (or joins) a login-less account and returns the capability
      // link + billing account id. Store the link and make it active. (D§5)
      const auth = await authenticate.mutateAsync({
        imap_host: state.imap_host,
        imap_port: state.imap_port,
        login: state.login,
        password: state.password,
        mailbox: state.mailbox,
        associate: hasAccount,
      });
      addAccount({ label: state.login, link: auth.link });

      // The client owns both the watch id and the HMAC secret (the server never
      // regenerates the secret), so we can show it once on the next step.
      const secret = randomSecret();
      const id = randomWatchId();
      await createWatch.mutateAsync({
        id,
        imap_host: state.imap_host,
        imap_port: state.imap_port,
        login: state.login,
        password: state.password,
        mailbox: state.mailbox,
        notify_url: state.notify_url,
        hmac_secret: secret,
        account_id: auth.account_id,
        active: true,
      });

      update({
        capabilityLink: auth.link,
        account_id: auth.account_id,
        watchId: id,
        hmac_secret: secret,
      });
      next();
    } catch {
      toast.error('Could not activate the watch. Please try again.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="notify">Notify URL</Label>
        <Input
          id="notify"
          type="url"
          placeholder="https://hooks.example.com/carillon"
          value={state.notify_url}
          onChange={(e) => update({ notify_url: e.target.value })}
        />
        {state.notify_url && !urlValid && (
          <p className="text-xs text-destructive">
            Must be https:// (or http:// on localhost for a local sink).
          </p>
        )}
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
