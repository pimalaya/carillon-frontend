import { Link } from 'react-router-dom';
import { AlertTriangle, Gift, Wallet } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBalance, useWatches } from '@/api/me';
import { formatDuration, formatRelativeTime, formatRunway } from '@/lib/format';

const TRIAL_GRANT = 7 * 86_400; // baseline for the trial progress bar
const LOW_RUNWAY_SECONDS = 3 * 86_400;

export function BalanceCard() {
  const { data: balance, isLoading } = useBalance();
  const { data: watches } = useWatches();

  if (isLoading || !balance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Watch-rate = active watches (each debits 1 s/s). The AccountView doesn't
  // carry it, so derive from the watch list.
  const rate = (watches ?? []).filter((w) => w.active).length;
  const total = balance.total_available_secs;
  const runwaySeconds = rate > 0 ? total / rate : Infinity;
  const lowRunway = rate > 0 && runwaySeconds < LOW_RUNWAY_SECONDS;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Balance</CardTitle>
            <CardDescription>
              Trial time is spent first, then the paid pool. Only the pool is refillable.
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link to="/billing">Add credits</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {lowRunway && (
          <Alert variant="warning">
            <AlertTriangle />
            <AlertTitle>Low balance</AlertTitle>
            <AlertDescription>
              About {formatRunway(total, rate)} of runway left at the current watch-rate. Top up
              to avoid a silent outage.
            </AlertDescription>
          </Alert>
        )}

        {/* Paid pool — the refillable, account-shared counter. */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="size-4 text-muted-foreground" />
              Paid pool
            </span>
            <span className="tabular-nums text-sm">
              {formatDuration(balance.pool_expired ? 0 : balance.paid_secs)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {balance.pool_expired
              ? 'Pool expired'
              : balance.paid_expires
                ? `Expires ${formatRelativeTime(balance.paid_expires)}`
                : 'No expiry'}
            {rate > 0 && ` · runway ${formatRunway(total, rate)}`}
          </p>
        </div>

        {/* Per-mailbox trials — non-refillable, drained first. */}
        <div className="space-y-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Gift className="size-4 text-muted-foreground" />
            Free trials
          </span>
          {balance.mailboxes.length === 0 && (
            <p className="text-xs text-muted-foreground">No trial mailboxes.</p>
          )}
          {balance.mailboxes.map((m) => {
            const pct = Math.min(100, Math.round((m.trial_secs / TRIAL_GRANT) * 100));
            return (
              <div key={m.mailbox_key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="truncate text-muted-foreground">{m.mailbox_key}</span>
                  <span className="tabular-nums">{formatDuration(m.trial_secs)}</span>
                </div>
                <Progress
                  value={pct}
                  indicatorClassName="bg-success"
                  aria-label={`${m.mailbox_key} trial remaining`}
                />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Trials are granted once per mailbox and can’t be refilled.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
