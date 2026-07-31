import { supabase } from "@/lib/supabase";

function normalizeRpcRow(data) {
  return Array.isArray(data) ? data[0] || null : data;
}

export async function getRequestTrustContext(requestId, otherUserId) {
  const { data, error } = await supabase.rpc("get_request_trust_context", {
    p_request_id: requestId,
    p_other_user_id: otherUserId,
  });
  return { data: normalizeRpcRow(data), error };
}

export async function submitRequestRating({ requestId, rating, comment }) {
  const { data, error } = await supabase.rpc("submit_request_rating", {
    p_request_id: requestId,
    p_rating: Number(rating),
    p_comment: comment.trim() || null,
  });
  return { data: normalizeRpcRow(data), error };
}

export async function setAccountBlock({ requestId, userId, blocked }) {
  return supabase.rpc("set_account_block", {
    p_request_id: requestId,
    p_blocked_user_id: userId,
    p_blocked: blocked,
  });
}

export async function submitAccountReport({
  requestId,
  userId,
  category,
  details,
}) {
  const { data, error } = await supabase.rpc("submit_account_report", {
    p_request_id: requestId,
    p_reported_user_id: userId,
    p_category: category,
    p_details: details.trim(),
  });
  return { data: normalizeRpcRow(data), error };
}
