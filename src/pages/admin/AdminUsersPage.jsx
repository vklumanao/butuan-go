import { Fragment, useCallback, useEffect, useState } from "react";
import { Search, ShieldBan, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  clearAdminAccountRestriction,
  listAdminAccounts,
} from "@/services/adminService";
import { devLog } from "@/lib/errors";
import { formatDateTime } from "@/lib/requestUtils";
import { ROLE_LABELS } from "@/lib/constants";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clearingId, setClearingId] = useState(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: accountError } = await listAdminAccounts({
      search: submittedSearch,
    });
    if (accountError) {
      devLog("Admin account list failed", accountError);
      setError("We could not load the protected account directory.");
    } else {
      setAccounts(data || []);
    }
    setLoading(false);
  }, [submittedSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadAccounts, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAccounts]);

  function handleSearch(event) {
    event.preventDefault();
    setSubmittedSearch(search.trim());
  }

  async function clearRestriction(account) {
    const confirmed = window.confirm(
      `Clear the active restriction for ${account.full_name}? This action will be added to the Admin audit log.`,
    );
    if (!confirmed) return;
    setClearingId(account.id);
    const { error: clearError } = await clearAdminAccountRestriction(account.id);
    setClearingId(null);
    if (clearError) {
      devLog("Admin restriction clearing failed", clearError);
      toast.error("The account restriction could not be cleared.");
      return;
    }
    toast.success("The account restriction has been cleared.");
    loadAccounts();
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <AdminPageHeader
        title="Account directory"
        description="Review onboarding state, marketplace participation, and active restrictions. Admin access itself remains backend-provisioned."
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
        {loading && <AdminLoadingState message="Loading account directory..." />}
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
                {accounts.length} account{accounts.length === 1 ? "" : "s"}
                {submittedSearch ? " found" : " shown"}
              </p>
              <p className="text-xs text-slate-400">
                Up to 50 newest matching accounts
              </p>
            </div>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
                    <caption className="sr-only">
                      ButuanGo account directory with roles, participation, and
                      restriction controls
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
                        const restricted = Boolean(account.restricted_until);
                        return (
                          <Fragment key={account.id}>
                            <tr
                              className={
                                restricted
                                  ? "bg-red-50/40 align-top"
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
                                {restricted ? (
                                  <Badge className="bg-red-100 text-red-800">
                                    <ShieldBan className="h-3.5 w-3.5" />
                                    Restricted
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-800">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Active
                                  </Badge>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {restricted ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => clearRestriction(account)}
                                    disabled={clearingId === account.id}
                                  >
                                    {clearingId === account.id
                                      ? "Clearing..."
                                      : "Clear restriction"}
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    No action needed
                                  </span>
                                )}
                              </td>
                            </tr>
                            {restricted && (
                              <tr className="bg-red-50/70">
                                <td colSpan={7} className="px-5 pb-4 pt-0">
                                  <div className="rounded-lg border border-red-200 bg-white px-4 py-3 text-xs text-red-900">
                                    <span className="font-bold">
                                      Restricted until{" "}
                                      {formatDateTime(
                                        account.restricted_until,
                                        "",
                                      )}
                                    </span>
                                    <span className="mx-2 text-red-300">·</span>
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
          </div>
        )}
      </div>
    </div>
  );
}
