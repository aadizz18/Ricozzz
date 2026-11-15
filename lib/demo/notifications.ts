/**
 * RICOZ Admin — Frontend Demo Notifications Service
 */

import { Notification } from "@/lib/admin/types";
import { getStorageItem, setStorageItem, STORAGE_KEYS, isBrowser } from "./storage";
import { DEFAULT_NOTIFICATIONS } from "./seedData";

let notifsSyncing = false;

export function getNotifications(unreadOnly = false): Notification[] {
  // Trigger background server sync
  if (isBrowser() && !notifsSyncing) {
    notifsSyncing = true;
    fetch("/api/admin/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.notifications)) {
          const mapped = data.notifications.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type,
            link: n.link,
            isRead: Boolean(n.is_read),
            createdAt: n.created_at,
          }));
          if (mapped.length > 0) {
            setStorageItem(STORAGE_KEYS.NOTIFICATIONS, mapped);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        notifsSyncing = false;
      });
  }

  let notifications = getStorageItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);

  if (unreadOnly) {
    notifications = notifications.filter((n) => !n.isRead);
  }

  // Sort newest first
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export function markNotificationAsRead(id: string): boolean {
  const notifications = getStorageItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx === -1) return false;

  notifications[idx].isRead = true;
  setStorageItem(STORAGE_KEYS.NOTIFICATIONS, notifications);

  if (isBrowser()) {
    fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    }).catch(() => {});
  }

  return true;
}

export function markAllNotificationsAsRead(): boolean {
  const notifications = getStorageItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
  const updated = notifications.map((n) => ({ ...n, isRead: true }));
  setStorageItem(STORAGE_KEYS.NOTIFICATIONS, updated);

  if (isBrowser()) {
    fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    }).catch(() => {});
  }

  return true;
}

export function deleteNotification(id: string): boolean {
  const notifications = getStorageItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
  const filtered = notifications.filter((n) => n.id !== id);
  setStorageItem(STORAGE_KEYS.NOTIFICATIONS, filtered);
  return true;
}

export function addNotification(
  title: string,
  message: string,
  type: Notification["type"] = "system",
  link: string | null = null
): Notification {
  const notifications = getStorageItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);

  const newNotif: Notification = {
    id: `notif-${Date.now().toString(36)}`,
    title,
    message,
    type,
    link,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  setStorageItem(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...notifications]);
  return newNotif;
}
