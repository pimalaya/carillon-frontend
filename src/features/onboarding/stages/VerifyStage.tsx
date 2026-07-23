import { Mailbox, PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SecretField } from "@/components/SecretField";
import { DeliveriesLog } from "@/features/deliveries/DeliveriesLog";
import { useDeliveries } from "@/api/deliveries";
import type { StageProps } from "../types";

export function VerifyStage({ state, next, back }: StageProps) {
  // Fed by the app-wide SSE stream; fills once the watch settles and the mailbox
  // next changes. Read-only: Carillon never writes to the mailbox.
  const { data } = useDeliveries({ watchId: state.watchId });
  const fired = (data?.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      {state.hmac_secret && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Signing secret</p>
          <SecretField value={state.hmac_secret} />
          <p className="text-xs text-muted-foreground">
            Store it now — it verifies every webhook’s HMAC signature.{" "}
            <a
              className="underline underline-offset-2"
              href="https://carillon.pimalaya.org/docs/verify"
              target="_blank"
              rel="noreferrer"
            >
              How to verify
            </a>
          </p>
        </div>
      )}

      {fired ? (
        <Alert variant="success">
          <PartyPopper />
          <AlertTitle>It works</AlertTitle>
          <AlertDescription>
            Carillon saw a change and fired your webhook. You’re all set.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Mailbox />
          <AlertTitle>Send yourself an email</AlertTitle>
          <AlertDescription>
            Send a message to <strong>{state.login}</strong> (or just wait for
            the next one). The delivery appears below the instant Carillon
            notices — no test button, because Carillon never writes to your
            mailbox.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Live delivery log</p>
        <DeliveriesLog
          watchId={state.watchId}
          emptyHint="Waiting for the first change… this updates live."
        />
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={back}>
          Back
        </Button>
        <Button onClick={next}>Continue</Button>
      </div>
    </div>
  );
}
