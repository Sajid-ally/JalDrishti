// src/types/hazard.ts
// Shared domain types for the coastal hazard platform.
// Keep this as the single source of truth for hazard-related shapes.

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

/** A citizen-submitted or AI-detected hazard report. */
export interface HazardReport {
  id: string;
  type: HazardType;
  severity: Severity;
  status: ReportStatus;

  location: GeoPoint;

  // Geographic information used by the Live Map filters
  city: string;
  state: string;
  area?: string;
  placeName?: string;

  description: string;
  mediaUrl?: string;
  reportedAt: string;
  reportedBy?: string;
  aiConfidence?: number;
  verifiedBy?: string;
}

/** Official advisory/alert issued by a government official. */
export interface Alert {
  id: string;
  type: HazardType;
  severity: Severity;
  title: string;
  description: string;
  areaName: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

/** Visual tokens keyed by severity. */
export const SEVERITY_STYLES: Record<
  Severity,
  {
    label: string;
    text: string;
    bg: string;
    border: string;
    dot: string;
    hex: string;
  }
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

/** Shape of a report while being composed. */
export interface HazardReportDraft {
  type: HazardType | null;
  description: string;
  location: GeoPoint | null;
  placeName?: string;
  severity: Severity | null;
  mediaFile?: File | null;
}

/** Result of the mocked AI analysis. */
export interface AIAnalysisResult {
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