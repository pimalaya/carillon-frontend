import { AdminConsole } from "@/features/admin/AdminConsole";

// The localhost-only admin console. Reachable only by typing `/admin`; it
// is deliberately not linked from any nav or menu. Authorization is
// enforced by the backend admin listener (loopback + email whitelist /
// admin token), not here — off-tunnel the admin API 404s and the console
// shows an "unavailable" state (see AdminConsole).
export function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">
        Admin console
      </h1>
      <AdminConsole />
    </div>
  );
}
