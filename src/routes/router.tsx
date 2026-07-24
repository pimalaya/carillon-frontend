import { createBrowserRouter } from "react-router-dom";

import { RootLayout } from "@/components/layout/RootLayout";
import { RequireAccount } from "./RequireAccount";
import { DashboardPage } from "./DashboardPage";
import { DeliveriesPage } from "./DeliveriesPage";
import { BillingPage } from "./BillingPage";
import { SettingsPage } from "./SettingsPage";
import { WatchDetailPage } from "./WatchDetailPage";
import { ServiceWizardPage } from "./ServiceWizardPage";
import { WelcomePage } from "./WelcomePage";
import { VerifyPage } from "./VerifyPage";
import { AdminPage } from "./AdminPage";
import { NotFoundPage } from "./NotFoundPage";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "welcome", element: <WelcomePage /> },
      { path: "verify", element: <VerifyPage /> },
      // Localhost-only admin console (§ admin-route). Outside RequireAccount:
      // admin authorization is enforced by the backend loopback listener, not
      // by the capability-link gate. Not linked from any nav — type /admin.
      { path: "admin", element: <AdminPage /> },
      {
        // Children require a stored capability link and render in the app shell.
        element: <RequireAccount />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "services/new", element: <ServiceWizardPage /> },
          { path: "deliveries", element: <DeliveriesPage /> },
          { path: "billing", element: <BillingPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "watches/:id", element: <WatchDetailPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
