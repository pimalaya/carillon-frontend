import { useState } from "react";
import { CalendarPlus, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useMe } from "@/api/me";
import { ActivateDialog } from "./ActivateDialog";

/**
 * A button that activates (start) or extends a service via the confirm dialog.
 * Guards an empty pool up front (a toast, not a dialog that could only show
 * negative math). Used where there's room for a button (e.g. the Billing card);
 * the tight dashboard rows open {@link ActivateDialog} from a menu instead.
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
