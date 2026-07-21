import { useEffect, useState } from "react";
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
import { useMailboxes, useTestWebhook } from "@/api/onboarding";
import { useCreateWatch } from "@/api/watches";
import type { WebhookTestResult } from "@/api/schemas";
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

/** "Add service" — configure a Watch IMAP service on an already-authenticated
 *  PIM account. The credential lives on the account (stored at "Add account"),
 *  so the service is created with no password — the server reuses it. */
export function ServiceConfigureStage({
  state,
  update,
  next,
  back,
  options,
  onSelectAccount,
}: ServiceConfigureProps) {
  const { activeLink } = useAuth();
  const createWatch = useCreateWatch();
  const testWebhook = useTestWebhook();
  const [webhookResult, setWebhookResult] = useState<WebhookTestResult | null>(
    null,
  );

  const urlValid = isValidNotifyUrl(state.notify_url);
  const busy = createWatch.isPending;

  // Fetch the folder list for the chosen PIM account. The list is authenticated
  // with the account's stored credential — we send the capability link and an
  // empty password, and the server resolves it. Keyed by the connection, so
  // switching accounts refetches. (api.rs /mailboxes)
  const mailboxesQuery = useMailboxes({
    imap_host: state.imap_host,
    imap_port: state.imap_port,
    login: state.login,
    link: activeLink ?? undefined,
    enabled: !!state.mailbox_key && !!state.imap_host,
  });
  const mailboxes = mailboxesQuery.data?.mailboxes ?? [];

  // Default the folder to the first listed one (unless the current pick is in
  // the list) once the folders arrive.
  useEffect(() => {
    const names = mailboxes.map((m) => m.name);
    if (names.length && !names.includes(state.mailbox))
      update({ mailbox: names[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailboxesQuery.data]);

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
            ? "Too many attempts — wait a moment before trying again."
            : "Could not reach the endpoint.",
      });
    }
  }

  async function addService() {
    try {
      const secret = state.hmac_secret ?? randomSecret();
      const id = randomWatchId();
      // No password: the credential lives on the PIM account and the server
      // reuses it. The client owns the watch id + HMAC secret so the next step
      // can show the secret once.
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
      update({ watchId: id, hmac_secret: secret });
      next();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          `A service already watches ${state.mailbox} on ${state.login}.`,
        );
      } else {
        toast.error("Could not add the service. Please try again.");
      }
    }
  }

  return (
    <div className="space-y-5">
      {options.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="account">Account</Label>
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
            The service watches a folder on this account, reusing its stored
            credential.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="mailbox">Folder to watch</Label>
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
            ? "Loading your folders…"
            : mailboxesQuery.isError
              ? "Couldn’t list folders — type the folder name to watch."
              : "One service watches one folder. The inbox is the usual choice."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notify">Notify URL</Label>
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
            Test
          </Button>
        </div>
        {state.notify_url && !urlValid && (
          <p className="text-xs text-destructive">
            Must be https:// (or http:// on localhost for a local sink).
          </p>
        )}
        {webhookResult &&
          (webhookResult.ok ? (
            <p className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="size-3.5" />
              Endpoint acknowledged
              {webhookResult.status ? ` (HTTP ${webhookResult.status})` : ""}.
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <XCircle className="size-3.5" />
              {webhookResult.error ?? "Endpoint did not acknowledge."}
            </p>
          ))}
      </div>

      <Alert>
        <Webhook />
        <AlertTitle>Signed, content-free webhooks</AlertTitle>
        <AlertDescription>
          Each change POSTs <code>{"{account, event, uid}"}</code> — never
          message content — signed with HMAC-SHA256. You’ll get the signing
          secret on the next step.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back} disabled={busy}>
          Back
        </Button>
        <Button onClick={addService} disabled={!urlValid || busy}>
          {busy ? <Spinner /> : <Rocket />}
          Add service
        </Button>
      </div>
    </div>
  );
}
