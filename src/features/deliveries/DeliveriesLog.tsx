import { useMemo } from 'react';
import { CheckCircle2, Inbox, XCircle } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EventBadge } from '@/components/EventBadge';
import { EmptyState } from '@/components/EmptyState';
import { useDeliveries } from '@/api/deliveries';
import { useWatches } from '@/api/me';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DeliveriesLogProps {
  /** Filter to one watch (server-side). */
  watchId?: string;
  limit?: number;
  /** Show a column identifying which watch fired (global log). */
  showWatch?: boolean;
  /** Client-side filter to failed deliveries (the server has no such param). */
  onlyFailures?: boolean;
  emptyHint?: string;
}

export function DeliveriesLog({
  watchId,
  limit,
  showWatch,
  onlyFailures,
  emptyHint,
}: DeliveriesLogProps) {
  const { data, isLoading, isError } = useDeliveries({ watchId, limit });
  const { data: watches } = useWatches();

  const watchLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of watches ?? []) map.set(w.id, `${w.login} · ${w.mailbox}`);
    return map;
  }, [watches]);

  const rows = useMemo(
    () => (onlyFailures ? (data ?? []).filter((d) => !d.ok) : data),
    [data, onlyFailures],
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<XCircle />}
        title="Could not load deliveries"
        description="The stream will refill once the connection recovers."
      />
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        icon={<Inbox />}
        title="No deliveries yet"
        description={
          emptyHint ??
          'When a watched mailbox changes, the signed webhook fires and shows up here — UID only, never content.'
        }
      />
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Event</TableHead>
            {showWatch && <TableHead>Watch</TableHead>}
            <TableHead>UID</TableHead>
            <TableHead>Result</TableHead>
            <TableHead className="text-right">Attempts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((d, i) => (
            <TableRow key={`${d.account}-${d.uid}-${d.at}-${i}`}>
              <TableCell
                className="whitespace-nowrap text-muted-foreground"
                title={formatDateTime(d.at)}
              >
                {formatRelativeTime(d.at)}
              </TableCell>
              <TableCell>
                <EventBadge event={d.event} />
              </TableCell>
              {showWatch && (
                <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                  {watchLabel.get(d.account) ?? d.account}
                </TableCell>
              )}
              <TableCell className="font-mono text-xs">{d.uid}</TableCell>
              <TableCell>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-sm',
                    d.ok ? 'text-success' : 'text-destructive',
                  )}
                  title={d.error ?? undefined}
                >
                  {d.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                  {d.status ?? '—'}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {d.attempts}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
