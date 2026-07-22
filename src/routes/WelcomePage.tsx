import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSignature, Loader2, Mail, Radio, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Brand } from "@/components/layout/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useRequestMagicLink } from "@/api/magic";
import { config } from "@/lib/config";

const POINTS = [
  {
    icon: Radio,
    title: "Signal, not sync",
    body: "We hold IMAP IDLE and fire the instant a mailbox changes. No polling, no mirror.",
  },
  {
    icon: FileSignature,
    title: "Content-free & signed",
    body: "Webhooks carry {account, event, uid} only — HMAC-signed. Never your message content.",
  },
  {
    icon: Wallet,
    title: "Pay per service",
    body: "€2.50/month per service — a watched folder. Buy credits in packs of 4 — spend them when you like.",
  },
];

export function WelcomePage() {
  const navigate = useNavigate();
  const { addAccount } = useAuth();
  const requestLink = useRequestMagicLink();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function exploreDemo() {
    const { DEMO_LINK } = await import("@/mocks/db");
    addAccount({ label: "demo@fastmail.com", link: DEMO_LINK });
    navigate("/");
  }

  function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    requestLink.mutate(value, {
      onSuccess: () => setSent(true),
      onError: () =>
        toast.error("Could not send the sign-in email — try again"),
    });
  }

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 py-16">
      <Brand />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">
        Know the instant your mailbox changes.
      </h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Carillon is a hosted watcher that turns a change on a remote mailbox
        into a signed, content-free webhook — no mailbox writes.
      </p>

      {/* Magic-link sign-in — the primary way into an account. */}
      <div className="mt-8 max-w-md">
        {sent ? (
          <div className="rounded-lg border bg-secondary/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="size-4 text-success" />
              Check your inbox
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a sign-in link to{" "}
              <span className="font-medium">{email}</span>. Open it to continue
              — it expires shortly.
            </p>
            <Button
              variant="link"
              className="mt-1 h-auto p-0"
              onClick={() => setSent(false)}
            >
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="flex gap-2">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={requestLink.isPending}>
              {requestLink.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Mail />
              )}
              Email me a link
            </Button>
          </form>
        )}
      </div>

      {/* A magic link is the only way in — it creates/opens the Carillon
          account that PIM accounts are then attached to. (Demo is dev-only.) */}
      {config.mocksEnabled && (
        <div className="mt-6">
          <Button variant="ghost" onClick={exploreDemo}>
            Explore the demo
          </Button>
        </div>
      )}

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Icon className="size-4" />
            </span>
            <h3 className="mt-3 text-sm font-medium">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
