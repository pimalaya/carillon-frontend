import { PageHeader } from '@/components/PageHeader';
import { SubscriptionCard } from '@/features/billing/SubscriptionCard';

export function BillingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        description="Each mailbox is subscribed on its own. New mailboxes get a free trial; testing is always free."
      />
      <div className="max-w-2xl">
        <SubscriptionCard />
      </div>
    </div>
  );
}
