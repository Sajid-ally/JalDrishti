// components/map/LiveMap.tsx
//
// Reusable Puri-centered coastal hazard map using react-leaflet.
// Accepts hazard location data via props — does NOT fetch data internally.
// Pass hazards from the parent page; swap mock data for API data there.
//
// Map center: Puri, Odisha, India (19.8135°N, 85.8312°E)

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { HazardType, Severity } from "../../types/hazard";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HazardLocation {
  id: string;
  latitude: number;
  longitude: number;
  hazardType: HazardType;
  severity: Severity;
  status: string;
  placeName?: string;
}

interface LiveMapProps {
  /** Hazard markers to display on the map.
   *  TODO: Parent should fetch this from GET /api/map/hazards */
  hazards: HazardLocation[];
  height?: string;
}

// ─── Severity → marker color ─────────────────────────────────────────────────

const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#10b981",
  moderate: "#f59e0b",
  high: "#ea580c",
  critical: "#dc2626",
};

const HAZARD_LABELS: Record<HazardType, string> = {
  flood: "Flood",
  tsunami: "Tsunami",
  storm_surge: "Storm Surge",
  high_waves: "High Waves",
  coastal_erosion: "Coastal Erosion",
  coastal_damage: "Coastal Damage",
  other: "Other Hazard",
};

// ─── Component ───────────────────────────────────────────────────────────────

const PURI_CENTER: [number, number] = [19.8135, 85.8312];
const DEFAULT_ZOOM = 13;

export default function LiveMap({ hazards, height = "480px" }: LiveMapProps) {
  return (
    <div style={{ height, borderRadius: "1.5rem", overflow: "hidden" }}>
      <MapContainer
        center={PURI_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {hazards.map((hazard) => {
          const color = SEVERITY_COLOR[hazard.severity];
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
                <div style={{ minWidth: "160px", fontFamily: "inherit" }}>
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
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
