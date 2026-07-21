import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, KeyRound, LogOut, Mail, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CopyButton } from '@/components/CopyButton';
import { useMe } from '@/api/me';
import { useSignout } from '@/api/onboarding';
import { useAuth } from '@/lib/auth';

function maskLink(link: string): string {
  if (link.length <= 12) return '••••••';
  return `${link.slice(0, 6)}…${link.slice(-4)}`;
}

export function SettingsPanel() {
  const navigate = useNavigate();
  const { active, renameAccount, removeAccount, clearAll } = useAuth();
  const { data: me } = useMe();
  const signout = useSignout();
  const [label, setLabel] = useState(active?.label ?? '');

  if (!active) return null;

  function doSignout(everywhere: boolean) {
    // Best-effort server-side revoke, then drop the link locally.
    signout.mutate(undefined, {
      onSettled: () => {
        if (everywhere) clearAll();
        else if (active) removeAccount(active.id);
        navigate('/');
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Account label */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account name</CardTitle>
          <CardDescription>A local label for the account switcher.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-md items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="acct-label">Label</Label>
              <Input
                id="acct-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => {
                renameAccount(active.id, label.trim() || active.label);
                toast.success('Renamed');
              }}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Member mailboxes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member mailboxes</CardTitle>
          <CardDescription>
            Every mailbox authenticated into this login-less account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(me?.mailboxes ?? []).map((m) => (
            <div key={m.mailbox_key} className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              {m.login}
              <span className="text-xs text-muted-foreground">· {m.imap_host}</span>
            </div>
          ))}
          {(me?.mailboxes?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No mailboxes yet.</p>
          )}
          <Separator className="my-3" />
          <Button variant="outline" size="sm" onClick={() => navigate('/onboarding')}>
            Add mailbox
          </Button>
        </CardContent>
      </Card>

      {/* Capability link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-muted-foreground" />
            Capability link
          </CardTitle>
          <CardDescription>
            This link <em>is</em> your login. Anyone with it controls the account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex h-9 flex-1 items-center rounded-md border bg-muted/40 px-3 font-mono text-sm">
              {maskLink(active.link)}
            </code>
            <CopyButton value={active.link} label="Link" variant="outline" />
          </div>
          <Alert variant="warning">
            <ShieldAlert />
            <AlertTitle>Keep it secret</AlertTitle>
            <AlertDescription>
              Store it in a password manager. Lost it? Re-authenticate any member mailbox to
              re-mint the link — no email involved.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Docs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-muted-foreground" />
            Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="https://carillon.pimalaya.org/docs/verify" target="_blank" rel="noreferrer">
              Verify a signature
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="https://carillon.pimalaya.org/docs/self-host" target="_blank" rel="noreferrer">
              Self-host guide
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sign out</CardTitle>
          <CardDescription>Revokes the link server-side and removes it from this browser.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={signout.isPending} onClick={() => doSignout(false)}>
            <LogOut />
            Sign out of this account
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={signout.isPending}
            onClick={() => doSignout(true)}
          >
            Sign out everywhere
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
