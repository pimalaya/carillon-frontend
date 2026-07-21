import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Gift, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMe } from "@/api/me";
import { useActivateWatch, useSetAutoRenew } from "@/api/watches";
import { formatDate } from "@/lib/format";
import type { StageProps } from "../types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate font-medium">{value}</span>
    </div>
  );
}

/** "Add service" final step: the service now exists, but (when metered) it isn't
 *  watching until a credit is spent. Surface the free credit as a gift and let
 *  the user activate now — 1 credit = a full, cumulative month — or later. */
export function CommitStage({ state }: StageProps) {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const activate = useActivateWatch();
  const setRenew = useSetAutoRenew();
  const [justActivated, setJustActivated] = useState<{
    until: number;
    credits: number;
  } | null>(null);

  const metered = me?.metered ?? true;
  const credits = me?.balance.credits ?? 0;
  const svc = me?.balance.mailboxes.find((m) => m.watch_id === state.watchId);
  const watching = !!justActivated || (svc?.watching ?? false);
  const until = justActivated?.until ?? svc?.watching_until ?? null;

  function activateNow() {
    if (!state.watchId) return;
    activate.mutate(
      { id: state.watchId, credits: 1 },
      {
        onSuccess: (r) => {
          setJustActivated({ until: r.watching_until, credits: r.credits });
          // Activating a service turns on auto-renew (the lifecycle switch).
          if (state.watchId)
            setRenew.mutate({ id: state.watchId, enabled: true });
        },
        onError: (e) =>
          toast.error(
            e.message.toLowerCase().includes("credit")
              ? "Out of credits — buy a pack first"
              : "Could not activate the service",
          ),
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="text-lg font-semibold">Service added</h2>
        <p className="text-sm text-muted-foreground">
          Carillon will watch this folder while it has a paid month.
        </p>
      </div>

      <div className="rounded-lg border p-4 text-left">
        <Row label="Account" value={state.login} />
        <Separator />
        <Row label="Folder" value={state.mailbox} />
        <Separator />
        <Row label="Notify URL" value={state.notify_url} />
      </div>

      {!metered ? (
        <Alert variant="success">
          <PlayCircle />
          <AlertTitle>Watching now</AlertTitle>
          <AlertDescription>
            This server is unmetered — the service runs without credits.
          </AlertDescription>
        </Alert>
      ) : watching ? (
        <Alert variant="success">
          <CheckCircle2 />
          <AlertTitle>Watching until {formatDate(until)}</AlertTitle>
          <AlertDescription>
            {justActivated
              ? `1 credit spent · ${justActivated.credits} left in your pool.`
              : "This service has a paid month running."}
          </AlertDescription>
        </Alert>
      ) : credits > 0 ? (
        <div className="space-y-3 rounded-lg border border-success/30 bg-success/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Gift className="size-4 text-success" />
            You’ve got {credits} credit{credits === 1 ? "" : "s"} in your pool
          </div>
          <p className="text-sm text-muted-foreground">
            Activate this service to start watching for a month. Time is
            cumulative — a credit always adds a full month on top of whatever’s
            left.
          </p>
          <div className="flex gap-2">
            <Button onClick={activateNow} disabled={activate.isPending}>
              {activate.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <PlayCircle />
              )}
              Activate now (1 credit)
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")}>
              Later
            </Button>
          </div>
        </div>
      ) : (
        <Alert variant="warning">
          <Gift />
          <AlertTitle>No credits yet</AlertTitle>
          <AlertDescription>
            Buy a pack to start watching — 1 credit watches this service for a
            month.
            <div className="mt-2">
              <Button size="sm" onClick={() => navigate("/billing")}>
                Buy credits
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center gap-2">
        {state.watchId && (
          <Button
            variant="outline"
            onClick={() => navigate(`/watches/${state.watchId}`)}
          >
            View this service
          </Button>
        )}
        <Button onClick={() => navigate("/")}>Go to dashboard</Button>
      </div>
    </div>
  );
}
