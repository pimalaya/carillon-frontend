import { useNavigate } from "react-router-dom";

import { ServiceWizard } from "@/features/services/ServiceWizard";

/** "Add service" — the single flow to add a watch (email folder or CardDAV
 *  addressbook). Renders inside the app shell (requires a capability link). The
 *  credential is collected in the flow and stored on the service. */
export function ServiceWizardPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl py-6">
      <ServiceWizard onCancel={() => navigate("/")} onDone={() => navigate("/")} />
    </div>
  );
}
