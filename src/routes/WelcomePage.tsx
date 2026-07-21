import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileSignature, Radio, Wallet } from 'lucide-react';

import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { config } from '@/lib/config';

const POINTS = [
  {
    icon: Radio,
    title: 'Signal, not sync',
    body: 'We hold IMAP IDLE and fire the instant a mailbox changes. No polling, no mirror.',
  },
  {
    icon: FileSignature,
    title: 'Content-free & signed',
    body: 'Webhooks carry {account, event, uid} only — HMAC-signed. Never your message content.',
  },
  {
    icon: Wallet,
    title: 'One simple subscription',
    body: '€1/month per mailbox — cancel anytime. New mailboxes start with a free trial.',
  },
];

export function WelcomePage() {
  const navigate = useNavigate();
  const { addAccount } = useAuth();

  async function exploreDemo() {
    const { DEMO_LINK } = await import('@/mocks/db');
    addAccount({ label: 'demo@fastmail.com', link: DEMO_LINK });
    navigate('/');
  }

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 py-16">
      <Brand />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">
        Know the instant your mailbox changes.
      </h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Carillon is a hosted watcher that turns a change on a remote mailbox into a signed,
        content-free webhook — no signup, no mailbox writes.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => navigate('/onboarding')}>
          Get started
          <ArrowRight />
        </Button>
        {config.mocksEnabled && (
          <Button size="lg" variant="outline" onClick={exploreDemo}>
            Explore the demo
          </Button>
        )}
      </div>

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
