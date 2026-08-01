import { supabase } from "@/lib/supabase";

function normalizeRpcRow(data) {
  return Array.isArray(data) ? data[0] || null : data;
}

export async function getMyAccountDeletionRequest() {
  const { data, error } = await supabase.rpc("get_my_account_deletion_request");
  return { data: normalizeRpcRow(data), error };
}

export async function requestAccountDeletion({ confirmation, reason }) {
  const { data, error } = await supabase.rpc("request_account_deletion", {
    p_confirmation: confirmation,
    p_reason: reason.trim() || null,
  });
  return { data: normalizeRpcRow(data), error };
}

export async function cancelAccountDeletion() {
  const { data, error } = await supabase.rpc("cancel_account_deletion");
  return { data: normalizeRpcRow(data), error };
}
