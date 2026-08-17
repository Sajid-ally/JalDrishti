import api, { toApiError } from "./api";

export interface NotificationItem {
  id: string;
  notificationType: string;
  message: string;
  reportId?: string;
  department?: string;
  assignedTo?: string;
  username?: string;
  isRead: boolean;
  createdAt: string;
}

export async function fetchNotifications(filters: {
  department?: string;
  username?: string;
  unreadOnly?: boolean;
} = {}): Promise<NotificationItem[]> {
  try {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined)
    );
    const response = await api.get<{ success: boolean; notifications: any[] }>("/notifications/", { params });
    
    // Map backend notifications to NotificationItem model
    return (response.data.notifications || []).map((notif: any) => ({
      id: notif.notificationId || notif.id || notif._id,
      notificationType: notif.notificationType,
      message: notif.message,
      reportId: notif.reportId,
      department: notif.department,
      assignedTo: notif.assignedTo,
      username: notif.username,
      isRead: notif.read || notif.isRead || false,
      createdAt: notif.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getUnreadNotificationsCount(filters: {
  department?: string;
  username?: string;
} = {}): Promise<number> {
  try {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined)
    );
    const response = await api.get<{ count: number }>("/notifications/unread-count", { params });
    return response.data.count || 0;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    await api.put(`/notifications/${encodeURIComponent(notificationId)}/read`);
    return true;
  } catch (error) {
    throw toApiError(error);
  }
}
