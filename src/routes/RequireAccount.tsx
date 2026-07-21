import { Navigate } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";

/**
 * Gate for the authenticated app shell. No stored capability link → send the
 * visitor to the welcome screen. Client gating is UX only; the server validates
 * every call. (PLAN §5)
 */
export function RequireAccount() {
  const { hasAccount } = useAuth();
  if (!hasAccount) return <Navigate to="/welcome" replace />;
  return <AppShell />;
}
