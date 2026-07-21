import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { StageProps } from "../types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate font-medium">{value}</span>
    </div>
  );
}

export function CommitStage({ state }: StageProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="text-lg font-semibold">Watch is live</h2>
        <p className="text-sm text-muted-foreground">
          Metering has started. It only runs while the watch is active — pause
          it any time.
        </p>
      </div>

      <div className="rounded-lg border p-4 text-left">
        <Row label="Mailbox" value={state.login} />
        <Separator />
        <Row label="Folder" value={state.mailbox} />
        <Separator />
        <Row label="Notify URL" value={state.notify_url} />
        <Separator />
        <Row label="Capability link" value="Saved to this browser" />
      </div>

      <div className="flex justify-center gap-2">
        {state.watchId && (
          <Button
            variant="outline"
            onClick={() => navigate(`/watches/${state.watchId}`)}
          >
            View this watch
          </Button>
        )}
        <Button onClick={() => navigate("/")}>Go to dashboard</Button>
      </div>
    </div>
  );
}
