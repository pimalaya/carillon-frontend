import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignout } from "@/api/onboarding";
import { useMe } from "@/api/me";
import { useAuth } from "@/lib/auth";

export function SettingsPanel() {
  const navigate = useNavigate();
  const { active, renameAccount, removeAccount, clearAll } = useAuth();
  const signout = useSignout();
  const { data: me } = useMe();
  const [label, setLabel] = useState(active?.label ?? "");

  if (!active) return null;

  function doSignout(everywhere: boolean) {
    // Best-effort server-side revoke, then drop the link locally.
    signout.mutate(undefined, {
      onSettled: () => {
        if (everywhere) clearAll();
        else if (active) removeAccount(active.id);
        navigate("/");
      },
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4 text-muted-foreground" />
            Account
          </CardTitle>
          <CardDescription>
            Your account is your email. Sign in again with it on any device — no
            password, nothing to copy or keep.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-md space-y-4">
          <div>
            <Label>Signed in as</Label>
            <div className="mt-1 flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
              {me?.balance.email ?? active.label}
            </div>
          </div>
          <div>
            <Label htmlFor="acct-label">Name</Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="acct-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  renameAccount(active.id, label.trim() || active.label);
                  toast.success("Renamed");
                }}
              >
                Save
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              A local label for the account switcher.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-muted-foreground" />
            Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href="https://carillon.pimalaya.org/docs/verify"
              target="_blank"
              rel="noreferrer"
            >
              Verify a signature
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href="https://carillon.pimalaya.org/docs/self-host"
              target="_blank"
              rel="noreferrer"
            >
              Self-host guide
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sign out</CardTitle>
          <CardDescription>
            Ends this session on this device and revokes it server-side.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={signout.isPending}
            onClick={() => doSignout(false)}
          >
            <LogOut />
            Sign out of this account
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={signout.isPending}
            onClick={() => doSignout(true)}
          >
            Sign out everywhere
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
