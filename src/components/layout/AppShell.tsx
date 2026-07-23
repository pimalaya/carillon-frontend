import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Sidebar } from "./Sidebar";
import { BetaBanner } from "./BetaBanner";
import { Brand } from "./Brand";
import { AccountSwitcher } from "./AccountSwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useStreamStatus } from "./StreamProvider";
import { LiveIndicator } from "@/components/LiveIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { connectionLabel } from "@/lib/config";

/** App frame (sidebar + top bar + routed content). Reads the app-wide stream
 *  status owned by StreamProvider for the header indicator. (PLAN §8) */
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
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">
                  <LiveIndicator status={streamStatus} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="opacity-70">{t("header.apiTitle")}</p>
                <p className="font-mono">{connectionLabel()}</p>
              </TooltipContent>
            </Tooltip>
            <LanguageSwitcher />
            <AccountSwitcher />
          </div>
        </header>
        <BetaBanner />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
