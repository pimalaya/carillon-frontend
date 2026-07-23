import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { useDeleteWatch } from "@/api/watches";
import type { Watch } from "@/api/schemas";

/** Trash button + confirm dialog to delete a service inline. */
export function DeleteServiceButton({
  watch,
  onDeleted,
}: {
  watch: Watch;
  onDeleted?: () => void;
}) {
  const del = useDeleteWatch();
  const [open, setOpen] = useState(false);

  function confirmDelete() {
    del.mutate(watch.id, {
      onSuccess: () => {
        toast.success("Service deleted");
        setOpen(false);
        onDeleted?.();
      },
      onError: () => toast.error("Could not delete the service"),
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete service"
        className="text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Trash2 />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete this service?</DialogTitle>
            <DialogDescription>
              Carillon will stop watching {watch.login} · {watch.mailbox} and
              drop its webhook config. Any remaining paid time is lost. This
              can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={del.isPending}
            >
              Delete service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
