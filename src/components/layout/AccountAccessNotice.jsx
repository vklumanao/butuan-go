import { useCallback, useEffect, useState } from "react";
import { LockKeyhole, ShieldAlert } from "lucide-react";
import { getMyAccountAccess } from "@/services/accountAccessService";
import {
  ACCOUNT_ACCESS_LABELS,
  ACCOUNT_ACCESS_LEVELS,
} from "@/lib/constants";
import { devLog } from "@/lib/errors";
import { formatDateTime } from "@/lib/requestUtils";
import { Alert } from "@/components/ui/alert";

export function AccountAccessNotice() {
  const [control, setControl] = useState(null);

  const loadControl = useCallback(async () => {
    const { data, error } = await getMyAccountAccess();
    if (error) {
      devLog("Account access notice failed", error);
      return;
    }
    setControl(data);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadControl, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadControl]);

  if (!control) return null;

  const readOnly = [
    ACCOUNT_ACCESS_LEVELS.SUSPENDED,
    ACCOUNT_ACCESS_LEVELS.BANNED,
  ].includes(control.access_level);
  const permanent = control.access_level === ACCOUNT_ACCESS_LEVELS.BANNED;
  const Icon = readOnly ? LockKeyhole : ShieldAlert;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-8">
      <Alert
        className={
          readOnly
            ? "border-red-300 bg-red-50 text-red-950"
            : "border-amber-300 bg-amber-50 text-amber-950"
        }
      >
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">
              Account {ACCOUNT_ACCESS_LABELS[control.access_level] || "limited"}
            </p>
            <p className="mt-1 text-sm leading-6">
              {readOnly
                ? "Marketplace actions are read-only. You can still review existing records and submit a relevant dispute or safety report."
                : "You cannot create new requests or accept new tasks, but existing transaction responsibilities remain available."}
            </p>
            <p className="mt-2 text-sm leading-6">
              <span className="font-semibold">Recorded reason:</span>{" "}
              {control.reason}
            </p>
            <p className="mt-1 text-xs opacity-75">
              {permanent
                ? "This control has no automatic expiration."
                : `Scheduled until ${formatDateTime(control.restricted_until, "")}.`}
            </p>
          </div>
        </div>
      </Alert>
    </div>
  );
}
