import { useState } from "react";
import { Coins, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";
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
import { useCheckout } from "@/api/billing";
import { PACK_SIZE, CREDIT_PRICE_EUR } from "@/api/schemas";
import { config } from "@/lib/config";

/** Credit pool: balance + a "buy N packs" control. A pack is the only refill
 *  unit (§ BILLING_MODEL). */
export function CreditsCard() {
  const { data: me, isLoading } = useMe();
  const checkout = useCheckout();
  const [packs, setPacks] = useState(1);

  if (isLoading || !me) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Skip credits when unmetered (self-host): services just run.
  if (!me.metered) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credits</CardTitle>
          <CardDescription>
            This server is unmetered — services run without credits.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const credits = me.balance.credits;

  function buy() {
    checkout.mutate(packs, {
      onSuccess: (session) => {
        // A real provider redirects to hosted Checkout (webhook credits the
        // pool); the mock settles immediately.
        if (!config.mocksEnabled && session.checkout_url) {
          window.location.href = session.checkout_url;
          return;
        }
        toast.success(`Added ${session.credits} credits`);
      },
      onError: () => toast.error("Checkout could not start"),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credits</CardTitle>
        <CardDescription>
          1 credit = one month watching one mailbox (€{CREDIT_PRICE_EUR}). Refill
          in packs of {PACK_SIZE} (€{PACK_SIZE * CREDIT_PRICE_EUR}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-baseline gap-2">
          <Coins className="size-5 self-center text-success" />
          <span className="text-3xl font-semibold tabular-nums">{credits}</span>
          <span className="text-sm text-muted-foreground">
            credit{credits === 1 ? "" : "s"} in your pool
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="one fewer pack"
              disabled={packs <= 1}
              onClick={() => setPacks((p) => Math.max(1, p - 1))}
            >
              <Minus />
            </Button>
            <span className="w-10 text-center text-sm tabular-nums">
              {packs}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="one more pack"
              onClick={() => setPacks((p) => p + 1)}
            >
              <Plus />
            </Button>
          </div>
          <Button
            className="flex-1"
            disabled={checkout.isPending}
            onClick={buy}
          >
            {checkout.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ShoppingCart />
            )}
            Buy {packs * PACK_SIZE} credits
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
