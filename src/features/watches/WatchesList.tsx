import { useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { WatchActionsMenu } from './WatchActionsMenu';
import { useWatches } from '@/api/me';
import { formatRelativeTime } from '@/lib/format';

export function WatchesList() {
  const navigate = useNavigate();
  const { data, isLoading } = useWatches();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<Radio />}
        title="No watches yet"
        description="Add a mailbox to start watching a folder. Carillon holds IMAP IDLE and fires a signed webhook the instant it changes."
        action={<Button onClick={() => navigate('/onboarding')}>Add mailbox</Button>}
      />
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mailbox · folder</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last event</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((watch) => (
            <TableRow
              key={watch.id}
              className="cursor-pointer"
              onClick={() => navigate(`/watches/${watch.id}`)}
            >
              <TableCell>
                <div className="font-medium">{watch.login}</div>
                <div className="text-xs text-muted-foreground">{watch.mailbox}</div>
              </TableCell>
              <TableCell>
                <StatusBadge active={watch.active} liveState={watch.liveState} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatRelativeTime(watch.lastEventAt)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <WatchActionsMenu watch={watch} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
