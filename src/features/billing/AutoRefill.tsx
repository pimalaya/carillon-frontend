import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBalance } from '@/api/me';
import { useSetAutoRefill } from '@/api/account';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

const DEFAULT_THRESHOLD = 86_400; // 1 day
const DEFAULT_AMOUNT = 7 * 86_400; // top up a week

/**
 * Opt-in auto-refill. Framed as "never miss a notification" — the point is to
 * kill the silent outage, not to upsell. (ROADMAP M5)
 */
export function AutoRefill() {
  const { data: balance, isLoading } = useBalance();
  const setAutoRefill = useSetAutoRefill();

  if (isLoading || !balance) {
    return <Skeleton className="h-40 w-full" />;
  }

  const enabled = balance.auto_refill;
  const threshold = balance.auto_refill_threshold || DEFAULT_THRESHOLD;
  const amount = balance.auto_refill_amount || DEFAULT_AMOUNT;

  function toggle() {
    setAutoRefill.mutate(
      { enabled: !enabled, threshold_secs: threshold, amount_secs: amount },
      { onSuccess: () => toast.success(!enabled ? 'Auto-refill on' : 'Auto-refill off') },
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="size-4 text-muted-foreground" />
              Auto-refill
            </CardTitle>
            <CardDescription>
              Top the pool up automatically before it runs dry, so a watch never goes silent.
            </CardDescription>
          </div>
          <Button
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            onClick={toggle}
            disabled={setAutoRefill.isPending}
          >
            <span
              className={cn(
                'mr-1 inline-block size-2 rounded-full',
                enabled ? 'bg-success-foreground' : 'bg-muted-foreground',
              )}
            />
            {enabled ? 'On' : 'Off'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {enabled
            ? `Adds ${formatDuration(amount)} when the pool drops below ${formatDuration(threshold)}.`
            : 'Currently off — you’ll get low-balance and pre-expiry warnings instead.'}
        </p>
      </CardContent>
    </Card>
  );
}
