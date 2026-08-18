// src/pages/Citizen/TrackReport.tsx
// Citizen "Track Your Reports" page.
// Allows citizens to enter a unique Report ID, search, and view live status timeline,
// uploaded media, location, AI analysis results, and municipal verification details.

import React, { useState, useEffect, useCallback, useId, useRef, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Search,
  CheckCircle2,
  Sparkles,
  MapPin,
  Calendar,
  AlertTriangle,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  Droplets,
  Eye,
  Building2,
  Activity,
  Timer,
} from "lucide-react";
import Badge from "../../components/common/Badge";
import { fetchBackendReportTracking } from "../../services/reportService";
import { toTrackedReportView, type TrackedReportView } from "../../services/reportAdapters";
import type { BackendReportStatus } from "../../types/api";
import { formatReportId, isValidReportId } from "../../utils/reportId";
import { SEVERITY_STYLES } from "../../types/hazard";

const STATUS_ORDER = [
  "submitted",
  "under_review",
  "assigned",
  "action_in_progress",
  "resolved",
] as const;

const STATUS_LABELS: Record<string, { title: string; subtitle: string }> = {
  submitted: {
    title: "Submitted",
    subtitle: "Report logged into disaster database",
  },
  under_review: {
    title: "Under Review",
    subtitle: "Municipal & disaster response review in progress",
  },
  assigned: {
    title: "Assigned",
    subtitle: "Assigned to specialized response department",
  },
  verified: {
    title: "Assigned",
    subtitle: "Incident verified and response squad assigned",
  },
  action_in_progress: {
    title: "In Progress",
    subtitle: "Field response teams active on-ground",
  },
  in_progress: {
    title: "In Progress",
    subtitle: "Field response teams active on-ground",
  },
  resolved: {
    title: "Resolved",
    subtitle: "Issue resolved and site cleared",
  },
  rejected: {
    title: "Rejected",
    subtitle: "Report reviewed and concluded by authorities",
  },
};

export default function TrackReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputId = useId();

  const [reportIdInput, setReportIdInput] = useState(() => searchParams.get("id") ?? "");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<TrackedReportView | null>(null);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const lastSearchedId = useRef<string | null>(null);

  const performSearch = useCallback(async (idToSearch: string) => {
    const cleanId = formatReportId(idToSearch);
    const isLegacyObjectId = /^[A-F\d]{24}$/i.test(cleanId);

    if (!cleanId || (!isValidReportId(cleanId) && !isLegacyObjectId)) {
      setReport(null);
      setSearchError("Enter a valid Report ID (e.g. JAL-2026-B72F2E).");
      setSearched(true);
      return;
    }

    setLoading(true);
    setSearched(true);
    setCopied(false);
    setSearchError(null);
    lastSearchedId.current = cleanId;

    try {
      const result = await fetchBackendReportTracking(cleanId);
      if (result) {
        const trackedReport = toTrackedReportView(result);
        setReport(trackedReport);
        setSearchParams({ id: cleanId }, { replace: true });
        toast.success(`Found report ${trackedReport.id}`);
      } else {
        setReport(null);
        setSearchError(`No report was found for "${cleanId}".`);
        toast.error(`No hazard report found for "${cleanId}"`);
      }
    } catch (error) {
      setReport(null);
      setSearchError(error instanceof Error ? error.message : "The tracking service is currently unavailable.");
      toast.error("Failed to load report status. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  // Auto-search if ID is provided in query param on load
  useEffect(() => {
    const queryId = searchParams.get("id");
    if (queryId && queryId !== lastSearchedId.current) {
      performSearch(queryId);
    }
  }, [searchParams, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reportIdInput.trim()) {
      performSearch(reportIdInput.trim());
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStageIndex = (status: BackendReportStatus | string) => {
    const s = (status || "").toLowerCase().trim();
    if (s === "submitted") return 0;
    if (s === "under_review") return 1;
    if (s === "assigned" || s === "verified") return 2;
    if (s === "action_in_progress" || s === "in_progress") return 3;
    if (s === "resolved" || s === "completed") return 4;
    return 0;
  };

  const getRemainingDeletionTime = (concludedAt?: string | null, expiresAt?: string | null) => {
    if (!concludedAt && !expiresAt) return null;
    const targetExpiry = expiresAt
      ? new Date(expiresAt).getTime()
      : new Date(concludedAt!).getTime() + 24 * 60 * 60 * 1000;

    const diffMs = targetExpiry - Date.now();
    if (diffMs <= 0) return "Expiring shortly";

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${totalHours}h ${totalMinutes}m remaining`;
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Pending";
    try {
      return new Date(isoString).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const cleanTimeline = useMemo(() => {
    if (!report?.timeline || report.timeline.length === 0) return [];
    const list: any[] = [];
    for (const item of report.timeline) {
      if (list.length === 0) {
        list.push(item);
      } else {
        const prev = list[list.length - 1];
        const isSameTitle =
          String(prev.title || "").trim().toLowerCase() ===
          String(item.title || "").trim().toLowerCase();
        const isSameStatus =
          String(prev.status || "").trim().toLowerCase() ===
          String(item.status || "").trim().toLowerCase();
        if (!isSameTitle || !isSameStatus) {
          list.push(item);
        }
      }
    }
    return list;
  }, [report?.timeline]);

  return (
    <main className="min-h-screen space-y-6 text-(--color-dark-teal)">
      {/* Top Banner / Header */}
      <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--color-pale-aqua) text-(--color-ocean)">
                <Search className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
                Live Status Tracker
              </p>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-(--color-deep-ocean)">
              Track Your Reports
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-(--color-medium-teal)">
              Enter your unique Report ID to check AI analysis, field verification, and resolution progress.
            </p>
          </div>

          <Link
            to="/citizen/report"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-(--color-deep-ocean) active:scale-95 self-start md:self-auto w-full sm:w-auto"
          >
            <Droplets className="h-4 w-4" />
            Submit New Report
          </Link>
        </div>

        {/* Search Box */}
        <form onSubmit={handleSubmit} className="mt-6">
          <div className="relative flex flex-col sm:flex-row items-stretch gap-2 rounded-2xl sm:rounded-3xl border-2 border-(--color-ocean)/40 bg-(--color-soft-mint) p-2 shadow-sm focus-within:border-(--color-ocean) focus-within:ring-4 focus-within:ring-(--color-ocean)/15 transition-all">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-(--color-ocean) pointer-events-none" />
              <input
                id={searchInputId}
                type="text"
                value={reportIdInput}
                onChange={(e) => setReportIdInput(e.target.value.toUpperCase())}
                placeholder="Enter Report ID (e.g. JAL-2026-B72F2E)"
                className="w-full bg-transparent pl-12 pr-4 py-3 text-sm sm:text-base font-mono font-bold tracking-wider text-(--color-deep-ocean) placeholder:font-sans placeholder:font-normal placeholder:text-(--color-medium-teal)/60 focus:outline-none"
              />
              {reportIdInput && (
                <button
                  type="button"
                  onClick={() => {
                    setReportIdInput("");
                    setReport(null);
                    setSearched(false);
                    setSearchParams({});
                  }}
                  className="mr-2 rounded-full p-1 text-xs text-(--color-medium-teal) hover:bg-(--color-pale-aqua)"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !reportIdInput.trim()}
              className="flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-(--color-ocean) px-6 py-3 text-sm font-bold text-white transition hover:bg-(--color-deep-ocean) disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching…</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </form>

        <p className="mt-4 text-xs text-(--color-medium-teal)">
          Use the public Report ID issued when your report was submitted.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-12 text-center shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-(--color-ocean)" />
          <h3 className="mt-4 text-base font-bold text-(--color-deep-ocean)">
            Fetching Report Details…
          </h3>
          <p className="text-xs text-(--color-medium-teal)">
            Querying real-time coastal hazard database for {reportIdInput}
          </p>
        </div>
      )}

      {/* Report Found State */}
      {!loading && report && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Card Header */}
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[rgba(53,98,103,0.12)]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base sm:text-lg font-black tracking-wider text-(--color-ocean) bg-(--color-soft-mint) px-3 py-1 rounded-xl border border-(--color-ocean)/30">
                    {report.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyId(report.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-(--color-medium-teal) hover:text-(--color-deep-ocean) rounded-lg p-1.5 hover:bg-(--color-pale-aqua) transition"
                    title="Copy Report ID"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>

                  <Badge variant="info">{report.categoryLabel}</Badge>

                  {report.severity && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                      style={{ background: SEVERITY_STYLES[report.severity].hex }}
                    >
                      {report.severity.toUpperCase()} SEVERITY
                    </span>
                  )}
                </div>

                <h2 className="mt-2 text-xl sm:text-2xl font-black text-(--color-deep-ocean)">
                  {report.categoryLabel} Incident
                </h2>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between text-xs text-(--color-medium-teal)">
                <span>Submitted</span>
                <span className="font-bold text-(--color-dark-teal)">
                  {formatDate(report.createdAt)}
                </span>
              </div>
            </div>

            {/* Status Timeline / Progress Component */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--color-ocean)">
                  Lifecycle Status Flow
                </p>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                    report.status === "rejected"
                      ? "text-rose-700 bg-rose-50 border-rose-200"
                      : "text-(--color-deep-ocean) bg-(--color-mint) border-(--color-ocean)/20"
                  }`}
                >
                  Current Stage: {STATUS_LABELS[report.status]?.title || "Submitted"}
                </span>
              </div>

              {report.status === "rejected" ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 space-y-3">
                  <div className="flex items-center gap-3 text-rose-800 font-bold text-base">
                    <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0" />
                    <span>Report Rejected by Municipal Authority</span>
                  </div>
                  <p className="text-sm text-rose-700 leading-relaxed">
                    This report has been reviewed and closed by municipal disaster response officers.
                  </p>
                  {typeof report.verification?.officerNotes === "string" && Boolean(report.verification.officerNotes) && (
                    <div className="mt-3 rounded-2xl bg-white/90 p-4 border border-rose-200 text-xs sm:text-sm text-rose-950 font-medium">
                      <strong className="text-rose-800">Official Reason:</strong> {String(report.verification.officerNotes)}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop & Tablet Horizontal Timeline */}
                  <div className="hidden md:grid grid-cols-5 gap-3 relative py-4">
                    {STATUS_ORDER.map((stage, idx) => {
                      const currentIdx = getStageIndex(report.status);
                      const isCompleted = idx < currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div
                          key={stage}
                          className={`relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all ${
                            isCurrent
                              ? "border-(--color-ocean) bg-(--color-mint)/60 shadow-md ring-2 ring-(--color-ocean)/30 -translate-y-1"
                              : isCompleted
                              ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                              : "border-slate-200 bg-slate-50/60 opacity-60 text-slate-500"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold mb-3 shadow-sm ${
                              isCurrent
                                ? "bg-(--color-ocean) text-white ring-4 ring-(--color-aqua)/30 animate-pulse"
                                : isCompleted
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <span>●</span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-(--color-deep-ocean)">
                            {STATUS_LABELS[stage]?.title}
                          </h4>
                          <p className="mt-1 text-[11px] text-(--color-medium-teal) leading-snug line-clamp-2">
                            {STATUS_LABELS[stage]?.subtitle}
                          </p>

                          {isCurrent && (
                            <span className="mt-2 text-[10px] font-bold uppercase tracking-wider bg-(--color-ocean) text-white px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Mobile Vertical Flow Timeline */}
                  <div className="md:hidden space-y-3">
                    {STATUS_ORDER.map((stage, idx) => {
                      const currentIdx = getStageIndex(report.status);
                      const isCompleted = idx < currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div
                          key={stage}
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                            isCurrent
                              ? "border-(--color-ocean) bg-(--color-mint)/60 shadow-sm"
                              : isCompleted
                              ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                              : "border-slate-200 bg-slate-50/60 opacity-60 text-slate-500"
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
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
                              <span>●</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs sm:text-sm font-bold text-(--color-deep-ocean)">
                                {STATUS_LABELS[stage]?.title}
                              </h4>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-(--color-ocean) bg-white px-2 py-0.5 rounded-full border border-(--color-ocean)/30">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-(--color-medium-teal) mt-0.5">
                              {STATUS_LABELS[stage]?.subtitle}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* 24-Hour Auto-Purge / Retention Countdown Banner */}
              {(report.status === "resolved" || report.status === "rejected") && (
                <div
                  className={`mt-4 rounded-3xl border p-4 sm:p-5 flex items-start gap-3.5 shadow-sm transition ${
                    report.status === "rejected"
                      ? "bg-rose-50/90 border-rose-200 text-rose-950"
                      : "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      report.status === "rejected" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                    }`}
                  >
                    <Timer className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs sm:text-sm font-black">
                        24-Hour Database Retention &amp; Auto-Purge Timer
                      </p>
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                          report.status === "rejected"
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300"
                        }`}
                      >
                        {getRemainingDeletionTime(report.concludedAt || report.updatedAt, report.expiresAt) || "24h 00m remaining"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs opacity-90 leading-relaxed">
                      As per municipal data policy, this {report.status === "rejected" ? "rejected record" : "resolved report"} is marked concluded and will automatically be permanently purged from the database after 24 hours.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details Grid: AI Analysis + Report Information */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: AI Analysis Section */}
            <div className="lg:col-span-5 space-y-6">
              {/* Persisted Gemini Details Card */}
              <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/60 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm sm:text-base">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    <span>Generated Report Details</span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                    Gemini
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                      Generated Title
                    </span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {report.aiAnalysis?.title || report.title || "Not available"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                      Generated Description
                    </span>
                    <p className="mt-1 text-xs sm:text-sm text-slate-700 italic bg-white p-3 rounded-xl border border-indigo-100 leading-relaxed">
                      "{report.aiAnalysis?.description || "Not available"}"
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800 border border-amber-200">
                    <strong>Note:</strong> Automated model predictions assist initial priority sorting. Official action is governed by on-site verification.
                  </div>
                </div>
              </div>

              {/* Municipal Verification Card */}
              <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-[rgba(53,98,103,0.12)]">
                  <ShieldCheck className="h-5 w-5 text-(--color-ocean)" />
                  <h3 className="text-sm sm:text-base font-bold text-(--color-deep-ocean)">
                    Verification Status
                  </h3>
                </div>

                <div className="mt-4 space-y-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-[11px] font-semibold text-(--color-medium-teal)">
                      Handling Agency
                    </span>
                    <p className="font-bold text-(--color-deep-ocean)">
                      {typeof report.verification.agency === "string" ? report.verification.agency : "Municipal Corporation"}
                    </p>
                  </div>

                  {report.assignedDepartment && (
                    <div className="rounded-2xl bg-(--color-soft-mint) p-3 border border-(--color-ocean)/20">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-ocean)">
                        Assigned Department
                      </span>
                      <p className="font-bold text-(--color-deep-ocean) flex items-center gap-1.5 mt-1">
                        <Building2 className="h-4 w-4 text-(--color-ocean)" />
                        {report.assignedDepartment}
                      </p>
                    </div>
                  )}

                  {report.assignment && typeof report.assignment.assignedTo === "string" && Boolean(report.assignment.assignedTo) && (
                    <div>
                      <span className="text-[11px] font-semibold text-(--color-medium-teal)">
                        Dispatched Field Squad
                      </span>
                      <p className="font-medium text-(--color-dark-teal)">
                        {String(report.assignment.assignedTo)}
                      </p>
                    </div>
                  )}

                  {typeof report.verification.verifiedBy === "string" && Boolean(report.verification.verifiedBy) && (
                    <div>
                      <span className="text-[11px] font-semibold text-(--color-medium-teal)">
                        Verified / Assigned By
                      </span>
                      <p className="font-medium text-(--color-dark-teal)">
                        {String(report.verification.verifiedBy)}
                      </p>
                    </div>
                  )}

                  {typeof report.verification.officerNotes === "string" && (
                    <div
                      className={`rounded-2xl p-3 border ${
                        report.status === "rejected"
                          ? "bg-rose-50 border-rose-200 text-rose-950"
                          : "bg-(--color-pale-aqua)/30 border-[rgba(53,98,103,0.12)] text-(--color-deep-ocean)"
                      }`}
                    >
                      <span
                        className={`text-[11px] font-bold ${
                          report.status === "rejected" ? "text-rose-700" : "text-(--color-ocean)"
                        }`}
                      >
                        {report.status === "rejected" ? "Rejection Reason:" : "Officer Notes:"}
                      </span>
                      <p className="mt-1 text-xs leading-relaxed">
                        {report.verification.officerNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Evidence Media + Full Report Details */}
            <div className="lg:col-span-7 space-y-6">
              {/* Evidence Media Preview */}
              <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[rgba(53,98,103,0.12)]">
                  <h3 className="text-sm sm:text-base font-bold text-(--color-deep-ocean)">
                    Uploaded Evidence ({report.media.length})
                  </h3>
                  <span className="text-xs text-(--color-medium-teal)">
                    Photo &amp; Video captures
                  </span>
                </div>

                <div className="mt-4">
                  {report.media.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No media files were attached to this report.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {report.media.map((item) => (
                        <div
                          key={item.id}
                          className="group relative overflow-hidden rounded-2xl border border-[rgba(53,98,103,0.14)] bg-slate-100 aspect-video flex items-center justify-center cursor-pointer"
                          onClick={() => setSelectedMedia(item.url)}
                        >
                          {item.type === "video" ? (
                            <video
                              src={item.url}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <img
                              src={item.url}
                              alt={item.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
                              <Eye className="h-3.5 w-3.5" /> View Full
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Description & Location Card */}
              <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-(--color-medium-teal)">
                    Description
                  </h4>
                  <p className="mt-1 text-sm sm:text-base text-(--color-deep-ocean) leading-relaxed bg-(--color-soft-mint) p-4 rounded-2xl border border-[rgba(53,98,103,0.1)]">
                    {report.description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <MapPin className="h-4 w-4 text-(--color-ocean) shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-slate-500">Location</span>
                      <p className="text-xs font-bold text-(--color-deep-ocean) truncate">
                        {[report.location.locality, report.location.city, report.location.district, report.location.state].filter(Boolean).join(", ") || "Coordinates Provided"}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {report.location.latitude?.toFixed(4) ?? "—"}°N, {report.location.longitude?.toFixed(4) ?? "—"}°E
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <Calendar className="h-4 w-4 text-(--color-ocean) shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500">Reported On</span>
                      <p className="text-xs font-bold text-(--color-deep-ocean)">
                        {formatDate(report.createdAt)}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Location details supplied by the backend
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chronological Action History & Audit Log */}
              {cleanTimeline.length > 0 && (
                <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-[rgba(53,98,103,0.12)]">
                    <Activity className="h-5 w-5 text-(--color-ocean)" />
                    <h3 className="text-sm sm:text-base font-bold text-(--color-deep-ocean)">
                      Official Action Log &amp; Timeline ({cleanTimeline.length} Updates)
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {cleanTimeline.map((event: any, index: number) => {
                      const isEventRejected = (event.status || "").toLowerCase() === "rejected";
                      const isEventResolved = (event.status || "").toLowerCase() === "resolved";
                      const isEventProgress = (event.status || "").toLowerCase().includes("progress");

                      return (
                        <div
                          key={index}
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border transition ${
                            isEventRejected
                              ? "bg-rose-50/70 border-rose-200 text-rose-950"
                              : isEventResolved
                              ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                              : isEventProgress
                              ? "bg-(--color-mint)/50 border-(--color-ocean)/20 text-(--color-deep-ocean)"
                              : "bg-slate-50 border-slate-200 text-slate-800"
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isEventRejected
                                ? "bg-rose-600 text-white"
                                : isEventResolved
                                ? "bg-emerald-600 text-white"
                                : isEventProgress
                                ? "bg-(--color-ocean) text-white"
                                : "bg-slate-300 text-slate-700"
                            }`}
                          >
                            {isEventRejected ? "✕" : isEventResolved ? "✓" : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs sm:text-sm font-bold">
                                {event.title || event.status || "Status Updated"}
                              </p>
                              {event.timestamp && (
                                <span className="text-[10px] text-(--color-medium-teal) whitespace-nowrap">
                                  {formatDate(event.timestamp)}
                                </span>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-xs leading-relaxed mt-1 opacity-90">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/citizen/live-map"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-(--color-deep-ocean) hover:bg-(--color-soft-mint) transition cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-(--color-ocean)" />
                  View On Live Map
                </Link>
                <Link
                  to="/citizen/report"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-(--color-deep-ocean) transition cursor-pointer"
                >
                  <Droplets className="h-4 w-4" />
                  Report Another Incident
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invalid / Not Found State */}
      {!loading && searched && !report && (
        <div className="rounded-3xl sm:rounded-4xl border border-rose-200 bg-rose-50/50 p-8 sm:p-12 text-center shadow-sm space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Report Not Found
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              {searchError || <>We couldn't locate any record matching <span className="font-mono font-bold text-rose-700">"{reportIdInput}"</span>. Please check the spelling or format (e.g. WR-2026-8F4K29).</>}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/citizen/report"
              className="rounded-2xl bg-(--color-ocean) px-5 py-2 text-xs font-bold text-white hover:bg-(--color-deep-ocean)"
            >
              Submit a New Report
            </Link>
          </div>
        </div>
      )}

      {/* Empty Initial State (Before searching) */}
      {!loading && !searched && !report && (
        <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-8 sm:p-12 text-center shadow-sm space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-(--color-pale-aqua) text-(--color-ocean)">
            <Search className="h-8 w-8" />
          </div>

          <div className="max-w-md mx-auto">
            <h3 className="text-lg sm:text-xl font-black text-(--color-deep-ocean)">
              Track Any Water Hazard Incident
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-(--color-medium-teal) leading-relaxed">
              Every submitted citizen report receives a unique tracking ID. Enter your ID above to inspect AI classification, municipal field assignment, and resolution progress.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto pt-4 text-left">
            <div className="p-4 rounded-2xl bg-(--color-soft-mint) border border-[rgba(53,98,103,0.1)]">
              <span className="font-bold text-xs text-(--color-ocean)">01. Instant AI Scan</span>
              <p className="text-xs text-(--color-medium-teal) mt-1">
                Visual estimation of water depth, severity, and problem category.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-(--color-soft-mint) border border-[rgba(53,98,103,0.1)]">
              <span className="font-bold text-xs text-(--color-ocean)">02. Government Review</span>
              <p className="text-xs text-(--color-medium-teal) mt-1">
                Dispatch of drainage pumps, rescue units, or repair engineers.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-(--color-soft-mint) border border-[rgba(53,98,103,0.1)]">
              <span className="font-bold text-xs text-(--color-ocean)">03. Real-time Status</span>
              <p className="text-xs text-(--color-medium-teal) mt-1">
                Live timeline updates until the waterlogged zone is cleared.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Media Fullscreen Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedMedia}
              alt="Report Evidence Full View"
              className="max-h-[80vh] w-auto object-contain"
            />
            <button
              type="button"
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/90"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
