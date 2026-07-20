import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Pause, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { CopyButton } from '@/components/CopyButton';
import { EmptyState } from '@/components/EmptyState';
import { WatchActionsMenu } from './WatchActionsMenu';
import { DeliveriesLog } from '@/features/deliveries/DeliveriesLog';
import { useWatch } from '@/api/me';
import { usePauseWatch, useResumeWatch, useRotateSecret } from '@/api/watches';
import { formatRelativeTime } from '@/lib/format';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] items-center gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function WatchDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data: watch, isLoading, isError } = useWatch(id);
  const pause = usePauseWatch();
  const resume = useResumeWatch();
  const rotate = useRotateSecret();
  // The server only returns a secret at rotation; reveal it once here.
  const [revealed, setRevealed] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !watch) {
    return (
      <EmptyState
        icon={<AlertTriangle />}
        title="Watch not found"
        description="It may have been deleted."
        action={<Button onClick={() => navigate('/')}>Back to dashboard</Button>}
      />
    );
  }

  const paused = !watch.active;

  function doRotate() {
    rotate.mutate(id, {
      onSuccess: (result) => {
        setRevealed(result.secret);
        toast.success('Secret rotated (previous stays valid during the overlap)');
      },
      onError: () => toast.error('Could not rotate the secret'),
    });
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/')}>
        <ArrowLeft />
        Dashboard
      </Button>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {watch.login}
            <StatusBadge active={watch.active} liveState={watch.liveState} />
          </span>
        }
        description={`Watching ${watch.mailbox}`}
        action={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                paused
                  ? resume.mutate(watch.id, { onSuccess: () => toast.success('Resumed') })
                  : pause.mutate(watch.id, { onSuccess: () => toast.success('Paused') })
              }
            >
              {paused ? <Play /> : <Pause />}
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <WatchActionsMenu watch={watch} onDeleted={() => navigate('/')} />
          </>
        }
      />

      {watch.liveState === 'error' && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Connection error</AlertTitle>
          <AlertDescription>
            {watch.liveDetail ?? 'The last connection attempt failed; Carillon is retrying.'}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <Field label="Login">
            <span className="text-sm">{watch.login}</span>
          </Field>
          <Field label="Folder">
            <span className="text-sm">{watch.mailbox}</span>
          </Field>
          <Field label="IMAP host">
            <span className="font-mono text-sm">
              {watch.imap_host}:{watch.imap_port}
            </span>
          </Field>
          <Field label="Notify URL">
            <div className="flex items-center gap-2">
              <code className="truncate font-mono text-sm">{watch.notify_url}</code>
              <CopyButton value={watch.notify_url} label="URL" />
            </div>
          </Field>
          <Field label="Signing secret">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Hidden — shown only when rotated
              </span>
              <Button variant="outline" size="sm" onClick={doRotate} disabled={rotate.isPending}>
                <RefreshCw className={rotate.isPending ? 'animate-spin' : undefined} />
                Rotate
              </Button>
            </div>
          </Field>
          <Field label="Last event">
            <span className="text-sm">{formatRelativeTime(watch.lastEventAt)}</span>
          </Field>
          <Field label="Watch id">
            <code className="font-mono text-xs text-muted-foreground">{watch.id}</code>
          </Field>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Delivery log</h2>
        <DeliveriesLog watchId={watch.id} limit={100} />
      </div>

      <Dialog open={revealed !== null} onOpenChange={(open) => !open && setRevealed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New signing secret</DialogTitle>
            <DialogDescription>
              Copy it now — it won’t be shown again. The previous secret keeps signing during the
              overlap window so receivers can migrate.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
              {revealed}
            </code>
            {revealed && <CopyButton value={revealed} label="Secret" variant="outline" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
