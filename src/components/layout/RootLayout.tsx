import { Outlet } from 'react-router-dom';

import { StreamProvider } from './StreamProvider';

/** Top-level layout: one live stream for the whole app, then the routed tree. */
export function RootLayout() {
  return (
    <StreamProvider>
      <Outlet />
    </StreamProvider>
  );
}
