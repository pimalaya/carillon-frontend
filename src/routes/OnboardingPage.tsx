import { useNavigate } from 'react-router-dom';

import { Brand } from '@/components/layout/Brand';
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard';
import { useAuth } from '@/lib/auth';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { hasAccount } = useAuth();

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center py-10">
      <div className="mb-6 flex justify-center">
        <Brand />
      </div>
      <OnboardingWizard onCancel={() => navigate(hasAccount ? '/' : '/welcome')} />
    </div>
  );
}
