import { useState, useEffect } from "react";
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
import type { RescueRequestItem, RescueRequestStatus } from "../../types/rescue";

const STATUS_STEPS: RescueRequestStatus[] = [
  "Submitted",
  "Under Review",
  "Government Assigned",
  "Rescue Team Dispatched",
  "Help Arriving",
  "Resolved",
];

export default function ReliefTracking() {
  const [requests, setRequests] = useState<RescueRequestItem[]>([]);
  const [selectedReq, setSelectedReq] = useState<RescueRequestItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getRescueRequests();
      setRequests(data);
      if (data.length > 0) {
        setSelectedReq(data[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (status: RescueRequestStatus) => {
    return STATUS_STEPS.indexOf(status);
  };

  return (
    <main className="min-h-screen text-[var(--color-dark-teal)] space-y-6">
      <div className="rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
              Response Progress
            </p>
            <h1 className="mt-1 text-3xl font-black text-[var(--color-deep-ocean)]">
              Relief &amp; Rescue Request Tracking
            </h1>
            <p className="mt-1 text-sm text-[var(--color-medium-teal)]">
              Track the real-time operational status of your submitted emergency rescue and relief requests.
            </p>
          </div>

          <Link
            to="/citizen/rescue"
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--color-deep-ocean)] self-start md:self-auto"
          >
            <Send className="h-4 w-4" />
            New Rescue Request
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[var(--color-medium-teal)]">
            Loading your relief tracking records...
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-[var(--color-soft-mint)]/20 p-8 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-[var(--color-ocean)] mx-auto opacity-70" />
            <div>
              <p className="text-base font-bold text-[var(--color-deep-ocean)]">No Active Relief Requests</p>
              <p className="text-xs text-[var(--color-medium-teal)] mt-1">
                You currently have no active rescue or relief tracking tickets on file.
              </p>
            </div>
            <Link
              to="/citizen/rescue"
              className="inline-block rounded-2xl bg-[var(--color-ocean)] px-6 py-2.5 text-xs font-bold text-white hover:bg-[var(--color-deep-ocean)]"
            >
              Submit Rescue Request
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            {/* Request Selector List */}
            <div className="lg:col-span-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] px-1">
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
                        ? "border-[var(--color-ocean)] bg-[var(--color-mint)]/40 shadow-sm ring-2 ring-[var(--color-ocean)]/20"
                        : "border-[rgba(53,98,103,0.16)] bg-white hover:bg-[var(--color-soft-mint)]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[var(--color-deep-ocean)]">
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
                    <p className="mt-2 text-sm font-bold text-[var(--color-deep-ocean)]">
                      {req.type}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-medium-teal)] truncate">
                      {req.location}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step Tracker Detail View */}
            {selectedReq && (
              <div className="lg:col-span-8 rounded-3xl border border-[rgba(53,98,103,0.16)] bg-[var(--color-soft-mint)]/20 p-6 space-y-6">
                {/* Details Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[rgba(53,98,103,0.12)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[var(--color-ocean)]">
                        Request ID: #{selectedReq.id}
                      </span>
                      <Badge variant="info">{selectedReq.type}</Badge>
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-[var(--color-deep-ocean)]">
                      Relief Request Progress
                    </h2>
                  </div>
                  <div className="text-right text-xs text-[var(--color-medium-teal)]">
                    <p>Submitted: <strong>{selectedReq.submittedAt}</strong></p>
                    <p className="mt-0.5">Last Update: <strong>{selectedReq.lastUpdate}</strong></p>
                  </div>
                </div>

                {/* Information Chips */}
                <div className="grid gap-4 sm:grid-cols-3 text-xs bg-white p-4 rounded-2xl border border-[rgba(53,98,103,0.12)]">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-[var(--color-ocean)] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[var(--color-medium-teal)]">Location</span>
                      <p className="font-bold text-[var(--color-dark-teal)]">{selectedReq.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <LifeBuoy className="h-4 w-4 text-[var(--color-ocean)] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[var(--color-medium-teal)]">Assigned Team</span>
                      <p className="font-bold text-[var(--color-dark-teal)]">
                        {selectedReq.assignedTeam || "Awaiting Assignment"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-[var(--color-ocean)] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[var(--color-medium-teal)]">Est. Response</span>
                      <p className="font-bold text-[var(--color-dark-teal)]">
                        {selectedReq.estimatedResponse || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Flow Diagram Tracker */}
                <div className="bg-white p-6 rounded-3xl border border-[rgba(53,98,103,0.14)] space-y-4">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-medium-teal)]">
                    Live Status Flow
                  </p>

                  <div className="relative py-2">
                    {STATUS_STEPS.map((step, idx) => {
                      const currentIdx = getStepIndex(selectedReq.status);
                      const isCompleted = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div key={step} className="flex flex-col items-center">
                          {/* Step Node */}
                          <div
                            className={`flex w-full items-center justify-between rounded-2xl px-5 py-3 border transition-all ${
                              isCurrent
                                ? "border-[var(--color-ocean)] bg-[var(--color-mint)]/50 shadow-sm"
                                : isCompleted
                                ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                                : "border-[rgba(53,98,103,0.1)] bg-slate-50 text-slate-400 opacity-60"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                  isCurrent
                                    ? "bg-[var(--color-ocean)] text-white"
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
                              <span className="text-sm font-bold">{step}</span>
                            </div>

                            {isCurrent && (
                              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ocean)] bg-white px-3 py-1 rounded-full border border-[var(--color-ocean)]/30">
                                Current Status
                              </span>
                            )}
                          </div>

                          {/* Connector Arrow */}
                          {idx < STATUS_STEPS.length - 1 && (
                            <div className="my-1.5 flex justify-center text-[var(--color-medium-teal)]/40">
                              <span className="text-lg font-bold">↓</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl bg-[var(--color-pale-aqua)]/30 p-4 text-xs text-[var(--color-dark-teal)] flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--color-ocean)] shrink-0 mt-0.5" />
                  <span>
                    Emergency dispatch units update status automatically as field teams communicate with central control. If severity increases, submit an updated report or call emergency helpline.
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
