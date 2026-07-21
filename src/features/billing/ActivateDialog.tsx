import { useEffect, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMe } from "@/api/me";
import { useActivateWatch, useSetAutoRenew } from "@/api/watches";
import { formatDate } from "@/lib/format";

/**
 * The confirm-and-spend dialog for activating (starting) or extending a service.
 * Controlled by the caller so it can be opened from a button, a menu item, etc.
 * Explicit about cost: pick how many credits (= months, cumulative), see the
 * pool before/after, then confirm. Activating a stopped service also turns on
 * auto-renew (the merged lifecycle switch).
 */
export function ActivateDialog({
  open,
  onOpenChange,
  watchId,
  watching,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchId: string;
  watching: boolean;
}) {
  const { data: me } = useMe();
  const activate = useActivateWatch();
  const setRenew = useSetAutoRenew();
  const [credits, setCredits] = useState(1);

  const pool = me?.balance.credits ?? 0;
  const canConfirm = credits >= 1 && pool >= credits;

  // Always start a fresh dialog at 1 credit.
  useEffect(() => {
    if (open) setCredits(1);
  }, [open]);

  function confirm() {
    activate.mutate(
      { id: watchId, credits },
      {
        onSuccess: (r) => {
          toast.success(
            `Watching until ${formatDate(r.watching_until)} · ${r.credits} credits left`,
          );
          if (!watching) setRenew.mutate({ id: watchId, enabled: true });
          onOpenChange(false);
        },
        onError: (e) =>
          toast.error(
            e.message.toLowerCase().includes("credit")
              ? "Not enough credits — buy a pack first"
              : "Could not activate the service",
          ),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            {watching ? "Extend this service" : "Activate this service"}
          </DialogTitle>
          <DialogDescription>
            Each credit adds one month of watching, stacked onto any time
            already left. Spent credits are removed from your pool and can’t be
            recovered — there are no refunds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Credits to spend</span>
            <div className="flex items-center rounded-md border">
              <Button
                variant="ghost"
                size="icon"
                aria-label="one fewer credit"
                disabled={credits <= 1}
                onClick={() => setCredits((c) => Math.max(1, c - 1))}
              >
                <Minus />
              </Button>
              <span className="w-10 text-center text-sm tabular-nums">
                {credits}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="one more credit"
                disabled={credits >= pool}
                onClick={() => setCredits((c) => c + 1)}
              >
                <Plus />
              </Button>
            </div>
          </div>

          <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adds</span>
              <span className="font-medium">
                {credits} month{credits === 1 ? "" : "s"} of watching
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pool after</span>
              <span className="font-medium tabular-nums">
                {pool} → {pool - credits} credit
                {pool - credits === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={!canConfirm || activate.isPending}
          >
            {activate.isPending && <Loader2 className="animate-spin" />}
            Spend {credits} credit{credits === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
