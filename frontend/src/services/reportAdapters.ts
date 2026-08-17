import { API_BASE_URL } from "../utils/constants";
import type {
  BackendReport,
  BackendReportStatus,
  BackendTrackingReport,
} from "../types/api";
import type { Severity } from "../types/hazard";
import type { MapIssueType } from "./hazardService";
import {
  WATER_PROBLEM_CATEGORIES,
  type WaterProblemType,
  type WaterReport,
  type WaterReportStatus,
  type GovReportStatus,
  type StatusTimelineStep,
  type Department,
} from "../types/report";

const BACKEND_CATEGORY_TO_UI: Record<string, WaterProblemType> = {
  flooding: "urban_flooding",
  urban_flooding: "urban_flooding",
  drainage_problem: "drainage_problem",
  pond_lake_problem: "pond_lake_issue",
  water_quality: "water_quality_pollution",
  other_water_problem: "other",
};

export function toUiProblemType(category?: string | null): WaterProblemType {
  return (category && BACKEND_CATEGORY_TO_UI[category]) || "other";
}

export function toUiSeverity(priority?: string | null): Severity {
  if (priority === "low" || priority === "high" || priority === "critical") {
    return priority;
  }

  // The backend's "medium" is displayed by the current UI as "moderate".
  return "moderate";
}

export function getBackendReportId(report: BackendReport): string {
  return report.publicReportId || report.id;
}

export function getCategoryLabel(category?: string | null): string {
  const problemType = toUiProblemType(category);
  return WATER_PROBLEM_CATEGORIES.find((item) => item.id === problemType)?.label ?? "Other Water Problem";
}

export interface CitizenMapMarker {
  id: string;
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
  title?: string;
  description?: string;
  imageUrl?: string;
  createdAt?: string | null;
}

function toMapIssueType(category?: string | null): MapIssueType {
  switch (category?.trim().toLowerCase()) {
    case "flood":
    case "flooding":
    case "urban_flooding":
      return "flood";
    case "waterlogging":
      return "waterlogging";
    case "drainage_problem":
      return "sewage";
    case "water_quality":
    case "water_quality_pollution":
      return "water_quality";
    case "pond_lake_problem":
    case "pond_lake_issue":
    case "pond":
      return "pond";
    case "lake":
      return "lake";
    default:
      return "other";
  }
}

export function toCitizenMapMarker(report: BackendReport): CitizenMapMarker | null {
  const latitude = report.location?.latitude;
  const longitude = report.location?.longitude;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const location = report.location;
  const placeName = [location?.locality, location?.city, location?.district, location?.state]
    .filter((value): value is string => Boolean(value))
    .join(", ");

  return {
    // Keep the database ID internal to React marker identity. It is not shown to citizens.
    id: report.id,
    reportId: report.publicReportId || undefined,
    latitude,
    longitude,
    hazardType: toMapIssueType(report.category),
    severity: toUiSeverity(report.priority),
    status: report.status || "submitted",
    placeName: placeName || undefined,
    state: location?.state || "",
    district: location?.district || "",
    locality: location?.locality || "",
    title: report.title || undefined,
    description: report.description || undefined,
    imageUrl: toMediaUrl(report.imageUrl) || undefined,
    createdAt: report.createdAt,
  };
}

export interface TrackedReportView {
  id: string;
  title?: string | null;
  description: string;
  categoryLabel: string;
  severity: Severity;
  status: BackendReportStatus;
  location: {
    latitude?: number;
    longitude?: number;
    state?: string | null;
    district?: string | null;
    city?: string | null;
    locality?: string | null;
  };
  media: Array<{ id: string; name: string; type: "image" | "video"; url: string }>;
  aiAnalysis?: {
    title?: string | null;
    description?: string | null;
  } | null;
  verification: Record<string, unknown>;
  timeline: Array<Record<string, unknown>>;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function toBackendStatus(status?: string | null): BackendReportStatus {
  if (
    status === "under_review" ||
    status === "verified" ||
    status === "action_in_progress" ||
    status === "resolved" ||
    status === "rejected"
  ) {
    return status;
  }

  return "submitted";
}

function toMediaUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const normalizedPath = imageUrl.replace(/^\/+/, "");
  return `${API_BASE_URL.replace(/\/$/, "")}/${normalizedPath}`;
}

export function toTrackedReportView(report: BackendTrackingReport): TrackedReportView {
  const imageUrl = toMediaUrl(report.imageUrl);

  return {
    id: report.reportId,
    title: report.title,
    description: report.description || "No description was provided for this report.",
    categoryLabel: getCategoryLabel(report.category),
    severity: toUiSeverity(report.priority),
    status: toBackendStatus(report.currentStatus),
    location: {
      latitude: report.location?.latitude,
      longitude: report.location?.longitude,
      state: report.location?.state,
      district: report.location?.district,
      city: report.location?.city,
      locality: report.location?.locality,
    },
    media: imageUrl
      ? [{ id: "report-evidence", name: "Uploaded evidence", type: "image", url: imageUrl }]
      : [],
    aiAnalysis: report.aiAnalysis,
    verification: report.verification || {},
    timeline: report.timeline || [],
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

export function toWaterReport(report: BackendReport): WaterReport {
  const problemType = toUiProblemType(report.category);
  const categoryLabel = getCategoryLabel(report.category);
  const imageUrl = toMediaUrl(report.imageUrl);
  
  // Backend statuses: submitted, under_review, verified, action_in_progress, resolved, rejected.
  // Frontend statuses (WaterReportStatus): submitted, ai_analysis, under_verification, resolved.
  let frontendStatus: WaterReportStatus = "submitted";
  if (report.status === "resolved" || report.status === "rejected") {
    frontendStatus = "resolved";
  } else if (report.status === "under_review" || report.status === "verified" || report.status === "action_in_progress") {
    frontendStatus = "under_verification";
  }

  // GovReportStatus: "under_review" | "assigned" | "in_progress" | "resolved"
  let govStatus: GovReportStatus = "under_review";
  if (report.status === "action_in_progress") {
    govStatus = "in_progress";
  } else if (report.status === "resolved" || report.status === "rejected") {
    govStatus = "resolved";
  } else if (report.status === "verified") {
    const isAssigned = (report.verification as any)?.assignedDepartment || 
                       (report as any).assignedDepartment || 
                       (report as any).assignment?.department;
    if (isAssigned) {
      govStatus = "assigned";
    } else {
      govStatus = "under_review";
    }
  }

  const assignedDepartment = (
    (report.verification as any)?.assignedDepartment || 
    (report as any).assignedDepartment || 
    (report as any).assignment?.department
  ) as Department | undefined;

  const timelineSteps: StatusTimelineStep[] = (report.timeline || []).map((step: any) => {
    let label = step.status || "Submitted";
    let title = step.status || "Report Submitted";
    let description = step.description || "";
    
    if (step.status === "submitted") {
      label = "Submitted";
      title = "Report Submitted";
      description = "Citizen report logged with evidence and geolocation.";
    } else if (step.status === "under_review") {
      label = "Under Review";
      title = "Government Desk Review";
      description = "Assigned to regional monitoring and review desk.";
    } else if (step.status === "verified") {
      label = "Verified";
      title = "Verification Completed";
      description = "Incident verified by municipal field officers.";
    } else if (step.status === "action_in_progress") {
      label = "In Progress";
      title = "Response In Progress";
      description = "Emergency response teams deployed and working.";
    } else if (step.status === "resolved") {
      label = "Resolved";
      title = "Incident Resolved";
      description = "Water hazard cleared and normal conditions restored.";
    } else if (step.status === "rejected") {
      label = "Rejected";
      title = "Incident Rejected";
      description = "Report marked as invalid, duplicate, or false alarm.";
    }

    return {
      status: frontendStatus,
      label,
      title,
      description,
      timestamp: step.timestamp || "",
      completed: true,
      current: report.status === step.status,
    };
  });

  return {
    id: report.publicReportId || report.id,
    problemType,
    categoryLabel,
    description: report.description || "",
    location: {
      coords: {
        lat: report.location?.latitude ?? 0,
        lng: report.location?.longitude ?? 0,
      },
      address: [report.location?.locality, report.location?.city, report.location?.district, report.location?.state]
        .filter(Boolean)
        .join(", ") || "GPS Location",
      placeName: report.location?.locality || report.location?.city || "Puri District",
      mode: report.location?.locality ? "manual" : "automatic",
    },
    media: imageUrl
      ? [{ id: "evidence", name: "Evidence Image", type: "image", url: imageUrl }]
      : [],
    severity: toUiSeverity(report.priority),
    status: frontendStatus,
    createdAt: report.createdAt || new Date().toISOString(),
    updatedAt: report.updatedAt || new Date().toISOString(),
    aiAnalysis: {
      detectedIssue: (report.aiAnalysis as any)?.title || categoryLabel,
      confidence: 0.91,
      severity: toUiSeverity(report.priority),
      summary: (report.aiAnalysis as any)?.description || report.description || "",
    },
    verification: {
      isVerified: report.status !== "submitted" && report.status !== "under_review",
      status: (report.status === "rejected" ? "rejected" : (report.status !== "submitted" && report.status !== "under_review" ? "verified" : "pending")) as any,
      agency: (report.verification as any)?.agency || "Municipal Corporation",
      verifiedBy: (report.verification as any)?.verifiedBy || undefined,
      verifiedAt: (report.verification as any)?.verifiedAt || undefined,
      officerNotes: (report.verification as any)?.officerNotes || undefined,
    },
    timeline: timelineSteps,
    contactName: report.username || undefined,
    assignedDepartment,
    govStatus,
    assignedAt: (report as any).assignedAt || undefined,
  };
}
