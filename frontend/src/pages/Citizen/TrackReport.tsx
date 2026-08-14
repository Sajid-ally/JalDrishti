// src/pages/Citizen/TrackReport.tsx
// Citizen "Track Your Reports" page.
// Allows citizens to enter a unique Report ID, search, and view live status timeline,
// uploaded media, location, AI analysis results, and municipal verification details.

import React, { useState, useEffect, useId } from "react";
import { useSearchParams, Link } from "react-router-dom";
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
} from "lucide-react";
import Badge from "../../components/common/Badge";
import { getReportById } from "../../services/reportService";
import type { WaterReport, WaterReportStatus } from "../../types/report";
import { formatReportId } from "../../utils/reportId";
import { SEVERITY_STYLES } from "../../types/hazard";

const STATUS_ORDER: WaterReportStatus[] = [
  "submitted",
  "ai_analysis",
  "under_verification",
  "resolved",
];

const STATUS_LABELS: Record<WaterReportStatus, { title: string; subtitle: string }> = {
  submitted: {
    title: "Submitted",
    subtitle: "Report logged into disaster database",
  },
  ai_analysis: {
    title: "AI Analysis",
    subtitle: "Computer vision and risk scoring completed",
  },
  under_verification: {
    title: "Under Verification",
    subtitle: "Municipal & disaster response review in progress",
  },
  resolved: {
    title: "Resolved",
    subtitle: "Issue resolved and site cleared",
  },
};

export default function TrackReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputId = useId();

  const [reportIdInput, setReportIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<WaterReport | null>(null);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  // Initialize search from query parameter if present (e.g., /citizen/track-report?id=WR-2026-8F4K29)
  useEffect(() => {
    const queryId = searchParams.get("id");
    if (queryId) {
      setReportIdInput(queryId);
      performSearch(queryId);
    }
  }, [searchParams]);

  const performSearch = async (idToSearch: string) => {
    const cleanId = formatReportId(idToSearch);
    if (!cleanId) return;

    setLoading(true);
    setSearched(true);
    setCopied(false);

    try {
      const result = await getReportById(cleanId);
      setReport(result);
      if (result) {
        setSearchParams({ id: cleanId }, { replace: true });
      }
    } catch (err) {
      console.error("Failed to search report:", err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

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

  const getStageIndex = (status: WaterReportStatus) => {
    return STATUS_ORDER.indexOf(status);
  };

  const formatDate = (isoString?: string) => {
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

  return (
    <main className="min-h-screen space-y-6 text-[var(--color-dark-teal)]">
      {/* Top Banner / Header */}
      <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-pale-aqua)] text-[var(--color-ocean)]">
                <Search className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
                Live Status Tracker
              </p>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-[var(--color-deep-ocean)]">
              Track Your Reports
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-medium-teal)]">
              Enter your unique Report ID to check AI analysis, field verification, and resolution progress.
            </p>
          </div>

          <Link
            to="/citizen/report"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[var(--color-deep-ocean)] active:scale-95 self-start md:self-auto w-full sm:w-auto"
          >
            <Droplets className="h-4 w-4" />
            Submit New Report
          </Link>
        </div>

        {/* Search Box */}
        <form onSubmit={handleSubmit} className="mt-6">
          <div className="relative flex flex-col sm:flex-row items-stretch gap-2 rounded-2xl sm:rounded-3xl border-2 border-[var(--color-ocean)]/40 bg-[var(--color-soft-mint)] p-2 shadow-sm focus-within:border-[var(--color-ocean)] focus-within:ring-4 focus-within:ring-[var(--color-ocean)]/15 transition-all">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-[var(--color-ocean)] pointer-events-none" />
              <input
                id={searchInputId}
                type="text"
                value={reportIdInput}
                onChange={(e) => setReportIdInput(e.target.value.toUpperCase())}
                placeholder="Enter Report ID (e.g. WR-2026-8F4K29)"
                className="w-full bg-transparent pl-12 pr-4 py-3 text-sm sm:text-base font-mono font-bold tracking-wider text-[var(--color-deep-ocean)] placeholder:font-sans placeholder:font-normal placeholder:text-[var(--color-medium-teal)]/60 focus:outline-none"
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
                  className="mr-2 rounded-full p-1 text-xs text-[var(--color-medium-teal)] hover:bg-[var(--color-pale-aqua)]"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !reportIdInput.trim()}
              className="flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-[var(--color-ocean)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-deep-ocean)] disabled:opacity-50 active:scale-95"
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

        {/* Quick Sample IDs for Easy Testing */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-medium-teal)]">
          <span className="font-semibold">Sample Report IDs:</span>
          {[
            { id: "WR-2026-8F4K29", label: "Urban Flooding (Under Verification)" },
            { id: "WR-2026-7A3B12", label: "Drainage (AI Analysis)" },
            { id: "WR-2026-9C5D44", label: "Pollution (Resolved)" },
          ].map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => {
                setReportIdInput(sample.id);
                performSearch(sample.id);
              }}
              className="rounded-full border border-[rgba(53,98,103,0.2)] bg-white px-3 py-1 font-mono font-medium text-[var(--color-deep-ocean)] hover:border-[var(--color-ocean)] hover:bg-[var(--color-pale-aqua)] transition"
            >
              {sample.id}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-12 text-center shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--color-ocean)]" />
          <h3 className="mt-4 text-base font-bold text-[var(--color-deep-ocean)]">
            Fetching Report Details…
          </h3>
          <p className="text-xs text-[var(--color-medium-teal)]">
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
                  <span className="font-mono text-base sm:text-lg font-black tracking-wider text-[var(--color-ocean)] bg-[var(--color-soft-mint)] px-3 py-1 rounded-xl border border-[var(--color-ocean)]/30">
                    {report.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyId(report.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-medium-teal)] hover:text-[var(--color-deep-ocean)] rounded-lg p-1.5 hover:bg-[var(--color-pale-aqua)] transition"
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

                <h2 className="mt-2 text-xl sm:text-2xl font-black text-[var(--color-deep-ocean)]">
                  {report.categoryLabel} Incident
                </h2>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between text-xs text-[var(--color-medium-teal)]">
                <span>Submitted</span>
                <span className="font-bold text-[var(--color-dark-teal)]">
                  {formatDate(report.createdAt)}
                </span>
              </div>
            </div>

            {/* Status Timeline / Progress Component */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-ocean)]">
                  Lifecycle Status Flow
                </p>
                <span className="text-xs font-semibold text-[var(--color-deep-ocean)] bg-[var(--color-mint)] px-3 py-1 rounded-full border border-[var(--color-ocean)]/20">
                  Current Stage: {STATUS_LABELS[report.status].title}
                </span>
              </div>

              {/* Desktop & Tablet Horizontal Timeline */}
              <div className="hidden md:grid grid-cols-4 gap-3 relative py-4">
                {STATUS_ORDER.map((stage, idx) => {
                  const currentIdx = getStageIndex(report.status);
                  const isCompleted = idx < currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div
                      key={stage}
                      className={`relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? "border-[var(--color-ocean)] bg-[var(--color-mint)]/60 shadow-md ring-2 ring-[var(--color-ocean)]/30 -translate-y-1"
                          : isCompleted
                          ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                          : "border-slate-200 bg-slate-50/60 opacity-60 text-slate-500"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold mb-3 shadow-sm ${
                          isCurrent
                            ? "bg-[var(--color-ocean)] text-white ring-4 ring-[var(--color-aqua)]/30 animate-pulse"
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

                      <h4 className="text-sm font-bold text-[var(--color-deep-ocean)]">
                        {STATUS_LABELS[stage].title}
                      </h4>
                      <p className="mt-1 text-[11px] text-[var(--color-medium-teal)] leading-snug line-clamp-2">
                        {STATUS_LABELS[stage].subtitle}
                      </p>

                      {isCurrent && (
                        <span className="mt-2 text-[10px] font-bold uppercase tracking-wider bg-[var(--color-ocean)] text-white px-2 py-0.5 rounded-full">
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
                          ? "border-[var(--color-ocean)] bg-[var(--color-mint)]/60 shadow-sm"
                          : isCompleted
                          ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                          : "border-slate-200 bg-slate-50/60 opacity-60 text-slate-500"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
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
                          <span>●</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs sm:text-sm font-bold text-[var(--color-deep-ocean)]">
                            {STATUS_LABELS[stage].title}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-[var(--color-ocean)] bg-white px-2 py-0.5 rounded-full border border-[var(--color-ocean)]/30">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--color-medium-teal)] mt-0.5">
                          {STATUS_LABELS[stage].subtitle}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Details Grid: AI Analysis + Report Information */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: AI Analysis Section */}
            <div className="lg:col-span-5 space-y-6">
              {/* AI Analysis Card */}
              <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/60 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm sm:text-base">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    <span>AI Analysis</span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                    Vision Prototype
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                      Detected Issue
                    </span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {report.aiAnalysis.detectedIssue}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-white/80 p-3 rounded-2xl border border-indigo-100">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Confidence
                      </span>
                      <p className="text-lg font-black text-indigo-600">
                        {Math.round(report.aiAnalysis.confidence * 100)}%
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Severity
                      </span>
                      <p
                        className="text-sm font-bold uppercase mt-1"
                        style={{ color: SEVERITY_STYLES[report.aiAnalysis.severity].hex }}
                      >
                        {report.aiAnalysis.severity}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                      AI Summary
                    </span>
                    <p className="mt-1 text-xs sm:text-sm text-slate-700 italic bg-white p-3 rounded-xl border border-indigo-100 leading-relaxed">
                      "{report.aiAnalysis.summary}"
                    </p>
                  </div>

                  {report.aiAnalysis.detectedObjects && (
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Visual Tags
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {report.aiAnalysis.detectedObjects.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-lg bg-indigo-100/60 px-2 py-0.5 text-[11px] font-medium text-indigo-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800 border border-amber-200">
                    <strong>Note:</strong> Automated model predictions assist initial priority sorting. Official action is governed by on-site verification.
                  </div>
                </div>
              </div>

              {/* Municipal Verification Card */}
              <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-[rgba(53,98,103,0.12)]">
                  <ShieldCheck className="h-5 w-5 text-[var(--color-ocean)]" />
                  <h3 className="text-sm sm:text-base font-bold text-[var(--color-deep-ocean)]">
                    Verification Status
                  </h3>
                </div>

                <div className="mt-4 space-y-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--color-medium-teal)]">
                      Handling Agency
                    </span>
                    <p className="font-bold text-[var(--color-deep-ocean)]">
                      {report.verification.agency || "Puri Municipal Corporation"}
                    </p>
                  </div>

                  {report.verification.verifiedBy && (
                    <div>
                      <span className="text-[11px] font-semibold text-[var(--color-medium-teal)]">
                        Assigned Officer
                      </span>
                      <p className="font-medium text-[var(--color-dark-teal)]">
                        {report.verification.verifiedBy}
                      </p>
                    </div>
                  )}

                  {report.verification.officerNotes && (
                    <div className="rounded-2xl bg-[var(--color-pale-aqua)]/30 p-3 border border-[rgba(53,98,103,0.12)]">
                      <span className="text-[11px] font-bold text-[var(--color-ocean)]">
                        Officer Notes:
                      </span>
                      <p className="mt-1 text-xs text-[var(--color-deep-ocean)] leading-relaxed">
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
                  <h3 className="text-sm sm:text-base font-bold text-[var(--color-deep-ocean)]">
                    Uploaded Evidence ({report.media.length})
                  </h3>
                  <span className="text-xs text-[var(--color-medium-teal)]">
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-medium-teal)]">
                    Description
                  </h4>
                  <p className="mt-1 text-sm sm:text-base text-[var(--color-deep-ocean)] leading-relaxed bg-[var(--color-soft-mint)] p-4 rounded-2xl border border-[rgba(53,98,103,0.1)]">
                    {report.description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <MapPin className="h-4 w-4 text-[var(--color-ocean)] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-slate-500">Location</span>
                      <p className="text-xs font-bold text-[var(--color-deep-ocean)] truncate">
                        {report.location.address || report.location.placeName || "Coordinates Provided"}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {report.location.coords.lat.toFixed(4)}°N, {report.location.coords.lng.toFixed(4)}°E
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <Calendar className="h-4 w-4 text-[var(--color-ocean)] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500">Reported On</span>
                      <p className="text-xs font-bold text-[var(--color-deep-ocean)]">
                        {formatDate(report.createdAt)}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Location Mode: {report.location.mode === "automatic" ? "Automatic GPS" : "Manual Selection"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/citizen/live-map"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-[var(--color-deep-ocean)] hover:bg-[var(--color-soft-mint)] transition"
                >
                  <MapPin className="h-4 w-4 text-[var(--color-ocean)]" />
                  View On Live Map
                </Link>
                <Link
                  to="/citizen/report"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[var(--color-deep-ocean)] transition"
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
              We couldn't locate any record matching <span className="font-mono font-bold text-rose-700">"{reportIdInput}"</span>. Please check the spelling or format (e.g. WR-2026-8F4K29).
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setReportIdInput("WR-2026-8F4K29");
                performSearch("WR-2026-8F4K29");
              }}
              className="rounded-2xl bg-white border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100/50"
            >
              Try Sample ID: WR-2026-8F4K29
            </button>
            <Link
              to="/citizen/report"
              className="rounded-2xl bg-[var(--color-ocean)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--color-deep-ocean)]"
            >
              Submit a New Report
            </Link>
          </div>
        </div>
      )}

      {/* Empty Initial State (Before searching) */}
      {!loading && !searched && !report && (
        <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-8 sm:p-12 text-center shadow-sm space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--color-pale-aqua)] text-[var(--color-ocean)]">
            <Search className="h-8 w-8" />
          </div>

          <div className="max-w-md mx-auto">
            <h3 className="text-lg sm:text-xl font-black text-[var(--color-deep-ocean)]">
              Track Any Water Hazard Incident
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-[var(--color-medium-teal)] leading-relaxed">
              Every submitted citizen report receives a unique tracking ID. Enter your ID above to inspect AI classification, municipal field assignment, and resolution progress.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto pt-4 text-left">
            <div className="p-4 rounded-2xl bg-[var(--color-soft-mint)] border border-[rgba(53,98,103,0.1)]">
              <span className="font-bold text-xs text-[var(--color-ocean)]">01. Instant AI Scan</span>
              <p className="text-xs text-[var(--color-medium-teal)] mt-1">
                Visual estimation of water depth, severity, and problem category.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--color-soft-mint)] border border-[rgba(53,98,103,0.1)]">
              <span className="font-bold text-xs text-[var(--color-ocean)]">02. Government Review</span>
              <p className="text-xs text-[var(--color-medium-teal)] mt-1">
                Dispatch of drainage pumps, rescue units, or repair engineers.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--color-soft-mint)] border border-[rgba(53,98,103,0.1)]">
              <span className="font-bold text-xs text-[var(--color-ocean)]">03. Real-time Status</span>
              <p className="text-xs text-[var(--color-medium-teal)] mt-1">
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
