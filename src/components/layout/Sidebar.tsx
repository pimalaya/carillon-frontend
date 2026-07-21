import { NavLink, useNavigate } from "react-router-dom";
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
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/deliveries", label: "Deliveries", icon: Radio, end: false },
  { to: "/billing", label: "Billing", icon: CreditCard, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

export function Sidebar() {
  const navigate = useNavigate();
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
          Add account
        </Button>
      </div>
      <nav className="mt-4 flex flex-col gap-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
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
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-3 text-xs text-muted-foreground">
        <p>Signal, not sync.</p>
        <p>Content-free by design.</p>
      </div>
    </aside>
  );
}
