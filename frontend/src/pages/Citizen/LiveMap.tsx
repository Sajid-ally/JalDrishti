// src/pages/Citizen/LiveMap.tsx
// Real-time Nationwide and Local Water Hazard Map with All 36 Indian States/UTs,
// Strict Sequential Filtering (State -> City -> Locality),
// City Normalization (Kanpur/Kanpur Nagar single entry),
// High-Precision Distance formatting (Meters vs Km), and Road-Level Zoom 17.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Droplets,
  Filter,
  LandPlot,
  MapPin,
  ShieldAlert,
  Waves,
  Wind,
  PlusCircle,
  Navigation,
  Eye,
  Crosshair,
  RotateCcw,
} from "lucide-react";

import LiveMap from "../../components/map/LiveMap";
import Badge from "../../components/common/Badge";
import { useGeolocation } from "../../hooks/useGeolocation";
import type { MapIssueType } from "../../services/hazardService";
import type { Severity } from "../../types/hazard";
import { fetchCitizenMapData } from "../../services/mapService";
import {
  toCitizenMapMarker,
  type CitizenMapMarker,
} from "../../services/reportAdapters";
import {
  ALL_INDIAN_STATES,
  STATE_CITIES_MAP,
  CITY_LOCALITIES_MAP,
  normalizeCityName,
  type LocalityCoord,
} from "../../data/indiaLocations";

const ISSUE_LABELS: Record<MapIssueType, string> = {
  flood: "Flooding / Inundation",
  tsunami: "Tsunami",
  storm_surge: "Storm Surge",
  high_waves: "High Waves",
  coastal_erosion: "Coastal Erosion",
  coastal_damage: "Coastal Damage",
  other: "Other Water Problem",
  waterlogging: "Severe Waterlogging",
  sewage: "Drainage / Sewage",
  water_quality: "Water Contamination",
  pond: "Pond Overfill",
  lake: "Lake Breach",
};

const ENVIRONMENTAL_ISSUES: MapIssueType[] = [
  "flood",
  "waterlogging",
  "sewage",
  "water_quality",
  "pond",
  "lake",
];

const ISSUE_ICONS: Record<MapIssueType, React.ReactNode> = {
  flood: <Droplets className="h-4 w-4 text-blue-600" />,
  waterlogging: <Droplets className="h-4 w-4 text-cyan-600" />,
  sewage: <Wind className="h-4 w-4 text-teal-600" />,
  water_quality: <ShieldAlert className="h-4 w-4 text-amber-600" />,
  pond: <LandPlot className="h-4 w-4 text-emerald-600" />,
  lake: <Waves className="h-4 w-4 text-indigo-600" />,
  tsunami: <Waves className="h-4 w-4 text-red-600" />,
  storm_surge: <Wind className="h-4 w-4 text-orange-600" />,
  high_waves: <Waves className="h-4 w-4 text-blue-600" />,
  coastal_erosion: <LandPlot className="h-4 w-4 text-yellow-600" />,
  coastal_damage: <AlertTriangle className="h-4 w-4 text-rose-600" />,
  other: <MapPin className="h-4 w-4 text-slate-600" />,
};

const severityVariant: Record<
  Severity,
  "danger" | "warning" | "info" | "success"
> = {
  critical: "danger", // Pure Red
  high: "warning",    // Orange
  moderate: "info",   // Amber
  low: "success",     // Green
};

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatProximityDistance(distKm?: number): string {
  if (distKm === undefined || distKm === null) return "";
  if (distKm < 0.06) {
    return "📍 At your exact location (< 60m)";
  }
  if (distKm < 1.0) {
    const meters = Math.round(distKm * 1000);
    return `📍 ${meters}m away`;
  }
  return `📍 ${distKm.toFixed(1)} km away`;
}

export default function CitizenLiveMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Strict Sequential Filters
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedLocality, setSelectedLocality] = useState<string>("all");
  const [issue, setIssue] = useState<MapIssueType | "all">("all");

  // Targeted map viewport with Road-level zoom
  const [targetFocus, setTargetFocus] = useState<{
    latitude: number;
    longitude: number;
    zoom: number;
  } | null>(null);

  const [reports, setReports] = useState<CitizenMapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live device GPS hook
  const { coords: userCoords, loading: geoLoading, request: requestGeo } = useGeolocation();

  // Handle URL Query Params for direct pinpoint focus (e.g. from Dashboard)
  useEffect(() => {
    const qLat = searchParams.get("lat");
    const qLng = searchParams.get("lng");
    const qZoom = searchParams.get("zoom");
    const qLocality = searchParams.get("locality");
    const qState = searchParams.get("state");
    const qCity = searchParams.get("city");

    if (qState) setSelectedState(qState);
    if (qCity) setSelectedCity(qCity);
    if (qLocality) setSelectedLocality(qLocality);

    if (qLat && qLng) {
      const lat = parseFloat(qLat);
      const lng = parseFloat(qLng);
      const zoom = qZoom ? parseInt(qZoom, 10) : 17;
      if (!isNaN(lat) && !isNaN(lng)) {
        setTargetFocus({ latitude: lat, longitude: lng, zoom });
      }
    }
  }, [searchParams]);

  // Auto-request GPS on mount
  useEffect(() => {
    requestGeo();
  }, [requestGeo]);

  // Load backend reports
  useEffect(() => {
    let cancelled = false;

    const loadMapReports = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchCitizenMapData({
          state: selectedState === "all" ? undefined : selectedState,
          district: selectedCity === "all" ? undefined : selectedCity,
        });

        const markers = data.reports
          .map(toCitizenMapMarker)
          .filter((marker): marker is CitizenMapMarker => marker !== null);

        if (!cancelled) {
          setReports(markers);
        }
      } catch (requestError) {
        if (!cancelled) {
          setReports([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load map reports."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadMapReports();

    return () => {
      cancelled = true;
    };
  }, [selectedState, selectedCity]);

  // 1. Available Cities (Enabled ONLY when a state is selected)
  const availableCities = useMemo(() => {
    if (selectedState === "all") {
      return [];
    }

    const defaultCities = STATE_CITIES_MAP[selectedState] || [];
    const reportCities = reports
      .filter((r) => r.state.toLowerCase().includes(selectedState.toLowerCase()))
      .map((r) => normalizeCityName(r.district || (r as any).city))
      .filter(Boolean);

    return [...new Set([...defaultCities, ...reportCities])].sort();
  }, [selectedState, reports]);

  // 2. Available Localities (Enabled ONLY when a city is selected)
  const availableLocalities = useMemo(() => {
    if (selectedCity === "all") {
      return [];
    }

    const normalizedCity = normalizeCityName(selectedCity);
    const predefined: LocalityCoord[] = CITY_LOCALITIES_MAP[normalizedCity] || [];
    const predefinedNames = predefined.map((p) => p.name);

    const reportLocalities = reports
      .filter((r) => {
        const rCity = normalizeCityName(r.district || (r as any).city);
        return rCity.toLowerCase() === normalizedCity.toLowerCase();
      })
      .map((r) => r.locality)
      .filter((loc) => loc && loc !== normalizedCity && loc !== selectedState);

    return [...new Set([...predefinedNames, ...reportLocalities])].sort();
  }, [selectedCity, selectedState, reports]);

  // Active locality coordinate mapping
  const activeLocalityCoord = useMemo(() => {
    if (selectedLocality === "all" || selectedCity === "all") return null;

    const normalizedCity = normalizeCityName(selectedCity);
    const found = (CITY_LOCALITIES_MAP[normalizedCity] || []).find(
      (l) => l.name.toLowerCase() === selectedLocality.toLowerCase()
    );
    if (found) return found;

    const reportMatch = reports.find((r) =>
      (r.locality || "").toLowerCase().includes(selectedLocality.toLowerCase())
    );
    if (reportMatch) {
      return {
        name: selectedLocality,
        lat: reportMatch.latitude,
        lng: reportMatch.longitude,
        zoom: 17,
      };
    }
    return null;
  }, [selectedLocality, selectedCity, reports]);

  // Filtered hazards list (Never disappear, sort by device proximity or selected area)
  const hazards = useMemo(() => {
    let filtered = reports.filter((item) => {
      const matchIssue = issue === "all" || item.hazardType === issue;

      const itemState = item.state.toLowerCase();
      const matchState =
        selectedState === "all" ||
        itemState.includes(selectedState.toLowerCase()) ||
        (item.placeName || "").toLowerCase().includes(selectedState.toLowerCase());

      const itemCity = normalizeCityName(item.district || (item as any).city || item.placeName).toLowerCase();
      const matchCity =
        selectedCity === "all" ||
        itemCity.includes(normalizeCityName(selectedCity).toLowerCase());

      return matchIssue && matchState && matchCity;
    });

    // Proximity to citizen's GPS coordinates
    if (userCoords) {
      filtered = filtered
        .map((item) => ({
          ...item,
          distanceKm: calculateDistanceKm(
            userCoords.lat,
            userCoords.lng,
            item.latitude,
            item.longitude
          ),
        }))
        .sort((a: any, b: any) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    }

    return filtered;
  }, [reports, issue, selectedState, selectedCity, userCoords]);

  // Dynamic Viewport controller
  const activeViewport = useMemo(() => {
    if (targetFocus) {
      return targetFocus;
    }

    // Locality Level -> Deep Road-Level Zoom 17
    if (activeLocalityCoord) {
      return {
        latitude: activeLocalityCoord.lat,
        longitude: activeLocalityCoord.lng,
        zoom: activeLocalityCoord.zoom || 17,
      };
    }

    // City Level -> Zoom 13
    if (selectedCity !== "all") {
      const normalizedCity = normalizeCityName(selectedCity);
      const matchReport = reports.find(
        (r) =>
          normalizeCityName(r.district || (r as any).city).toLowerCase() ===
          normalizedCity.toLowerCase()
      );
      if (matchReport) {
        return { latitude: matchReport.latitude, longitude: matchReport.longitude, zoom: 13 };
      }
      if (CITY_LOCALITIES_MAP[normalizedCity]?.[0]) {
        const c = CITY_LOCALITIES_MAP[normalizedCity][0];
        return { latitude: c.lat, longitude: c.lng, zoom: 13 };
      }
    }

    // State Level -> Zoom 8
    if (selectedState !== "all") {
      const matchReport = reports.find((r) =>
        r.state.toLowerCase().includes(selectedState.toLowerCase())
      );
      if (matchReport) {
        return { latitude: matchReport.latitude, longitude: matchReport.longitude, zoom: 8 };
      }
    }

    // User GPS location default (Zoom 14)
    if (userCoords) {
      return { latitude: userCoords.lat, longitude: userCoords.lng, zoom: 14 };
    }

    return null;
  }, [targetFocus, activeLocalityCoord, selectedCity, selectedState, reports, userCoords]);

  const criticalCount = hazards.filter((h) => h.severity === "critical").length;

  // Strict Sequential Handlers
  const handleSelectState = (stateName: string) => {
    setSelectedState(stateName);
    setSelectedCity("all");
    setSelectedLocality("all");
    setTargetFocus(null);
  };

  const handleSelectCity = (cityName: string) => {
    setSelectedCity(cityName);
    setSelectedLocality("all");
    setTargetFocus(null);
  };

  const handleSelectLocality = (localityName: string) => {
    setSelectedLocality(localityName);
    setTargetFocus(null);
  };

  const handleResetFilters = () => {
    setSelectedState("all");
    setSelectedCity("all");
    setSelectedLocality("all");
    setIssue("all");
    setTargetFocus(null);
  };

  const focusOnIncident = (hazard: CitizenMapMarker) => {
    setTargetFocus({
      latitude: hazard.latitude,
      longitude: hazard.longitude,
      zoom: 17, // Deep Road & Street Level Zoom
    });
  };

  return (
    <main className="space-y-6 text-(--color-dark-teal)">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--color-pale-aqua) text-(--color-ocean)">
              <MapPin className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
              GIS Hazard System
            </p>
          </div>
          <h1 className="mt-1 text-2xl font-black text-(--color-deep-ocean) sm:text-3xl">
            Live Water &amp; Hazard Map
          </h1>
          <p className="mt-1 text-xs text-(--color-medium-teal) sm:text-sm">
            Strict State → City → Locality filter &amp; road-level auto-zoom across India.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* GPS Auto-Locate Button */}
          <button
            type="button"
            onClick={() => {
              setTargetFocus(null);
              requestGeo();
            }}
            disabled={geoLoading}
            className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-3 text-xs sm:text-sm font-bold text-(--color-ocean) hover:bg-(--color-soft-mint) active:scale-95 transition shadow-2xs"
            title="Auto-detect current GPS location"
          >
            <Navigation className={`h-4 w-4 ${geoLoading ? "animate-spin text-amber-600" : "text-(--color-ocean)"}`} />
            <span>{geoLoading ? "Locating…" : "My Location"}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/citizen/report")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-(--color-deep-ocean) active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            Submit Report
          </button>
        </div>
      </div>

      {/* GPS Status Banner */}
      {userCoords && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-blue-50/90 border border-blue-200 px-4 py-2.5 text-xs text-blue-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
            <span>
              <strong>Live GPS Active:</strong> Accurate coordinates ({userCoords.lat.toFixed(5)}° N, {userCoords.lng.toFixed(5)}° E)
            </span>
          </div>
          <span className="text-[11px] font-bold text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
            {hazards.length} Incidents in Database
          </span>
        </div>
      )}

      {/* ── Strict Sequential Administrative Filter Toolbar ── */}
      <section className="rounded-2xl sm:rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-(--color-dark-teal)">
            <Filter className="h-4 w-4 text-(--color-ocean)" />
            <span>Strict Sequential Regional Filter</span>
          </div>
          {(selectedState !== "all" || selectedCity !== "all" || selectedLocality !== "all" || issue !== "all" || targetFocus !== null) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-(--color-ocean) hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Step 1: Select State / UT */}
          <div>
            <label className="block text-[11px] font-bold text-(--color-medium-teal) mb-1 uppercase tracking-wider">
              1. State / UT ({ALL_INDIAN_STATES.length})
            </label>
            <select
              aria-label="Filter by state"
              value={selectedState}
              onChange={(e) => handleSelectState(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-(--color-deep-ocean) font-medium focus:outline-none focus:border-(--color-ocean)"
            >
              <option value="all">All States &amp; UTs of India</option>
              {ALL_INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select City (Enabled ONLY if state is selected) */}
          <div>
            <label className="block text-[11px] font-bold text-(--color-medium-teal) mb-1 uppercase tracking-wider">
              2. City / District
            </label>
            <select
              aria-label="Filter by city"
              value={selectedCity}
              onChange={(e) => handleSelectCity(e.target.value)}
              disabled={selectedState === "all"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-(--color-deep-ocean) font-medium focus:outline-none focus:border-(--color-ocean) disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="all">
                {selectedState === "all"
                  ? "Select State First"
                  : `All Cities in ${selectedState}`}
              </option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Select Locality (Enabled ONLY if city is selected) */}
          <div>
            <label className="block text-[11px] font-bold text-(--color-medium-teal) mb-1 uppercase tracking-wider">
              3. Locality / Ward Focus
            </label>
            <select
              aria-label="Filter by locality"
              value={selectedLocality}
              onChange={(e) => handleSelectLocality(e.target.value)}
              disabled={selectedCity === "all"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-(--color-deep-ocean) font-medium focus:outline-none focus:border-(--color-ocean) disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="all">
                {selectedCity === "all"
                  ? "Select City First"
                  : `All Localities in ${selectedCity}`}
              </option>
              {availableLocalities.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Step 4: Problem Category */}
          <div>
            <label className="block text-[11px] font-bold text-(--color-medium-teal) mb-1 uppercase tracking-wider">
              4. Problem Type
            </label>
            <select
              aria-label="Filter by problem"
              value={issue}
              onChange={(e) => setIssue(e.target.value as MapIssueType | "all")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-(--color-deep-ocean) font-medium focus:outline-none focus:border-(--color-ocean)"
            >
              <option value="all">All Problem Types</option>
              {ENVIRONMENTAL_ISSUES.map((item) => (
                <option key={item} value={item}>
                  {ISSUE_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Locality Pills strictly for the selected City */}
        {selectedCity !== "all" && availableLocalities.length > 0 && (
          <div className="pt-2 border-t border-[rgba(53,98,103,0.08)] flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-(--color-medium-teal) text-[11px] uppercase mr-1 flex items-center gap-1">
              <Crosshair className="h-3 w-3 text-(--color-ocean)" />
              {selectedCity} Localities:
            </span>
            {availableLocalities.slice(0, 10).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => handleSelectLocality(selectedLocality === loc ? "all" : loc)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                  selectedLocality === loc
                    ? "bg-(--color-ocean) text-white shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-(--color-pale-aqua) hover:text-(--color-deep-ocean)"
                }`}
              >
                📍 {loc}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* API Error Banner */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-medium text-rose-700">
          Unable to load map data: {error}
        </div>
      )}

      {/* Critical Alert Banner (RED) */}
      {criticalCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50/95 px-4 py-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 animate-pulse" />
          <p className="text-xs sm:text-sm font-bold text-red-900">
            ⚠️ Attention: {criticalCount} CRITICAL water emergency reported in this region. High-priority response dispatched.
          </p>
        </div>
      )}

      {/* Map Container with Road-Level Zoom Control */}
      <div className="overflow-hidden rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-[0_8px_30px_rgba(53,98,103,0.1)]">
        <LiveMap
          hazards={hazards}
          userLocation={userCoords ? { latitude: userCoords.lat, longitude: userCoords.lng } : null}
          selectedArea={activeViewport}
          height="540px"
        />
      </div>

      {/* Incident List with Road-level Focus Button */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-(--color-dark-teal)">
            Active Incidents ({hazards.length})
            {selectedLocality !== "all" && (
              <span className="ml-2 lowercase font-normal text-xs text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Focused on {selectedLocality} (Zoom 17)
              </span>
            )}
          </h2>
          <span className="text-xs text-(--color-medium-teal)">
            {userCoords
              ? "Proximity measured from your device GPS location"
              : "Live database reports"}
          </span>
        </div>

        {loading ? (
          <p className="rounded-2xl border border-[rgba(53,98,103,0.14)] bg-white p-6 text-center text-sm text-(--color-medium-teal)">
            Loading live report markers…
          </p>
        ) : hazards.length === 0 ? (
          <p className="rounded-2xl border border-[rgba(53,98,103,0.14)] bg-white p-6 text-center text-sm text-(--color-medium-teal)">
            No active hazard reports match the selected filters.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hazards.map((hazard: any) => {
              const isCrit = hazard.severity === "critical";
              return (
                <div
                  key={hazard.id}
                  className={`rounded-2xl border p-4 shadow-xs transition hover:shadow-md ${
                    isCrit
                      ? "border-red-300 bg-red-50/40 ring-1 ring-red-200"
                      : "border-[rgba(53,98,103,0.14)] bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {ISSUE_ICONS[hazard.hazardType as MapIssueType]}
                      <span className="text-sm font-bold text-(--color-deep-ocean)">
                        {ISSUE_LABELS[hazard.hazardType as MapIssueType] || hazard.hazardType}
                      </span>
                    </div>

                    <Badge variant={severityVariant[hazard.severity as Severity]}>
                      {hazard.severity.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs font-bold text-(--color-deep-ocean)">
                    {hazard.title || hazard.placeName || "Registered Incident"}
                  </p>

                  <p className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>
                      {hazard.placeName || `${hazard.locality ? `${hazard.locality}, ` : ""}${hazard.city || hazard.district}, ${hazard.state}`}
                    </span>
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    {hazard.distanceKm !== undefined ? (
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {formatProximityDistance(hazard.distanceKm)}
                      </span>
                    ) : (
                      <span className="font-mono text-slate-500">ID: {hazard.reportId || hazard.id.slice(0, 8)}</span>
                    )}

                    <div className="flex items-center gap-2">
                      {/* Auto-Zoom Button (Zoom 17) */}
                      <button
                        type="button"
                        onClick={() => focusOnIncident(hazard)}
                        className="inline-flex items-center gap-1 font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md hover:bg-teal-100 transition"
                        title="Auto-zoom to road level on map"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Road Zoom</span>
                      </button>

                      {hazard.reportId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/citizen/track-report?id=${hazard.reportId}`)}
                          className="font-mono font-bold text-(--color-ocean) hover:underline"
                        >
                          Track →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}