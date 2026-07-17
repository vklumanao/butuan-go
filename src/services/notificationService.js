import { isDemoMode, supabase } from "@/lib/supabase";

function normalizeRpcRow(data) {
  return Array.isArray(data) ? data[0] || null : data;
}

export async function getNotifications(limit = 30) {
  if (isDemoMode) return { data: [], error: null };

  return supabase
    .from("notifications")
    .select(
      "id, user_id, request_id, type, title, message, read_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function markNotificationRead(notificationId) {
  if (isDemoMode) return { data: null, error: null };

  const { data, error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });
  return { data: normalizeRpcRow(data), error };
}

export async function markAllNotificationsRead() {
  if (isDemoMode) return { data: 0, error: null };
  return supabase.rpc("mark_all_notifications_read");
}

export function subscribeToNotifications(userId, onNotification) {
  if (isDemoMode || !userId) return () => {};

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNotification(payload.new),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
