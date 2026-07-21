import { useNavigate } from "react-router-dom";
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

/** Multi-mailbox/account switcher — a client-side list of capability links. (D§5) */
export function AccountSwitcher() {
  const navigate = useNavigate();
  const { accounts, active, setActiveAccount, removeAccount } = useAuth();

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
        <DropdownMenuLabel>Accounts</DropdownMenuLabel>
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
        <DropdownMenuItem onSelect={() => navigate("/onboarding")}>
          <Plus />
          Add account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
