import { useState } from "react";
import { CalendarPlus, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useMe } from "@/api/me";
import { ActivateDialog } from "./ActivateDialog";

/**
 * Button to activate or extend a service via {@link ActivateDialog}. Guards an
 * empty pool with a toast up front, before the dialog could show negative math.
 */
export function ActivateServiceButton({
  watchId,
  watching,
  size = "sm",
}: {
  watchId: string;
  watching: boolean;
  size?: "sm" | "default";
}) {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const pool = me?.balance.credits ?? 0;

  function launch(e: React.MouseEvent) {
    e.stopPropagation();
    if (pool < 1) {
      toast.error("Your pool is empty — buy credits first.");
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <Button
        size={size}
        variant={watching ? "outline" : "default"}
        onClick={launch}
      >
        {watching ? (
          <>
            <CalendarPlus />
            Extend
          </>
        ) : (
          <>
            <PlayCircle />
            Activate
          </>
        )}
      </Button>
      <ActivateDialog
        open={open}
        onOpenChange={setOpen}
        watchId={watchId}
        watching={watching}
      />
    </>
  );
}
