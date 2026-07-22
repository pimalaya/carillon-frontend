import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  LayoutDashboard,
  Plus,
  Radio,
  Settings,
} from "lucide-react";

import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/deliveries", labelKey: "nav.deliveries", icon: Radio, end: false },
  { to: "/billing", labelKey: "nav.billing", icon: CreditCard, end: false },
  { to: "/settings", labelKey: "nav.settings", icon: Settings, end: false },
] as const;

export function Sidebar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/40 md:flex">
      <div className="flex h-14 items-center px-4">
        <Brand />
      </div>
      <div className="px-3">
        <Button
          className="w-full justify-start"
          size="sm"
          onClick={() => navigate("/onboarding")}
        >
          <Plus />
          {t("nav.addAccount")}
        </Button>
      </div>
      <nav className="mt-4 flex flex-col gap-1 px-3">
        {NAV.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )
            }
          >
            <Icon className="size-4" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-3 text-xs text-muted-foreground">
        <p>{t("nav.taglineSignal")}</p>
        <p>{t("nav.taglineContentFree")}</p>
      </div>
    </aside>
  );
}
