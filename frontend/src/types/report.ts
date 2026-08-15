// src/types/report.ts
// Single source of truth for water-related problem reports, categories, and AI tracking

import type { GeoPoint, Severity } from "./hazard";

export type WaterProblemType =
  | "urban_flooding"
  | "waterlogging"
  | "drainage_problem"
  | "pond_lake_issue"
  | "water_quality_pollution"
  | "other";

export type WaterReportStatus =
  | "submitted"
  | "ai_analysis"
  | "under_verification"
  | "resolved";

/** Extended status used by Government review workflow */
export type GovReportStatus =
  | "under_review"
  | "assigned"
  | "in_progress"
  | "resolved";

export const DEPARTMENT_OPTIONS = [
  "Nagar Nigam",
  "Municipal Corporation",
  "Municipal Council",
  "Water Department",
  "Drainage Department",
  "Public Works Department",
  "District Administration",
  "Other",
] as const;

export type Department = typeof DEPARTMENT_OPTIONS[number];

export interface WaterProblemCategory {
  id: WaterProblemType;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string;
  badgeColor: string;
}

export const WATER_PROBLEM_CATEGORIES: WaterProblemCategory[] = [
  {
    id: "urban_flooding",
    label: "Urban Flooding",
    shortLabel: "Flooding",
    description: "Inundation of roads, residential or commercial areas due to heavy rainfall or storm surge",
    iconName: "Waves",
    badgeColor: "bg-blue-500",
  },
  {
    id: "waterlogging",
    label: "Waterlogging",
    shortLabel: "Waterlogging",
    description: "Prolonged standing water on streets, alleys, or public pathways obstructing traffic",
    iconName: "Droplets",
    badgeColor: "bg-cyan-500",
  },
  {
    id: "drainage_problem",
    label: "Drainage Problem",
    shortLabel: "Drainage",
    description: "Clogged stormwater drains, overflowing culverts, sewer blockages or broken drains",
    iconName: "Pipette",
    badgeColor: "bg-teal-500",
  },
  {
    id: "pond_lake_issue",
    label: "Pond / Lake Issue",
    shortLabel: "Pond/Lake",
    description: "Water body overflowing, embankment breach, algae bloom, or encroached catchment",
    iconName: "CircleDot",
    badgeColor: "bg-emerald-500",
  },
  {
    id: "water_quality_pollution",
    label: "Water Quality / Pollution",
    shortLabel: "Water Quality",
    description: "Contaminated drinking water, industrial runoff, foul odor, or chemical discoloration",
    iconName: "AlertTriangle",
    badgeColor: "bg-amber-500",
  },
  {
    id: "other",
    label: "Other Water Problem",
    shortLabel: "Other",
    description: "Any other water-related emergency, sea erosion, or infrastructure damage",
    iconName: "HelpCircle",
    badgeColor: "bg-slate-500",
  },
];

export interface UploadedMediaItem {
  id: string;
  name: string;
  type: "image" | "video";
  url: string;
  size?: number;
  previewUrl?: string;
}

export interface ReportLocation {
  coords: GeoPoint;
  address?: string;
  placeName?: string;
  landmark?: string;
  mode: "automatic" | "manual";
}

export interface AIAnalysisReportData {
  detectedIssue: string;
  confidence: number; // e.g. 0.91 -> 91%
  severity: Severity;
  summary: string;
  analyzedAt?: string;
  detectedObjects?: string[];
  recommendedAction?: string;
}

export interface VerificationInfo {
  isVerified: boolean;
  status: "pending" | "verified" | "rejected" | "investigating";
  verifiedBy?: string;
  agency?: string;
  verifiedAt?: string;
  officerNotes?: string;
}

export interface StatusTimelineStep {
  status: WaterReportStatus;
  label: string;
  title: string;
  description: string;
  timestamp: string;
  completed: boolean;
  current: boolean;
}

export interface WaterReport {
  id: string; // e.g. WR-2026-8F4K29
  problemType: WaterProblemType;
  categoryLabel: string;
  description: string;
  location: ReportLocation;
  media: UploadedMediaItem[];
  severity: Severity;
  status: WaterReportStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  aiAnalysis: AIAnalysisReportData;
  verification: VerificationInfo;
  timeline: StatusTimelineStep[];
  contactName?: string;
  contactPhone?: string;
  /** Government review fields */
  assignedDepartment?: Department;
  govStatus?: GovReportStatus;
  assignedAt?: string; // ISO
}

export interface SubmitReportDraft {
  problemType: WaterProblemType;
  description: string;
  location: ReportLocation;
  mediaFiles: File[];
  mediaPreviews: UploadedMediaItem[];
  severity?: Severity;
  contactName?: string;
  contactPhone?: string;
}
