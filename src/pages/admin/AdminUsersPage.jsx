import { useCallback, useEffect, useState } from "react";
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
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
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
        {loading && <AdminLoadingState message="Loading account directory…" />}
        {!loading && error && <AdminErrorState message={error} onRetry={loadAccounts} />}
        {!loading && !error && accounts.length === 0 && (
          <AdminEmptyState title="No matching accounts" description="Try a different name, email, or exact account ID." />
        )}
        {!loading && !error && accounts.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-500">Showing up to 50 newest matching accounts</p>
            {accounts.map((account) => {
              const restricted = Boolean(account.restricted_until);
              return (
                <Card key={account.id} className={restricted ? "border-red-200" : ""}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{ROLE_LABELS[account.active_role] || account.active_role}</Badge>
                          {restricted ? (
                            <Badge className="bg-red-100 text-red-800"><ShieldBan className="h-3.5 w-3.5" />Restricted</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800"><ShieldCheck className="h-3.5 w-3.5" />No active restriction</Badge>
                          )}
                        </div>
                        <h2 className="mt-3 text-lg font-black text-slate-950">{account.full_name}</h2>
                        <p className="mt-1 break-all text-sm text-slate-600">{account.email}</p>
                        <p className="mt-2 break-all font-mono text-xs text-slate-400">{account.id}</p>
                      </div>
                      {restricted && (
                        <Button
                          variant="outline"
                          onClick={() => clearRestriction(account)}
                          disabled={clearingId === account.id}
                        >
                          {clearingId === account.id ? "Clearing…" : "Clear restriction"}
                        </Button>
                      )}
                    </div>

                    <div className="mt-5 grid gap-3 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Onboarding</p>
                        <p className="mt-1 font-semibold text-slate-800">{account.onboarding_completed_at ? "Completed" : "Incomplete"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Participation</p>
                        <p className="mt-1 font-semibold text-slate-800">{account.request_count} requests · {account.runner_task_count} tasks</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Joined</p>
                        <p className="mt-1 font-semibold text-slate-800">{formatDateTime(account.created_at, "")}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Sign-up method</p>
                        <p className="mt-1 font-semibold capitalize text-slate-800">{account.signup_method}</p>
                      </div>
                    </div>

                    {restricted && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                        <p className="font-bold">Restricted until {formatDateTime(account.restricted_until, "")}</p>
                        <p className="mt-1 leading-6">{account.restriction_reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
