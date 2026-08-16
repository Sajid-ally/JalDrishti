// src/pages/Government/EmergencyOperations.tsx
// Combines Disaster Alerts + Rescue Teams into a single tabbed page.

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
import RescueRequests from "./RescueRequests";

import {
  getGovernmentAlerts,
  markAlertStatus,
} from "../../services/alertService";

import type {
  GovernmentAlert,
  AlertPriority,
} from "../../types/alert";


// ---------------------------------------------
// Types
// ---------------------------------------------

type Tab = "alerts" | "rescue";


// ---------------------------------------------
// Tab configuration
// ---------------------------------------------

const TABS: {
  id: Tab;
  label: string;
  icon: React.ElementType;
}[] = [
  {
    id: "alerts",
    label: "Disaster Alerts",
    icon: Siren,
  },
  {
    id: "rescue",
    label: "Rescue Teams",
    icon: LifeBuoy,
  },
];


// ---------------------------------------------
// Priority Badge
// ---------------------------------------------

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


// ---------------------------------------------
// Alert Icon
// ---------------------------------------------

function getAlertIcon(type: GovernmentAlert["type"]) {
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
        <Radio className="h-5 w-5 text-(--color-ocean)" />
      );
  }
}


// ---------------------------------------------
// Emergency Operations
// ---------------------------------------------

export default function EmergencyOperations() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState<Tab>("alerts");

  const [alerts, setAlerts] =
    useState<GovernmentAlert[]>([]);

  const [loading, setLoading] =
    useState(true);


  // -------------------------------------------
  // Fetch alerts
  // -------------------------------------------

  const fetchAlerts = async () => {
    setLoading(true);

    try {
      const data = await getGovernmentAlerts();
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  };


  // -------------------------------------------
  // Load alerts when page opens
  // -------------------------------------------

  useEffect(() => {
    fetchAlerts();
  }, []);


  // -------------------------------------------
  // Handle alert action
  // -------------------------------------------

  const handleAction = async (
    alert: GovernmentAlert
  ) => {
    await markAlertStatus(alert.id, "Reviewed");

    if (alert.targetRoute) {
      navigate(alert.targetRoute);
    } else {
      toast.success(
        `Marked alert "${alert.title}" as reviewed.`
      );

      await fetchAlerts();
    }
  };


  // -------------------------------------------
  // UI
  // -------------------------------------------

  return (
    <main className="space-y-6">

      {/* ---------------------------------------
          Header
      --------------------------------------- */}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
          Government Emergency Operations
        </p>

        <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-(--color-deep-ocean)">
          Emergency Operations Dashboard
        </h1>

        <p className="mt-1 text-xs sm:text-sm text-(--color-medium-teal)">
          Manage emergency response, view live incidents,
          and coordinate relief efforts across the state.
        </p>
      </div>


      {/* ---------------------------------------
          Tab Bar
      --------------------------------------- */}

      <div className="flex gap-1 rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white p-1 shadow-sm w-fit">

        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-(--color-ocean) text-white shadow-sm"
                  : "text-(--color-medium-teal) hover:bg-(--color-pale-aqua)/60 hover:text-(--color-dark-teal)"
              }`}
            >
              <Icon className="h-4 w-4" />

              <span>{tab.label}</span>
            </button>
          );
        })}

      </div>


      {/* ---------------------------------------
          Tab Content
      --------------------------------------- */}

      <section>

        {/* =====================================
            DISASTER ALERTS TAB
        ===================================== */}

        {activeTab === "alerts" && (
          <div className="rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">

            {/* Alerts heading */}

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
                Operational Intelligence
              </p>

              <h2 className="mt-1 text-2xl font-black text-(--color-deep-ocean)">
                Government Alerts &amp; News Feed
              </h2>

              <p className="mt-1 text-sm text-(--color-medium-teal)">
                Real-time feed of reported hazards, incident
                verifications, rescue dispatches, and field
                updates.
              </p>
            </div>


            {/* ---------------------------------
                Loading
            --------------------------------- */}

            {loading && (
              <div className="py-12 text-center text-sm text-(--color-medium-teal)">
                Loading operational feed...
              </div>
            )}


            {/* ---------------------------------
                No alerts
            --------------------------------- */}

            {!loading && alerts.length === 0 && (
              <div className="mt-8 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint)/20 p-8 text-center">

                <p className="text-sm text-(--color-medium-teal)">
                  No active operational alerts recorded.
                </p>

              </div>
            )}


            {/* ---------------------------------
                Alert list
            --------------------------------- */}

            {!loading && alerts.length > 0 && (
              <div className="mt-8 space-y-4 max-w-4xl">

                {alerts.map((item) => (
                  <Card
                    key={item.id}
                    variant="news"
                    className="p-5 rounded-3xl border border-[rgba(53,98,103,0.16)] transition hover:shadow-md"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      {/* Alert information */}

                      <div className="flex items-start gap-4">

                        {/* Icon */}

                        <div className="mt-0.5 rounded-2xl bg-(--color-pale-aqua)/60 p-3 shrink-0">
                          {getAlertIcon(item.type)}
                        </div>


                        {/* Text */}

                        <div className="space-y-1.5">

                          {/* Type + Priority + Status */}

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="text-xs font-bold uppercase tracking-[0.15em] text-(--color-ocean)">
                              {item.type}
                            </span>

                            <PriorityBadge
                              priority={item.priority}
                            />

                            {item.status === "Reviewed" ? (
                              <Badge variant="success">
                                Reviewed
                              </Badge>
                            ) : (
                              <Badge variant="warning">
                                Action Pending
                              </Badge>
                            )}

                          </div>


                          {/* Title */}

                          <h3 className="text-lg font-bold text-(--color-deep-ocean)">
                            {item.title}
                          </h3>


                          {/* Description */}

                          <p className="text-xs text-(--color-dark-teal) leading-relaxed">
                            {item.description}
                          </p>


                          {/* Location + Time */}

                          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-(--color-medium-teal)">

                            {item.location && (
                              <span className="flex items-center gap-1">

                                <MapPin className="h-3.5 w-3.5 text-(--color-ocean)" />

                                {item.location}

                              </span>
                            )}

                            <span className="flex items-center gap-1">

                              <Clock className="h-3.5 w-3.5 text-(--color-ocean)" />

                              {item.timeAgo}

                            </span>

                          </div>

                        </div>

                      </div>


                      {/* ---------------------------------
                          Action Button
                      --------------------------------- */}

                      {item.actionLabel && (
                        <button
                          type="button"
                          onClick={() =>
                            handleAction(item)
                          }
                          className="flex items-center justify-center gap-1.5 rounded-2xl bg-(--color-ocean) px-4 py-2.5 text-xs font-bold text-white transition hover:bg-(--color-deep-ocean) shrink-0 self-start sm:self-center"
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
        )}


        {/* =====================================
            RESCUE TEAMS TAB
        ===================================== */}

        {activeTab === "rescue" && (
          <RescueRequests />
        )}

      </section>

    </main>
  );
}