import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Eye, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import {
  fetchNotifications,
  markAsRead,
  type NotificationItem,
} from "../../services/notificationService";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications({
        username: user?.role === "citizen" ? user.name : undefined,
      });
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      toast.error("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      toast.success("Notification marked as read.");
    } catch {
      toast.error("Failed to update notification.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <div className="rounded-[32px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
                Notifications
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">Your alerts</h1>
              <p className="mt-1 text-sm text-slate-600">
                Stay updated on report status, rescue activity, and official alerts.
              </p>
            </div>
            <button
              type="button"
              onClick={loadNotifications}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="mt-8 flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
              <span className="ml-3 text-sm text-slate-500">Loading alerts…</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
              <Bell className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-500">No notifications available.</p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border p-5 transition ${
                    item.isRead
                      ? "border-slate-200 bg-white opacity-70"
                      : "border-sky-100 bg-sky-50/50 shadow-xs"
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          item.notificationType === "new_report"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : item.notificationType === "status_changed"
                              ? "bg-sky-50 text-sky-700 border border-sky-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {item.notificationType.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 font-medium">
                      {item.message}
                    </p>
                    {item.reportId && (
                      <div className="pt-1 flex items-center gap-2 text-xs">
                        <span className="text-slate-400 font-mono">
                          ID: {item.reportId}
                        </span>
                        <Link
                          to={
                            user?.role === "government"
                              ? `/government/review-reports`
                              : `/citizen/track-report?id=${item.reportId}`
                          }
                          className="text-sky-600 hover:underline flex items-center gap-0.5"
                        >
                          View Report <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {!item.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item.id)}
                      className="self-start sm:self-auto flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      title="Mark as read"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
