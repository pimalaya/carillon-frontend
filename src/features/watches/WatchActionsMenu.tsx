import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, MoreHorizontal, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMe } from "@/api/me";
import { usePauseWatch, useResumeWatch, useDeleteWatch } from "@/api/watches";
import type { Watch } from "@/api/schemas";

export function WatchActionsMenu({
  watch,
  onDeleted,
}: {
  watch: Watch;
  onDeleted?: () => void;
}) {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const pause = usePauseWatch();
  const resume = useResumeWatch();
  const del = useDeleteWatch();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const paused = !watch.active;
  // Pause/resume only apply while the service actually has a paid month running.
  // When metered and not watching (never activated, or expired / out of
  // credits), toggling `active` does nothing real — block it.
  const metered = me?.metered ?? true;
  const watching =
    me?.balance.mailboxes.find((m) => m.watch_id === watch.id)?.watching ??
    false;

  function toggle() {
    if (metered && !watching) {
      toast.error(
        "Activate this service first — pause/resume only applies while it’s watching.",
      );
      return;
    }
    if (paused) {
      resume.mutate(watch.id, {
        onSuccess: () => toast.success("Watch resumed"),
      });
    } else {
      pause.mutate(watch.id, {
        onSuccess: () => toast.success("Watch paused"),
      });
    }
  }

  function confirmDelete() {
    del.mutate(watch.id, {
      onSuccess: () => {
        toast.success("Watch deleted");
        setConfirmOpen(false);
        onDeleted?.();
      },
      onError: () => toast.error("Could not delete the watch"),
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Watch actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => navigate(`/watches/${watch.id}`)}>
            <Info />
            Info
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggle}>
            {paused ? <Play /> : <Pause />}
            {paused ? "Resume" : "Pause"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this watch?</DialogTitle>
            <DialogDescription>
              Carillon will stop watching {watch.login} · {watch.mailbox} and
              drop its webhook config. Metering stops. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={del.isPending}
            >
              Delete watch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
