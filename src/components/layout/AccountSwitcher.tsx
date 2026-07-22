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

/** Carillon-account switcher — one entry per Carillon account (magic-link
 *  identity / capability link) this browser knows. The credit pool is scoped to
 *  the active one; PIM accounts live *under* it (filtered on the dashboard). */
export function AccountSwitcher() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { accounts, active, setActiveAccount, removeAccount, renameAccount } =
    useAuth();
  const { data: me } = useMe();

  // Label the active account with the Carillon email (the magic-link identity)
  // once /me resolves it — so the top bar shows who you signed in as, not the
  // "my account" placeholder or a PIM login.
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
        {/* Add *another Carillon account* (a separate magic-link identity, with
            its own credit pool) — not a PIM account. Purely local to this
            browser; elsewhere you sign in again via a magic link. */}
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
