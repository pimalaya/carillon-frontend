import { useState } from "react";
import { Search, Settings2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/utils";
import { useDiscover } from "@/api/onboarding";
import type { AuthMethod, ImapChoice } from "@/api/schemas";
import { guessImapHost, type StageProps } from "../types";

/** The auth form a method maps to — the label shown on a choice. */
function authLabel(auth: AuthMethod): string {
  if (auth.kind === "password") return "Password";
  if (auth.kind === "bearer") return "API token";
  return "OAuth";
}

/** Two choices are the same selection iff same server endpoint + auth form. */
function sameChoice(
  a: { host: string; port: number },
  b: ImapChoice,
  auth?: AuthMethod,
) {
  return a.host === b.host && a.port === b.port && auth?.kind === b.auth.kind;
}

function ChoiceCard({
  choice,
  selected,
  onSelect,
}: {
  choice: ImapChoice;
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
        <Badge>{authLabel(choice.auth)}</Badge>
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

export function IdentifyStage({ state, update, next, back }: StageProps) {
  // The "put anything" identifier drives discovery; default to the login we
  // may already hold. A typed email also becomes the default login — the
  // credential form (step 2) asks for the login only when it needs one.
  const [query, setQuery] = useState(state.login);
  const [choices, setChoices] = useState<ImapChoice[] | null>(null);
  const [manual, setManual] = useState(false);
  const discover = useDiscover();

  const selectedNonTls = state.security && state.security !== "tls";
  // A config is chosen once we hold a host + an auth method to continue with.
  const canContinue = state.imap_host.trim().length > 0 && !!state.auth;

  async function runDiscover() {
    const input = query.trim();
    if (!input) return;
    // A typed email is the default login (the folder + login live in later steps).
    if (input.includes("@")) update({ login: input });
    try {
      const res = await discover.mutateAsync(input);
      setChoices(res.choices);
      // Auto-pick the first TLS choice (password comes first per server), else
      // the first choice, so the common path is one step.
      const best =
        res.choices.find((c) => c.security === "tls") ?? res.choices[0];
      if (best) {
        pick(best, input);
        setManual(false);
      } else {
        setManual(true);
        if (!state.imap_host) update({ imap_host: guessImapHost(input) });
      }
    } catch {
      setChoices([]);
      setManual(true);
      if (!state.imap_host) update({ imap_host: guessImapHost(input) });
    }
  }

  function pick(choice: ImapChoice, input = query) {
    update({
      imap_host: choice.host,
      imap_port: choice.port,
      security: choice.security,
      auth: choice.auth,
      login: state.login || (input.includes("@") ? input : ""),
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="identifier">Email address or server</Label>
        <div className="flex gap-2">
          <Input
            id="identifier"
            placeholder="you@example.com  ·  or  imap.example.com"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runDiscover()}
          />
          <Button
            variant="secondary"
            onClick={runDiscover}
            disabled={discover.isPending || !query.trim()}
          >
            {discover.isPending ? <Spinner /> : <Search />}
            Discover
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          We look up your provider’s IMAP settings and how to sign in — just
          pick one.
        </p>
      </div>

      {choices !== null &&
        (choices.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">How do you want to sign in?</p>
            <div className="space-y-2">
              {choices.map((choice, i) => (
                <ChoiceCard
                  key={`${choice.host}:${choice.port}:${choice.auth.kind}:${i}`}
                  choice={choice}
                  selected={sameChoice(
                    { host: state.imap_host, port: state.imap_port },
                    choice,
                    state.auth,
                  )}
                  onSelect={() => pick(choice)}
                />
              ))}
            </div>
          </div>
        ) : (
          <Alert>
            <Search />
            <AlertTitle>No configuration found</AlertTitle>
            <AlertDescription>
              Enter your IMAP server manually below.
            </AlertDescription>
          </Alert>
        ))}

      {selectedNonTls && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>This endpoint isn’t TLS</AlertTitle>
          <AlertDescription>
            Carillon watches over implicit TLS (usually port 993).
            STARTTLS/plain aren’t wired yet — pick a TLS endpoint or set the
            host/port manually.
          </AlertDescription>
        </Alert>
      )}

      {/* Manual override: hidden by default, offered when discovery finds
          nothing (or on request). No login/folder here — those live in the
          later steps. */}
      {!manual ? (
        <button
          type="button"
          onClick={() => setManual(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="size-3.5" />
          Enter server settings manually
        </button>
      ) : (
        <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="host">IMAP host</Label>
            <Input
              id="host"
              placeholder="imap.example.com"
              value={state.imap_host}
              onChange={(e) =>
                update({
                  imap_host: e.target.value,
                  // Manual entry implies a plain password login over TLS.
                  security: state.security ?? "tls",
                  auth: state.auth ?? { kind: "password" },
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="port">Port</Label>
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
          Cancel
        </Button>
        <Button onClick={next} disabled={!canContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
