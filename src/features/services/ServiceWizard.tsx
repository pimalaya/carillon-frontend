import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/features/onboarding/Stepper";
import { VerifyStage } from "@/features/onboarding/stages/VerifyStage";
import { CommitStage } from "@/features/onboarding/stages/CommitStage";
import {
  SERVICE_STAGES,
  initialWizardState,
  randomSecret,
  type WizardState,
} from "@/features/onboarding/types";
import { useMe } from "@/api/me";
import type { Me } from "@/api/schemas";
import {
  ServiceConfigureStage,
  type PimAccountOption,
} from "./stages/ServiceConfigureStage";

// "Add service" — put a service (an IMAP folder or a CardDAV addressbook) on an
// already-authenticated PIM account, reusing that account's stored credential.
// Three steps: configure the target + webhook, verify it fires, done. Distinct
// from "Add account", which authenticates the PIM account in the first place.

/** Build the choosable PIM accounts from /me: memberships carry login + host;
 *  the port is pulled from an existing watch on the same login (else 993, the
 *  only transport Carillon watches over today). */
function buildOptions(me: Me): PimAccountOption[] {
  return me.mailboxes.map((m) => {
    const watch = me.watches.find(
      (w) => w.login.toLowerCase() === m.login.toLowerCase(),
    );
    return {
      mailbox_key: m.mailbox_key,
      login: m.login,
      imap_host: m.imap_host,
      imap_port: watch?.imap_port ?? 993,
    };
  });
}

export function ServiceWizard({
  preselectKey,
  onCancel,
  onDone,
}: {
  preselectKey?: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { data: me, isLoading } = useMe();
  const options = useMemo(() => (me ? buildOptions(me) : []), [me]);

  const titles = [
    t("services.titleConfigure"),
    t("services.titleVerify"),
    t("services.titleDone"),
  ];
  const descriptions = [
    t("services.descConfigure"),
    t("services.descVerify"),
    t("services.descDone"),
  ];

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialWizardState);
  const [seeded, setSeeded] = useState(false);

  // Seed the target PIM account once /me arrives: the preselected one, or the
  // account's only/first PIM account.
  useEffect(() => {
    if (!me || seeded || options.length === 0) return;
    const chosen =
      options.find((o) => o.mailbox_key === preselectKey) ?? options[0];
    setState((s) => ({
      ...s,
      account_id: me.account_id,
      mailbox_key: chosen.mailbox_key,
      login: chosen.login,
      imap_host: chosen.imap_host,
      imap_port: chosen.imap_port,
      mailbox: "INBOX",
      hmac_secret: s.hmac_secret ?? randomSecret(),
    }));
    setSeeded(true);
  }, [me, seeded, options, preselectKey]);

  const update = (patch: Partial<WizardState>) =>
    setState((s) => ({ ...s, ...patch }));
  const next = () =>
    step >= SERVICE_STAGES.length - 1 ? onDone() : setStep((s) => s + 1);
  const back = () => (step === 0 ? onCancel() : setStep((s) => s - 1));

  function selectAccount(mailboxKey: string) {
    const opt = options.find((o) => o.mailbox_key === mailboxKey);
    if (!opt) return;
    setState((s) => ({
      ...s,
      mailbox_key: opt.mailbox_key,
      login: opt.login,
      imap_host: opt.imap_host,
      imap_port: opt.imap_port,
      mailbox: "INBOX",
    }));
  }

  if (isLoading || (!seeded && options.length > 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("services.titleConfigure")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (options.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("services.titleConfigure")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>{t("services.needAccountTitle")}</AlertTitle>
            <AlertDescription>{t("services.needAccountBody")}</AlertDescription>
          </Alert>
          <Button onClick={onCancel}>{t("common.back")}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Stepper current={step} stages={SERVICE_STAGES} />
        <CardTitle className="mt-4">{titles[step]}</CardTitle>
        <CardDescription>{descriptions[step]}</CardDescription>
      </CardHeader>
      <CardContent>
        {step === 0 && (
          <ServiceConfigureStage
            state={state}
            update={update}
            next={next}
            back={back}
            options={options}
            onSelectAccount={selectAccount}
          />
        )}
        {step === 1 && (
          <VerifyStage state={state} update={update} next={next} back={back} />
        )}
        {step === 2 && (
          <CommitStage state={state} update={update} next={next} back={back} />
        )}
      </CardContent>
    </Card>
  );
}
