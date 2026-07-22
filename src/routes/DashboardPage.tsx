import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Radio } from "lucide-react";

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/services/new")}>
              <Radio />
              {t("dashboard.addService")}
            </Button>
            <Button onClick={() => navigate("/onboarding")}>
              <Plus />
              {t("dashboard.addAccount")}
            </Button>
          </div>
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
