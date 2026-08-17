import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  MapPin,
  LifeBuoy,
  Send,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

import Badge from "../../components/common/Badge";
import { getRescueRequests } from "../../services/rescueService";
import type { RescueRequestStatus } from "../../types/rescue";

const STATUS_STEPS: RescueRequestStatus[] = [
  "Submitted",
  "Under Review",
  "Government Assigned",
  "Rescue Team Dispatched",
  "Help Arriving",
  "Resolved",
];

type RescueRequest = Awaited<
  ReturnType<typeof getRescueRequests>
>[number];

export default function ReliefTracking() {
  const [requests, setRequests] = useState<RescueRequest[]>([]);
  const [selectedReq, setSelectedReq] =
    useState<RescueRequest | null>(null);
  const [loading, setLoading] = useState(true);

  /*
   * Load rescue requests.
   *
   * The async function is intentionally inside the effect so
   * react-hooks/set-state-in-effect does not complain about
   * calling a function that immediately updates component state.
   */
  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      try {
        const data = await getRescueRequests();

        if (cancelled) {
          return;
        }

        setRequests(data);

        setSelectedReq((previous) => {
          if (previous) {
            return (
              data.find(
                (request) => request.id === previous.id
              ) ?? previous
            );
          }

          return data.length > 0 ? data[0] : null;
        });
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed to load rescue requests:",
            error
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Convert the backend location into display text.
   *
   * The service can return either a string or a location object.
   */
  const getLocationText = (
    location: RescueRequest["location"]
  ): string => {
    if (typeof location === "string") {
      return location;
    }

    if (
      location &&
      typeof location.latitude === "number" &&
      typeof location.longitude === "number"
    ) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }

    return "Location unavailable";
  };

  /*
   * assignedTeam can be either a string or an object.
   * Convert both forms into something React can render.
   */
 const getAssignedTeamText = (
  team: RescueRequest["assignedTeam"]
): string => {
  if (!team) {
    return "Awaiting Assignment";
  }

  if (typeof team === "string") {
    return team;
  }

  return "Rescue Team Assigned";
};

  /*
   * The backend status is currently typed as string.
   * Safely map it to one of the known workflow steps.
   */
  const getStepIndex = (status: string): number => {
    const index = STATUS_STEPS.indexOf(
      status as RescueRequestStatus
    );

    return index >= 0 ? index : 0;
  };

  return (
    <main className="min-h-screen space-y-6 text-(--color-dark-teal)">
      <div className="rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">

        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
              Response Progress
            </p>

            <h1 className="mt-1 text-3xl font-black text-(--color-deep-ocean)">
              Relief &amp; Rescue Request Tracking
            </h1>

            <p className="mt-1 text-sm text-(--color-medium-teal)">
              Track the real-time operational status of your submitted
              emergency rescue and relief requests.
            </p>
          </div>

          <Link
            to="/citizen/rescue"
            className="inline-flex items-center gap-2 self-start rounded-2xl bg-(--color-ocean) px-5 py-2.5 text-xs font-bold text-white transition hover:bg-(--color-deep-ocean) md:self-auto"
          >
            <Send className="h-4 w-4" />
            New Rescue Request
          </Link>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="py-12 text-center text-sm text-(--color-medium-teal)">
            Loading your relief tracking records...
          </div>
        ) : requests.length === 0 ? (
          /* Empty State */
          <div className="mt-8 space-y-4 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint)/20 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-(--color-ocean) opacity-70" />

            <div>
              <p className="text-base font-bold text-(--color-deep-ocean)">
                No Active Relief Requests
              </p>

              <p className="mt-1 text-xs text-(--color-medium-teal)">
                You currently have no active rescue or relief tracking
                tickets on file.
              </p>
            </div>

            <Link
              to="/citizen/rescue"
              className="inline-block rounded-2xl bg-(--color-ocean) px-6 py-2.5 text-xs font-bold text-white transition hover:bg-(--color-deep-ocean)"
            >
              Submit Rescue Request
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-12">

            {/* Request Selector */}
            <div className="space-y-3 lg:col-span-4">
              <p className="px-1 text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                Your Submitted Requests ({requests.length})
              </p>

              <div className="space-y-3">
                {requests.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedReq(req)}
                    className={`w-full rounded-3xl border p-4 text-left transition-all ${
                      selectedReq?.id === req.id
                        ? "border-(--color-ocean) bg-(--color-mint)/40 shadow-sm ring-2 ring-(--color-ocean)/20"
                        : "border-[rgba(53,98,103,0.16)] bg-white hover:bg-(--color-soft-mint)/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-(--color-deep-ocean)">
                        #{req.id}
                      </span>

                      <Badge
                        variant={
                          req.status === "Resolved"
                            ? "success"
                            : req.urgency === "Critical"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {req.status}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm font-bold text-(--color-deep-ocean)">
                      {req.type}
                    </p>

                    <p className="mt-1 truncate text-xs text-(--color-medium-teal)">
                      {getLocationText(req.location)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Request */}
            {selectedReq && (
              <div className="space-y-6 rounded-3xl border border-[rgba(53,98,103,0.16)] bg-(--color-soft-mint)/20 p-6 lg:col-span-8">

                {/* Details Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(53,98,103,0.12)] pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-(--color-ocean)">
                        Request ID: #{selectedReq.id}
                      </span>

                      <Badge variant="info">
                        {selectedReq.type}
                      </Badge>
                    </div>

                    <h2 className="mt-1 text-xl font-bold text-(--color-deep-ocean)">
                      Relief Request Progress
                    </h2>
                  </div>

                  <div className="text-right text-xs text-(--color-medium-teal)">
                    <p>
                      Submitted:{" "}
                      <strong>
                        {selectedReq.submittedAt}
                      </strong>
                    </p>

                    <p className="mt-0.5">
                      Last Update:{" "}
                      <strong>
                        {selectedReq.lastUpdate}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Request Information */}
                <div className="grid gap-4 rounded-2xl border border-[rgba(53,98,103,0.12)] bg-white p-4 text-xs sm:grid-cols-3">

                  {/* Location */}
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

                    <div>
                      <span className="font-semibold text-(--color-medium-teal)">
                        Location
                      </span>

                      <p className="font-bold text-(--color-dark-teal)">
                        {getLocationText(
                          selectedReq.location
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Assigned Team */}
                  <div className="flex items-start gap-2">
                    <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

                    <div>
                      <span className="font-semibold text-(--color-medium-teal)">
                        Assigned Team
                      </span>

                      <p className="font-bold text-(--color-dark-teal)">
                        {getAssignedTeamText(
                          selectedReq.assignedTeam
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Estimated Response */}
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

                    <div>
                      <span className="font-semibold text-(--color-medium-teal)">
                        Est. Response
                      </span>

                      <p className="font-bold text-(--color-dark-teal)">
                        {selectedReq.estimatedResponse ||
                          "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Flow */}
                <div className="space-y-4 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                    Live Status Flow
                  </p>

                  <div className="relative py-2">
                    {STATUS_STEPS.map((step, idx) => {
                      const currentIdx = getStepIndex(
                        selectedReq.status
                      );

                      const isCompleted =
                        idx <= currentIdx;

                      const isCurrent =
                        idx === currentIdx;

                      return (
                        <div
                          key={step}
                          className="flex flex-col items-center"
                        >
                          <div
                            className={`flex w-full items-center justify-between rounded-2xl border px-5 py-3 transition-all ${
                              isCurrent
                                ? "border-(--color-ocean) bg-(--color-mint)/50 shadow-sm"
                                : isCompleted
                                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                                  : "border-[rgba(53,98,103,0.1)] bg-slate-50 text-slate-400 opacity-60"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                  isCurrent
                                    ? "bg-(--color-ocean) text-white"
                                    : isCompleted
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-200 text-slate-500"
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  idx + 1
                                )}
                              </div>

                              <span className="text-sm font-bold">
                                {step}
                              </span>
                            </div>

                            {isCurrent && (
                              <span className="rounded-full border border-(--color-ocean)/30 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-(--color-ocean)">
                                Current Status
                              </span>
                            )}
                          </div>

                          {idx <
                            STATUS_STEPS.length - 1 && (
                            <div className="my-1.5 flex justify-center text-(--color-medium-teal)/40">
                              <span className="text-lg font-bold">
                                ↓
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Operational Note */}
                <div className="flex items-start gap-2 rounded-2xl bg-(--color-pale-aqua)/30 p-4 text-xs text-(--color-dark-teal)">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

                  <span>
                    Emergency dispatch units update status automatically as
                    field teams communicate with central control. If severity
                    increases, submit an updated report or call emergency
                    helpline.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}