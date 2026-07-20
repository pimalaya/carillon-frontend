import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePacks, useCheckout } from '@/api/billing';
import { config } from '@/lib/config';
import { formatDuration } from '@/lib/format';

// Human names for the server's pack ids (week/quarter/year). Falls back to the
// id if the catalogue grows.
const LABELS: Record<string, string> = {
  week: 'Week',
  quarter: 'Quarter',
  year: 'Year',
};

export function CreditPacks() {
  const { data, isLoading } = usePacks();
  const checkout = useCheckout();

  function buy(packId: string) {
    checkout.mutate(packId, {
      onSuccess: (session) => {
        // Real provider → redirect to the hosted checkout; the top-up lands via
        // the billing webhook. Mock settles immediately, so just confirm.
        if (!config.mocksEnabled && session.checkout_url) {
          window.location.href = session.checkout_url;
          return;
        }
        toast.success(`Added ${formatDuration(session.secs)} to your pool`);
      },
      onError: () => toast.error('Checkout could not start'),
    });
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-3">
        {data.packs.map((pack) => (
          <Card key={pack.id}>
            <CardHeader>
              <CardTitle className="text-base">{LABELS[pack.id] ?? pack.id}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatDuration(pack.secs)}
                </div>
                <p className="text-sm text-muted-foreground">of watch-time</p>
              </div>
              <Button
                className="w-full"
                variant="outline"
                disabled={checkout.isPending}
                onClick={() => buy(pack.id)}
              >
                {checkout.isPending && checkout.variables === pack.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ExternalLink />
                )}
                Buy
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Price is set by the payment provider ({data.provider}) at checkout — packs are watch-time
        only.
      </p>
    </div>
  );
}
