import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, PlayCircle, Radio } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/api/me";
import { useActivateWatch, useSetAutoRenew } from "@/api/watches";
import { formatDate } from "@/lib/format";
import type { AccountMailbox } from "@/api/schemas";

/** One service row: its watch state + Activate / auto-renew controls. */
function ServiceRow({ m }: { m: AccountMailbox }) {
  const activate = useActivateWatch();
  const autoRenew = useSetAutoRenew();
  const watchId = m.watch_id;

  function onActivate() {
    if (!watchId) return;
    activate.mutate(watchId, {
      onSuccess: (r) =>
        toast.success(
          `Watching until ${formatDate(r.watching_until)} · ${r.credits} credits left`,
        ),
      onError: (e) =>
        toast.error(
          e.message.toLowerCase().includes("no credits")
            ? "Out of credits — buy a pack first"
            : "Could not activate",
        ),
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          {m.mailbox_key}
          {m.mailbox && (
            <span className="text-muted-foreground">
              {" "}
              · Watch IMAP {m.mailbox}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {!watchId ? (
            "no service yet"
          ) : m.watching ? (
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="size-3.5" />
              watching until {formatDate(m.watching_until)}
            </span>
          ) : m.watching_until ? (
            "expired — activate to resume"
          ) : (
            "not watching — activate to start"
          )}
        </div>
      </div>

      {watchId && (
        <div className="flex shrink-0 items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="size-3.5 accent-primary"
              checked={m.auto_renew}
              disabled={autoRenew.isPending}
              onChange={(e) =>
                autoRenew.mutate({ id: watchId, enabled: e.target.checked })
              }
            />
            auto-renew
          </label>
          <Button
            size="sm"
            variant={m.watching ? "outline" : "default"}
            disabled={activate.isPending}
            onClick={onActivate}
          >
            {activate.isPending ? (
              <Loader2 className="animate-spin" />
            ) : m.watching ? (
              "+1 month"
            ) : (
              <>
                <PlayCircle />
                Activate
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

/** The account's services (billed units) and their activation state. Hidden
 *  when the server is unmetered (self-host). */
export function ServicesCard() {
  const navigate = useNavigate();
  const { data: me, isLoading } = useMe();

  if (isLoading || !me) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (!me.metered) return null;

  const services = me.balance.mailboxes;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Services</CardTitle>
        <CardDescription>
          Each watched folder is a service. Spend 1 credit to watch it for a
          month.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {services.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              No services yet — add one to start watching a folder.
            </p>
            <Button size="sm" onClick={() => navigate("/services/new")}>
              <Radio />
              Add service
            </Button>
          </div>
        ) : (
          services.map((m) => (
            <ServiceRow key={m.watch_id ?? m.mailbox_key} m={m} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
