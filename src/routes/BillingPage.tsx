import { PageHeader } from "@/components/PageHeader";
import { CreditsCard } from "@/features/billing/CreditsCard";
import { ServicesCard } from "@/features/billing/ServicesCard";

export function BillingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        description="Buy credits in packs of 5; spend 1 to watch a service for a month. Testing is always free."
      />
      {/* Same shape as the dashboard: services list wide on the left, the credit
          pool card on the right (same size as the dashboard's). */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ServicesCard />
        </div>
        <div className="space-y-6">
          <CreditsCard />
        </div>
      </div>
    </div>
  );
}
