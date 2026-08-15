// src/pages/Government/DepartmentTracking.tsx
// Tracks reports that have been assigned to departments.
// Uses the same WaterReport store (localStorage) as ReviewReports.
// Filters are applied client-side.

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  RefreshCw,
  Eye,
  Filter,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import Badge from "../../components/common/Badge";
import { getAllWaterReports } from "../../services/reportService";
import type { WaterReport } from "../../types/report";
import {
  DEPARTMENT_OPTIONS,
  type Department,
  type GovReportStatus,
} from "../../types/report";
import type { Severity } from "../../types/hazard";
import { SEVERITY_STYLES } from "../../types/hazard";

// ─── Helpers ────────────────────────────────────────────────────────────────

const GOV_STATUS_OPTIONS: { value: GovReportStatus; label: string }[] = [
  { value: "under_review", label: "Under Review" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function govStatusLabel(s?: GovReportStatus): string {
  if (!s) return "Under Review";
  return GOV_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

function govStatusVariant(s?: GovReportStatus): "info" | "warning" | "success" | "neutral" {
  switch (s) {
    case "resolved": return "success";
    case "in_progress": return "warning";
    case "assigned": return "info";
    default: return "neutral";
  }
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DepartmentTracking() {
  const [allReports, setAllReports] = useState<WaterReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterDept, setFilterDept] = useState<Department | "all">("all");
  const [filterStatus, setFilterStatus] = useState<GovReportStatus | "all">("all");
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
  const [filterArea, setFilterArea] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllWaterReports();
      // Show only reports that have been assigned to a department
      setAllReports(data.filter((r) => !!r.assignedDepartment));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derive areas from location data for filter
  const areas = useMemo(() => {
    const areaSet = new Set(
      allReports
        .map((r) => r.location.placeName ?? r.location.address ?? "")
        .filter(Boolean)
    );
    return Array.from(areaSet);
  }, [allReports]);

  const filtered = useMemo(() => {
    return allReports.filter((r) => {
      if (filterDept !== "all" && r.assignedDepartment !== filterDept) return false;
      if (filterStatus !== "all" && (r.govStatus ?? "assigned") !== filterStatus) return false;
      if (filterSeverity !== "all" && r.severity !== filterSeverity) return false;
      if (filterArea !== "all") {
        const reportArea = r.location.placeName ?? r.location.address ?? "";
        if (reportArea !== filterArea) return false;
      }
      return true;
    });
  }, [allReports, filterDept, filterStatus, filterSeverity, filterArea]);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">Department Management</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-(--color-deep-ocean)">Department Tracking</h1>
          <p className="mt-1 text-xs sm:text-sm text-(--color-medium-teal)">
            Track reports assigned to departments. Updates from Review Reports are reflected here automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="self-start flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2 text-sm font-semibold text-(--color-dark-teal) hover:bg-(--color-pale-aqua) transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-(--color-dark-teal)">
          <Filter className="h-4 w-4" />
          Filter Assigned Reports
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Department filter */}
          <div>
            <label className="block text-xs font-semibold text-(--color-medium-teal) mb-1">Department</label>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value as Department | "all")}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
            >
              <option value="all">All Departments</option>
              {DEPARTMENT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-xs font-semibold text-(--color-medium-teal) mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as GovReportStatus | "all")}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
            >
              <option value="all">All Statuses</option>
              {GOV_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-xs font-semibold text-(--color-medium-teal) mb-1">Priority</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as Severity | "all")}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
            >
              <option value="all">All Priorities</option>
              {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Area filter */}
          <div>
            <label className="block text-xs font-semibold text-(--color-medium-teal) mb-1">Area</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
            >
              <option value="all">All Areas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-(--color-ocean)" />
          <span className="ml-3 text-sm text-(--color-medium-teal)">Loading assignments…</span>
        </div>
      ) : allReports.length === 0 ? (
        <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-10 text-center">
          <Building2 className="h-8 w-8 text-(--color-medium-teal) mx-auto mb-3" />
          <p className="text-sm font-semibold text-(--color-dark-teal) mb-1">No assigned reports yet</p>
          <p className="text-xs text-(--color-medium-teal)">
            Assign reports to departments from the Review Reports page and they will appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-(--color-medium-teal) mx-auto mb-3" />
          <p className="text-sm text-(--color-medium-teal)">No reports match the selected filters.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm">
            <table className="min-w-full">
              <thead className="bg-(--color-soft-mint) border-b border-[rgba(53,98,103,0.1)]">
                <tr>
                  {["Report ID", "Problem", "Location", "Department", "Priority", "Status", "Assigned Date", "Last Updated", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal) whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(53,98,103,0.07)]">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-(--color-soft-mint)/40 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold text-(--color-ocean)">{r.id}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-(--color-deep-ocean)">{r.categoryLabel}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-(--color-medium-teal) max-w-[140px] block truncate">
                        {r.location.placeName ?? r.location.address ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-(--color-dark-teal)">{r.assignedDepartment}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_STYLES[r.severity].bg} ${SEVERITY_STYLES[r.severity].text}`}>
                        {SEVERITY_STYLES[r.severity].label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={govStatusVariant(r.govStatus)}>{govStatusLabel(r.govStatus)}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-(--color-medium-teal) whitespace-nowrap">{formatDate(r.assignedAt)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-(--color-medium-teal) whitespace-nowrap">{formatDate(r.updatedAt)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <a
                        href="/government/review-reports"
                        className="flex items-center gap-1.5 rounded-lg bg-(--color-ocean) px-3 py-1.5 text-xs font-semibold text-white hover:bg-(--color-deep-ocean) transition whitespace-nowrap"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-4 shadow-sm space-y-3">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-semibold text-(--color-ocean)">{r.id}</span>
                    <p className="mt-0.5 text-sm font-bold text-(--color-deep-ocean)">{r.categoryLabel}</p>
                    <p className="text-xs text-(--color-medium-teal)">{r.location.placeName ?? r.location.address ?? "Unknown"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_STYLES[r.severity].bg} ${SEVERITY_STYLES[r.severity].text}`}>
                      {SEVERITY_STYLES[r.severity].label}
                    </span>
                    <Badge variant={govStatusVariant(r.govStatus)}>{govStatusLabel(r.govStatus)}</Badge>
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-center gap-2 text-xs text-(--color-dark-teal)">
                  <Building2 className="h-3.5 w-3.5 text-(--color-ocean) shrink-0" />
                  <span className="font-semibold">{r.assignedDepartment}</span>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2 text-xs text-(--color-medium-teal)">
                  <div>
                    <p className="font-semibold">Assigned</p>
                    <p>{formatDate(r.assignedAt)}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Updated</p>
                    <p>{formatDate(r.updatedAt)}</p>
                  </div>
                </div>

                <a
                  href="/government/review-reports"
                  className="flex items-center justify-center gap-2 rounded-xl bg-(--color-ocean) py-2.5 text-sm font-bold text-white hover:bg-(--color-deep-ocean) transition"
                >
                  <Eye className="h-4 w-4" />
                  View in Review Reports
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
