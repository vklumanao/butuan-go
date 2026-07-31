import { supabase } from "@/lib/supabase";

function normalizeRpcRow(data) {
  return Array.isArray(data) ? data[0] || null : data;
}

export async function getAdminDashboardSummary() {
  const { data, error } = await supabase.rpc("admin_get_dashboard_summary");
  return { data: normalizeRpcRow(data), error };
}

export async function listAdminAccounts({
  search = "",
  limit = 50,
  offset = 0,
} = {}) {
  return supabase.rpc("admin_list_accounts", {
    p_search: search.trim() || null,
    p_limit: limit,
    p_offset: offset,
  });
}

export async function listAdminRequests({
  status = "ALL",
  search = "",
  limit = 50,
} = {}) {
  return supabase.rpc("admin_list_requests", {
    p_status: status,
    p_search: search.trim() || null,
    p_limit: limit,
    p_offset: 0,
  });
}

export async function listAdminDisputes({
  status = "OPEN",
  limit = 50,
} = {}) {
  return supabase.rpc("admin_list_disputes", {
    p_status: status,
    p_limit: limit,
    p_offset: 0,
  });
}

export async function listAdminAuditEvents(limit = 50) {
  return supabase.rpc("admin_list_audit_events", {
    p_limit: limit,
    p_offset: 0,
  });
}

export async function resolveAdminDispute({
  disputeId,
  outcome,
  resolutionNote,
  restrictReportedDays = 0,
}) {
  const { data, error } = await supabase.rpc(
    "admin_resolve_request_dispute",
    {
      p_dispute_id: disputeId,
      p_outcome: outcome,
      p_resolution_note: resolutionNote.trim(),
      p_restrict_reported_days: Number(restrictReportedDays) || 0,
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function clearAdminAccountRestriction(accountId) {
  const { data, error } = await supabase.rpc(
    "admin_clear_account_restriction",
    { p_account_id: accountId },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function setAdminAccountAccess({
  accountId,
  accessLevel,
  reason,
  durationDays = null,
}) {
  const { data, error } = await supabase.rpc("admin_set_account_access", {
    p_account_id: accountId,
    p_access_level: accessLevel,
    p_reason: reason.trim(),
    p_duration_days: durationDays,
  });
  return { data: normalizeRpcRow(data), error };
}

export async function restoreAdminAccountAccess(accountId) {
  const { data, error } = await supabase.rpc(
    "admin_restore_account_access",
    { p_account_id: accountId },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function listAdminAccountReports({
  status = "OPEN",
  limit = 50,
} = {}) {
  return supabase.rpc("admin_list_account_reports", {
    p_status: status,
    p_limit: limit,
    p_offset: 0,
  });
}

export async function resolveAdminAccountReport({
  reportId,
  outcome,
  resolutionNote,
  restrictReportedDays = 0,
}) {
  const { data, error } = await supabase.rpc(
    "admin_resolve_account_report",
    {
      p_report_id: reportId,
      p_outcome: outcome,
      p_resolution_note: resolutionNote.trim(),
      p_restrict_reported_days: Number(restrictReportedDays) || 0,
    },
  );
  return { data: normalizeRpcRow(data), error };
}
