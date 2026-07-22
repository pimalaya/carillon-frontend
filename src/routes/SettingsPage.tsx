import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/PageHeader";
import { SettingsPanel } from "@/features/account/SettingsPanel";

export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />
      <SettingsPanel />
    </div>
  );
}
