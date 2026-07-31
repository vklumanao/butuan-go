import { Fragment, useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  LockKeyhole,
  Search,
  Settings2,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  listAdminAccounts,
  restoreAdminAccountAccess,
  setAdminAccountAccess,
} from "@/services/adminService";
import { devLog } from "@/lib/errors";
import { formatDateTime } from "@/lib/requestUtils";
import {
  ACCOUNT_ACCESS_LABELS,
  ACCOUNT_ACCESS_LEVELS,
  ROLE_LABELS,
  USER_ROLES,
} from "@/lib/constants";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminState";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PAGE_SIZE = 10;

function getAccountAccessLevel(account) {
  if (account.access_level) return account.access_level;
  return account.restriction_reason ? ACCOUNT_ACCESS_LEVELS.RESTRICTED : null;
}

function getRemainingDays(value) {
  const end = new Date(value).getTime();
  if (!Number.isFinite(end)) return 7;
  return Math.min(
    365,
    Math.max(1, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000))),
  );
}

function AccessBadge({ account }) {
  if (account.role === USER_ROLES.ADMIN) {
    return (
      <Badge className="bg-violet-100 text-violet-800">
        <ShieldCheck className="h-3.5 w-3.5" />
        Protected Admin
      </Badge>
    );
  }

  const accessLevel = getAccountAccessLevel(account);
  if (accessLevel === ACCOUNT_ACCESS_LEVELS.BANNED) {
    return (
      <Badge className="bg-red-200 text-red-950">
        <ShieldBan className="h-3.5 w-3.5" />
        Permanently banned
      </Badge>
    );
  }
  if (accessLevel === ACCOUNT_ACCESS_LEVELS.SUSPENDED) {
    return (
      <Badge className="bg-red-100 text-red-800">
        <LockKeyhole className="h-3.5 w-3.5" />
        Suspended
      </Badge>
    );
  }
  if (accessLevel === ACCOUNT_ACCESS_LEVELS.RESTRICTED) {
    return (
      <Badge className="bg-amber-100 text-amber-900">
        <ShieldAlert className="h-3.5 w-3.5" />
        Restricted
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-800">
      <ShieldCheck className="h-3.5 w-3.5" />
      Active
    </Badge>
  );
}

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accessLevel, setAccessLevel] = useState(
    ACCOUNT_ACCESS_LEVELS.RESTRICTED,
  );
  const [durationDays, setDurationDays] = useState("7");
  const [reason, setReason] = useState("");
  const [banConfirmation, setBanConfirmation] = useState("");
  const [manageError, setManageError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: accountError } = await listAdminAccounts({
      search: submittedSearch,
      limit: PAGE_SIZE + 1,
      offset: (page - 1) * PAGE_SIZE,
    });
    if (accountError) {
      devLog("Admin account list failed", accountError);
      setError("We could not load the protected account directory.");
    } else {
      const rows = data || [];
      setAccounts(rows.slice(0, PAGE_SIZE));
      setHasNextPage(rows.length > PAGE_SIZE);
    }
    setLoading(false);
  }, [page, submittedSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadAccounts, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAccounts]);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  }

  function openManage(account) {
    const currentAccess =
      getAccountAccessLevel(account) || ACCOUNT_ACCESS_LEVELS.RESTRICTED;
    setSelectedAccount(account);
    setAccessLevel(currentAccess);
    setDurationDays(
      currentAccess === ACCOUNT_ACCESS_LEVELS.BANNED
        ? "7"
        : String(getRemainingDays(account.restricted_until)),
    );
    setReason(account.restriction_reason || "");
    setBanConfirmation("");
    setManageError("");
  }

  function changeManageDialog(open) {
    if (!open && !saving) setSelectedAccount(null);
  }

  async function saveAccessControl() {
    const trimmedReason = reason.trim();
    const days = Number(durationDays);
    setManageError("");

    if (trimmedReason.length < 10) {
      setManageError("Enter a factual reason with at least 10 characters.");
      return;
    }
    if (
      accessLevel !== ACCOUNT_ACCESS_LEVELS.BANNED &&
      (!Number.isInteger(days) || days < 1 || days > 365)
    ) {
      setManageError("Temporary controls require 1 to 365 whole days.");
      return;
    }
    if (
      accessLevel === ACCOUNT_ACCESS_LEVELS.BANNED &&
      banConfirmation !== "BAN"
    ) {
      setManageError('Type "BAN" to confirm the permanent account control.');
      return;
    }

    setSaving(true);
    const { error: saveError } = await setAdminAccountAccess({
      accountId: selectedAccount.id,
      accessLevel,
      reason: trimmedReason,
      durationDays: accessLevel === ACCOUNT_ACCESS_LEVELS.BANNED ? null : days,
    });
    setSaving(false);
    if (saveError) {
      devLog("Admin account access update failed", saveError);
      setManageError(
        saveError.message || "The account control could not be saved.",
      );
      return;
    }

    setSelectedAccount(null);
    toast.success(
      "The account control was recorded and the user was notified.",
    );
    loadAccounts();
  }

  async function restoreAccess() {
    const confirmed = window.confirm(
      `Restore normal marketplace access for ${selectedAccount.full_name}? This action will be added to the Admin audit log.`,
    );
    if (!confirmed) return;

    setSaving(true);
    setManageError("");
    const { error: restoreError } = await restoreAdminAccountAccess(
      selectedAccount.id,
    );
    setSaving(false);
    if (restoreError) {
      devLog("Admin account restoration failed", restoreError);
      setManageError(
        restoreError.message || "The account access could not be restored.",
      );
      return;
    }

    setSelectedAccount(null);
    toast.success("Normal account access was restored.");
    loadAccounts();
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <AdminPageHeader
        title="Account directory"
        description="Review account participation and apply reversible, audited access controls without deleting transaction history."
      />

      <Card className="mt-8">
        <CardContent className="p-4 sm:p-5">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
                placeholder="Search name, email, or account ID"
                aria-label="Search accounts"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6">
        {loading && (
          <AdminLoadingState message="Loading account directory..." />
        )}
        {!loading && error && (
          <AdminErrorState message={error} onRetry={loadAccounts} />
        )}
        {!loading && !error && accounts.length === 0 && (
          <AdminEmptyState
            title="No matching accounts"
            description="Try a different name, email, or exact account ID."
          />
        )}
        {!loading && !error && accounts.length > 0 && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}-
                {(page - 1) * PAGE_SIZE + accounts.length}
                {submittedSearch ? ` for “${submittedSearch}”` : ""}
              </p>
              <p className="text-xs text-slate-400">10 accounts per page</p>
            </div>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
                    <caption className="sr-only">
                      ButuanGo account directory with roles, participation, and
                      account access controls
                    </caption>
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-5 py-3.5 font-bold">
                          Account
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-bold">
                          Workspace
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-bold">
                          Onboarding
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-bold">
                          Participation
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-bold">
                          Joined
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-bold">
                          Status
                        </th>
                        <th
                          scope="col"
                          className="px-5 py-3.5 text-right font-bold"
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {accounts.map((account) => {
                        const accountAccess = getAccountAccessLevel(account);
                        return (
                          <Fragment key={account.id}>
                            <tr
                              className={
                                accountAccess
                                  ? "bg-amber-50/40 align-top"
                                  : "align-top hover:bg-slate-50/70"
                              }
                            >
                              <td className="max-w-80 px-5 py-4">
                                <p className="font-bold text-slate-950">
                                  {account.full_name}
                                </p>
                                <p
                                  className="mt-1 truncate text-xs text-slate-600"
                                  title={account.email}
                                >
                                  {account.email}
                                </p>
                                <p
                                  className="mt-1 truncate font-mono text-[11px] text-slate-400"
                                  title={account.id}
                                >
                                  {account.id}
                                </p>
                              </td>
                              <td className="px-4 py-4">
                                <Badge>
                                  {ROLE_LABELS[account.active_role] ||
                                    account.active_role}
                                </Badge>
                              </td>
                              <td className="px-4 py-4">
                                <p className="font-semibold text-slate-800">
                                  {account.onboarding_completed_at
                                    ? "Completed"
                                    : "Incomplete"}
                                </p>
                                <p className="mt-1 text-xs capitalize text-slate-500">
                                  {account.signup_method}
                                </p>
                              </td>
                              <td className="px-4 py-4">
                                <p className="font-semibold text-slate-800">
                                  {account.request_count} requests
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {account.runner_task_count} Runner tasks
                                </p>
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-700">
                                {formatDateTime(account.created_at, "")}
                              </td>
                              <td className="px-4 py-4">
                                <AccessBadge account={account} />
                              </td>
                              <td className="px-5 py-4 text-right">
                                {account.role === USER_ROLES.ADMIN ? (
                                  <span className="text-xs text-slate-400">
                                    Backend-managed
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openManage(account)}
                                  >
                                    <Settings2 className="h-4 w-4" />
                                    Manage
                                  </Button>
                                )}
                              </td>
                            </tr>
                            {accountAccess && (
                              <tr className="bg-amber-50/70">
                                <td colSpan={7} className="px-5 pb-4 pt-0">
                                  <div className="rounded-lg border border-amber-200 bg-white px-4 py-3 text-xs text-amber-950">
                                    <span className="font-bold">
                                      {ACCOUNT_ACCESS_LABELS[accountAccess] ||
                                        accountAccess}
                                      {accountAccess ===
                                      ACCOUNT_ACCESS_LEVELS.BANNED
                                        ? " - no automatic expiration"
                                        : ` until ${formatDateTime(account.restricted_until, "")}`}
                                    </span>
                                    <span className="mx-2 text-amber-300">
                                      ·
                                    </span>
                                    <span>{account.restriction_reason}</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <nav
              className="mt-4 flex items-center justify-between gap-3"
              aria-label="Account directory pagination"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <p className="text-sm font-semibold text-slate-600">
                Page {page}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((current) => current + 1)}
                disabled={!hasNextPage}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedAccount)} onOpenChange={changeManageDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage account access</DialogTitle>
            <DialogDescription>
              Apply a documented marketplace control to{" "}
              {selectedAccount?.full_name}. This does not delete their Google
              login, profile, or transaction history.
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-5">
              {manageError && (
                <Alert variant="destructive">{manageError}</Alert>
              )}

              <Alert className="border-amber-200 bg-amber-50 text-amber-950">
                Restriction blocks new activity but permits existing
                responsibilities. Suspension and permanent ban are read-only and
                will be rejected while unfinished requests exist.
              </Alert>

              <div>
                <Label htmlFor="accountAccessLevel">Access control</Label>
                <select
                  id="accountAccessLevel"
                  value={accessLevel}
                  onChange={(event) => {
                    setAccessLevel(event.target.value);
                    setBanConfirmation("");
                  }}
                  className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  <option value={ACCOUNT_ACCESS_LEVELS.RESTRICTED}>
                    Restricted - no new requests or tasks
                  </option>
                  <option value={ACCOUNT_ACCESS_LEVELS.SUSPENDED}>
                    Suspended - temporary read-only access
                  </option>
                  <option value={ACCOUNT_ACCESS_LEVELS.BANNED}>
                    Permanently banned - read-only, no expiration
                  </option>
                </select>
              </div>

              {accessLevel !== ACCOUNT_ACCESS_LEVELS.BANNED && (
                <div>
                  <Label htmlFor="accountControlDays">Duration in days</Label>
                  <Input
                    id="accountControlDays"
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    className="mt-2"
                    value={durationDays}
                    onChange={(event) => setDurationDays(event.target.value)}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="accountControlReason">Factual reason</Label>
                <Textarea
                  id="accountControlReason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 min-h-32"
                  maxLength={1000}
                  placeholder="Record the relevant behavior, evidence reviewed, and reason for this control."
                />
                <p className="mt-1 text-right text-xs text-slate-500">
                  {reason.length}/1000
                </p>
              </div>

              {accessLevel === ACCOUNT_ACCESS_LEVELS.BANNED && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <Label htmlFor="permanentBanConfirmation">
                    Type BAN to confirm
                  </Label>
                  <Input
                    id="permanentBanConfirmation"
                    value={banConfirmation}
                    onChange={(event) =>
                      setBanConfirmation(event.target.value.toUpperCase())
                    }
                    className="mt-2 border-red-300"
                    autoComplete="off"
                  />
                  <p className="mt-2 text-xs leading-5 text-red-900">
                    Permanent bans have no automatic expiration. Another Admin
                    action is required to restore access.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {selectedAccount && getAccountAccessLevel(selectedAccount) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={restoreAccess}
                  disabled={saving}
                >
                  Restore normal access
                </Button>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <DialogClose asChild>
                <Button variant="outline" disabled={saving}>
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={saveAccessControl} disabled={saving}>
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save account control"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
