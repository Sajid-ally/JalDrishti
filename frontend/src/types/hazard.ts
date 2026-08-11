// src/types/hazard.ts
// Shared domain types for the coastal hazard platform.
// Keep this as the single source of truth for hazard-related shapes so
// map, alert, and dashboard components never drift out of sync.

export type HazardType =
  | "flood"
  | "tsunami"
  | "storm_surge"
  | "high_waves"
  | "coastal_erosion"
  | "coastal_damage"
  | "other";

export type Severity = "low" | "moderate" | "high" | "critical";

export type ReportStatus = "pending" | "verified" | "resolved" | "rejected";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** A citizen-submitted or AI-detected hazard report, used as a map marker / heatmap point. */
export interface HazardReport {
  id: string;
  type: HazardType;
  severity: Severity;
  status: ReportStatus;
  location: GeoPoint;
  placeName?: string;
  description: string;
  mediaUrl?: string;
  reportedAt: string; // ISO timestamp
  reportedBy?: string;
  aiConfidence?: number; // 0-1, AI severity/authenticity confidence score
  verifiedBy?: string;
}

/** An official advisory/alert issued by a government official, shown via AlertCard. */
export interface Alert {
  id: string;
  type: HazardType;
  severity: Severity;
  title: string;
  description: string;
  areaName: string;
  issuedBy: string;
  issuedAt: string; // ISO timestamp
  expiresAt?: string; // ISO timestamp
  isActive: boolean;
}

/** Visual tokens keyed by severity, shared across AlertCard, LiveMap and Heatmap
 * so the color language means the same thing everywhere in the app. */
export const SEVERITY_STYLES: Record<
  Severity,
  { label: string; text: string; bg: string; border: string; dot: string; hex: string }
> = {
  low: {
    label: "Low",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    hex: "#10b981",
  },
  moderate: {
    label: "Moderate",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    hex: "#f59e0b",
  },
  high: {
    label: "High",
    text: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-500",
    hex: "#ea580c",
  },
  critical: {
    label: "Critical",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-600",
    hex: "#dc2626",
  },
};

/** Shape of a report as it's being composed on the citizen ReportHazard form,
 * before it has a server-assigned id / status. */
export interface HazardReportDraft {
 type: HazardType | null;
  description: string;
  location: GeoPoint | null;
  placeName?: string;
  severity: Severity | null;
  mediaFile?: File | null;

  // Backend fields
  title?: string;
  latitude?: number;
  longitude?: number;
  hazardType?: HazardType;
  file?: File | null;
}

/** Result of the (mocked, prototype-stage) AI analysis run over an uploaded photo/video. */
export interface AIAnalysisResult {
  title?: string;
  suggestedDescription: string;
  suggestedSeverity: Severity;
  suggestedType: HazardType;
  confidence: number;
}

export const HAZARD_LABELS: Record<HazardType, string> = {
  flood: "Flood",
  tsunami: "Tsunami",
  storm_surge: "Storm Surge",
  high_waves: "High Waves",
  coastal_erosion: "Coastal Erosion",
  coastal_damage: "Coastal Damage",
  other: "Other Hazard",
};
