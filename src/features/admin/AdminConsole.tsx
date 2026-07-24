import { useState } from "react";
import { toast } from "sonner";

import {
  useAccountWatches,
  useAdminAccounts,
  useAdminOverview,
  useAdjustCredits,
  useSetBlocked,
  type AdminAccount,
} from "@/api/admin";
import { ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Whether an error means the admin API simply isn't reachable here —
 *  the expected state when the SPA is loaded outside the SSH tunnel, where
 *  the admin routes 404 (they are not mounted on the public listener). */
function isUnavailable(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 404;
  // A bare network/CORS failure (no server on this origin) also counts.
  return error instanceof TypeError;
}

function days(seconds: number): number {
  return Math.round(seconds / 86_400);
}

function formatDate(secs: number | null): string {
  if (!secs) return "—";
  return new Date(secs * 1000).toLocaleDateString();
}

export function AdminConsole() {
  const overview = useAdminOverview();
  const accounts = useAdminAccounts();

  if (overview.isLoading || accounts.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (isUnavailable(overview.error) || isUnavailable(accounts.error)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin API not available</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            The admin API did not answer on this origin. It is served only on
            the backend&rsquo;s loopback listener; reach it over an SSH tunnel
            (e.g.{" "}
            <code className="rounded bg-muted px-1">
              ssh -L 3001:127.0.0.1:3001 host
            </code>
            ) and open this page at{" "}
            <code className="rounded bg-muted px-1">
              http://127.0.0.1:3001/admin
            </code>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  if (overview.isError || accounts.isError) {
    const error = overview.error ?? accounts.error;
    const forbidden = error instanceof ApiError && error.status === 403;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin request failed</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {forbidden
            ? "This session is not authorized for the admin console (not a whitelisted admin email)."
            : "Could not load admin data. Check the backend logs."}
        </CardContent>
      </Card>
    );
  }

  const stats = overview.data!;
  const rows = accounts.data ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Accounts" value={stats.total_accounts} />
        <StatCard
          label={`New (last ${days(stats.signup_window_secs)}d)`}
          value={stats.recent_signups}
        />
        <StatCard label="Credits in pool" value={stats.total_credits} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Adjust</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No accounts yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function AccountRow({ account }: { account: AdminAccount }) {
  const [delta, setDelta] = useState("");
  const [open, setOpen] = useState(false);
  const adjust = useAdjustCredits();
  const block = useSetBlocked();

  const applyDelta = () => {
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) {
      toast.error("Enter a non-zero whole number of credits.");
      return;
    }
    adjust.mutate(
      { id: account.id, delta: n },
      {
        onSuccess: (res) => {
          setDelta("");
          toast.success(`${account.email ?? account.id}: ${res.credits} credits`);
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError && err.status === 409
              ? "Not enough credits to remove."
              : "Credit adjustment failed.",
          ),
      },
    );
  };

  const toggleBlock = () => {
    const next = !account.blocked;
    block.mutate(
      { id: account.id, blocked: next },
      {
        onSuccess: () =>
          toast.success(
            `${account.email ?? account.id} ${next ? "blocked" : "unblocked"}`,
          ),
        onError: () => toast.error("Could not update block state."),
      },
    );
  };

  // Clicking the row opens the services dialog; the interactive cells
  // (credit adjust, block) stop propagation so their controls still work.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => setOpen(true)}
        title="View services"
      >
        <TableCell>
          <div className="font-medium">{account.email ?? "(no email)"}</div>
          <div className="text-xs text-muted-foreground">{account.id}</div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDate(account.created_at)}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {account.credits}
        </TableCell>
        <TableCell onClick={stop}>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="±"
              className="h-8 w-20"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={applyDelta}
              disabled={adjust.isPending}
            >
              Apply
            </Button>
          </div>
        </TableCell>
        <TableCell className="text-right" onClick={stop}>
          <div className="flex items-center justify-end gap-2">
            {account.blocked && <Badge variant="destructive">blocked</Badge>}
            <Button
              size="sm"
              variant={account.blocked ? "outline" : "destructive"}
              onClick={toggleBlock}
              disabled={block.isPending}
            >
              {account.blocked ? "Unblock" : "Block"}
            </Button>
          </div>
        </TableCell>
      </TableRow>
      <WatchesDialog account={account} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Dialog listing one account's services (watches), lazy-loaded while
 *  open. */
function WatchesDialog({
  account,
  open,
  onOpenChange,
}: {
  account: AdminAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const watches = useAccountWatches(account.id, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Services</DialogTitle>
          <DialogDescription>{account.email ?? account.id}</DialogDescription>
        </DialogHeader>

        {watches.isLoading && (
          <p className="text-sm text-muted-foreground">Loading services…</p>
        )}
        {watches.isError && (
          <p className="text-sm text-muted-foreground">
            Could not load services.
          </p>
        )}
        {watches.data && watches.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No services.</p>
        )}
        {watches.data && watches.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Watches until</TableHead>
                <TableHead className="text-right">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {watches.data.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <div className="font-medium">{w.mailbox}</div>
                    <div className="text-xs text-muted-foreground">
                      {w.source_kind}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {w.login}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {w.provider || w.imap_host}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(w.watching_until ?? null)}
                  </TableCell>
                  <TableCell className="text-right">
                    {w.active ? (
                      <Badge variant="muted">active</Badge>
                    ) : (
                      <Badge variant="warning">paused</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
