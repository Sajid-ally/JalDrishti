import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Droplets, Filter, LandPlot, MapPin, ShieldAlert, Waves, Wind, PlusCircle } from "lucide-react";
import LiveMap from "../../components/map/LiveMap";
import Badge from "../../components/common/Badge";
import { MOCK_HAZARD_LOCATIONS, type MapIssueType } from "../../services/hazardService";
import type { Severity } from "../../types/hazard";

const ISSUE_LABELS: Record<MapIssueType, string> = {
  flood: "Flooding", tsunami: "Tsunami", storm_surge: "Storm surge", high_waves: "High waves",
  coastal_erosion: "Coastal erosion", coastal_damage: "Coastal damage", other: "Other",
  waterlogging: "Waterlogging", sewage: "Sewage", water_quality: "Water quality", pond: "Pond", lake: "Lake",
};

const ENVIRONMENTAL_ISSUES: MapIssueType[] = ["flood", "waterlogging", "sewage", "water_quality", "pond", "lake"];
const ISSUE_ICONS: Record<MapIssueType, React.ReactNode> = {
  flood: <Droplets className="h-4 w-4" />, waterlogging: <Droplets className="h-4 w-4" />,
  sewage: <Wind className="h-4 w-4" />, water_quality: <ShieldAlert className="h-4 w-4" />,
  pond: <LandPlot className="h-4 w-4" />, lake: <Waves className="h-4 w-4" />,
  tsunami: <Waves className="h-4 w-4" />, storm_surge: <Wind className="h-4 w-4" />, high_waves: <Waves className="h-4 w-4" />,
  coastal_erosion: <LandPlot className="h-4 w-4" />, coastal_damage: <AlertTriangle className="h-4 w-4" />, other: <MapPin className="h-4 w-4" />,
};

const severityVariant: Record<Severity, "danger" | "warning" | "info" | "success"> = { critical: "danger", high: "warning", moderate: "info", low: "success" };

export default function CitizenLiveMap() {
  const navigate = useNavigate();
  const [state, setState] = useState("all");
  const [district, setDistrict] = useState("all");
  const [locality, setLocality] = useState("all");
  const [issue, setIssue] = useState<MapIssueType | "all">("all");

  const states = useMemo(() => [...new Set(MOCK_HAZARD_LOCATIONS.map((item) => item.state))], []);
  const districts = useMemo(() => [...new Set(MOCK_HAZARD_LOCATIONS.filter((item) => state === "all" || item.state === state).map((item) => item.district))], [state]);
  const localities = useMemo(() => [...new Set(MOCK_HAZARD_LOCATIONS.filter((item) => (state === "all" || item.state === state) && (district === "all" || item.district === district)).map((item) => item.locality))], [state, district]);
  const hazards = useMemo(() => MOCK_HAZARD_LOCATIONS.filter((item) =>
    (state === "all" || item.state === state) && (district === "all" || item.district === district) &&
    (locality === "all" || item.locality === locality) && (issue === "all" || item.hazardType === issue)
  ), [state, district, locality, issue]);
  const selectedArea = useMemo(() => {
    const area = locality !== "all" ? MOCK_HAZARD_LOCATIONS.find((x) => x.locality === locality && (district === "all" || x.district === district)) : district !== "all" ? MOCK_HAZARD_LOCATIONS.find((x) => x.district === district) : state !== "all" ? MOCK_HAZARD_LOCATIONS.find((x) => x.state === state) : null;
    return area ? { latitude: area.latitude, longitude: area.longitude, zoom: locality !== "all" ? 15 : district !== "all" ? 11 : 8 } : null;
  }, [state, district, locality]);
  const criticalCount = hazards.filter((h) => h.severity === "critical").length;

  const selectState = (value: string) => { setState(value); setDistrict("all"); setLocality("all"); };
  const selectDistrict = (value: string) => { setDistrict(value); setLocality("all"); };

  return (
    <main className="space-y-6">
      {/* Top Header with Submit Report Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
            Nationwide Monitoring
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[var(--color-deep-ocean)]">
            Live Water &amp; Hazard Map
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-medium-teal)]">
            Monitor real-time environmental hazards, flood risks, and citizen reports across India.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/citizen/report")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[var(--color-deep-ocean)] transition self-start sm:self-auto active:scale-98"
        >
          <PlusCircle className="h-4 w-4" />
          Submit Report
        </button>
      </div>

      {/* Filter Toolbar */}
      <section className="rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-dark-teal)]">
          <Filter className="h-4 w-4" />
          Filter Map Data
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select aria-label="Filter by state" value={state} onChange={(e) => selectState(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">All states (India-wide)</option>
            {states.map((x) => <option key={x}>{x}</option>)}
          </select>
          <select aria-label="Filter by district" value={district} onChange={(e) => selectDistrict(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">All districts</option>
            {districts.map((x) => <option key={x}>{x}</option>)}
          </select>
          <select aria-label="Filter by locality" value={locality} onChange={(e) => setLocality(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">All localities</option>
            {localities.map((x) => <option key={x}>{x}</option>)}
          </select>
          <select aria-label="Filter by problem" value={issue} onChange={(e) => setIssue(e.target.value as MapIssueType | "all")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">All problems</option>
            {ENVIRONMENTAL_ISSUES.map((x) => <option key={x} value={x}>{ISSUE_LABELS[x]}</option>)}
          </select>
        </div>
      </section>

      {criticalCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm font-semibold text-red-700">
            {criticalCount} critical issue{criticalCount > 1 ? "s" : ""} active in this view.
          </p>
        </div>
      )}

      {/* Map Viewport */}
      <div className="overflow-hidden rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-[0_8px_30px_rgba(53,98,103,0.1)]">
        <LiveMap hazards={hazards} selectedArea={selectedArea} height="520px" />
      </div>

      {/* Incident List */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.15em] text-[var(--color-dark-teal)]">
          Issues in view ({hazards.length})
        </h2>
        {hazards.length === 0 ? (
          <p className="rounded-2xl bg-white border border-[rgba(53,98,103,0.14)] p-6 text-sm text-[var(--color-medium-teal)] text-center">
            No active hazard reports match the selected filters.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hazards.map((hazard) => (
              <div key={hazard.id} className="rounded-2xl border border-[rgba(53,98,103,0.14)] bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[var(--color-ocean)]">
                    {ISSUE_ICONS[hazard.hazardType]}
                    <span className="text-sm font-semibold text-[var(--color-deep-ocean)]">
                      {ISSUE_LABELS[hazard.hazardType]}
                    </span>
                  </div>
                  <Badge variant={severityVariant[hazard.severity]}>{hazard.severity}</Badge>
                </div>
                <p className="text-xs font-semibold text-[var(--color-medium-teal)]">{hazard.placeName}</p>
                <p className="mt-1 text-xs text-slate-500">{hazard.locality}, {hazard.district}, {hazard.state}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
