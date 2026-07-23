import { Outlet } from "react-router-dom";

import { StreamProvider } from "./StreamProvider";

/** Wraps the routed tree in one app-wide live stream. */
export function RootLayout() {
  return (
    <StreamProvider>
      <Outlet />
    </StreamProvider>
  );
}
