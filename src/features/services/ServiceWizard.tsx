import { useEffect, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Stepper } from "@/features/onboarding/Stepper";
import { IdentifyStage } from "@/features/onboarding/stages/IdentifyStage";
import { AuthenticateStage } from "@/features/onboarding/stages/AuthenticateStage";
import { VerifyStage } from "@/features/onboarding/stages/VerifyStage";
import { CommitStage } from "@/features/onboarding/stages/CommitStage";
import {
  WIZARD_STAGES,
  initialWizardState,
  randomSecret,
  type StageProps,
  type WizardState,
} from "@/features/onboarding/types";
import { useMe } from "@/api/me";
import { ServiceConfigureStage } from "./stages/ServiceConfigureStage";

// The one "Add service" flow (§ SERVICE_MODEL v3). Five steps, one credential:
// identify what to watch → sign in (the password is held here and stored on the
// service) → pick the target + webhook → watch it fire → activate. There is no
// separate "Add account" — account/credential and service are one thing now.

const STAGE_COMPONENTS: ComponentType<StageProps>[] = [
  IdentifyStage,
  AuthenticateStage,
  ServiceConfigureStage,
  VerifyStage,
  CommitStage,
];

export function ServiceWizard({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { data: me } = useMe();

  const titles = [
    t("onboarding.titleIdentify"),
    t("onboarding.titleAuth"),
    t("services.titleConfigure"),
    t("services.titleVerify"),
    t("services.titleDone"),
  ];
  const descriptions = [
    t("onboarding.descIdentify"),
    t("onboarding.descAuth"),
    t("services.descConfigure"),
    t("services.descVerify"),
    t("services.descDone"),
  ];

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(() => ({
    ...initialWizardState,
    service_type: "email",
    hmac_secret: randomSecret(),
  }));

  // Seed the billing account id once /me arrives. The real server keys the watch
  // off the capability link (this is ignored for a scoped caller); the mock uses
  // it — so the created service lands under the right Carillon account either way.
  useEffect(() => {
    if (me?.account_id)
      setState((s) => (s.account_id ? s : { ...s, account_id: me.account_id }));
  }, [me?.account_id]);

  const update = (patch: Partial<WizardState>) =>
    setState((s) => ({ ...s, ...patch }));
  const next = () =>
    step >= WIZARD_STAGES.length - 1 ? onDone() : setStep((s) => s + 1);
  const back = () => (step === 0 ? onCancel() : setStep((s) => s - 1));

  const Stage = STAGE_COMPONENTS[step];

  return (
    <Card>
      <CardHeader>
        <Stepper current={step} />
        <CardTitle className="mt-4">{titles[step]}</CardTitle>
        <CardDescription>{descriptions[step]}</CardDescription>
      </CardHeader>
      <CardContent>
        <Stage state={state} update={update} next={next} back={back} />
      </CardContent>
    </Card>
  );
}
