import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  BookUser,
  Mail,
  Search,
  Settings2,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/utils";
import { useDiscover, useDiscoverContacts } from "@/api/onboarding";
import type { AuthMethod, CardDavChoice, ImapChoice } from "@/api/schemas";
import { guessImapHost, type StageProps } from "../types";

/** The auth form a method maps to — the label shown on a choice. */
function authLabel(auth: AuthMethod, t: TFunction): string {
  if (auth.kind === "password") return t("onboarding.authPassword");
  if (auth.kind === "bearer") return t("onboarding.authToken");
  return t("onboarding.authOauth");
}

/** Two IMAP choices are the same selection iff same endpoint + auth form. */
function sameImap(
  a: { host: string; port: number },
  b: ImapChoice,
  auth?: AuthMethod,
) {
  return a.host === b.host && a.port === b.port && auth?.kind === b.auth.kind;
}

function ImapChoiceCard({
  choice,
  label,
  selected,
  onSelect,
}: {
  choice: ImapChoice;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors",
        selected ? "border-primary ring-1 ring-primary" : "hover:bg-muted/50",
      )}
    >
      <div className="flex items-center gap-2">
        <Badge>{label}</Badge>
        <span className="font-mono text-sm">
          {choice.host}:{choice.port}
        </span>
      </div>
      <Badge variant={choice.security === "tls" ? "secondary" : "outline"}>
        {choice.security.toUpperCase()}
      </Badge>
    </button>
  );
}

function DavChoiceCard({
  choice,
  label,
  selected,
  onSelect,
}: {
  choice: CardDavChoice;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border p-3 text-left transition-colors",
        selected ? "border-primary ring-1 ring-primary" : "hover:bg-muted/50",
      )}
    >
      <Badge>{label}</Badge>
      <span className="truncate font-mono text-xs">{choice.url}</span>
    </button>
  );
}

/** The Email / Contacts type cards — intent before any technical choice. */
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

export function IdentifyStage({ state, update, next, back }: StageProps) {
  const { t } = useTranslation();
  const serviceType = state.service_type ?? "email";
  const isContacts = serviceType === "addressbook";
  const [query, setQuery] = useState(state.login);
  const [imapChoices, setImapChoices] = useState<ImapChoice[] | null>(null);
  const [davChoices, setDavChoices] = useState<CardDavChoice[] | null>(null);
  const [manual, setManual] = useState(false);
  const discover = useDiscover();
  const discoverContacts = useDiscoverContacts();

  const selectedNonTls = state.security && state.security !== "tls";
  const canContinue = isContacts
    ? !!state.carddav_base && state.carddav_base.trim().length > 0
    : state.imap_host.trim().length > 0 && !!state.auth;
  const busy = discover.isPending || discoverContacts.isPending;

  /** The identity host for a CardDAV context root (keys the mailbox, keeps the
   *  login stable across the flow). */
  function davHost(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return "";
    }
  }

  function chooseType(type: "email" | "addressbook") {
    if (type === serviceType) return;
    setImapChoices(null);
    setDavChoices(null);
    setManual(false);
    update({ service_type: type });
  }

  function pickImap(choice: ImapChoice, input = query) {
    update({
      imap_host: choice.host,
      imap_port: choice.port,
      security: choice.security,
      auth: choice.auth,
      login: state.login || (input.includes("@") ? input : ""),
    });
  }

  function pickDav(choice: CardDavChoice, input = query) {
    update({
      // The discovered URL is the context root; the collection is picked later.
      carddav_base: choice.url,
      imap_host: davHost(choice.url),
      // Respect the choice's auth form (the credential form shows next).
      auth: choice.auth,
      login: state.login || (input.includes("@") ? input : ""),
    });
  }

  async function runDiscover() {
    const input = query.trim();
    if (!input) return;
    if (input.includes("@")) update({ login: input });

    if (isContacts) {
      try {
        const res = await discoverContacts.mutateAsync(input);
        // The server emits a Password choice first, then an OAuth one when the
        // endpoint advertises it — show both, defaulting to Password.
        setDavChoices(res.choices);
        const best = res.choices[0];
        if (best) {
          pickDav(best, input);
          setManual(false);
        } else {
          setManual(true);
        }
      } catch {
        setDavChoices([]);
        setManual(true);
      }
      return;
    }

    try {
      const res = await discover.mutateAsync(input);
      setImapChoices(res.choices);
      const best =
        res.choices.find((c) => c.security === "tls") ?? res.choices[0];
      if (best) {
        pickImap(best, input);
        setManual(false);
      } else {
        setManual(true);
        if (!state.imap_host) update({ imap_host: guessImapHost(input) });
      }
    } catch {
      setImapChoices([]);
      setManual(true);
      if (!state.imap_host) update({ imap_host: guessImapHost(input) });
    }
  }

  return (
    <div className="space-y-5">
      {/* Intent first: what to watch, before any technical choice. */}
      <div className="space-y-2">
        <Label>{t("onboarding.whatToWatch")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <TypeCard
            active={!isContacts}
            icon={<Mail className="size-4" />}
            title={t("onboarding.email")}
            hint={t("onboarding.emailHint")}
            onClick={() => chooseType("email")}
          />
          <TypeCard
            active={isContacts}
            icon={<BookUser className="size-4" />}
            title={t("onboarding.contacts")}
            hint={t("onboarding.contactsHint")}
            onClick={() => chooseType("addressbook")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="identifier">{t("onboarding.identifier")}</Label>
        <div className="flex gap-2">
          <Input
            id="identifier"
            placeholder={t("onboarding.identifierPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runDiscover()}
          />
          <Button
            variant="secondary"
            onClick={runDiscover}
            disabled={busy || !query.trim()}
          >
            {busy ? <Spinner /> : <Search />}
            {t("onboarding.discover")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isContacts ? t("onboarding.hintContacts") : t("onboarding.hintEmail")}
        </p>
      </div>

      {/* Discovered choices, per kind. */}
      {!isContacts &&
        imapChoices !== null &&
        (imapChoices.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("onboarding.signInHow")}</p>
            <div className="space-y-2">
              {imapChoices.map((choice, i) => (
                <ImapChoiceCard
                  key={`${choice.host}:${choice.port}:${choice.auth.kind}:${i}`}
                  choice={choice}
                  label={authLabel(choice.auth, t)}
                  selected={sameImap(
                    { host: state.imap_host, port: state.imap_port },
                    choice,
                    state.auth,
                  )}
                  onSelect={() => pickImap(choice)}
                />
              ))}
            </div>
          </div>
        ) : (
          <Alert>
            <Search />
            <AlertTitle>{t("onboarding.noImapFound")}</AlertTitle>
            <AlertDescription>
              {t("onboarding.noImapFoundBody")}
            </AlertDescription>
          </Alert>
        ))}

      {isContacts &&
        davChoices !== null &&
        (davChoices.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t("onboarding.foundDavServer")}
            </p>
            <div className="space-y-2">
              {davChoices.map((choice, i) => (
                <DavChoiceCard
                  key={`${choice.url}:${choice.auth.kind}:${i}`}
                  choice={choice}
                  label={authLabel(choice.auth, t)}
                  selected={
                    state.carddav_base === choice.url &&
                    state.auth?.kind === choice.auth.kind
                  }
                  onSelect={() => pickDav(choice)}
                />
              ))}
            </div>
          </div>
        ) : (
          <Alert>
            <Search />
            <AlertTitle>{t("onboarding.noDavFound")}</AlertTitle>
            <AlertDescription>{t("onboarding.noDavFoundBody")}</AlertDescription>
          </Alert>
        ))}

      {!isContacts && selectedNonTls && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>{t("onboarding.notTls")}</AlertTitle>
          <AlertDescription>{t("onboarding.notTlsBody")}</AlertDescription>
        </Alert>
      )}

      {/* Manual override. */}
      {!manual ? (
        <button
          type="button"
          onClick={() => setManual(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="size-3.5" />
          {t("onboarding.enterManually")}
        </button>
      ) : isContacts ? (
        <div className="space-y-1.5 rounded-lg border p-4">
          <Label htmlFor="dav-url">{t("onboarding.davUrl")}</Label>
          <Input
            id="dav-url"
            type="url"
            placeholder="https://carddav.example.com/"
            value={state.carddav_base ?? ""}
            onChange={(e) =>
              update({
                carddav_base: e.target.value,
                imap_host: davHost(e.target.value),
                auth: state.auth ?? { kind: "password" },
              })
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="host">{t("onboarding.imapHost")}</Label>
            <Input
              id="host"
              placeholder="imap.example.com"
              value={state.imap_host}
              onChange={(e) =>
                update({
                  imap_host: e.target.value,
                  security: state.security ?? "tls",
                  auth: state.auth ?? { kind: "password" },
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="port">{t("onboarding.port")}</Label>
            <Input
              id="port"
              type="number"
              value={state.imap_port}
              onChange={(e) => update({ imap_port: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back}>
          {t("onboarding.cancel")}
        </Button>
        <Button onClick={next} disabled={!canContinue}>
          {t("onboarding.continue")}
        </Button>
      </div>
    </div>
  );
}
