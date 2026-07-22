import { useNavigate } from "react-router-dom";
import { CheckCircle2, Gift, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMe } from "@/api/me";
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

/** "Add service" final step (§ SERVICE_MODEL v3): the service is created and
 *  already watching on a free trial — no "activate" step here. We just confirm
 *  it, show when the free trial ends, and point at buying credits to keep it
 *  going (1 credit = a full, cumulative month, activated later from the
 *  dashboard). A re-added mailbox whose trial was already used shows the
 *  buy-credits path instead. */
export function CommitStage({ state }: StageProps) {
  const navigate = useNavigate();
  const { data: me } = useMe();

  const metered = me?.metered ?? true;
  const svc = me?.balance.mailboxes.find((m) => m.watch_id === state.watchId);
  const watching = svc?.watching ?? false;
  const until = svc?.watching_until ?? null;
  const isAddressbook = state.service_type === "addressbook";

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="text-lg font-semibold">Service added</h2>
        <p className="text-sm text-muted-foreground">
          {isAddressbook
            ? "Carillon will watch this addressbook while it has paid (or trial) time."
            : "Carillon will watch this folder while it has paid (or trial) time."}
        </p>
      </div>

      <div className="rounded-lg border p-4 text-left">
        <Row label="Account" value={state.login} />
        <Separator />
        <Row label={isAddressbook ? "Addressbook" : "Folder"} value={state.mailbox} />
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
          <Gift />
          <AlertTitle>
            Watching free until {formatDate(until)}
          </AlertTitle>
          <AlertDescription>
            Your service is live on a free trial — no credit spent. To keep it
            going after that, add a credit any time (1 credit = a full month,
            stacked on top of what’s left).
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="warning">
          <Gift />
          <AlertTitle>Not watching yet</AlertTitle>
          <AlertDescription>
            This mailbox already used its free trial. Buy a pack to start
            watching — 1 credit watches this service for a month.
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
