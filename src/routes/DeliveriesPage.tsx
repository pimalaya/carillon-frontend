import { useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveriesLog } from "@/features/deliveries/DeliveriesLog";

export function DeliveriesPage() {
  const [tab, setTab] = useState<"all" | "failures">("all");
  return (
    <div>
      <PageHeader
        title="Deliveries"
        description="Every webhook Carillon has fired across your services — UID only, never content."
        action={
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "all" | "failures")}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="failures">Failures</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      <DeliveriesLog showWatch onlyFailures={tab === "failures"} limit={200} />
    </div>
  );
}
