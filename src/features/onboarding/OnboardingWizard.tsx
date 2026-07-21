import { useState, type ComponentType } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Stepper } from "./Stepper";
import { IdentifyStage } from "./stages/IdentifyStage";
import { AuthenticateStage } from "./stages/AuthenticateStage";
import {
  STAGES,
  initialWizardState,
  type StageProps,
  type WizardState,
} from "./types";

// "Add account" — attach a PIM account to the Carillon account. Two steps:
// discover the provider, then authenticate. Authenticating stores the
// credential on the PIM account (reused later by every service) and mints the
// capability link; the flow stops there. Services are added separately, per
// PIM account, by the "Add service" wizard.

const STAGE_COMPONENTS: ComponentType<StageProps>[] = [
  IdentifyStage,
  AuthenticateStage,
];

const TITLES = ["Add an account", "Sign in"];

const DESCRIPTIONS = [
  "Enter your email — we discover your provider and how to sign in.",
  "Authenticate once. We store the credential on this account and reuse it for every service you add.",
];

export function OnboardingWizard({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialWizardState);

  const update = (patch: Partial<WizardState>) =>
    setState((s) => ({ ...s, ...patch }));
  // Advancing past the last stage finishes the flow (the account is now stored).
  const next = () =>
    step >= STAGES.length - 1 ? onDone() : setStep((s) => s + 1);
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
