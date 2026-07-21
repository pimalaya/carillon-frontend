import { PageHeader } from "@/components/PageHeader";
import { CreditsCard } from "@/features/billing/CreditsCard";
import { ServicesCard } from "@/features/billing/ServicesCard";

export function BillingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        description="Buy credits in packs of 5; spend 1 to watch a mailbox for a month. Testing is always free."
      />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <CreditsCard />
        <ServicesCard />
      </div>
    </div>
  );
}
