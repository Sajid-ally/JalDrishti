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

export function toUiSeverity(priority?: string | null, severityNum?: number | null): Severity {
  const p = priority?.toLowerCase();
  if (severityNum === 5 || p === "critical") {
    return "critical";
  }
  if (severityNum === 4 || p === "high") {
    return "high";
  }
  if (severityNum === 3 || p === "medium" || p === "moderate") {
    return "moderate";
  }
  if ((typeof severityNum === "number" && severityNum <= 2) || p === "low") {
    return "low";
  }
  if (p === "critical" || p === "high" || p === "low") {
    return p as Severity;
  }
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
  const latitude = report.location?.latitude ?? (report as any).latitude;
  const longitude = report.location?.longitude ?? (report as any).longitude;

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
    .join(", ") || (report as any).city || (report as any).state || "Reported Location";

  const severityNum = (report as any).severity ?? (report as any).mlAnalysis?.severity;

  return {
    id: report.id,
    reportId: report.publicReportId || undefined,
    latitude,
    longitude,
    hazardType: toMapIssueType(report.category),
    severity: toUiSeverity(report.priority, severityNum),
    status: report.status || "submitted",
    placeName: placeName || undefined,
    state: location?.state || (report as any).state || "",
    district: location?.district || (report as any).district || "",
    locality: location?.locality || (report as any).locality || location?.city || (report as any).city || (report as any).district || "Active Hazard Zone",
    title: report.title || (report as any).aiAnalysis?.title || undefined,
    description: report.description || (report as any).aiAnalysis?.description || undefined,
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
  assignedDepartment?: string | null;
  assignment?: Record<string, unknown> | null;
  concludedAt?: string | null;
  expiresAt?: string | null;
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
  const s = (status || "").toLowerCase().trim();
  if (
    s === "under_review" ||
    s === "verified" ||
    s === "action_in_progress" ||
    s === "in_progress" ||
    s === "assigned" ||
    s === "resolved" ||
    s === "rejected"
  ) {
    if (s === "in_progress") return "action_in_progress";
    return s as any;
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
  const severityNum = (report as any).severity ?? (report as any).mlAnalysis?.severity;

  const dept =
    report.assignment?.department ||
    (report.verification as any)?.assignedDepartment ||
    (report as any).assignedDepartment ||
    null;

  return {
    id: report.reportId,
    title: report.title,
    description: report.description || "No description was provided for this report.",
    categoryLabel: getCategoryLabel(report.category),
    severity: toUiSeverity(report.priority, severityNum),
    status: toBackendStatus(report.currentStatus || (report as any).status),
    assignedDepartment: typeof dept === "string" ? dept : null,
    assignment: report.assignment || null,
    concludedAt: report.concludedAt || (report as any).concludedAt || null,
    expiresAt: report.expiresAt || (report as any).expiresAt || null,
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
  const severityNum = (report as any).severity ?? (report as any).mlAnalysis?.severity;
  
  const rawStatus = (report.status || "").toLowerCase().trim();
  const rawGovStatus = ((report as any).govStatus || "").toLowerCase().trim();

  // Frontend statuses: submitted, under_verification, resolved, rejected.
  let frontendStatus: WaterReportStatus = "submitted";
  if (rawStatus === "resolved" || rawGovStatus === "resolved") {
    frontendStatus = "resolved";
  } else if (rawStatus === "rejected" || rawGovStatus === "rejected") {
    frontendStatus = "rejected";
  } else if (
    rawStatus === "under_review" ||
    rawStatus === "verified" ||
    rawStatus === "action_in_progress" ||
    rawStatus === "in_progress" ||
    rawStatus === "assigned" ||
    rawGovStatus === "assigned" ||
    rawGovStatus === "in_progress"
  ) {
    frontendStatus = "under_verification";
  }

  // GovReportStatus: "under_review" | "assigned" | "in_progress" | "resolved" | "rejected"
  let govStatus: GovReportStatus = "under_review";
  if (rawGovStatus === "rejected" || rawStatus === "rejected") {
    govStatus = "rejected";
  } else if (rawGovStatus === "resolved" || rawStatus === "resolved") {
    govStatus = "resolved";
  } else if (rawGovStatus === "in_progress" || rawStatus === "action_in_progress" || rawStatus === "in_progress") {
    govStatus = "in_progress";
  } else if (rawGovStatus === "assigned" || rawStatus === "assigned") {
    govStatus = "assigned";
  } else if (rawStatus === "verified") {
    const isAssigned = (report.verification as any)?.assignedDepartment || 
                       (report as any).assignedDepartment || 
                       (report as any).assignment?.department;
    govStatus = isAssigned ? "assigned" : "under_review";
  } else {
    const hasDept = (report.verification as any)?.assignedDepartment || 
                    (report as any).assignedDepartment || 
                    (report as any).assignment?.department;
    govStatus = hasDept ? "assigned" : "under_review";
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
        .join(", ") || (report.location as any)?.formattedAddress || "GPS Coordinates Location",
      placeName: report.location?.locality || report.location?.city || report.location?.district || report.location?.state || "Incident Site",
      mode: report.location?.locality ? "manual" : "automatic",
    },
    media: imageUrl
      ? [{ id: "evidence", name: "Evidence Image", type: "image", url: imageUrl }]
      : [],
    severity: toUiSeverity(report.priority, severityNum),
    status: frontendStatus,
    createdAt: report.createdAt || new Date().toISOString(),
    updatedAt: report.updatedAt || new Date().toISOString(),
    aiAnalysis: {
      detectedIssue: (report.aiAnalysis as any)?.title || categoryLabel,
      confidence: 0.91,
      severity: toUiSeverity(report.priority, severityNum),
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
