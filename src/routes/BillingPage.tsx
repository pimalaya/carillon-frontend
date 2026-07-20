import { PageHeader } from '@/components/PageHeader';
import { BalanceCard } from '@/features/billing/BalanceCard';
import { CreditPacks } from '@/features/billing/CreditPacks';
import { AutoRefill } from '@/features/billing/AutoRefill';

export function BillingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        description="Prepaid, metered watch-time. You pay only for time watched; testing is always free."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <BalanceCard />
        <AutoRefill />
      </div>
      <section>
        <h2 className="mb-3 text-sm font-semibold">Credit packs</h2>
        <CreditPacks />
      </section>
    </div>
  );
}
