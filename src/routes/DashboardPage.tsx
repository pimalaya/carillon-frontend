import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { WatchesList } from "@/features/watches/WatchesList";
import { CreditsCard } from "@/features/billing/CreditsCard";
import { DeliveriesLog } from "@/features/deliveries/DeliveriesLog";

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        action={
          // One entry point: "Add service" starts the flow (which connects a new
          // account when needed). Adding a Carillon account lives in the switcher.
          <Button onClick={() => navigate("/services/new")}>
            <Plus />
            {t("dashboard.addService")}
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-sm font-semibold">
              {t("dashboard.services")}
            </h2>
            <WatchesList />
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold">
              {t("dashboard.recentDeliveries")}
            </h2>
            <DeliveriesLog showWatch limit={8} />
          </section>
        </div>
        <div className="space-y-6">
          <CreditsCard />
        </div>
      </div>
    </div>
  );
}
