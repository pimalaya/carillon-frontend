import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Radio } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { ActivateServiceButton } from "@/features/billing/ActivateServiceButton";
import { DeleteServiceButton } from "./DeleteServiceButton";
import { useMe } from "@/api/me";
import { usePauseWatch, useResumeWatch, useSetAutoRenew } from "@/api/watches";
import { formatDate } from "@/lib/format";
import type { AccountMailbox, Watch } from "@/api/schemas";

/** The "Not watching" state — a service that exists but has no paid month, so
 *  the supervisor isn't running it. Distinct from a paused watch. */
function NotWatching() {
  const { t } = useTranslation();
  return (
    <div className="space-y-0.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="size-2 rounded-full bg-muted-foreground" />
        {t("watches.notWatching")}
      </span>
      <div className="text-xs text-muted-foreground">
        {t("watches.activateToStart")}
      </div>
    </div>
  );
}

const Dash = () => <span className="text-xs text-muted-foreground">—</span>;

/** One service row: status, its two switches (Active = deliver events;
 *  Auto-renew = keep paying at expiry), and activate/extend + delete. */
function WatchRow({
  watch,
  svc,
  metered,
}: {
  watch: Watch;
  svc?: AccountMailbox;
  metered: boolean;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pause = usePauseWatch();
  const resume = useResumeWatch();
  const setRenew = useSetAutoRenew();

  const watching = svc?.watching ?? false;
  const autoRenew = svc?.auto_renew ?? false;
  // Pausing is meaningful while the service can actually run: a paid month
  // (metered) or self-host (unmetered). A stopped, unpaid service can't deliver.
  const runnable = !metered || watching;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => navigate(`/watches/${watch.id}`)}
    >
      <TableCell>
        <div className="font-medium">{watch.login}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{watch.mailbox}</span>
          {watch.source_kind === "carddav" && (
            <span className="rounded bg-secondary px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
              {t("watches.kindAddressbook")}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell>
        {metered && !watching ? (
          <NotWatching />
        ) : (
          <div className="space-y-0.5">
            <StatusBadge active={watch.active} liveState={watch.liveState} />
            {metered && svc?.watching_until && (
              <div className="text-xs text-muted-foreground">
                {t("watches.until", { date: formatDate(svc.watching_until) })}
              </div>
            )}
          </div>
        )}
      </TableCell>

      {/* Active = paused/resumed: stop or resume webhook deliveries. */}
      <TableCell onClick={stop}>
        {runnable ? (
          <Switch
            aria-label={t("watches.activeAria")}
            checked={watch.active}
            disabled={pause.isPending || resume.isPending}
            onCheckedChange={(on) =>
              on
                ? resume.mutate(watch.id, {
                    onSuccess: () => toast.success(t("watches.resumed")),
                  })
                : pause.mutate(watch.id, {
                    onSuccess: () => toast.success(t("watches.paused")),
                  })
            }
          />
        ) : (
          <Dash />
        )}
      </TableCell>

      {metered && (
        <TableCell onClick={stop}>
          {watching ? (
            <Switch
              aria-label={t("watches.autoRenewAria")}
              checked={autoRenew}
              disabled={setRenew.isPending}
              onCheckedChange={(enabled) =>
                setRenew.mutate(
                  { id: watch.id, enabled },
                  {
                    onSuccess: () =>
                      toast.success(
                        enabled
                          ? t("watches.autoRenewOn")
                          : t("watches.autoRenewOff"),
                      ),
                  },
                )
              }
            />
          ) : (
            <Dash />
          )}
        </TableCell>
      )}

      {metered && (
        <TableCell className="text-right" onClick={stop}>
          <ActivateServiceButton watchId={watch.id} watching={watching} />
        </TableCell>
      )}

      <TableCell className="text-right" onClick={stop}>
        <DeleteServiceButton watch={watch} />
      </TableCell>
    </TableRow>
  );
}

export function WatchesList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
        title={t("watches.emptyTitle")}
        description={t("watches.emptyDescription")}
        action={
          <Button onClick={() => navigate("/services/new")}>
            {t("dashboard.addService")}
          </Button>
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
          <span className="text-xs text-muted-foreground">
            {t("watches.account")}
          </span>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 max-w-xs text-xs"
          >
            <option value="all">{t("watches.allAccounts")}</option>
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
              <TableHead>{t("watches.colTarget")}</TableHead>
              <TableHead>{t("watches.colStatus")}</TableHead>
              <TableHead>{t("watches.colActive")}</TableHead>
              {metered && <TableHead>{t("watches.colAutoRenew")}</TableHead>}
              {metered && <TableHead className="w-24" />}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((watch) => (
              <WatchRow
                key={watch.id}
                watch={watch}
                svc={svcByWatch.get(watch.id)}
                metered={metered}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {shown.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          {t("watches.noneOnAccount")}
        </p>
      )}
    </div>
  );
}
