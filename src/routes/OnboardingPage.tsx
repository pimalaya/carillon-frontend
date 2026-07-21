import { Navigate, useNavigate } from "react-router-dom";

import { Brand } from "@/components/layout/Brand";
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard";
import { useAuth } from "@/lib/auth";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { hasAccount } = useAuth();

  // Onboarding *attaches a PIM account to a Carillon account* — so it presumes
  // one exists. The only way to get a Carillon account is a magic link, so a
  // visitor without one goes back to the welcome screen to sign in first.
  if (!hasAccount) return <Navigate to="/welcome" replace />;

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center py-10">
      <div className="mb-6 flex justify-center">
        <Brand />
      </div>
      <OnboardingWizard
        onCancel={() => navigate("/")}
        // Account added → go straight on to adding its first service.
        onDone={() => navigate("/services/new")}
      />
    </div>
  );
}
