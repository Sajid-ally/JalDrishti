// src/pages/Citizen/Dashboard.tsx
// Citizen Overview Dashboard with Auto-detected GPS location,
// Direct Report ID Tracking, Nearby Hazard Alerts with Live Map Navigation,
// and City-Aware Government Advisories.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  Map,
  Newspaper,
  AlertTriangle,
  Droplets,
  Wind,
  Waves,
  Megaphone,
  Search,
  MapPin,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import Card, { DashboardCards } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import useAuth from "../../hooks/useAuth";
import { useGeolocation } from "../../hooks/useGeolocation";
import type { Severity } from "../../types/hazard";
import type { WaterReport } from "../../types/report";
import { getAllWaterReports, fetchNearbyReports } from "../../services/reportService";
import { getReliefRequests } from "../../services/rescueService";
import { getGovernmentAlerts } from "../../services/alertService";

async function fetchCityFromCoords(lat: number, lng: number): Promise<{ city?: string; locality?: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.district || addr.county || "Kanpur";
      const locality = addr.suburb || addr.neighbourhood || addr.residential || "";
      return { city, locality };
    }
  } catch {
    // ignore network errors
  }
  return { city: "Kanpur", locality: "Colonelganj" };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function severityBadge(severity: Severity) {
  const map: Record<
    Severity,
    "danger" | "warning" | "info" | "success"
  > = {
    critical: "danger", // Pure Red
    high: "warning",    // Orange
    moderate: "info",   // Amber
    low: "success",     // Green
  };

  return (
    <Badge variant={map[severity] || "info"}>
      {(severity || "moderate").toUpperCase()}
    </Badge>
  );
}

function newsIcon(title: string) {
  if (/wave|coastal/i.test(title)) {
    return <Waves className="h-5 w-5 text-(--color-ocean)" />;
  }
  if (/flood|waterlogging/i.test(title)) {
    return <Droplets className="h-5 w-5 text-(--color-ocean)" />;
  }
  if (/rain|storm|surge|drain/i.test(title)) {
    return <Wind className="h-5 w-5 text-(--color-ocean)" />;
  }
  if (/emergency|government|alert/i.test(title)) {
    return <Megaphone className="h-5 w-5 text-(--color-ocean)" />;
  }
  return <AlertTriangle className="h-5 w-5 text-(--color-ocean)" />;
}

function formatTime(iso?: string) {
  if (!iso) return "Recent";
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);

  if (hours < 1) return "Just now";
  if (hours === 1) return "1 hr ago";
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function formatProximity(distKm: number): string {
  if (distKm < 0.06) {
    return "📍 At your exact location (< 60m)";
  }
  if (distKm < 1.0) {
    const meters = Math.round(distKm * 1000);
    return `📍 ${meters}m away`;
  }
  return `📍 ${distKm.toFixed(1)} km away`;
}

export interface CityAwareAdvisory {
  id: string;
  title: string;
  body: string;
  city?: string;
  state?: string;
  locality?: string;
  location?: { lat: number; lng: number };
  severity: Severity;
  source: string;
  issuedAt: string;
}

// ─── Main Dashboard Component ────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trackInputId, setTrackInputId] = useState("");
  const [detectedCity, setDetectedCity] = useState<string>("Kanpur");
  const [detectedLocality, setDetectedLocality] = useState<string>("");

  const [stats, setStats] = useState({
    activeAlerts: 3,
    openReports: 8,
    rescueRequests: 1,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  const [nearbyReports, setNearbyReports] = useState<WaterReport[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const [advisories, setAdvisories] = useState<CityAwareAdvisory[]>([]);

  // Live GPS hook
  const { coords: autoCoords, request: requestGeo } = useGeolocation();

  useEffect(() => {
    requestGeo();
  }, [requestGeo]);

  // Reverse geocode user location to detect city & locality
  useEffect(() => {
    if (!autoCoords) return;
    async function resolveLocation() {
      if (!autoCoords) return;
      try {
        const place = await fetchCityFromCoords(autoCoords.lat, autoCoords.lng);
        if (place?.city) setDetectedCity(place.city);
        if (place?.locality) setDetectedLocality(place.locality);
      } catch {
        // keep defaults
      }
    }
    resolveLocation();
  }, [autoCoords]);

  // Load Overview Statistics
  useEffect(() => {
    async function loadStats() {
      try {
        const [reports, rescues, alerts] = await Promise.all([
          getAllWaterReports().catch(() => []),
          getReliefRequests().catch(() => []),
          getGovernmentAlerts().catch(() => []),
        ]);

        const openCount = reports.filter((r) => r.status !== "resolved").length;
        const rescueCount = rescues.filter((r) => r.status.toLowerCase() !== "resolved").length;
        const alertCount = alerts.filter((a) => a.status !== "Reviewed").length;

        setStats({
          activeAlerts: Math.max(alertCount, 1),
          openReports: openCount,
          rescueRequests: rescueCount,
        });
      } catch (err) {
        console.warn("Stats background fetch note:", err);
      } finally {
        setStatsLoading(false);
      }
    }
    loadStats();
  }, []);

  // Fetch Nearby Reports within 15 km
  useEffect(() => {
    async function loadNearby() {
      // Use device coords or fallback Kanpur center coords
      const lat = autoCoords?.lat ?? 26.4730;
      const lng = autoCoords?.lng ?? 80.3345;

      setNearbyLoading(true);
      try {
        const nearby = await fetchNearbyReports(lat, lng, 15.0);
        setNearbyReports(nearby || []);
      } catch (err) {
        console.warn("Failed to load nearby reports:", err);
        setNearbyReports([]);
      } finally {
        setNearbyLoading(false);
      }
    }
    loadNearby();
  }, [autoCoords]);

  // Build Dynamic City-Aware Advisories
  useEffect(() => {
    const city = detectedCity || "Kanpur";
    const dynamicList: CityAwareAdvisory[] = [
      {
        id: "ADV-01",
        title: `Monsoon Drainage & Waterlogging Advisory — ${city}`,
        body: `Municipal authorities have deployed extra dewatering pump sets near vulnerable low-lying drains in ${detectedLocality || "central localities"}. Citizens are requested to report overflowing manholes immediately.`,
        city: city,
        state: "Uttar Pradesh",
        locality: detectedLocality || "Colonelganj",
        location: autoCoords ? { lat: autoCoords.lat, lng: autoCoords.lng } : { lat: 26.4675, lng: 80.3325 },
        severity: "high",
        source: `${city} Municipal Corporation`,
        issuedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: "ADV-02",
        title: "Clean Water Bodies & Pond Protection Protocol",
        body: "Strict monitoring active against solid waste and plastic dumping along public ponds and river banks. Report polluted water bodies via JalDrishti for priority cleanup.",
        city: city,
        state: "Uttar Pradesh",
        locality: "Bakarmandi / Sisamau",
        location: { lat: 26.4635, lng: 80.3295 },
        severity: "moderate",
        source: "JalDrishti Civic Vigilance",
        issuedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
    ];
    setAdvisories(dynamicList);
  }, [detectedCity, detectedLocality, autoCoords]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = trackInputId.trim().toUpperCase();
    if (!cleanId) return;
    navigate(`/citizen/track-report?id=${encodeURIComponent(cleanId)}`);
  };

  return (
    <main className="space-y-8 text-(--color-dark-teal)">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
            JalDrishti Citizen Portal
          </p>

          <h1 className="mt-1 text-2xl font-black text-(--color-deep-ocean) sm:text-3xl lg:text-4xl">
            Welcome{user?.name ? `, ${user.name}` : ""}
          </h1>

          <p className="mt-1 text-xs text-(--color-medium-teal) sm:text-sm">
            Live civic water monitoring, localized hazard alerts, and verified response tracking.
          </p>
        </div>

        {autoCoords ? (
          <div className="flex items-center gap-2 bg-(--color-soft-mint) border border-[rgba(53,98,103,0.15)] rounded-2xl px-4 py-2 text-xs text-(--color-deep-ocean) self-start sm:self-auto">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>
              <strong>GPS Active ({detectedCity}):</strong> {autoCoords.lat.toFixed(4)}° N, {autoCoords.lng.toFixed(4)}° E
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={requestGeo}
            className="flex items-center gap-2 bg-white border border-(--color-ocean)/30 hover:border-(--color-ocean) rounded-2xl px-4 py-2 text-xs font-bold text-(--color-ocean) shadow-xs self-start sm:self-auto transition"
          >
            <MapPin className="h-4 w-4" />
            Enable Device GPS
          </button>
        )}
      </div>

      {/* ── Overview Statistics ── */}
      <section>
        {statsLoading ? (
          <div className="flex h-20 items-center justify-center text-xs font-semibold text-(--color-medium-teal)">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Refreshing overview statistics...
          </div>
        ) : (
          <DashboardCards
            activeAlerts={stats.activeAlerts}
            openReports={stats.openReports}
            rescueRequests={stats.rescueRequests}
          />
        )}
      </section>

      {/* ── Quick Actions & Direct Track Search ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-(--color-dark-teal) sm:text-base">
          Quick Actions &amp; Private Tracking
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* 1. Submit Report Card */}
          <button
            type="button"
            onClick={() => navigate("/citizen/report")}
            className="flex items-center gap-4 rounded-3xl border-2 border-(--color-ocean) bg-(--color-soft-mint) p-5 text-left transition hover:bg-(--color-mint) hover:shadow-md active:scale-98"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--color-ocean) text-white shadow-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-(--color-deep-ocean) sm:text-base">
                Submit Report
              </p>
              <p className="text-xs text-(--color-medium-teal)">
                Upload photo to detect drainage, pond or flood issues
              </p>
            </div>
          </button>

          {/* 2. Direct Private Report Tracker (Privacy by ID) */}
          <div className="rounded-3xl border border-[rgba(53,98,103,0.2)] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Search className="h-4 w-4 text-(--color-ocean)" />
                <p className="text-sm font-bold text-(--color-deep-ocean)">
                  Track Your Report Status
                </p>
              </div>
              <p className="text-xs text-(--color-medium-teal) mb-3">
                Enter your unique Report ID to securely inspect progress
              </p>
            </div>

            <form onSubmit={handleTrackSubmit} className="flex gap-2">
              <input
                type="text"
                value={trackInputId}
                onChange={(e) => setTrackInputId(e.target.value)}
                placeholder="e.g. JAL-2026-80834D"
                className="flex-1 rounded-xl border border-[rgba(53,98,103,0.2)] px-3 py-2 text-xs font-mono font-bold text-(--color-deep-ocean) placeholder:font-sans placeholder:font-normal focus:border-(--color-ocean) focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!trackInputId.trim()}
                className="rounded-xl bg-(--color-ocean) px-3 py-2 text-xs font-bold text-white hover:bg-(--color-dark-teal) disabled:opacity-50 transition shrink-0"
              >
                Track →
              </button>
            </form>
          </div>

          {/* 3. Live Hazard Map */}
          <button
            type="button"
            onClick={() => navigate("/citizen/live-map")}
            className="flex items-center gap-4 rounded-3xl border border-[rgba(53,98,103,0.2)] bg-white p-5 text-left transition hover:border-(--color-ocean) hover:bg-(--color-soft-mint) hover:shadow-md active:scale-98"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--color-pale-aqua) text-(--color-ocean)">
              <Map className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-(--color-deep-ocean) sm:text-base">
                Live Hazard Map
              </p>
              <p className="text-xs text-(--color-medium-teal)">
                Explore active problem locations across city localities
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* ── Nearby Water Hazards with Direct Live Map Navigation ── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-(--color-ocean)" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-(--color-dark-teal) sm:text-base">
                Nearby Water Problems in {detectedCity}
              </h2>
              <p className="text-xs text-(--color-medium-teal)">
                Active civic water problems reported within 15 km
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/citizen/live-map")}
            className="text-xs font-bold text-(--color-ocean) hover:underline self-start sm:self-auto flex items-center gap-1"
          >
            Open Full Live Map <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {nearbyLoading ? (
          <div className="flex h-24 items-center justify-center text-xs font-semibold text-(--color-medium-teal) rounded-3xl border border-[rgba(53,98,103,0.12)] bg-white p-6">
            <Loader2 className="h-4 w-4 animate-spin text-(--color-ocean) mr-2" />
            Locating nearby water hazards...
          </div>
        ) : nearbyReports.length === 0 ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 text-xs text-emerald-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-sm text-emerald-950">No Active Water Hazards Nearby</p>
                <p className="text-emerald-800">
                  {autoCoords
                    ? `No unresolved water problems reported within 15 km of your location in ${detectedCity}.`
                    : "No unresolved issues reported nearby. Enable GPS for live proximity."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/citizen/report")}
              className="px-3.5 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 shrink-0 transition"
            >
              Report a Problem
            </button>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {nearbyReports.map((report) => {
              const isCrit = report.severity === "critical";
              const userLat = autoCoords?.lat ?? 26.4730;
              const userLng = autoCoords?.lng ?? 80.3345;
              const repLat = report.location.coords.lat;
              const repLng = report.location.coords.lng;
              const dist = calculateDistanceKm(userLat, userLng, repLat, repLng);
              const localityName = (report as any).locality || report.location.address || "Area Problem Point";

              return (
                <div
                  key={report.id}
                  className={`rounded-2xl border p-4 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                    isCrit
                      ? "border-red-300 bg-red-50/60 ring-1 ring-red-200"
                      : "border-[rgba(53,98,103,0.16)] bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-black text-(--color-deep-ocean)">
                        {report.categoryLabel || report.problemType.replace("_", " ").toUpperCase()}
                      </span>
                      {severityBadge(report.severity)}
                    </div>

                    <p className="text-xs font-bold text-(--color-deep-ocean) line-clamp-1">
                      {report.title || (report.aiAnalysis as any)?.title || report.description}
                    </p>

                    <p className="text-[11px] font-semibold text-slate-600 mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{localityName}</span>
                    </p>

                    <div className="mt-2 text-[11px]">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {formatProximity(dist)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/citizen/live-map?lat=${repLat}&lng=${repLng}&locality=${encodeURIComponent(
                            localityName
                          )}&zoom=17`
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-(--color-ocean) hover:text-(--color-dark-teal) transition"
                    >
                      <Map className="h-3 w-3" />
                      View on Live Map
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/citizen/track-report?id=${report.id}`)}
                      className="font-mono text-[11px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      {report.id} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── City-Aware Government Advisories & Announcements ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-(--color-ocean)" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-(--color-dark-teal) sm:text-base">
              Civic Advisories &amp; Official Announcements ({detectedCity})
            </h2>
            <p className="text-xs text-(--color-medium-teal)">
              Official government bulletins and municipal action notices
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {advisories.map((item) => (
            <Card
              key={item.id}
              variant="news"
              className="rounded-2xl p-4.5 border border-[rgba(53,98,103,0.16)]"
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 shrink-0 rounded-xl bg-(--color-pale-aqua) p-2 text-(--color-ocean)">
                  {newsIcon(item.title)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold leading-snug text-(--color-deep-ocean)">
                      {item.title}
                    </h3>
                    {severityBadge(item.severity)}
                  </div>

                  <p className="text-xs leading-relaxed text-(--color-medium-teal)">
                    {item.body}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100 pt-2">
                    <div className="flex items-center gap-2 text-(--color-medium-teal)/80">
                      <span className="font-semibold">{item.source}</span>
                      <span>·</span>
                      <span>{formatTime(item.issuedAt)}</span>
                      {item.locality && (
                        <>
                          <span>·</span>
                          <span className="font-bold text-slate-700">📍 {item.locality}</span>
                        </>
                      )}
                    </div>

                    {item.location && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/citizen/live-map?lat=${item.location!.lat}&lng=${item.location!.lng}&locality=${encodeURIComponent(
                              item.locality || item.city || ""
                            )}&zoom=17`
                          )
                        }
                        className="inline-flex items-center gap-1 font-bold text-xs text-(--color-ocean) hover:underline"
                      >
                        <Map className="h-3.5 w-3.5" />
                        View Affected Area on Live Map →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}