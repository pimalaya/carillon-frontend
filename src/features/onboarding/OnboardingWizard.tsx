import { useState, type ComponentType } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Stepper } from './Stepper';
import { IdentifyStage } from './stages/IdentifyStage';
import { AuthenticateStage } from './stages/AuthenticateStage';
import { ConfigureStage } from './stages/ConfigureStage';
import { VerifyStage } from './stages/VerifyStage';
import { CommitStage } from './stages/CommitStage';
import { STAGES, initialWizardState, type StageProps, type WizardState } from './types';

const STAGE_COMPONENTS: ComponentType<StageProps>[] = [
  IdentifyStage,
  AuthenticateStage,
  ConfigureStage,
  VerifyStage,
  CommitStage,
];

const TITLES = [
  'Add a mailbox',
  'Sign in',
  'Configure the webhook',
  'Verify it works',
  'You’re all set',
];

const DESCRIPTIONS = [
  'Enter your email — we discover your provider and how to sign in.',
  'Authenticate and confirm we can watch it (IDLE, and QRESYNC where offered).',
  'Pick a folder, point the signed webhook at your endpoint, then activate.',
  'Watch your own endpoint fire — read-only, no test button.',
  'Metering runs only while the watch is active.',
];

export function OnboardingWizard({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialWizardState);

  const update = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, STAGES.length - 1));
  const back = () => (step === 0 ? onCancel() : setStep((s) => s - 1));

  const Stage = STAGE_COMPONENTS[step];

  return (
    <Card>
      <CardHeader>
        <Stepper current={step} />
        <CardTitle className="mt-4">{TITLES[step]}</CardTitle>
        <CardDescription>{DESCRIPTIONS[step]}</CardDescription>
      </CardHeader>
      <CardContent>
        <Stage state={state} update={update} next={next} back={back} />
      </CardContent>
    </Card>
  );
}
