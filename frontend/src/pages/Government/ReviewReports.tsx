// src/pages/Government/ReviewReports.tsx
// Government Review Reports Page with City-Wise Filtering (Kanpur default),
// 1-Click Status Controls, Direct Reject Button, and Bi-directional Synchronization

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

import Badge from "../../components/common/Badge";
import GovernmentReportDetailDrawer from "../../components/report/GovernmentReportDetailDrawer";
import {
  getAdministrativeReports,
  updateGovStatus,
} from "../../services/reportService";
import type { WaterReport, GovReportStatus } from "../../types/report";
import type { Severity } from "../../types/hazard";
import { SEVERITY_STYLES } from "../../types/hazard";
import {
  ALL_INDIAN_STATES,
  STATE_CITIES_MAP,
  CITY_LOCALITIES_MAP,
  normalizeCityName,
  detectNearestJurisdiction,
} from "../../data/indiaLocations";

const statuses: { value: GovReportStatus; label: string }[] = [
  { value: "under_review", label: "Under Review" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const priorities: Severity[] = ["low", "moderate", "high", "critical"];

const statusLabel = (status?: GovReportStatus) =>
  statuses.find((item) => item.value === status)?.label ?? "Under Review";

const statusVariant = (
  status?: GovReportStatus
): "info" | "warning" | "success" | "neutral" | "danger" => {
  if (status === "resolved") return "success";
  if (status === "rejected") return "danger";
  if (status === "in_progress") return "warning";
  if (status === "assigned") return "info";
  return "neutral";
};

import RejectReasonModal from "../../components/report/RejectReasonModal";

export default function ReviewReports() {
  const [reports, setReports] = useState<WaterReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<WaterReport | null>(null);
  const [rejectTargetReport, setRejectTargetReport] = useState<WaterReport | null>(null);

  // Jurisdiction filter states - Pure dynamic auto-detection with National (All India) default
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedLocality, setSelectedLocality] = useState<string>("all");
  const [isGpsDetected, setIsGpsDetected] = useState<boolean>(false);
  const [detectingGps, setDetectingGps] = useState<boolean>(false);

  const [filterStatus, setFilterStatus] = useState<GovReportStatus | "all">("all");
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");

  // Auto-Detect Officer's Current Location / Jurisdiction via GPS
  const handleAutoDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const detected = detectNearestJurisdiction(latitude, longitude);
        setSelectedState(detected.state);
        setSelectedCity(detected.city);
        setSelectedLocality("all");
        setIsGpsDetected(true);
        setDetectingGps(false);
        toast.success(`📍 Auto-detected jurisdiction: ${detected.city}, ${detected.state}`);
      },
      () => {
        setDetectingGps(false);
      },
      { timeout: 6000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    handleAutoDetectLocation();
  }, [handleAutoDetectLocation]);

  // Load Reports from Backend
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedState !== "all") filters.state = selectedState;
      if (selectedCity !== "all") filters.city = selectedCity;
      if (selectedLocality !== "all") filters.locality = selectedLocality;

      const data = await getAdministrativeReports(filters);
      setReports(data);
    } catch (err) {
      console.error("Failed to load reports:", err);
      toast.error("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [selectedState, selectedCity, selectedLocality]);

  useEffect(() => {
    void load();
  }, [load]);

  // Available cities for selected state
  const availableCities = useMemo(() => {
    if (selectedState === "all") {
      const allCities = Object.values(STATE_CITIES_MAP).flat();
      return Array.from(new Set(allCities)).sort();
    }
    return STATE_CITIES_MAP[selectedState] || [];
  }, [selectedState]);

  // Available localities for selected city
  const availableLocalities = useMemo(() => {
    if (selectedCity === "all") return [];
    const normalized = normalizeCityName(selectedCity);
    const locList = CITY_LOCALITIES_MAP[normalized] || [];
    return locList.map((loc) => loc.name).sort();
  }, [selectedCity]);

  // Handle 1-Click Quick Status Changes
  const handleQuickStatusChange = async (
    reportId: string,
    newStatus: GovReportStatus,
    note?: string
  ) => {
    setActionLoadingId(reportId);
    try {
      await updateGovStatus(reportId, newStatus, note);
      if (newStatus === "rejected") {
        toast.success("Report rejected with reason and unlisted from active queue.");
      } else {
        toast.success(`Report status updated to ${statusLabel(newStatus)}`);
      }
      await load();
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Failed to update report status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered reports: When viewing "all" (active operational queue), rejected reports are unlisted!
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const currentGovStatus = r.govStatus ?? "under_review";
      const matchesStatus =
        filterStatus === "all"
          ? currentGovStatus !== "rejected" // Unlisted from active queue
          : currentGovStatus === filterStatus;
      const matchesSeverity =
        filterSeverity === "all" || r.severity === filterSeverity;
      return matchesStatus && matchesSeverity;
    });
  }, [reports, filterStatus, filterSeverity]);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-(--color-ocean)" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
              Government Review Desk
            </p>
          </div>

          <h1 className="mt-1 text-2xl font-black text-(--color-deep-ocean) sm:text-3xl">
            Review & Assign Problem Reports
          </h1>

          <p className="mt-1 text-xs text-(--color-medium-teal) sm:text-sm">
            Review citizen submissions, assign municipal departments, progress work, or reject invalid reports in real time.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex self-start items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm font-bold text-(--color-dark-teal) shadow-sm hover:bg-slate-50 transition cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Jurisdiction & Scope Selector */}
      <section className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-(--color-dark-teal)">
            <Filter className="h-4 w-4 text-(--color-ocean)" />
            <span>Administrative Scope & Location Filter</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAutoDetectLocation}
              disabled={detectingGps}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                isGpsDetected
                  ? "bg-teal-700 text-white border-teal-800 shadow-sm"
                  : "bg-white text-teal-800 border-teal-300 hover:bg-teal-50"
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${detectingGps ? "animate-spin" : ""}`} />
              🎯 {detectingGps ? "Detecting GPS…" : isGpsDetected ? `Auto-Detected: ${selectedCity}` : "Auto-Detect My Location"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedState("all");
                setSelectedCity("all");
                setSelectedLocality("all");
                setIsGpsDetected(false);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                selectedState === "all" && !isGpsDetected
                  ? "bg-teal-800 text-white border-teal-900 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              🇮🇳 All India Overview
            </button>
          </div>
        </div>

        {/* Dropdowns Grid */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {/* State */}
          <div>
            <label className="block text-xs font-bold text-(--color-medium-teal) mb-1">
              State / UT
            </label>
            <select
              value={selectedState}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedState(val);
                if (val === "all") {
                  setSelectedCity("all");
                  setSelectedLocality("all");
                } else {
                  const cities = STATE_CITIES_MAP[val] || [];
                  setSelectedCity(cities.includes("Kanpur") ? "Kanpur" : cities[0] || "all");
                  setSelectedLocality("all");
                }
              }}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs font-semibold text-(--color-deep-ocean)"
            >
              <option value="all">All States</option>
              {ALL_INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-bold text-(--color-medium-teal) mb-1">
              City / District
            </label>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedLocality("all");
              }}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs font-semibold text-(--color-deep-ocean)"
            >
              <option value="all">All Cities</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Locality */}
          <div>
            <label className="block text-xs font-bold text-(--color-medium-teal) mb-1">
              Locality
            </label>
            <select
              value={selectedLocality}
              onChange={(e) => setSelectedLocality(e.target.value)}
              disabled={availableLocalities.length === 0}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs font-semibold text-(--color-deep-ocean) disabled:opacity-50"
            >
              <option value="all">All Localities</option>
              {availableLocalities.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-(--color-medium-teal) mb-1">
              Status Filter
            </label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as GovReportStatus | "all")
              }
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs font-semibold text-(--color-deep-ocean)"
            >
              <option value="all">All Statuses</option>
              {statuses.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-(--color-medium-teal) mb-1">
              Priority Filter
            </label>
            <select
              value={filterSeverity}
              onChange={(e) =>
                setFilterSeverity(e.target.value as Severity | "all")
              }
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs font-semibold text-(--color-deep-ocean)"
            >
              <option value="all">All Priorities</option>
              {priorities.map((x) => (
                <option key={x} value={x}>
                  {SEVERITY_STYLES[x].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Scope Banner */}
        <div className="flex items-center justify-between text-xs text-(--color-dark-teal) pt-2 border-t border-slate-100 font-medium">
          <span>
            Viewing problems for: <strong className="text-(--color-ocean)">{selectedCity !== "all" ? selectedCity : selectedState !== "all" ? selectedState : "All India"}</strong> ({filtered.length} report{filtered.length === 1 ? "" : "s"})
          </span>
          <span className="text-slate-500">
            Click status badges or &ldquo;View / Assign&rdquo; to modify report status dynamically.
          </span>
        </div>
      </section>

      {/* Reports Table / Card List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-(--color-ocean)" />
          <span className="ml-3 text-sm font-semibold text-(--color-medium-teal)">
            Loading reports for {selectedCity !== "all" ? selectedCity : "selected jurisdiction"}…
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-10 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
          <p className="text-sm font-bold text-(--color-deep-ocean)">
            No reports found for the selected filters.
          </p>
          <p className="text-xs text-(--color-medium-teal) mt-1">
            Try choosing &ldquo;All India&rdquo; or adjusting the city and status filters above.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm lg:block">
            <table className="min-w-full text-left">
              <thead className="border-b border-[rgba(53,98,103,0.1)] bg-(--color-soft-mint)">
                <tr>
                  {[
                    "Report ID",
                    "Problem",
                    "Location",
                    "Assigned Dept",
                    "Priority",
                    "Current Status",
                    "Quick Actions",
                    "Details",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[rgba(53,98,103,0.07)]">
                {filtered.map((r) => {
                  const isActing = actionLoadingId === r.id;

                  return (
                    <tr
                      key={r.id}
                      className="transition hover:bg-(--color-soft-mint)/40"
                    >
                      {/* ID */}
                      <td className="px-5 py-4 font-mono text-xs font-bold text-(--color-ocean)">
                        {r.id}
                      </td>

                      {/* Problem */}
                      <td className="px-5 py-4 text-sm font-bold text-(--color-deep-ocean)">
                        <div>{r.categoryLabel}</div>
                        {r.source === "SOCIAL_MEDIA" ? (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              📱 @{r.socialUsername || "citizen"}
                            </span>
                          </div>
                        ) : r.contactName ? (
                          <div className="mt-1 text-[11px] font-medium text-slate-500">
                            👤 {r.contactName}
                          </div>
                        ) : null}
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 text-xs text-(--color-dark-teal) max-w-xs">
                        <p className="font-semibold">{r.location.placeName || "Incident Site"}</p>
                        {r.location.address && (
                          <p className="text-[11px] text-(--color-medium-teal) truncate">
                            {r.location.address}
                          </p>
                        )}
                      </td>

                      {/* Assigned Dept */}
                      <td className="px-5 py-4 text-xs text-(--color-dark-teal)">
                        {r.assignedDepartment ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                            <Building2 className="h-3 w-3 text-teal-600" />
                            {r.assignedDepartment}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-4">
                        <Priority report={r} />
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        <Badge variant={statusVariant(r.govStatus)}>
                          {statusLabel(r.govStatus)}
                        </Badge>
                      </td>

                      {/* Quick Actions (1-Click Workflow) */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {/* In Progress */}
                          <button
                            type="button"
                            title="Mark In Progress"
                            disabled={isActing || r.govStatus === "in_progress"}
                            onClick={() => handleQuickStatusChange(r.id, "in_progress")}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-40 transition cursor-pointer"
                          >
                            Progress
                          </button>

                          {/* Resolve */}
                          <button
                            type="button"
                            title="Mark Resolved"
                            disabled={isActing || r.govStatus === "resolved"}
                            onClick={() => handleQuickStatusChange(r.id, "resolved")}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 transition cursor-pointer"
                          >
                            Resolve
                          </button>

                          {/* Reject */}
                          <button
                            type="button"
                            title="Reject Report with Official Reason"
                            disabled={isActing || r.govStatus === "rejected"}
                            onClick={() => setRejectTargetReport(r)}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40 transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </td>

                      {/* Full Drawer View */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelected(r)}
                          className="flex items-center gap-1 rounded-xl bg-(--color-ocean) px-3 py-1.5 text-xs font-bold text-white hover:bg-(--color-deep-ocean) transition cursor-pointer shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Cards */}
          <div className="space-y-4 lg:hidden">
            {filtered.map((r) => {
              const isActing = actionLoadingId === r.id;

              return (
                <article
                  key={r.id}
                  className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-bold text-(--color-ocean)">
                        {r.id}
                      </p>
                      <p className="mt-0.5 text-base font-bold text-(--color-deep-ocean)">
                        {r.categoryLabel}
                      </p>
                      {r.source === "SOCIAL_MEDIA" ? (
                        <p className="text-[11px] font-semibold text-blue-700">
                          📱 @{r.socialUsername || "citizen"}
                        </p>
                      ) : r.contactName ? (
                        <p className="text-[11px] font-medium text-slate-500">
                          👤 {r.contactName}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-(--color-medium-teal)">
                        {r.location.placeName ?? r.location.address ?? "Unknown site"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <Priority report={r} />
                      <Badge variant={statusVariant(r.govStatus)}>
                        {statusLabel(r.govStatus)}
                      </Badge>
                    </div>
                  </div>

                  {r.assignedDepartment && (
                    <p className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 border border-teal-200">
                      <Building2 className="h-3.5 w-3.5 text-teal-600" />
                      {r.assignedDepartment}
                    </p>
                  )}

                  {/* 1-Click Action Bar */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isActing || r.govStatus === "in_progress"}
                      onClick={() => handleQuickStatusChange(r.id, "in_progress")}
                      className="py-1.5 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 text-amber-800 disabled:opacity-40"
                    >
                      In Progress
                    </button>

                    <button
                      type="button"
                      disabled={isActing || r.govStatus === "resolved"}
                      onClick={() => handleQuickStatusChange(r.id, "resolved")}
                      className="py-1.5 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 disabled:opacity-40"
                    >
                      Resolve
                    </button>

                    <button
                      type="button"
                      disabled={isActing || r.govStatus === "rejected"}
                      onClick={() => setRejectTargetReport(r)}
                      className="py-1.5 text-xs font-bold rounded-xl border border-rose-300 bg-rose-50 text-rose-700 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-(--color-ocean) py-2.5 text-xs font-bold text-white hover:bg-(--color-deep-ocean) transition cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                    Open Detail & Assign Drawer
                  </button>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Drawer */}
      {selected && (
        <GovernmentReportDetailDrawer
          report={selected}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      )}

      {/* Reject Reason Modal */}
      <RejectReasonModal
        isOpen={!!rejectTargetReport}
        reportId={rejectTargetReport?.id}
        reportTitle={rejectTargetReport?.title || rejectTargetReport?.categoryLabel}
        isLoading={actionLoadingId === rejectTargetReport?.id}
        onConfirm={async (reason) => {
          if (rejectTargetReport) {
            await handleQuickStatusChange(rejectTargetReport.id, "rejected", reason);
            setRejectTargetReport(null);
          }
        }}
        onClose={() => setRejectTargetReport(null)}
      />
    </main>
  );
}

function Priority({ report }: { report: WaterReport }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
        SEVERITY_STYLES[report.severity].bg
      } ${SEVERITY_STYLES[report.severity].text}`}
    >
      {SEVERITY_STYLES[report.severity].label}
    </span>
  );
}
