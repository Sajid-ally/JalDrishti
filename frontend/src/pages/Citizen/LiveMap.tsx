// pages/Citizen/LiveMap.tsx
//
// Citizen-facing live hazard map page — Puri coastal region.
// Hazard data is currently sourced from MOCK_HAZARD_LOCATIONS.
// TODO: Replace mock data with API call: GET /api/map/hazards

import LiveMap from "../../components/map/LiveMap";
import Badge from "../../components/common/Badge";
import { MOCK_HAZARD_LOCATIONS } from "../../services/hazardService";
import { Droplets, Waves, Wind, AlertTriangle, Mountain, HelpCircle } from "lucide-react";
import type { HazardType, Severity } from "../../types/hazard";

const HAZARD_LABELS: Record<HazardType, string> = {
  flood: "Flood",
  tsunami: "Tsunami",
  storm_surge: "Storm Surge",
  high_waves: "High Waves",
  coastal_erosion: "Coastal Erosion",
  coastal_damage: "Coastal Damage",
  other: "Other",
};

const HAZARD_ICONS: Record<HazardType, React.ReactNode> = {
  flood: <Droplets className="h-3.5 w-3.5" />,
  tsunami: <Waves className="h-3.5 w-3.5" />,
  storm_surge: <Wind className="h-3.5 w-3.5" />,
  high_waves: <Waves className="h-3.5 w-3.5" />,
  coastal_erosion: <Mountain className="h-3.5 w-3.5" />,
  coastal_damage: <AlertTriangle className="h-3.5 w-3.5" />,
  other: <HelpCircle className="h-3.5 w-3.5" />,
};

function severityBadge(severity: Severity) {
  const map: Record<Severity, "danger" | "warning" | "info" | "success"> = {
    critical: "danger",
    high: "warning",
    moderate: "info",
    low: "success",
  };
  return <Badge variant={map[severity]}>{severity.charAt(0).toUpperCase() + severity.slice(1)}</Badge>;
}

import React from "react";

export default function CitizenLiveMap() {
  // TODO: Replace with: const hazards = await fetch('/api/map/hazards').then(r => r.json());
  const hazards = MOCK_HAZARD_LOCATIONS;

  const criticalCount = hazards.filter((h) => h.severity === "critical").length;

  return (
    <main>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[(--color-ocean)]">
          Puri Coastal Region
        </p>
        <h1 className="mt-2 text-3xl font-black text-[(--color-deep-ocean)]">
          Live Hazard Map
        </h1>
        <p className="mt-1 text-sm text-[(--color-medium-teal)]">
          Real-time hazard markers around Puri, Odisha. Click a marker for details.
        </p>
      </div>

      {/* Alert Banner */}
      {criticalCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm font-semibold text-red-700">
            {criticalCount} critical hazard{criticalCount > 1 ? "s" : ""} active in your area — stay alert.
          </p>
        </div>
      )}

      {/* Map */}
      <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-[0_8px_30px_rgba(53,98,103,0.1)] overflow-hidden mb-6">
        <LiveMap hazards={hazards} height="500px" />
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[(--color-medium-teal)] self-center mr-1">Severity:</span>
        {(["low", "moderate", "high", "critical"] as Severity[]).map((s) =>
          severityBadge(s)
        )}
      </div>

      {/* Hazard list */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.15em] text-[(--color-dark-teal)]">
          Active Hazard Reports ({hazards.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hazards.map((hazard) => (
            <div
              key={hazard.id}
              className="rounded-2xl border border-[rgba(53,98,103,0.14)] bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[(--color-ocean)]">
                    {HAZARD_ICONS[hazard.hazardType]}
                  </span>
                  <span className="text-sm font-semibold text-[(--color-deep-ocean)]">
                    {HAZARD_LABELS[hazard.hazardType]}
                  </span>
                </div>
                {severityBadge(hazard.severity)}
              </div>
              {hazard.placeName && (
                <p className="text-xs text-[(--color-medium-teal)]">
                  📍 {hazard.placeName}
                </p>
              )}
              <p className="mt-1 text-xs text-[(--color-medium-teal)]/70">
                Status: <span className="font-medium">{hazard.status}</span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
