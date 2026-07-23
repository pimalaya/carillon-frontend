import { useNavigate } from "react-router-dom";

import { ServiceWizard } from "@/features/services/ServiceWizard";

/** Hosts the add-service flow; the credential collected here is stored on the
 *  service. Renders inside the app shell (requires a capability link). */
export function ServiceWizardPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl py-6">
      <ServiceWizard onCancel={() => navigate("/")} onDone={() => navigate("/")} />
    </div>
  );
}
