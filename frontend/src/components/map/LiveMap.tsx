// components/map/LiveMap.tsx
//
// Reusable India-centered coastal hazard map using react-leaflet.
// Supports live user auto-geolocation, locality markers, and critical red hazard alerts.

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import { useEffect, type ReactNode } from "react";
import "leaflet/dist/leaflet.css";

import type { Severity } from "../../types/hazard";
import type { MapIssueType } from "../../services/hazardService";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HazardLocation {
  id: string;

  /** Public report ID, shown only when the backend has issued one. */
  reportId?: string;

  latitude: number;
  longitude: number;

  hazardType: MapIssueType;
  severity: Severity;
  status: string;

  placeName?: string;

  state: string;
  district: string;
  locality: string;

  /** Optional report information from backend. */
  title?: string;
  description?: string;
  imageUrl?: string;
  createdAt?: string | null;
}

interface LiveMapProps {
  /** Hazard markers to display on the map. */
  hazards: HazardLocation[];

  height?: string;

  userLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;

  selectedArea?: {
    latitude: number;
    longitude: number;
    zoom: number;
  } | null;

  /** Optional page-specific popup content. */
  renderPopup?: (
    hazard: HazardLocation
  ) => ReactNode | undefined;
}

// ─── Severity → marker color ─────────────────────────────────────────────────

const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#10b981",       // Green
  moderate: "#f59e0b",  // Amber
  high: "#ea580c",      // Orange
  critical: "#dc2626",  // Pure Red for Critical
};

// ─── Hazard labels ───────────────────────────────────────────────────────────

const HAZARD_LABELS: Record<MapIssueType, string> = {
  flood: "Flooding / Inundation",
  tsunami: "Tsunami Warning",
  storm_surge: "Storm Surge",
  high_waves: "High Waves",
  coastal_erosion: "Coastal Erosion",
  coastal_damage: "Coastal Damage",
  other: "Other Water Hazard",
  waterlogging: "Severe Waterlogging",
  sewage: "Drainage / Sewage Overflow",
  water_quality: "Water Contamination",
  pond: "Pond Overfill",
  lake: "Lake Breach",
};

// ─── Map configuration ───────────────────────────────────────────────────────

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

// ─── Map viewport controller ─────────────────────────────────────────────────

function MapViewport({
  selectedArea,
  userLocation,
}: Pick<LiveMapProps, "selectedArea" | "userLocation">) {
  const map = useMap();

  useEffect(() => {
    if (selectedArea) {
      map.flyTo(
        [selectedArea.latitude, selectedArea.longitude],
        selectedArea.zoom,
        { duration: 0.8 }
      );
    } else if (userLocation) {
      map.flyTo(
        [userLocation.latitude, userLocation.longitude],
        13,
        { duration: 1.0 }
      );
    }
  }, [map, selectedArea, userLocation]);

  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LiveMap({
  hazards,
  height = "480px",
  userLocation,
  selectedArea,
  renderPopup,
}: LiveMapProps) {
  const initialCenter: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : selectedArea
    ? [selectedArea.latitude, selectedArea.longitude]
    : INDIA_CENTER;

  const initialZoom = userLocation || selectedArea ? 13 : DEFAULT_ZOOM;

  return (
    <div
      style={{
        height,
        borderRadius: "1.5rem",
        overflow: "hidden",
        position: "relative",
        zIndex: 0,
        isolation: "isolate",
      }}
    >
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        minZoom={3}
        style={{
          height: "100%",
          width: "100%",
        }}
        scrollWheelZoom
        attributionControl
      >
        <MapViewport selectedArea={selectedArea} userLocation={userLocation} />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* ── User GPS Live Marker ── */}
        {userLocation && (
          <>
            {/* Pulsing blue outer halo */}
            <CircleMarker
              center={[userLocation.latitude, userLocation.longitude]}
              radius={24}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#60a5fa",
                fillOpacity: 0.25,
                weight: 1.5,
                dashArray: "4, 4",
              }}
            />
            {/* Center solid blue dot */}
            <CircleMarker
              center={[userLocation.latitude, userLocation.longitude]}
              radius={8}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#2563eb",
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup>
                <div style={{ minWidth: "160px", fontFamily: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb" }}></span>
                    <strong style={{ color: "#1e3a8a", fontSize: "0.85rem" }}>You Are Here</strong>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "#475569" }}>
                    Auto-detected GPS Location
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontFamily: "monospace", fontSize: "0.72rem", color: "#0284c7" }}>
                    {userLocation.latitude.toFixed(5)}° N, {userLocation.longitude.toFixed(5)}° E
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* ── Hazard Markers ── */}
        {hazards.map((hazard) => {
          const isCritical = hazard.severity === "critical";
          const color = isCritical ? "#dc2626" : SEVERITY_COLOR[hazard.severity];
          const popupContent = renderPopup?.(hazard);

          const radius = isCritical ? 14 : hazard.severity === "high" ? 11 : 9;

          return (
            <div key={hazard.id}>
              {/* Critical Red Pulsing Outer Halo */}
              {isCritical && (
                <CircleMarker
                  center={[hazard.latitude, hazard.longitude]}
                  radius={24}
                  pathOptions={{
                    color: "#dc2626",
                    fillColor: "#ef4444",
                    fillOpacity: 0.3,
                    weight: 2,
                  }}
                />
              )}

              {/* Main Severity Marker */}
              <CircleMarker
                center={[hazard.latitude, hazard.longitude]}
                radius={radius}
                pathOptions={{
                  color: isCritical ? "#ffffff" : color,
                  fillColor: color,
                  fillOpacity: isCritical ? 0.95 : 0.75,
                  weight: isCritical ? 2.5 : 2,
                }}
              >
                <Popup>
                  {popupContent ?? (
                    <div
                      style={{
                        minWidth: "180px",
                        fontFamily: "inherit",
                        padding: "2px",
                      }}
                    >
                      {/* Hazard title */}
                      <p
                        style={{
                          fontWeight: 800,
                          fontSize: "0.9rem",
                          marginBottom: "0.25rem",
                          color: isCritical ? "#991b1b" : "#0f172a",
                        }}
                      >
                        {hazard.title || HAZARD_LABELS[hazard.hazardType] || "Water Hazard"}
                      </p>

                      {/* Public report ID */}
                      {hazard.reportId && (
                        <p
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            color: "#0f766e",
                            marginBottom: "0.25rem",
                          }}
                        >
                          ID: {hazard.reportId}
                        </p>
                      )}

                      {/* Locality & Place */}
                      {(hazard.placeName || hazard.locality) && (
                        <p
                          style={{
                            fontSize: "0.78rem",
                            color: "#334155",
                            marginBottom: "0.35rem",
                            lineHeight: 1.3,
                          }}
                        >
                          📍 {hazard.placeName || hazard.locality}
                        </p>
                      )}

                      {/* Severity Badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            background: isCritical ? "#fee2e2" : `${color}20`,
                            color: isCritical ? "#dc2626" : color,
                            border: `1px solid ${color}40`,
                          }}
                        >
                          {hazard.severity.toUpperCase()} SEVERITY
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                          Status: {hazard.status}
                        </span>
                      </div>

                      {hazard.description && (
                        <p
                          style={{
                            fontSize: "0.72rem",
                            color: "#475569",
                            marginTop: "6px",
                            lineHeight: 1.35,
                            borderTop: "1px solid #e2e8f0",
                            paddingTop: "4px",
                          }}
                        >
                          {hazard.description}
                        </p>
                      )}
                    </div>
                  )}
                </Popup>
              </CircleMarker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}