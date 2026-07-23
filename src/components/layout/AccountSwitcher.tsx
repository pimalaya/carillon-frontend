import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, LogOut, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useMe } from "@/api/me";

/** Switches Carillon accounts (one per magic-link identity known to this
 *  browser). The credit pool is scoped to the active one; PIM accounts live
 *  under it. */
export function AccountSwitcher() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { accounts, active, setActiveAccount, removeAccount, renameAccount } =
    useAuth();
  const { data: me } = useMe();

  // Replace the placeholder label with the Carillon email once /me resolves it,
  // so the top bar shows who you signed in as.
  const email = me?.balance.email;
  useEffect(() => {
    if (email && active && active.label !== email) {
      renameAccount(active.id, email);
    }
  }, [email, active, renameAccount]);

  if (!active) return null;

  function signOut() {
    if (!active) return;
    removeAccount(active.id);
    navigate("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[16rem]">
          <span className="truncate">{active.label}</span>
          <ChevronsUpDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{t("accountSwitcher.accounts")}</DropdownMenuLabel>
        {accounts.map((acct) => (
          <DropdownMenuItem
            key={acct.id}
            onSelect={() => setActiveAccount(acct.id)}
          >
            <Check
              className={acct.id === active.id ? "opacity-100" : "opacity-0"}
            />
            <span className="truncate">{acct.label}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {/* Adds another Carillon account (a separate magic-link identity with
            its own credit pool), local to this browser — not a PIM account. */}
        <DropdownMenuItem onSelect={() => navigate("/welcome")}>
          <Plus />
          {t("accountSwitcher.addAccount")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>
          <LogOut />
          {t("accountSwitcher.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
