import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, PlayCircle, Radio } from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { WatchActionsMenu } from "./WatchActionsMenu";
import { useMe } from "@/api/me";
import { useActivateWatch } from "@/api/watches";
import { formatDate, formatRelativeTime } from "@/lib/format";
import type { AccountMailbox } from "@/api/schemas";

/** Spend one credit to give a service a month (cumulative). Its own hook per
 *  row so the pending state is per-button. */
function ActivateButton({
  watchId,
  watching,
}: {
  watchId: string;
  watching: boolean;
}) {
  const activate = useActivateWatch();
  return (
    <Button
      size="sm"
      variant={watching ? "outline" : "default"}
      disabled={activate.isPending}
      onClick={(e) => {
        e.stopPropagation();
        activate.mutate(watchId, {
          onSuccess: (r) =>
            toast.success(
              `Watching until ${formatDate(r.watching_until)} · ${r.credits} credits left`,
            ),
          onError: (err) =>
            toast.error(
              err.message.toLowerCase().includes("credit")
                ? "Out of credits — buy a pack first"
                : "Could not activate",
            ),
        });
      }}
    >
      {activate.isPending ? (
        <Loader2 className="animate-spin" />
      ) : watching ? (
        "+1 month"
      ) : (
        <>
          <PlayCircle />
          Activate
        </>
      )}
    </Button>
  );
}

/** The "Not watching" state — a service that exists but has no paid month, so
 *  the supervisor isn't running it. Distinct from a paused watch. */
function NotWatching() {
  return (
    <div className="space-y-0.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="size-2 rounded-full bg-muted-foreground" />
        Not watching
      </span>
      <div className="text-xs text-muted-foreground">activate to start</div>
    </div>
  );
}

export function WatchesList() {
  const navigate = useNavigate();
  const { data: me, isLoading } = useMe();
  const [filter, setFilter] = useState("all");

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const watches = me?.watches ?? [];
  const memberships = me?.mailboxes ?? [];
  const metered = me?.metered ?? true;
  // Per-watch activation state (watching / paid-through), keyed by watch id.
  const svcByWatch = new Map<string, AccountMailbox>();
  for (const m of me?.balance.mailboxes ?? [])
    if (m.watch_id) svcByWatch.set(m.watch_id, m);

  if (watches.length === 0) {
    return (
      <EmptyState
        icon={<Radio />}
        title="No services yet"
        description="Add a service to watch a folder on one of your accounts. Carillon holds IMAP IDLE and fires a signed webhook the instant it changes."
        action={
          <Button onClick={() => navigate("/services/new")}>Add service</Button>
        }
      />
    );
  }

  const shown =
    filter === "all"
      ? watches
      : watches.filter((w) => w.login.toLowerCase() === filter.toLowerCase());

  return (
    <div className="space-y-3">
      {/* Filter the shared cross-account view down to one PIM account. */}
      {memberships.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Account</span>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 max-w-xs text-xs"
          >
            <option value="all">All accounts</option>
            {memberships.map((m) => (
              <option key={m.mailbox_key} value={m.login}>
                {m.login}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account · folder</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last event</TableHead>
              <TableHead className="w-24" />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((watch) => {
              const svc = svcByWatch.get(watch.id);
              const watching = svc?.watching ?? false;
              return (
                <TableRow
                  key={watch.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/watches/${watch.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{watch.login}</div>
                    <div className="text-xs text-muted-foreground">
                      {watch.mailbox}
                    </div>
                  </TableCell>
                  <TableCell>
                    {metered && !watching ? (
                      <NotWatching />
                    ) : (
                      <div className="space-y-0.5">
                        <StatusBadge
                          active={watch.active}
                          liveState={watch.liveState}
                        />
                        {metered && svc?.watching_until && (
                          <div className="text-xs text-muted-foreground">
                            until {formatDate(svc.watching_until)}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(watch.lastEventAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {metered && (
                      <ActivateButton watchId={watch.id} watching={watching} />
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <WatchActionsMenu watch={watch} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {shown.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          No services on this account yet.
        </p>
      )}
    </div>
  );
}
