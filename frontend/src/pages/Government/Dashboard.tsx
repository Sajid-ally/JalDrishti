// src/pages/Government/Dashboard.tsx
// Government Disaster Response & Operations Dashboard with City-Wise Filtering (Kanpur default),
// Real Dynamic Statistics Calculation, and Direct Interactive Report Management

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPinned,
  Siren,
  Waves,
  FileCheck,
  ShieldCheck,
  ExternalLink,
  Filter,
  RefreshCw,
  Building2,
  Eye,
} from "lucide-react";

import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import useAuth from "../../hooks/useAuth";
import {
  getDashboardStats,
  getAdministrativeReports,
} from "../../services/reportService";
import type { WaterReport, GovReportStatus } from "../../types/report";
import GovernmentReportDetailDrawer from "../../components/report/GovernmentReportDetailDrawer";
import {
  ALL_INDIAN_STATES,
  STATE_CITIES_MAP,
  CITY_LOCALITIES_MAP,
  normalizeCityName,
  detectNearestJurisdiction,
} from "../../data/indiaLocations";
import toast from "react-hot-toast";

const quickLinks = [
  {
    to: "/government/live-map",
    label: "Live Map",
    desc: "Monitor live incidents and real-time citizen reports on GIS map",
    icon: MapPinned,
    accent: "bg-(--color-soft-mint) border-[rgba(53,98,103,0.2)] text-(--color-dark-teal)",
    iconBg: "bg-(--color-pale-aqua) text-(--color-ocean)",
  },
  {
    to: "/government/emergency-operations",
    label: "Emergency Operations",
    desc: "Dispatch rescue teams (NDRF/SDRF) and coordinate urgent relief",
    icon: Siren,
    accent: "bg-red-50 border-red-200 text-red-700",
    iconBg: "bg-red-100 text-red-700",
  },
  {
    to: "/government/review-reports",
    label: "Review Reports",
    desc: "Review, assign departments, and track or reject citizen submissions",
    icon: Waves,
    accent: "bg-sky-50 border-sky-200 text-sky-700",
    iconBg: "bg-sky-100 text-sky-700",
  },
];

const statusVariant = (
  status?: GovReportStatus
): "info" | "warning" | "success" | "neutral" | "danger" => {
  if (status === "resolved") return "success";
  if (status === "rejected") return "danger";
  if (status === "in_progress") return "warning";
  if (status === "assigned") return "info";
  return "neutral";
};

export default function GovernmentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Jurisdiction filter states - Pure dynamic auto-detection with National (All India) default
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedLocality, setSelectedLocality] = useState<string>("all");
  const [isGpsDetected, setIsGpsDetected] = useState<boolean>(false);
  const [detectingGps, setDetectingGps] = useState<boolean>(false);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    resolved: 0,
    rejected: 0,
  });

  const [reports, setReports] = useState<WaterReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WaterReport | null>(null);
  const [loading, setLoading] = useState(true);

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
        // Stays on All-India overview if permission is not granted
        setDetectingGps(false);
      },
      { timeout: 6000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (user?.city) {
      setSelectedCity(user.city);
      if (user.state) setSelectedState(user.state);
      setIsGpsDetected(true);
    } else {
      handleAutoDetectLocation();
    }
  }, [user, handleAutoDetectLocation]);

  // Load Dashboard Data with Jurisdiction Filters
  const loadDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      const filters: any = {};
      if (selectedState !== "all") filters.state = selectedState;
      if (selectedCity !== "all") filters.city = selectedCity;
      if (selectedLocality !== "all") filters.locality = selectedLocality;

      // 1. Fetch filtered stats
      const statsData = await getDashboardStats(filters);

      // 2. Fetch filtered reports
      const reportsList = await getAdministrativeReports(filters);
      setReports(reportsList);

      const total =
        statsData.totalReports ?? (statsData as any).summary?.totalReports ?? reportsList.length;
      const pending =
        statsData.pendingReview ?? (statsData as any).summary?.submitted ?? reportsList.filter((r) => r.govStatus === "under_review" || !r.govStatus).length;
      const verified =
        statsData.verifiedIncidents ?? (statsData as any).summary?.verified ?? reportsList.filter((r) => r.govStatus === "assigned" || r.govStatus === "in_progress").length;
      const resolved =
        statsData.resolvedIncidents ?? (statsData as any).summary?.resolved ?? reportsList.filter((r) => r.govStatus === "resolved").length;
      const rejected =
        statsData.rejected ?? statsData.rejectedIncidents ?? (statsData as any).summary?.rejected ?? reportsList.filter((r) => r.govStatus === "rejected").length;

      setStats({
        total,
        pending,
        verified,
        resolved,
        rejected,
      });
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedState, selectedCity, selectedLocality]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

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

  return (
    <main className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-(--color-ocean)" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
              Government Command Hub
            </p>
          </div>

          <h1 className="mt-1 text-3xl font-black text-(--color-deep-ocean)">
            Disaster Response Overview
          </h1>

          <p className="mt-1 text-sm text-(--color-medium-teal)">
            Welcome{user?.name ? `, ${user.name}` : ""}. Monitor verified city-level incidents, assign response departments, and dispatch rescue operations.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboardData}
          disabled={loading}
          className="flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm font-bold text-(--color-dark-teal) shadow-sm hover:bg-slate-50 transition cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {/* Jurisdiction / Administrative Filter Bar */}
      <section className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-(--color-dark-teal)">
            <Filter className="h-4 w-4 text-(--color-ocean)" />
            <span>Officer Jurisdiction (City-Wise Filter)</span>
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

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  setSelectedCity(cities[0] || "all");
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
              Locality / Ward
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
        </div>

        <div className="text-xs text-(--color-dark-teal) pt-2 border-t border-slate-100 font-medium flex items-center justify-between">
          <span>
            Displaying metrics & problems for: <strong className="text-(--color-ocean)">{selectedCity !== "all" ? selectedCity : selectedState !== "all" ? selectedState : "All India"}</strong>
          </span>
          <span className="text-slate-500">
            {stats.total} total incident{stats.total === 1 ? "" : "s"} logged in this area
          </span>
        </div>
      </section>

      {/* Dynamic Statistics Cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card
          variant="stat"
          className="rounded-2xl p-5"
          title={`Total Reports in ${selectedCity !== "all" ? selectedCity : selectedState !== "all" ? selectedState : "India"}`}
          value={stats.total}
          subtitle={`Active in ${selectedCity !== "all" ? selectedCity : "scope"}`}
        />

        <Card
          variant="stat"
          className="rounded-2xl p-5"
          title="Pending Review"
          value={stats.pending}
          subtitle="Awaiting desk action"
        />

        <Card
          variant="stat"
          className="rounded-2xl p-5"
          title="Assigned / Active"
          value={stats.verified}
          subtitle="Under active response"
        />

        <Card
          variant="stat"
          className="rounded-2xl p-5"
          title="Rejected"
          value={stats.rejected}
          subtitle="Invalid / duplicates"
        />
      </section>

      {/* Operations & Department Tracking */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-ocean)">
              Operations
            </p>

            <h2 className="mt-1 text-xl font-bold text-(--color-deep-ocean)">
              Department Incident Tracking ({reports.length}) — {selectedCity !== "all" ? selectedCity : selectedState !== "all" ? selectedState : "All India"}
            </h2>

            <p className="mt-1 text-sm text-(--color-medium-teal)">
              Track real-time progress of citizen incidents in {selectedCity !== "all" ? selectedCity : selectedState !== "all" ? selectedState : "your jurisdiction"}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/government/review-reports")}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(53,98,103,0.18)] bg-white px-4 py-2 text-xs font-semibold text-(--color-ocean) transition hover:bg-(--color-pale-aqua) cursor-pointer"
          >
            Review all
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-[rgba(53,98,103,0.12)] bg-(--color-soft-mint)/40">
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)">
                  Report ID
                </th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)">
                  Problem Type
                </th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)">
                  Location
                </th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)">
                  Assigned Dept
                </th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)">
                  Status
                </th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {reports.slice(0, 6).map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-[rgba(53,98,103,0.08)] last:border-b-0 hover:bg-(--color-soft-mint)/20 transition"
                >
                  {/* Report */}
                  <td className="px-5 py-4 font-mono text-xs font-bold text-(--color-ocean)">
                    <div className="flex items-center gap-2.5">
                      <FileCheck className="h-4 w-4 text-(--color-ocean) shrink-0" />
                      <span>{report.id}</span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-5 py-4 text-sm font-bold text-(--color-deep-ocean)">
                    {report.categoryLabel}
                  </td>

                  {/* Location */}
                  <td className="px-5 py-4 text-xs text-(--color-dark-teal)">
                    <p className="font-semibold">{report.location.placeName || "Incident Site"}</p>
                    <p className="text-[11px] text-(--color-medium-teal)">{report.location.address}</p>
                  </td>

                  {/* Assigned Department */}
                  <td className="px-5 py-4 text-xs">
                    {report.assignedDepartment ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        <Building2 className="h-3 w-3 text-teal-600" />
                        {report.assignedDepartment}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <Badge variant={statusVariant(report.govStatus)}>
                      {report.govStatus ? report.govStatus.replace(/_/g, " ").toUpperCase() : "UNDER REVIEW"}
                    </Badge>
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="flex items-center gap-1 text-xs font-bold text-(--color-ocean) hover:underline cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Review / Assign
                    </button>
                  </td>
                </tr>
              ))}

              {reports.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-(--color-medium-teal)"
                  >
                    No incidents reported yet in {selectedCity !== "all" ? selectedCity : "this region"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Navigation Areas */}
      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.15em] text-(--color-dark-teal)">
          Management Areas
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;

            return (
              <button
                key={link.to}
                type="button"
                onClick={() => navigate(link.to)}
                className={`flex items-center gap-4 rounded-3xl border px-6 py-5 text-left transition hover:shadow-md cursor-pointer ${link.accent}`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${link.iconBg}`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div>
                  <p className="font-bold text-base">{link.label}</p>
                  <p className="text-xs opacity-80 mt-0.5">{link.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Detail & Action Drawer */}
      {selectedReport && (
        <GovernmentReportDetailDrawer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdated={() => {
            void loadDashboardData();
          }}
        />
      )}
    </main>
  );
}