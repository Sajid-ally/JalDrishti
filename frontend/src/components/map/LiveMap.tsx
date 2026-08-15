// components/map/LiveMap.tsx
//
// Reusable Puri-centered coastal hazard map using react-leaflet.
// Accepts hazard location data via props — does NOT fetch data internally.
// Pass hazards from the parent page; swap mock data for API data there.
//
// Map center: Puri, Odisha, India (19.8135°N, 85.8312°E)

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useEffect, type ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import type { Severity } from "../../types/hazard";
import type { MapIssueType } from "../../services/hazardService";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HazardLocation {
  id: string;
  latitude: number;
  longitude: number;
  hazardType: MapIssueType;
  severity: Severity;
  status: string;
  placeName?: string;
  state: string;
  district: string;
  locality: string;
}

interface LiveMapProps {
  /** Hazard markers to display on the map.
   *  TODO: Parent should fetch this from GET /api/map/hazards */
  hazards: HazardLocation[];
  height?: string;
  selectedArea?: { latitude: number; longitude: number; zoom: number } | null;
  /** Optional page-specific popup content; default hazard popup remains unchanged. */
  renderPopup?: (hazard: HazardLocation) => ReactNode | undefined;
}

// ─── Severity → marker color ─────────────────────────────────────────────────

const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#10b981",
  moderate: "#f59e0b",
  high: "#ea580c",
  critical: "#dc2626",
};

const HAZARD_LABELS: Record<MapIssueType, string> = {
  flood: "Flood",
  tsunami: "Tsunami",
  storm_surge: "Storm Surge",
  high_waves: "High Waves",
  coastal_erosion: "Coastal Erosion",
  coastal_damage: "Coastal Damage",
  other: "Other Hazard",
  waterlogging: "Waterlogging",
  sewage: "Sewage",
  water_quality: "Water Quality",
  pond: "Pond",
  lake: "Lake",
};

// ─── Component ───────────────────────────────────────────────────────────────

const INDIA_CENTER: [number, number] = [22.5937, 78.9629];
const DEFAULT_ZOOM = 5;

function MapViewport({ selectedArea }: Pick<LiveMapProps, "selectedArea">) {
  const map = useMap();
  useEffect(() => {
    if (selectedArea) {
      map.flyTo([selectedArea.latitude, selectedArea.longitude], selectedArea.zoom, { duration: 0.8 });
    }
  }, [map, selectedArea]);
  return null;
}

export default function LiveMap({ hazards, height = "480px", selectedArea, renderPopup }: LiveMapProps) {
  return (
    <div style={{ height, borderRadius: "1.5rem", overflow: "hidden", position: "relative", zIndex: 0, isolation: "isolate" }}>
      <MapContainer
        center={INDIA_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={4}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        attributionControl
        >
        <MapViewport selectedArea={selectedArea} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {hazards.map((hazard) => {
          const color = SEVERITY_COLOR[hazard.severity];
          const popupContent = renderPopup?.(hazard);
          return (
            <CircleMarker
              key={hazard.id}
              center={[hazard.latitude, hazard.longitude]}
              radius={hazard.severity === "critical" ? 14 : hazard.severity === "high" ? 11 : 9}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.65,
                weight: 2,
              }}
            >
              <Popup>
                {popupContent ?? <div style={{ minWidth: "160px", fontFamily: "inherit" }}>
                  <p style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                    {HAZARD_LABELS[hazard.hazardType]}
                  </p>
                  {hazard.placeName && (
                    <p style={{ fontSize: "0.78rem", color: "#41737c", marginBottom: "0.2rem" }}>
                      📍 {hazard.placeName}
                    </p>
                  )}
                  <p style={{ fontSize: "0.78rem", marginBottom: "0.2rem" }}>
                    Severity:{" "}
                    <span style={{ fontWeight: 600, color }}>
                      {hazard.severity.charAt(0).toUpperCase() + hazard.severity.slice(1)}
                    </span>
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Status: {hazard.status}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                    {hazard.locality}, {hazard.district}, {hazard.state}
                  </p>
                </div>}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
