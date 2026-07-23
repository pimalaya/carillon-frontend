import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/PageHeader";
import { CreditsCard } from "@/features/billing/CreditsCard";
import { ServicesCard } from "@/features/billing/ServicesCard";

export function BillingPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      <PageHeader
        title={t("billing.title")}
        description={t("billing.description")}
      />
      {/* Mirror the dashboard grid: wide services list, credit pool card aside. */}
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
