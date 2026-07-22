import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Sidebar } from "./Sidebar";
import { Brand } from "./Brand";
import { AccountSwitcher } from "./AccountSwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useStreamStatus } from "./StreamProvider";
import { LiveIndicator } from "@/components/LiveIndicator";
import { connectionLabel } from "@/lib/config";

/**
 * App frame: sidebar + top bar + routed content. Reads the app-wide stream
 * status (owned by StreamProvider) for the header's live indicator. (PLAN §8)
 */
export function AppShell() {
  const streamStatus = useStreamStatus();
  const { t } = useTranslation();

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <Brand className="md:hidden" />
          <div className="ml-auto flex items-center gap-4">
            <span
              className="hidden font-mono text-xs text-muted-foreground sm:inline"
              title={t("header.apiTitle")}
            >
              {connectionLabel()}
            </span>
            <LiveIndicator status={streamStatus} />
            <LanguageSwitcher />
            <AccountSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
