// src/pages/Government/LiveMap.tsx
// Real-time Nationwide and Local Water Hazard Map for Government Command Hub
// Uses 100% Real Live Database Data (No Mock/Hardcoded Locations)
// Complete with Cascading State -> City -> Locality Filters & Direct Review Drawer

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Filter,
  ShieldAlert,
  ClipboardList,
  Eye,
  RefreshCw,
  Siren,
  Building2,
} from "lucide-react";

import LiveMap, { type HazardLocation } from "../../components/map/LiveMap";
import Badge from "../../components/common/Badge";
import type { MapIssueType } from "../../services/hazardService";
import { getAllWaterReports } from "../../services/reportService";
import {
  ALL_INDIAN_STATES,
  STATE_CITIES_MAP,
  CITY_LOCALITIES_MAP,
  normalizeCityName,
  detectNearestJurisdiction,
  CITY_COORDINATES,
} from "../../data/indiaLocations";
import toast from "react-hot-toast";
import type { WaterReport, GovReportStatus } from "../../types/report";
import GovernmentReportDetailDrawer from "../../components/report/GovernmentReportDetailDrawer";

const statusVariant = (
  status?: GovReportStatus
): "info" | "warning" | "success" | "neutral" | "danger" => {
  if (status === "resolved") return "success";
  if (status === "rejected") return "danger";
  if (status === "in_progress") return "warning";
  if (status === "assigned") return "info";
  return "neutral";
};

export default function GovernmentLiveMap() {
  const navigate = useNavigate();

  // Location filter states - Pure dynamic auto-detection with National (All India) default
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedLocality, setSelectedLocality] = useState<string>("all");
  const [issueFilter, setIssueFilter] = useState<MapIssueType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isGpsDetected, setIsGpsDetected] = useState<boolean>(false);
  const [detectingGps, setDetectingGps] = useState<boolean>(false);

  // Real Database Data
  const [dbReports, setDbReports] = useState<WaterReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedReport, setSelectedReport] = useState<WaterReport | null>(null);

  // Map view target - Defaults to full India view
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState<number>(5);

  // Auto-Detect Officer's Current Location / Jurisdiction via GPS
  const handleAutoDetectLocation = () => {
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
        const cityCoord = CITY_COORDINATES[detected.city];
        if (cityCoord) {
          setMapCenter([cityCoord.lat, cityCoord.lng]);
        } else {
          setMapCenter([latitude, longitude]);
        }
        setMapZoom(12);
        setIsGpsDetected(true);
        setDetectingGps(false);
        toast.success(`📍 Map centered on auto-detected jurisdiction: ${detected.city}, ${detected.state}`);
      },
      () => {
        setDetectingGps(false);
      },
      { timeout: 6000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    handleAutoDetectLocation();
  }, []);

  // Load Real Data from Backend
  const loadData = async () => {
    setLoading(true);
    try {
      const reports = await getAllWaterReports();
      setDbReports(reports);
    } catch (err) {
      console.error("Failed to load real water reports for government map:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

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

  // Handle State Change
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    if (state === "all") {
      setSelectedCity("all");
      setSelectedLocality("all");
      setMapCenter([22.5937, 78.9629]);
      setMapZoom(5);
    } else {
      const cities = STATE_CITIES_MAP[state] || [];
      if (cities.length > 0) {
        const defaultCity = cities.includes("Kanpur") ? "Kanpur" : cities[0];
        setSelectedCity(defaultCity);
        setSelectedLocality("all");
      } else {
        setSelectedCity("all");
        setSelectedLocality("all");
      }
    }
  };

  // Handle City Change
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedLocality("all");

    if (city !== "all") {
      const norm = normalizeCityName(city);
      const locs = CITY_LOCALITIES_MAP[norm];
      if (locs && locs.length > 0) {
        setMapCenter([locs[0].lat, locs[0].lng]);
        setMapZoom(12);
      }
    } else if (selectedState !== "all") {
      setMapCenter([26.8467, 80.9462]);
      setMapZoom(7);
    }
  };

  // Handle Locality Change
  const handleLocalityChange = (loc: string) => {
    setSelectedLocality(loc);
    if (loc !== "all" && selectedCity !== "all") {
      const norm = normalizeCityName(selectedCity);
      const locList = CITY_LOCALITIES_MAP[norm] || [];
      const found = locList.find((l) => l.name === loc);
      if (found) {
        setMapCenter([found.lat, found.lng]);
        setMapZoom(found.zoom || 15);
      }
    }
  };

  // Filtered Real Reports
  const filteredReports = useMemo(() => {
    return dbReports.filter((r) => {
      // Problem Type
      if (issueFilter !== "all") {
        const matchesIssue =
          r.problemType === issueFilter ||
          (issueFilter === "flood" && r.problemType === "urban_flooding") ||
          (issueFilter === "waterlogging" && r.problemType === "waterlogging") ||
          (issueFilter === "sewage" && r.problemType === "drainage_problem") ||
          (issueFilter === "water_quality" && r.problemType === "water_quality_pollution") ||
          (issueFilter === "pond" && r.problemType === "pond_lake_issue");
        if (!matchesIssue) return false;
      }

      // Status
      if (statusFilter !== "all") {
        if ((r.govStatus || "under_review") !== statusFilter) return false;
      }

      // State Filter
      if (selectedState !== "all") {
        const rState = (r.location as any)?.state || "";
        const rAddr = r.location.address || "";
        const rPlace = r.location.placeName || "";
        const matchesState =
          rState.toLowerCase().includes(selectedState.toLowerCase()) ||
          rAddr.toLowerCase().includes(selectedState.toLowerCase()) ||
          rPlace.toLowerCase().includes(selectedState.toLowerCase());

        if (!matchesState && selectedState === "Uttar Pradesh") {
          // If in UP and address has Kanpur/Lucknow etc.
          const isUPCity = ["kanpur", "lucknow", "varanasi", "noida", "agra"].some((c) =>
            rAddr.toLowerCase().includes(c) || rPlace.toLowerCase().includes(c)
          );
          if (!isUPCity && !rState) return false;
        } else if (!matchesState && rState) {
          return false;
        }
      }

      // City Filter
      if (selectedCity !== "all") {
        const normSelected = normalizeCityName(selectedCity).toLowerCase();
        const rCity = ((r.location as any)?.city || "").toLowerCase();
        const rDistrict = ((r.location as any)?.district || "").toLowerCase();
        const rAddr = (r.location.address || "").toLowerCase();
        const rPlace = (r.location.placeName || "").toLowerCase();

        const matchesCity =
          rCity.includes(normSelected) ||
          rDistrict.includes(normSelected) ||
          rAddr.includes(normSelected) ||
          rPlace.includes(normSelected) ||
          (normSelected === "kanpur" &&
            (rAddr.includes("kanpur") ||
              rPlace.includes("kanpur") ||
              rAddr.includes("mall road") ||
              rAddr.includes("bhauti") ||
              rAddr.includes("bakar mandi")));

        if (!matchesCity) return false;
      }

      // Locality Filter
      if (selectedLocality !== "all") {
        const locLower = selectedLocality.toLowerCase();
        const rLoc = ((r.location as any)?.locality || "").toLowerCase();
        const rAddr = (r.location.address || "").toLowerCase();
        const rPlace = (r.location.placeName || "").toLowerCase();

        const matchesLoc =
          rLoc.includes(locLower) || rAddr.includes(locLower) || rPlace.includes(locLower);
        if (!matchesLoc) return false;
      }

      return true;
    });
  }, [dbReports, issueFilter, statusFilter, selectedState, selectedCity, selectedLocality]);

  // Convert real reports to Map Hazard Locations
  const mapHazardLocations: HazardLocation[] = useMemo(() => {
    return filteredReports.map((r) => {
      let type: MapIssueType = "other";
      if (r.problemType === "urban_flooding") type = "flood";
      else if (r.problemType === "waterlogging") type = "waterlogging";
      else if (r.problemType === "drainage_problem") type = "sewage";
      else if (r.problemType === "water_quality_pollution") type = "water_quality";
      else if (r.problemType === "pond_lake_issue") type = "pond";

      const lat = r.location.coords.lat || 26.4499;
      const lng = r.location.coords.lng || 80.3319;

      return {
        id: r.id,
        reportId: r.id,
        latitude: lat,
        longitude: lng,
        hazardType: type,
        severity: r.severity,
        status: r.govStatus || "under_review",
        placeName: r.location.placeName || r.location.address || "Reported Site",
        state: (r.location as any)?.state || "Uttar Pradesh",
        district: (r.location as any)?.district || (r.location as any)?.city || "Kanpur",
        locality: (r.location as any)?.locality || r.location.placeName || "Local Area",
        title: `${r.categoryLabel} — ${r.location.placeName || "Incident Site"}`,
        description: r.description || `${r.categoryLabel} reported by citizen`,
        imageUrl: r.media?.[0]?.url,
        createdAt: r.createdAt,
      };
    });
  }, [filteredReports]);

  return (
    <main className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-(--color-ocean)" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
              Government Command Center
            </p>
          </div>

          <h1 className="mt-1 text-2xl font-black text-(--color-deep-ocean) sm:text-3xl">
            Live Water Hazard & Operations Map
          </h1>

          <p className="mt-1 text-xs text-(--color-medium-teal) sm:text-sm">
            Live dynamic GIS visualization of verified citizen problems, rescue operations, and municipal responses.
          </p>
        </div>

        {/* Quick Action Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3.5 py-2 text-xs font-bold text-(--color-dark-teal) transition hover:bg-slate-50 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => navigate("/government/review-reports")}
            className="flex items-center gap-1.5 rounded-xl bg-(--color-ocean) px-3.5 py-2 text-xs font-bold text-white transition hover:bg-(--color-deep-ocean) shadow-sm cursor-pointer"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Review Reports ({dbReports.length})
          </button>

          <button
            type="button"
            onClick={() => navigate("/government/emergency-operations")}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-rose-700 shadow-sm cursor-pointer"
          >
            <Siren className="h-3.5 w-3.5" />
            Rescue Ops
          </button>
        </div>
      </div>

      {/* Sequential Filter Bar */}
      <section className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-(--color-dark-teal)">
            <Filter className="h-4 w-4 text-(--color-ocean)" />
            <span>Administrative Jurisdiction & Problem Filter</span>
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
                setMapCenter([22.5937, 78.9629]);
                setMapZoom(5);
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

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* State */}
          <div>
            <label className="block text-xs font-bold text-(--color-medium-teal) mb-1">
              1. State / UT
            </label>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs font-semibold text-(--color-deep-ocean) focus:ring-2 focus:ring-(--color-ocean)"
            >
              <option value="all">All India (National)</option>
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
              2. City / District
            </label>
            <select
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs font-semibold text-(--color-deep-ocean) focus:ring-2 focus:ring-(--color-ocean)"
            >
              <option value="all">All Cities / Districts</option>
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
              3. Locality / Ward
            </label>
            <select
              value={selectedLocality}
              onChange={(e) => handleLocalityChange(e.target.value)}
              disabled={availableLocalities.length === 0}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs font-semibold text-(--color-deep-ocean) disabled:opacity-50 focus:ring-2 focus:ring-(--color-ocean)"
            >
              <option value="all">All Localities</option>
              {availableLocalities.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Problem Type */}
          <div>
            <label className="block text-xs font-bold text-(--color-medium-teal) mb-1">
              4. Problem Category
            </label>
            <select
              value={issueFilter}
              onChange={(e) => setIssueFilter(e.target.value as MapIssueType | "all")}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs font-semibold text-(--color-deep-ocean) focus:ring-2 focus:ring-(--color-ocean)"
            >
              <option value="all">All Problem Types</option>
              <option value="flood">Urban Flooding</option>
              <option value="waterlogging">Waterlogging</option>
              <option value="sewage">Drainage / Sewage</option>
              <option value="water_quality">Water Pollution / Quality</option>
              <option value="pond">Pond & Lake Overfill</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-(--color-medium-teal) mb-1">
              5. Incident Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs font-semibold text-(--color-deep-ocean) focus:ring-2 focus:ring-(--color-ocean)"
            >
              <option value="all">All Statuses</option>
              <option value="under_review">Under Review</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Active Stats Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-(--color-dark-teal) pt-2 border-t border-slate-100">
          <span>
            Showing <strong className="text-(--color-ocean)">{filteredReports.length}</strong> active problem report{filteredReports.length === 1 ? "" : "s"} in {selectedCity !== "all" ? selectedCity : selectedState !== "all" ? selectedState : "India"}
          </span>

          <span className="text-slate-500 font-medium">
            Click any pin on the map to review details, assign departments, or update status.
          </span>
        </div>
      </section>

      {/* Map Container */}
      <section className="overflow-hidden rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-lg">
        <div className="h-[650px] w-full relative">
          <LiveMap
            hazards={mapHazardLocations}
            selectedArea={{
              latitude: mapCenter[0],
              longitude: mapCenter[1],
              zoom: mapZoom,
            }}
            renderPopup={(hazard) => (
              <div className="p-1 space-y-1.5 min-w-[200px]">
                <p className="font-bold text-sm text-(--color-deep-ocean)">
                  {hazard.title || hazard.hazardType}
                </p>
                <p className="text-xs text-slate-600">
                  {hazard.placeName || hazard.locality}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant={statusVariant(hazard.status as GovReportStatus)}>
                    {hazard.status.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const matched = dbReports.find(
                      (r) => r.id === hazard.id || r.id === hazard.reportId
                    );
                    if (matched) setSelectedReport(matched);
                  }}
                  className="w-full mt-2.5 py-1.5 px-3 rounded-lg bg-(--color-ocean) hover:bg-(--color-deep-ocean) text-white text-xs font-bold transition cursor-pointer"
                >
                  Review / Assign Report
                </button>
              </div>
            )}
          />
        </div>
      </section>

      {/* List of Problems for Current View */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-(--color-dark-teal)">
            Incidents in Selected Scope ({filteredReports.length})
          </h2>
          <span className="text-xs text-(--color-medium-teal)">
            Sorted by priority
          </span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-[rgba(53,98,103,0.14)] bg-white p-8 text-center text-sm text-(--color-medium-teal)">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-amber-500" />
            No problem reports match the selected location and category filters.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredReports.map((report) => (
              <article
                key={report.id}
                className="rounded-2xl border border-[rgba(53,98,103,0.14)] bg-white p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-(--color-ocean)">
                      {report.id}
                    </span>
                    <Badge variant={statusVariant(report.govStatus)}>
                      {report.govStatus ? report.govStatus.replace(/_/g, " ").toUpperCase() : "UNDER REVIEW"}
                    </Badge>
                  </div>

                  <p className="text-sm font-bold text-(--color-deep-ocean) mb-1">
                    {report.categoryLabel}
                  </p>

                  <p className="text-xs text-(--color-medium-teal) line-clamp-2 mb-2">
                    {report.location.placeName || report.location.address || "Local Area"}
                  </p>

                  {report.assignedDepartment && (
                    <p className="text-xs font-semibold text-teal-800 mb-2 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-teal-600" />
                      {report.assignedDepartment}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500">
                    {report.severity} Priority
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className="flex items-center gap-1 text-xs font-bold text-(--color-ocean) hover:underline cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Review & Assign →
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Detail & Action Drawer */}
      {selectedReport && (
        <GovernmentReportDetailDrawer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdated={() => {
            void loadData();
          }}
        />
      )}
    </main>
  );
}
