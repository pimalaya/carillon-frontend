import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveriesLog } from "@/features/deliveries/DeliveriesLog";

export function DeliveriesPage() {
  const [tab, setTab] = useState<"all" | "failures">("all");
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader
        title={t("deliveries.title")}
        description={t("deliveries.description")}
        action={
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "all" | "failures")}
          >
            <TabsList>
              <TabsTrigger value="all">{t("deliveries.all")}</TabsTrigger>
              <TabsTrigger value="failures">
                {t("deliveries.failures")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      <DeliveriesLog showWatch onlyFailures={tab === "failures"} limit={200} />
    </div>
  );
}
