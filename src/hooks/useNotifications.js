import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { devLog } from "@/lib/errors";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "@/services/notificationService";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    const { data, error: loadError } = await getNotifications();
    if (loadError) {
      devLog("Notification retrieval failed", loadError);
      setError("We could not load your notifications.");
    } else {
      setNotifications(data || []);
      setError(null);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    getNotifications().then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) {
        devLog("Notification retrieval failed", loadError);
        setError("We could not load your notifications.");
      } else {
        setNotifications(data || []);
        setError(null);
      }
      setLoading(false);
    });

    const unsubscribe = subscribeToNotifications(user?.id, (notification) => {
      if (!active) return;
      setNotifications((current) =>
        current.some((item) => item.id === notification.id)
          ? current
          : [notification, ...current].slice(0, 30),
      );
      toast.info(notification.title, { description: notification.message });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.id]);

  const markRead = useCallback(async (notificationId) => {
    const { data, error: updateError } =
      await markNotificationRead(notificationId);
    if (updateError) {
      devLog("Notification update failed", updateError);
      toast.error("We could not mark that notification as read.");
      return false;
    }
    const readAt = data?.read_at || new Date().toISOString();
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, read_at: readAt } : item,
      ),
    );
    return true;
  }, []);

  const markAllRead = useCallback(async () => {
    const { error: updateError } = await markAllNotificationsRead();
    if (updateError) {
      devLog("Mark-all notifications failed", updateError);
      toast.error("We could not mark all notifications as read.");
      return false;
    }
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at || readAt })),
    );
    return true;
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    reload: loadNotifications,
    markRead,
    markAllRead,
  };
}
