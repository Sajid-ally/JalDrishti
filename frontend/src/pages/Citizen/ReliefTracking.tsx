import {
  useState,
  useEffect,
  useCallback,
} from "react";

import { Link } from "react-router-dom";

import {
  CheckCircle2,
  MapPin,
  LifeBuoy,
  Send,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

import Badge from "../../components/common/Badge";

import {
  getRescueRequests,
} from "../../services/rescueService";

import type {
  RescueRequestItem,
  RescueRequestStatus,
} from "../../types/rescue";


/* ============================================================
   RESCUE WORKFLOW
   ============================================================ */

const STATUS_STEPS: RescueRequestStatus[] = [
  "Submitted",
  "Under Review",
  "Government Assigned",
  "Rescue Team Dispatched",
  "Help Arriving",
  "Resolved",
];


/* ============================================================
   COMPONENT
   ============================================================ */

export default function ReliefTracking() {
  const [
    requests,
    setRequests,
  ] = useState<RescueRequestItem[]>([]);

  const [
    selectedReq,
    setSelectedReq,
  ] = useState<RescueRequestItem | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);


  /* ==========================================================
     FETCH REQUESTS
     ========================================================== */

  const fetchRequests = useCallback(
    async () => {
      setLoading(true);

      try {
        const data =
          await getRescueRequests();

        setRequests(data);

        setSelectedReq(
          (previous) => {
            if (previous) {
              const updated =
                data.find(
                  (request) =>
                    request.id ===
                    previous.id
                );

              return (
                updated ??
                previous
              );
            }

            return (
              data.length > 0
                ? data[0]
                : null
            );
          }
        );
      } catch (error) {
        console.error(
          "Failed to load rescue requests:",
          error
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );


  /* ==========================================================
     INITIAL LOAD + REFRESH
     ========================================================== */

  useEffect(() => {
    fetchRequests();

    /*
     * Refresh every 10 seconds so the citizen
     * can see government/rescue status changes.
     */
    const interval =
      window.setInterval(
        () => {
          fetchRequests();
        },
        10000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [fetchRequests]);


  /* ==========================================================
     STATUS INDEX
     ========================================================== */

  const getStepIndex = (
    status: RescueRequestStatus
  ) => {
    if (status === "Rejected") {
      return -1;
    }

    return STATUS_STEPS.indexOf(
      status
    );
  };


  /* ==========================================================
     BADGE VARIANT
     ========================================================== */

  const getStatusVariant = (
    status: RescueRequestStatus
  ) => {
    switch (status) {
      case "Resolved":
        return "success" as const;

      case "Rejected":
        return "danger" as const;

      case "Government Assigned":
      case "Rescue Team Dispatched":
      case "Help Arriving":
        return "info" as const;

      case "Under Review":
        return "warning" as const;

      case "Submitted":
      default:
        return "warning" as const;
    }
  };


  /* ==========================================================
     LOCATION LABEL
     ========================================================== */

  const getLocationLabel = (
    request: RescueRequestItem
  ) => {
    if (
      request.locationName &&
      request.locationName.trim()
    ) {
      return request.locationName;
    }

    return `${request.location.latitude.toFixed(
      4
    )}, ${request.location.longitude.toFixed(
      4
    )}`;
  };


  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <main className="min-h-screen bg-[var(--color-sand)] text-[var(--color-dark-teal)] p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ==================================================
            HEADER
            ================================================== */}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-3xl font-bold">
              Relief Tracking
            </h1>

            <p className="text-[var(--color-medium-teal)]">
              Track your rescue requests and
              monitor government response in
              real time.
            </p>
          </div>


          <Link
            to="/citizen/rescue"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-teal)] px-4 py-2 font-semibold text-white hover:bg-[var(--color-dark-teal)]"
          >
            <Send className="h-4 w-4" />

            New Rescue Request
          </Link>

        </div>


        {/* ==================================================
            MAIN GRID
            ================================================== */}

        <div className="grid gap-6 lg:grid-cols-[340px,1fr]">


          {/* =================================================
              LEFT PANEL
              ================================================= */}

          <aside className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">

            <h2 className="text-lg font-semibold">
              Your Requests
            </h2>


            {loading ? (

              <p className="mt-4 text-sm text-[var(--color-medium-teal)]">
                Loading requests...
              </p>

            ) : requests.length === 0 ? (

              <div className="mt-6 rounded-xl bg-[var(--color-light)] p-5 text-center">

                <LifeBuoy className="mx-auto h-8 w-8 text-[var(--color-teal)]" />

                <p className="mt-3 text-sm font-semibold">
                  No rescue requests found.
                </p>

                <p className="mt-1 text-xs text-[var(--color-medium-teal)]">
                  Submit a rescue request if
                  you need emergency assistance.
                </p>

              </div>

            ) : (

              <div className="mt-4 space-y-3">

                {requests.map(
                  (request) => (

                    <button
                      key={request.id}
                      type="button"
                      onClick={() =>
                        setSelectedReq(
                          request
                        )
                      }
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedReq?.id ===
                        request.id
                          ? "border-[var(--color-teal)] bg-[var(--color-light)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-teal)]"
                      }`}
                    >

                      <div className="flex items-start justify-between gap-2">

                        <div className="min-w-0">

                          <h3 className="font-semibold truncate">
                            {request.title}
                          </h3>

                          <p className="mt-1 text-xs text-[var(--color-medium-teal)] truncate">
                            {getLocationLabel(
                              request
                            )}
                          </p>

                        </div>


                        <Badge
                          variant={getStatusVariant(
                            request.status
                          )}
                        >
                          {request.status}
                        </Badge>

                      </div>

                    </button>

                  )
                )}

              </div>

            )}

          </aside>


          {/* =================================================
              RIGHT PANEL
              ================================================= */}

          <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">

            {!selectedReq ? (

              <div className="flex min-h-[500px] items-center justify-center text-[var(--color-medium-teal)]">

                <div className="text-center">

                  <LifeBuoy className="mx-auto h-10 w-10 opacity-50" />

                  <p className="mt-3">
                    Select a rescue request
                    to view details.
                  </p>

                </div>

              </div>

            ) : (

              <div className="space-y-6">


                {/* =========================================
                    TITLE
                    ========================================= */}

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                  <div>

                    <h2 className="text-2xl font-bold">
                      {selectedReq.title}
                    </h2>

                    <p className="text-[var(--color-medium-teal)]">
                      Submitted on{" "}
                      {new Date(
                        selectedReq.createdAt
                      ).toLocaleString()}
                    </p>

                  </div>


                  <Badge
                    variant={getStatusVariant(
                      selectedReq.status
                    )}
                  >
                    {selectedReq.status}
                  </Badge>

                </div>


                {/* =========================================
                    REJECTED MESSAGE
                    ========================================= */}

                {selectedReq.status ===
                  "Rejected" && (

                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                    <div className="flex items-start gap-3">

                      <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />

                      <div>

                        <p className="font-semibold text-red-800">
                          Rescue request rejected
                        </p>

                        <p className="mt-1 text-sm text-red-700">
                          {selectedReq.governmentNote ||
                            "The request was rejected during government review."}
                        </p>

                      </div>

                    </div>

                  </div>

                )}


                {/* =========================================
                    STATUS TRACKER
                    ========================================= */}

                {selectedReq.status !==
                  "Rejected" && (

                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-light)] p-5">

                    <div className="flex items-center gap-2">

                      <ShieldCheck className="h-5 w-5 text-[var(--color-teal)]" />

                      <h3 className="font-semibold">
                        Response Status
                      </h3>

                    </div>


                    <div className="mt-6 space-y-4">

                      {STATUS_STEPS.map(
                        (
                          step,
                          index
                        ) => {

                          const currentIndex =
                            getStepIndex(
                              selectedReq.status
                            );

                          const completed =
                            index <=
                            currentIndex;

                          const current =
                            index ===
                            currentIndex;

                          return (
                            <div
                              key={step}
                              className="flex items-start gap-3"
                            >

                              <div
                                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                  completed
                                    ? "bg-[var(--color-teal)] text-white"
                                    : "border border-[var(--color-border)] bg-white text-[var(--color-medium-teal)]"
                                }`}
                              >
                                {completed ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <span className="text-xs font-bold">
                                    {index + 1}
                                  </span>
                                )}
                              </div>


                              <div className="min-w-0">

                                <p
                                  className={`text-sm font-semibold ${
                                    current
                                      ? "text-[var(--color-teal)]"
                                      : completed
                                      ? "text-[var(--color-dark-teal)]"
                                      : "text-[var(--color-medium-teal)]"
                                  }`}
                                >
                                  {step}
                                </p>


                                {current && (
                                  <p className="mt-0.5 text-xs text-[var(--color-medium-teal)]">
                                    Current status
                                  </p>
                                )}

                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>

                  </div>

                )}


                {/* =========================================
                    INFO CARDS
                    ========================================= */}

                <div className="grid gap-4 md:grid-cols-2">


                  {/* LOCATION */}

                  <div className="rounded-xl bg-[var(--color-light)] p-4">

                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-medium-teal)]">

                      <MapPin className="h-4 w-4" />

                      Location

                    </div>

                    <p className="mt-2 font-bold text-[var(--color-dark-teal)]">

                      {getLocationLabel(
                        selectedReq
                      )}

                    </p>

                  </div>


                  {/* ASSISTANCE */}

                  <div className="rounded-xl bg-[var(--color-light)] p-4">

                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-medium-teal)]">

                      <LifeBuoy className="h-4 w-4" />

                      Assistance Needed

                    </div>


                    <div className="mt-2 flex flex-wrap gap-2">

                      {selectedReq.assistanceRequired
                        .map(
                          (
                            item: string
                          ) => (

                            <span
                              key={item}
                              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-dark-teal)] border border-[var(--color-border)]"
                            >
                              {item}
                            </span>

                          )
                        )}

                    </div>

                  </div>


                  {/* PEOPLE */}

                  <div className="rounded-xl bg-[var(--color-light)] p-4">

                    <p className="text-sm font-semibold text-[var(--color-medium-teal)]">
                      People Affected
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {selectedReq.peopleCount}
                    </p>

                  </div>


                  {/* URGENCY */}

                  <div className="rounded-xl bg-[var(--color-light)] p-4">

                    <p className="text-sm font-semibold text-[var(--color-medium-teal)]">
                      Urgency
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {selectedReq.urgency}
                    </p>

                  </div>

                </div>


                {/* =========================================
                    DESCRIPTION
                    ========================================= */}

                <div className="rounded-xl border border-[var(--color-border)] p-5">

                  <h3 className="font-semibold">
                    Emergency Description
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[var(--color-medium-teal)]">
                    {selectedReq.description}
                  </p>

                </div>


                {/* =========================================
                    ASSIGNED TEAM
                    ========================================= */}

                {selectedReq.assignedTeam && (

                  <div className="rounded-xl border border-[var(--color-border)] p-5">

                    <div className="flex items-center gap-2">

                      <ShieldCheck className="h-5 w-5 text-[var(--color-teal)]" />

                      <h3 className="font-semibold">
                        Assigned Rescue Team
                      </h3>

                    </div>


                    <div className="mt-4">

                      <p className="text-sm font-semibold text-[var(--color-medium-teal)]">
                        Organization
                      </p>

                      <p className="mt-1 font-bold">
                        {
                          selectedReq
                            .assignedTeam
                            .organization
                        }
                      </p>


                      <p className="mt-4 text-sm font-semibold text-[var(--color-medium-teal)]">
                        Team
                      </p>

                      <p className="mt-1 font-bold">
                        {
                          selectedReq
                            .assignedTeam
                            .teamName
                        }
                      </p>


                      {selectedReq
                        .assignedTeam
                        .resources
                        .length > 0 && (

                        <div className="mt-4">

                          <p className="text-sm font-semibold text-[var(--color-medium-teal)]">
                            Resources
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">

                            {selectedReq
                              .assignedTeam
                              .resources
                              .map(
                                (
                                  resource: string
                                ) => (

                                  <span
                                    key={
                                      resource
                                    }
                                    className="rounded-full bg-[var(--color-light)] px-3 py-1 text-xs font-semibold"
                                  >
                                    {resource}
                                  </span>

                                )
                              )}

                          </div>

                        </div>

                      )}

                    </div>

                  </div>

                )}


                {/* =========================================
                    GOVERNMENT NOTE
                    ========================================= */}

                {selectedReq.governmentNote &&
                  selectedReq.status !==
                    "Rejected" && (

                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-light)] p-5">

                    <div className="flex items-center gap-2">

                      <ShieldCheck className="h-5 w-5 text-[var(--color-teal)]" />

                      <h3 className="font-semibold">
                        Government Update
                      </h3>

                    </div>

                    <p className="mt-2 text-sm leading-6 text-[var(--color-medium-teal)]">
                      {
                        selectedReq
                          .governmentNote
                      }
                    </p>

                  </div>

                )}


                {/* =========================================
                    ESTIMATED RESPONSE
                    ========================================= */}

                {selectedReq.estimatedResponse && (

                  <div className="rounded-xl border border-[var(--color-border)] p-5">

                    <p className="text-sm font-semibold text-[var(--color-medium-teal)]">
                      Estimated Response
                    </p>

                    <p className="mt-1 font-bold">
                      {
                        selectedReq
                          .estimatedResponse
                      }
                    </p>

                  </div>

                )}


                {/* =========================================
                    PHOTO
                    ========================================= */}

                {selectedReq.photoUrl && (

                  <div className="rounded-xl border border-[var(--color-border)] p-5">

                    <h3 className="font-semibold">
                      Evidence Photo
                    </h3>

                    <img
                      src={
                        selectedReq.photoUrl
                      }
                      alt="Rescue request evidence"
                      className="mt-3 max-h-[420px] w-full rounded-xl object-cover"
                    />

                  </div>

                )}


                {/* =========================================
                    REQUEST ID
                    ========================================= */}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--color-light)] p-4">

                  <div>

                    <p className="text-xs text-[var(--color-medium-teal)]">
                      Rescue Request ID
                    </p>

                    <p className="font-mono text-sm font-bold">
                      {selectedReq.id}
                    </p>

                  </div>


                  <div className="text-right">

                    <p className="text-xs text-[var(--color-medium-teal)]">
                      Last Updated
                    </p>

                    <p className="text-sm font-semibold">
                      {selectedReq.lastUpdate}
                    </p>

                  </div>

                </div>


              </div>

            )}

          </section>

        </div>

      </div>
    </main>
  );
}