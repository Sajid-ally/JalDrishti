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

import {
  getGovernmentAlerts,
  markAlertStatus,
} from "../../services/alertService";

import type {
  GovernmentAlert,
  AlertPriority,
} from "../../types/alert";


/* ============================================================
   PRIORITY BADGE
   ============================================================ */

function PriorityBadge({
  priority,
}: {
  priority: AlertPriority;
}) {
  const map: Record<
    AlertPriority,
    "danger" | "warning" | "info" | "neutral"
  > = {
    Critical: "danger",
    High: "warning",
    Medium: "info",
    Low: "neutral",
  };

  return (
    <Badge variant={map[priority]}>
      {priority} Priority
    </Badge>
  );
}


/* ============================================================
   ALERT ICON
   ============================================================ */

function getAlertIcon(
  type: GovernmentAlert["type"]
) {
  switch (type) {
    case "New hazard report":
      return (
        <ShieldAlert className="h-5 w-5 text-amber-600" />
      );

    case "Rescue request":
      return (
        <LifeBuoy className="h-5 w-5 text-red-600" />
      );

    case "High-priority incident":
      return (
        <Siren className="h-5 w-5 text-purple-600" />
      );

    default:
      return (
        <Radio className="h-5 w-5 text-[var(--color-ocean)]" />
      );
  }
}


/* ============================================================
   COMPONENT
   ============================================================ */

export default function GovernmentDisasterAlerts() {
  const navigate = useNavigate();

  const [
    alerts,
    setAlerts,
  ] = useState<GovernmentAlert[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);


  /* ==========================================================
     FETCH ALERTS
     ========================================================== */

  const fetchAlerts = async () => {
    setLoading(true);

    try {
      const data =
        await getGovernmentAlerts();

      setAlerts(data);
    } catch (error) {
      console.error(
        "Failed to load government alerts:",
        error
      );

      toast.error(
        "Failed to load operational alerts."
      );
    } finally {
      setLoading(false);
    }
  };


  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  useEffect(() => {
    fetchAlerts();
  }, []);


  /* ==========================================================
     HANDLE ALERT ACTION
     ========================================================== */

  const handleAction = async (
    alert: GovernmentAlert
  ) => {
    try {
      await markAlertStatus(
        alert.id,
        "Reviewed"
      );

      if (alert.targetRoute) {
        navigate(
          alert.targetRoute
        );

        return;
      }

      toast.success(
        `Marked alert "${alert.title}" as reviewed.`
      );

      await fetchAlerts();
    } catch (error) {
      console.error(
        "Failed to update alert:",
        error
      );

      toast.error(
        "Failed to update alert status."
      );
    }
  };


  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <main className="min-h-screen text-[var(--color-dark-teal)] space-y-6">

      <div className="rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">

        {/* ==================================================
            HEADER
            ================================================== */}

        <div>

          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
            Operational Intelligence
          </p>

          <h1 className="mt-1 text-3xl font-black text-[var(--color-deep-ocean)]">
            Government Alerts &amp; News Feed
          </h1>

          <p className="mt-1 text-sm text-[var(--color-medium-teal)]">
            Real-time feed of reported water hazards,
            rescue requests, high-priority incidents,
            and field updates.
          </p>

        </div>


        {/* ==================================================
            OPERATIONAL FEED
            ================================================== */}

        {loading ? (

          <div className="py-12 text-center text-sm text-[var(--color-medium-teal)]">
            Loading operational feed...
          </div>

        ) : alerts.length === 0 ? (

          <div className="mt-8 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-[var(--color-soft-mint)]/20 p-8 text-center">

            <Radio className="mx-auto h-8 w-8 text-[var(--color-ocean)]" />

            <p className="mt-3 text-sm font-semibold text-[var(--color-dark-teal)]">
              No active operational alerts recorded.
            </p>

            <p className="mt-1 text-xs text-[var(--color-medium-teal)]">
              New hazard and rescue alerts will appear here.
            </p>

          </div>

        ) : (

          <div className="mt-8 max-w-4xl space-y-4">

            {alerts.map(
              (item) => (

                <Card
                  key={item.id}
                  variant="news"
                  className="rounded-3xl border border-[rgba(53,98,103,0.16)] p-5 transition hover:shadow-md"
                >

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    {/* =================================================
                        ALERT CONTENT
                        ================================================= */}

                    <div className="flex items-start gap-4">

                      {/* ICON */}

                      <div className="mt-0.5 shrink-0 rounded-2xl bg-[var(--color-pale-aqua)]/60 p-3">

                        {getAlertIcon(
                          item.type
                        )}

                      </div>


                      {/* DETAILS */}

                      <div className="space-y-1.5">

                        {/* TYPE + PRIORITY + STATUS */}

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-ocean)]">
                            {item.type}
                          </span>

                          <PriorityBadge
                            priority={
                              item.priority
                            }
                          />

                          {item.status ===
                          "Reviewed" ? (

                            <Badge variant="success">
                              Reviewed
                            </Badge>

                          ) : (

                            <Badge variant="warning">
                              Action Pending
                            </Badge>

                          )}

                        </div>


                        {/* TITLE */}

                        <h2 className="text-lg font-bold text-[var(--color-deep-ocean)]">
                          {item.title}
                        </h2>


                        {/* DESCRIPTION */}

                        <p className="text-xs leading-relaxed text-[var(--color-dark-teal)]">
                          {item.description}
                        </p>


                        {/* META */}

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


                    {/* =================================================
                        ACTION
                        ================================================= */}

                    {item.actionLabel && (

                      <button
                        type="button"
                        onClick={() =>
                          handleAction(
                            item
                          )
                        }
                        disabled={
                          item.status ===
                          "Reviewed"
                        }
                        className="flex shrink-0 items-center justify-center gap-1.5 self-start rounded-2xl bg-[var(--color-ocean)] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--color-deep-ocean)] disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
                      >

                        {item.actionLabel}

                        <ExternalLink className="h-3.5 w-3.5" />

                      </button>

                    )}

                  </div>

                </Card>

              )
            )}

          </div>

        )}

      </div>

    </main>
  );
}