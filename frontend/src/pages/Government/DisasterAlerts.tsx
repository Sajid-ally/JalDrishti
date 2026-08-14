import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Siren,
  MapPin,
  Clock,
  ExternalLink,
  ShieldAlert,
  LifeBuoy,
  Radio,
} from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../../components/common/Badge";
import Card from "../../components/common/Card";
import { getGovernmentAlerts, markAlertStatus } from "../../services/alertService";
import type { GovernmentAlert, AlertPriority } from "../../types/alert";

function PriorityBadge({ priority }: { priority: AlertPriority }) {
  const map: Record<AlertPriority, "danger" | "warning" | "info" | "neutral"> = {
    Critical: "danger",
    High: "warning",
    Medium: "info",
    Low: "neutral",
  };
  return <Badge variant={map[priority]}>{priority} Priority</Badge>;
}

function getAlertIcon(type: GovernmentAlert["type"]) {
  switch (type) {
    case "New hazard report":
      return <ShieldAlert className="h-5 w-5 text-amber-600" />;
    case "Rescue request":
      return <LifeBuoy className="h-5 w-5 text-red-600" />;
    case "High-priority incident":
      return <Siren className="h-5 w-5 text-purple-600" />;
    default:
      return <Radio className="h-5 w-5 text-[var(--color-ocean)]" />;
  }
}

export default function GovernmentDisasterAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<GovernmentAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await getGovernmentAlerts();
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAction = async (alert: GovernmentAlert) => {
    if (alert.targetRoute) {
      await markAlertStatus(alert.id, "Reviewed");
      navigate(alert.targetRoute);
    } else {
      await markAlertStatus(alert.id, "Reviewed");
      toast.success(`Marked alert "${alert.title}" as reviewed.`);
      await fetchAlerts();
    }
  };

  return (
    <main className="min-h-screen text-[var(--color-dark-teal)] space-y-6">
      <div className="rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
            Operational Intelligence
          </p>
          <h1 className="mt-1 text-3xl font-black text-[var(--color-deep-ocean)]">
            Government Alerts &amp; News Feed
          </h1>
          <p className="mt-1 text-sm text-[var(--color-medium-teal)]">
            Real-time feed of reported hazards, incident verifications, rescue dispatches, and field updates.
          </p>
        </div>

        {/* Operational Feed */}
        {loading ? (
          <div className="py-12 text-center text-sm text-[var(--color-medium-teal)]">
            Loading operational feed...
          </div>
        ) : alerts.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-[var(--color-soft-mint)]/20 p-8 text-center">
            <p className="text-sm text-[var(--color-medium-teal)]">
              No active operational alerts recorded.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4 max-w-4xl">
            {alerts.map((item) => (
              <Card
                key={item.id}
                variant="news"
                className="p-5 rounded-3xl border border-[rgba(53,98,103,0.16)] transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 rounded-2xl bg-[var(--color-pale-aqua)]/60 p-3 shrink-0">
                      {getAlertIcon(item.type)}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-ocean)]">
                          {item.type}
                        </span>
                        <PriorityBadge priority={item.priority} />
                        {item.status === "Reviewed" ? (
                          <Badge variant="success">Reviewed</Badge>
                        ) : (
                          <Badge variant="warning">Action Pending</Badge>
                        )}
                      </div>

                      <h2 className="text-lg font-bold text-[var(--color-deep-ocean)]">
                        {item.title}
                      </h2>

                      <p className="text-xs text-[var(--color-dark-teal)] leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[var(--color-medium-teal)]">
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[var(--color-ocean)]" />
                            {item.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[var(--color-ocean)]" />
                          {item.timeAgo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {item.actionLabel && (
                    <button
                      type="button"
                      onClick={() => handleAction(item)}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--color-ocean)] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--color-deep-ocean)] shrink-0 self-start sm:self-center"
                    >
                      {item.actionLabel}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
