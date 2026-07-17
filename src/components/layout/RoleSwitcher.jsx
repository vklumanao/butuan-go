import { useState } from "react";
import { ArrowLeftRight, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  getActiveRole,
  getDashboardPath,
  ROLE_LABELS,
  USER_ROLES,
} from "@/lib/constants";
import { devLog } from "@/lib/errors";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RoleSwitcher({ className = "", onSwitched }) {
  const { profile, switchRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const activeRole = getActiveRole(profile);
  const targetRole =
    activeRole === USER_ROLES.RUNNER ? USER_ROLES.REQUESTOR : USER_ROLES.RUNNER;

  function changeDialog(openState) {
    setOpen(openState);
    if (!openState) setSwitchError("");
  }

  async function handleSwitch() {
    setSwitching(true);
    setSwitchError("");
    const { error } = await switchRole(targetRole);
    setSwitching(false);

    if (error) {
      devLog("Workspace switch failed", error);
      setSwitchError(
        "We could not switch workspaces. Check your connection and try again.",
      );
      return;
    }

    setOpen(false);
    onSwitched?.();
    navigate(getDashboardPath(targetRole), { replace: true });
    toast.success(
      `You are now using ButuanGo as a ${ROLE_LABELS[targetRole]}.`,
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        <ArrowLeftRight className="h-4 w-4" />
        Switch to {ROLE_LABELS[targetRole]}
      </Button>
      <Dialog open={open} onOpenChange={changeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Switch to {ROLE_LABELS[targetRole]} workspace?
            </DialogTitle>
            <DialogDescription>
              Your account, posted requests, accepted tasks, and notifications
              remain unchanged. Only the workspace and available actions will
              switch.
            </DialogDescription>
          </DialogHeader>
          {activeRole === USER_ROLES.RUNNER && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              Any assigned Runner task remains assigned to you. Return to the
              Runner workspace when it needs attention.
            </Alert>
          )}
          {switchError && <Alert variant="destructive">{switchError}</Alert>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={switching}>
                Stay as {ROLE_LABELS[activeRole]}
              </Button>
            </DialogClose>
            <Button onClick={handleSwitch} disabled={switching}>
              {switching && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {switching
                ? "Switching…"
                : `Switch to ${ROLE_LABELS[targetRole]}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
