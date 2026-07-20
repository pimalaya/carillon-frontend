import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { guessImapHost, type StageProps } from '../types';

export function IdentifyStage({ state, update, next, back }: StageProps) {
  const emailValid = /.+@.+\..+/.test(state.login);

  function onLogin(login: string) {
    // Prefill the host from the domain only while the user hasn't set one.
    const patch: Partial<typeof state> = { login };
    if (!state.imap_host) patch.imap_host = guessImapHost(login);
    update(patch);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="login">Email address</Label>
        <Input
          id="login"
          type="email"
          placeholder="you@example.com"
          value={state.login}
          onChange={(e) => onLogin(e.target.value)}
          onBlur={() => !state.imap_host && update({ imap_host: guessImapHost(state.login) })}
        />
        <p className="text-xs text-muted-foreground">
          We guess the IMAP host from your domain — confirm or override it below.
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-[1fr_7rem]">
        <div className="space-y-1.5">
          <Label htmlFor="host">IMAP host</Label>
          <Input
            id="host"
            placeholder="imap.example.com"
            value={state.imap_host}
            onChange={(e) => update({ imap_host: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            type="number"
            value={state.imap_port}
            onChange={(e) => update({ imap_port: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="folder">Folder</Label>
          <Input
            id="folder"
            value={state.mailbox}
            onChange={(e) => update({ mailbox: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back}>
          Cancel
        </Button>
        <Button onClick={next} disabled={!emailValid || !state.imap_host}>
          Continue
        </Button>
      </div>
    </div>
  );
}
