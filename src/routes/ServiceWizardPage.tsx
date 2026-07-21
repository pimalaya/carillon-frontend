import { useNavigate, useSearchParams } from "react-router-dom";

import { ServiceWizard } from "@/features/services/ServiceWizard";

/** "Add service" — a per-PIM-account flow to add a Watch IMAP service. Renders
 *  inside the app shell (requires a capability link). `?account=<mailbox_key>`
 *  preselects the target PIM account. */
export function ServiceWizardPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectKey = params.get("account") ?? undefined;

  return (
    <div className="mx-auto max-w-2xl py-6">
      <ServiceWizard
        preselectKey={preselectKey}
        onCancel={() => navigate("/")}
        onDone={() => navigate("/")}
      />
    </div>
  );
}
