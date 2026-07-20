import { createBrowserRouter } from 'react-router-dom';

import { RootLayout } from '@/components/layout/RootLayout';
import { RequireAccount } from './RequireAccount';
import { DashboardPage } from './DashboardPage';
import { DeliveriesPage } from './DeliveriesPage';
import { BillingPage } from './BillingPage';
import { SettingsPage } from './SettingsPage';
import { WatchDetailPage } from './WatchDetailPage';
import { OnboardingPage } from './OnboardingPage';
import { WelcomePage } from './WelcomePage';
import { NotFoundPage } from './NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: 'welcome', element: <WelcomePage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      {
        // Everything below requires a stored capability link and renders inside
        // the app shell.
        element: <RequireAccount />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'deliveries', element: <DeliveriesPage /> },
          { path: 'billing', element: <BillingPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'watches/:id', element: <WatchDetailPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
