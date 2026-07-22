import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Rocket, Send, Webhook, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/Spinner";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  useAddressbooks,
  useMailboxes,
  useTestWebhook,
} from "@/api/onboarding";
import { useCreateWatch } from "@/api/watches";
import type { CreateWatchRequest, WebhookTestResult } from "@/api/schemas";
import {
  isValidNotifyUrl,
  randomSecret,
  randomWatchId,
  type StageProps,
} from "@/features/onboarding/types";

/** A CardDAV collection URL is https. */
function isValidCardDavUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** A friendly default addressbook name from the collection URL's last segment
 *  (only used for the manual-URL fallback; the picker uses the reported name). */
function deriveName(url: string | undefined): string {
  if (!url) return "";
  const segment = url.replace(/\/+$/, "").split("/").pop() ?? "";
  return decodeURIComponent(segment);
}

/** "Configure" — pick the target (an IMAP folder or a CardDAV addressbook, each a
 *  dropdown of what the account actually has) and the webhook URL, then create
 *  the service. The credential lives on the service now (§ SERVICE_MODEL v3): the
 *  held password rides through on create, and the target-listing doubles as its
 *  check. An OAuth mailbox carries no password — the server lists and watches it
 *  with the stored refresh token (sent via the capability link). */
export function ServiceConfigureStage({
  state,
  update,
  next,
  back,
}: StageProps) {
  const { t } = useTranslation();
  const { activeLink } = useAuth();
  const createWatch = useCreateWatch();
  const testWebhook = useTestWebhook();
  const [webhookResult, setWebhookResult] = useState<WebhookTestResult | null>(
    null,
  );

  const isAddressbook = state.service_type === "addressbook";
  const urlValid = isValidNotifyUrl(state.notify_url);
  const cardUrlValid = isValidCardDavUrl(state.carddav_url);
  const busy = createWatch.isPending;
  const canAdd = urlValid && !busy && (!isAddressbook || cardUrlValid);

  // The wizard holds a password for the password path; an OAuth mailbox has none
  // and lists via its stored credential (sent by the capability link instead).
  const hasPassword = state.password.length > 0;

  // Fetch the folder list for an email service. With a password we list via
  // LOGIN (unauthenticated); for OAuth we send the capability link and the
  // server uses the stored refresh token. Keyed by the connection. (api.rs)
  const mailboxesQuery = useMailboxes({
    imap_host: state.imap_host,
    imap_port: state.imap_port,
    login: state.login,
    password: hasPassword ? state.password : undefined,
    link: hasPassword ? undefined : (activeLink ?? undefined),
    enabled: !isAddressbook && !!state.imap_host && (hasPassword || !!activeLink),
  });
  const mailboxes = mailboxesQuery.data?.mailboxes ?? [];

  // List the collections under the discovered context root — the addressbook
  // dropdown, exactly like the folder picker. Password path sends the held
  // password; OAuth sends the capability link (stored refresh token). (api.rs)
  const davBase = state.carddav_base ?? "";
  const addressbooksQuery = useAddressbooks({
    carddav_url: davBase,
    login: state.login,
    password: hasPassword ? state.password : undefined,
    link: hasPassword ? undefined : (activeLink ?? undefined),
    enabled: isAddressbook && !!davBase && (hasPassword || !!activeLink),
  });
  const addressbooks = addressbooksQuery.data?.addressbooks ?? [];
  // The listing failed (or there's no base URL) — fall back to a pasted URL.
  const davManual = isAddressbook && (!davBase || addressbooksQuery.isError);

  // Default the folder to the first listed one (unless the current pick is in
  // the list) once the folders arrive.
  useEffect(() => {
    if (isAddressbook) return;
    const names = mailboxes.map((m) => m.name);
    if (names.length && !names.includes(state.mailbox))
      update({ mailbox: names[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailboxesQuery.data]);

  // Default to the first listed addressbook (carrying its name) once they load.
  useEffect(() => {
    if (!isAddressbook) return;
    const first = addressbooks[0];
    if (first && !addressbooks.some((b) => b.url === state.carddav_url))
      update({ carddav_url: first.url, mailbox: first.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressbooksQuery.data]);

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

  async function addService() {
    try {
      const secret = state.hmac_secret ?? randomSecret();
      const id = randomWatchId();
      // The password (when held) is stored on the watch; an OAuth mailbox sends
      // none and the server uses its stored credential. The client owns the
      // watch id + HMAC secret so the next step can show the secret once.
      const password = state.password || undefined;
      const body: CreateWatchRequest = isAddressbook
        ? {
            id,
            source_kind: "carddav",
            imap_host: state.imap_host,
            imap_port: state.imap_port,
            login: state.login,
            password,
            // Use the addressbook's own name (from the picker), like a folder.
            mailbox: state.mailbox?.trim() || deriveName(state.carddav_url) || "Addressbook",
            carddav_url: state.carddav_url,
            notify_url: state.notify_url,
            hmac_secret: secret,
            account_id: state.account_id,
            active: true,
          }
        : {
            id,
            imap_host: state.imap_host,
            imap_port: state.imap_port,
            login: state.login,
            password,
            mailbox: state.mailbox,
            notify_url: state.notify_url,
            hmac_secret: secret,
            account_id: state.account_id,
            active: true,
          };
      const result = await createWatch.mutateAsync(body);
      // Free-trial head start: explicit about *why* it's free (first service on
      // this provider). Non-first services on the same provider get nothing.
      if (result.free_trial && result.provider) {
        toast.success(t("services.trialGranted", { provider: result.provider }));
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
      {isAddressbook ? (
        <div className="space-y-2">
          <Label htmlFor="addressbook">{t("services.addressbookPick")}</Label>
          {davManual ? (
            // No listing (server we couldn't enumerate, or wrong credentials):
            // paste the collection URL; its last path segment becomes the name.
            <Input
              id="addressbook"
              type="url"
              placeholder={t("services.carddavUrlPlaceholder")}
              value={state.carddav_url ?? ""}
              onChange={(e) =>
                update({
                  carddav_url: e.target.value,
                  mailbox: deriveName(e.target.value),
                })
              }
            />
          ) : (
            <Select
              id="addressbook"
              value={state.carddav_url ?? ""}
              loading={addressbooksQuery.isFetching}
              onChange={(e) => {
                const book = addressbooks.find((b) => b.url === e.target.value);
                update({
                  carddav_url: e.target.value,
                  mailbox: book?.name ?? state.mailbox,
                });
              }}
            >
              {/* Keep the current value selectable even before the list loads. */}
              {addressbooks.length === 0 && (
                <option value={state.carddav_url ?? ""} disabled>
                  {addressbooksQuery.isFetching
                    ? t("services.addressbooksLoading")
                    : t("services.chooseAddressbook")}
                </option>
              )}
              {addressbooks.map((book) => (
                <option key={book.url} value={book.url}>
                  {book.name}
                </option>
              ))}
            </Select>
          )}
          {addressbooksQuery.isError ? (
            // The listing failed (usually CardDAV auth): say why, and let the
            // user paste the collection URL as a fallback.
            <p className="text-xs text-destructive">
              {t("services.addressbooksError")}
              {addressbooksQuery.error instanceof Error
                ? ` (${addressbooksQuery.error.message})`
                : ""}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {addressbooksQuery.isFetching
                ? t("services.addressbooksLoading")
                : t("services.addressbookPickHint")}
            </p>
          )}
        </div>
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
              loading={mailboxesQuery.isFetching}
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
