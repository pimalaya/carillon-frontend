import { useState } from 'react';
import { CreditCard, Loader2, Radio, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useBalance } from '@/api/me';
import { useCheckout, usePlans, usePortal } from '@/api/billing';
import { config } from '@/lib/config';
import { daysUntil, formatDate } from '@/lib/format';
import type { AccountMailbox } from '@/api/schemas';

const PLAN_LABELS: Record<string, string> = { month: 'Monthly', year: 'Yearly' };

function planLabel(plan?: string | null): string {
  return (plan && PLAN_LABELS[plan]) ?? plan ?? 'Subscribed';
}

/** "5 days left" / "ends today" from an absolute expiry (unix seconds). */
function trialLine(expires?: number | null): string {
  const days = daysUntil(expires);
  if (days === null) return 'trial';
  if (days <= 0) return 'ends today';
  return `${days} day${days === 1 ? '' : 's'} left`;
}

/** A small status dot, like the header's "Live" indicator. */
function Dot({ tone }: { tone: 'success' | 'warning' | 'muted' }) {
  const color =
    tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-muted-foreground';
  return <span className={cn('inline-flex size-2.5 rounded-full', color)} />;
}

export function SubscriptionCard() {
  const { data: balance, isLoading } = useBalance();
  const { data: plansData } = usePlans();
  const checkout = useCheckout();
  const portal = usePortal();
  // Which cadence a Subscribe click uses. Default to the yearly discount.
  const [cadence, setCadence] = useState('year');

  if (isLoading || !balance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  const plans = plansData?.plans ?? [];
  const cadences = plans.length ? plans.map((p) => p.id) : ['month', 'year'];

  function subscribe(mailbox_key: string) {
    checkout.mutate(
      { plan: cadence, mailbox_key },
      {
        onSuccess: (session) => {
          // Real provider → redirect to hosted Checkout; the subscription is
          // activated via the billing webhook. Mock settles immediately.
          if (!config.mocksEnabled && session.checkout_url) {
            window.location.href = session.checkout_url;
            return;
          }
          toast.success(`Subscribed ${session.mailbox_key} (${planLabel(session.plan).toLowerCase()})`);
        },
        onError: () => toast.error('Checkout could not start'),
      },
    );
  }

  function manage(mailbox_key: string) {
    portal.mutate(
      { mailbox_key },
      {
        onSuccess: (r) => {
          if (r.portal_url) window.location.href = r.portal_url;
        },
        onError: () => toast.error('Could not open the billing portal'),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>€1/mo or €10/yr per mailbox. Cancel anytime.</CardDescription>
          </div>
          {/* Cadence chosen for the next Subscribe click. */}
          <div className="flex shrink-0 rounded-lg border p-0.5">
            {cadences.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCadence(c)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  c === cadence ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                )}
              >
                {planLabel(c)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {balance.mailboxes.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            Authenticate a mailbox to start a free trial.
          </p>
        )}
        {balance.mailboxes.map((m) => (
          <MailboxRow
            key={m.mailbox_key}
            mailbox={m}
            subscribing={checkout.isPending && checkout.variables?.mailbox_key === m.mailbox_key}
            managing={portal.isPending && portal.variables?.mailbox_key === m.mailbox_key}
            onSubscribe={() => subscribe(m.mailbox_key)}
            onManage={() => manage(m.mailbox_key)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function MailboxRow({
  mailbox,
  subscribing,
  managing,
  onSubscribe,
  onManage,
}: {
  mailbox: AccountMailbox;
  subscribing: boolean;
  managing: boolean;
  onSubscribe: () => void;
  onManage: () => void;
}) {
  const cancelling = mailbox.subscribed && mailbox.status === 'canceled';
  const pastDue = mailbox.status === 'past_due';

  let status: React.ReactNode;
  if (mailbox.subscribed) {
    status = (
      <span className="flex items-center gap-1.5">
        <Dot tone={pastDue ? 'warning' : 'success'} />
        {pastDue ? (
          <span className="text-warning">payment due</span>
        ) : (
          <>
            {planLabel(mailbox.plan)} · {cancelling ? 'ends' : 'renews'}{' '}
            {formatDate(mailbox.current_period_end)}
          </>
        )}
      </span>
    );
  } else if (mailbox.trial_active) {
    status = (
      <span className="flex items-center gap-1.5 text-success">
        <Radio className="size-3.5" />
        trial · {trialLine(mailbox.trial_expires)}
      </span>
    );
  } else {
    status = <span className="text-muted-foreground">{mailbox.status === 'canceled' ? 'subscription ended' : 'not subscribed'}</span>;
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{mailbox.mailbox_key}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{status}</div>
      </div>
      {mailbox.subscribed && mailbox.can_manage ? (
        <Button variant="outline" size="sm" disabled={managing} onClick={onManage}>
          {managing ? <Loader2 className="animate-spin" /> : <CreditCard />}
          Manage
        </Button>
      ) : (
        <Button size="sm" disabled={subscribing} onClick={onSubscribe}>
          {subscribing ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Subscribe
        </Button>
      )}
    </div>
  );
}
