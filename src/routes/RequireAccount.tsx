import { Navigate } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";

/** Gates the app shell on a stored capability link. Client gating is UX only;
 *  the server validates every call. (PLAN §5) */
export function RequireAccount() {
  const { hasAccount } = useAuth();
  if (!hasAccount) return <Navigate to="/welcome" replace />;
  return <AppShell />;
}
