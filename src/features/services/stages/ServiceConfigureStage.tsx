import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookUser,
  CheckCircle2,
  Mail,
  Rocket,
  Send,
  Webhook,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMailboxes, useTestCardDav, useTestWebhook } from "@/api/onboarding";
import { useCreateWatch } from "@/api/watches";
import type { TestVerdict, WebhookTestResult } from "@/api/schemas";
import {
  isValidNotifyUrl,
  randomSecret,
  randomWatchId,
  type StageProps,
} from "@/features/onboarding/types";

/** One PIM account the service can be added to. */
export interface PimAccountOption {
  mailbox_key: string;
  login: string;
  imap_host: string;
  imap_port: number;
}

interface ServiceConfigureProps extends StageProps {
  /** PIM accounts on this Carillon account, to add the service to. */
  options: PimAccountOption[];
  /** Switch the target PIM account (re-seeds host/login/port + folders). */
  onSelectAccount: (mailboxKey: string) => void;
}

/** A CardDAV collection URL is https + has a path (the addressbook). */
function isValidCardDavUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** A friendly default addressbook name from the collection URL's last segment. */
function deriveName(url: string | undefined): string {
  if (!url) return "";
  const segment = url.replace(/\/+$/, "").split("/").pop() ?? "";
  return decodeURIComponent(segment);
}

/** "Add service" — configure a service on an already-authenticated PIM account,
 *  reusing that account's stored credential (created with no password — the
 *  server reuses it). The service is an IMAP folder or a CardDAV addressbook. */
export function ServiceConfigureStage({
  state,
  update,
  next,
  back,
  options,
  onSelectAccount,
}: ServiceConfigureProps) {
  const { t } = useTranslation();
  const { activeLink } = useAuth();
  const createWatch = useCreateWatch();
  const testWebhook = useTestWebhook();
  const testCardDav = useTestCardDav();
  const [webhookResult, setWebhookResult] = useState<WebhookTestResult | null>(
    null,
  );
  const [cardVerdict, setCardVerdict] = useState<TestVerdict | null>(null);

  const serviceType = state.service_type ?? "email";
  const isAddressbook = serviceType === "addressbook";
  const urlValid = isValidNotifyUrl(state.notify_url);
  const cardUrlValid = isValidCardDavUrl(state.carddav_url);
  const busy = createWatch.isPending;
  const canAdd = urlValid && !busy && (!isAddressbook || cardUrlValid);

  // Fetch the folder list for the chosen PIM account (email services only). The
  // list is authenticated with the account's stored credential — we send the
  // capability link and an empty password, and the server resolves it. Keyed by
  // the connection, so switching accounts refetches. (api.rs /mailboxes)
  const mailboxesQuery = useMailboxes({
    imap_host: state.imap_host,
    imap_port: state.imap_port,
    login: state.login,
    link: activeLink ?? undefined,
    enabled: !isAddressbook && !!state.mailbox_key && !!state.imap_host,
  });
  const mailboxes = mailboxesQuery.data?.mailboxes ?? [];

  // Default the folder to the first listed one (unless the current pick is in
  // the list) once the folders arrive.
  useEffect(() => {
    if (isAddressbook) return;
    const names = mailboxes.map((m) => m.name);
    if (names.length && !names.includes(state.mailbox))
      update({ mailbox: names[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailboxesQuery.data]);

  function chooseType(type: "email" | "addressbook") {
    if (type === serviceType) return;
    setCardVerdict(null);
    // The `mailbox` field doubles as the IMAP folder / the addressbook display
    // name — swap the placeholder-ish "INBOX" default out when leaving email.
    update({
      service_type: type,
      mailbox:
        type === "addressbook"
          ? state.mailbox === "INBOX"
            ? ""
            : state.mailbox
          : state.mailbox || "INBOX",
    });
  }

  async function runWebhookTest() {
    if (!urlValid || !state.hmac_secret) return;
    setWebhookResult(null);
    try {
      const result = await testWebhook.mutateAsync({
        notify_url: state.notify_url,
        hmac_secret: state.hmac_secret,
      });
      setWebhookResult(result);
    } catch (err) {
      setWebhookResult({
        ok: false,
        status: null,
        error:
          err instanceof ApiError && err.isRateLimited
            ? t("services.tooManyAttempts")
            : t("services.endpointUnreachable"),
      });
    }
  }

  async function runCardDavTest() {
    if (!cardUrlValid || !activeLink) return;
    setCardVerdict(null);
    try {
      const verdict = await testCardDav.mutateAsync({
        carddav_url: state.carddav_url!,
        imap_host: state.imap_host,
        login: state.login,
        link: activeLink,
      });
      setCardVerdict(verdict);
    } catch {
      setCardVerdict(null);
      toast.error(t("services.carddavFail"));
    }
  }

  async function addService() {
    try {
      const secret = state.hmac_secret ?? randomSecret();
      const id = randomWatchId();
      // No password: the credential lives on the PIM account and the server
      // reuses it. The client owns the watch id + HMAC secret so the next step
      // can show the secret once.
      if (isAddressbook) {
        const name = state.mailbox?.trim() || deriveName(state.carddav_url);
        await createWatch.mutateAsync({
          id,
          source_kind: "carddav",
          imap_host: state.imap_host,
          imap_port: state.imap_port,
          login: state.login,
          mailbox: name || "Addressbook",
          carddav_url: state.carddav_url,
          notify_url: state.notify_url,
          hmac_secret: secret,
          account_id: state.account_id,
          active: true,
        });
      } else {
        await createWatch.mutateAsync({
          id,
          imap_host: state.imap_host,
          imap_port: state.imap_port,
          login: state.login,
          mailbox: state.mailbox,
          notify_url: state.notify_url,
          hmac_secret: secret,
          account_id: state.account_id,
          active: true,
        });
      }
      update({ watchId: id, hmac_secret: secret });
      next();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          isAddressbook
            ? t("services.conflictAddressbook", { login: state.login })
            : t("services.conflictEmail", {
                mailbox: state.mailbox,
                login: state.login,
              }),
        );
      } else {
        toast.error(t("services.addError"));
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Service type: an IMAP folder (held IDLE) or a CardDAV addressbook (polled). */}
      <div className="space-y-2">
        <Label>{t("services.type.label")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <TypeCard
            active={!isAddressbook}
            icon={<Mail className="size-4" />}
            title={t("services.type.email")}
            hint={t("services.type.emailHint")}
            onClick={() => chooseType("email")}
          />
          <TypeCard
            active={isAddressbook}
            icon={<BookUser className="size-4" />}
            title={t("services.type.addressbook")}
            hint={t("services.type.addressbookHint")}
            onClick={() => chooseType("addressbook")}
          />
        </div>
      </div>

      {options.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="account">{t("services.account")}</Label>
          <Select
            id="account"
            value={state.mailbox_key ?? ""}
            onChange={(e) => onSelectAccount(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.mailbox_key} value={o.mailbox_key}>
                {o.login}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            {isAddressbook
              ? t("services.accountHintAddressbook")
              : t("services.accountHintEmail")}
          </p>
        </div>
      )}

      {isAddressbook ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="carddav-url">{t("services.carddavUrl")}</Label>
            <div className="flex gap-2">
              <Input
                id="carddav-url"
                type="url"
                placeholder={t("services.carddavUrlPlaceholder")}
                value={state.carddav_url ?? ""}
                onChange={(e) => {
                  update({ carddav_url: e.target.value });
                  setCardVerdict(null);
                }}
              />
              <Button
                variant="secondary"
                onClick={runCardDavTest}
                disabled={!cardUrlValid || testCardDav.isPending}
              >
                {testCardDav.isPending ? <Spinner /> : <Send />}
                {t("common.test")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("services.carddavUrlHint")}
            </p>
            {cardVerdict &&
              (cardVerdict.ok ? (
                <p className="flex items-center gap-1.5 text-xs text-success">
                  <CheckCircle2 className="size-3.5" />
                  {t("services.carddavOk")}
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <XCircle className="size-3.5" />
                  {cardVerdict.reachable && cardVerdict.authenticated
                    ? t("services.carddavNoSync")
                    : t("services.carddavFail")}
                </p>
              ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-name">{t("services.carddavName")}</Label>
            <Input
              id="card-name"
              value={state.mailbox === "INBOX" ? "" : state.mailbox}
              onChange={(e) => update({ mailbox: e.target.value })}
              placeholder={t("services.carddavNamePlaceholder")}
            />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="mailbox">{t("services.folder")}</Label>
          {mailboxesQuery.isError ? (
            <Input
              id="mailbox"
              value={state.mailbox}
              onChange={(e) => update({ mailbox: e.target.value })}
              placeholder="INBOX"
            />
          ) : (
            <Select
              id="mailbox"
              value={state.mailbox}
              disabled={mailboxesQuery.isFetching}
              onChange={(e) => update({ mailbox: e.target.value })}
            >
              {/* Keep the current value selectable even before the list loads. */}
              {mailboxes.length === 0 && (
                <option value={state.mailbox}>{state.mailbox}</option>
              )}
              {mailboxes.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                  {m.role && m.role !== "inbox" ? ` · ${m.role}` : ""}
                </option>
              ))}
            </Select>
          )}
          <p className="text-xs text-muted-foreground">
            {mailboxesQuery.isFetching
              ? t("services.folderLoading")
              : mailboxesQuery.isError
                ? t("services.folderError")
                : t("services.folderHint")}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notify">{t("services.notifyUrl")}</Label>
        <div className="flex gap-2">
          <Input
            id="notify"
            type="url"
            placeholder="https://hooks.example.com/carillon"
            value={state.notify_url}
            onChange={(e) => {
              update({ notify_url: e.target.value });
              setWebhookResult(null);
            }}
          />
          <Button
            variant="secondary"
            onClick={runWebhookTest}
            disabled={!urlValid || testWebhook.isPending}
          >
            {testWebhook.isPending ? <Spinner /> : <Send />}
            {t("common.test")}
          </Button>
        </div>
        {state.notify_url && !urlValid && (
          <p className="text-xs text-destructive">
            {t("services.notifyInvalid")}
          </p>
        )}
        {webhookResult &&
          (webhookResult.ok ? (
            <p className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="size-3.5" />
              {t("services.endpointOk")}
              {webhookResult.status ? ` (HTTP ${webhookResult.status})` : ""}.
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <XCircle className="size-3.5" />
              {webhookResult.error ?? t("services.endpointNoAck")}
            </p>
          ))}
      </div>

      <Alert>
        <Webhook />
        <AlertTitle>{t("services.webhookTitle")}</AlertTitle>
        <AlertDescription>
          {isAddressbook
            ? t("services.webhookBodyAddressbook")
            : t("services.webhookBodyEmail")}
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back} disabled={busy}>
          {t("common.back")}
        </Button>
        <Button onClick={addService} disabled={!canAdd}>
          {busy ? <Spinner /> : <Rocket />}
          {t("services.addService")}
        </Button>
      </div>
    </div>
  );
}

/** A selectable service-type card (email vs addressbook). */
function TypeCard({
  active,
  icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "hover:border-muted-foreground/40 hover:bg-secondary/40",
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </button>
  );
}
