import { supabase } from "@/lib/supabase";

function normalizeRpcRow(data) {
  return Array.isArray(data) ? data[0] || null : data;
}

export async function getMyAccountAccess() {
  const { data, error } = await supabase.rpc("get_my_account_access");
  return { data: normalizeRpcRow(data), error };
}
