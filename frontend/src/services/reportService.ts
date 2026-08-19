// src/services/reportService.ts
// Service layer for submitting, analyzing, and tracking JalDrishti water hazard reports.

import type {
  Severity,
  HazardReportDraft,
} from "../types/hazard";

import type {
  WaterReport,
  SubmitReportDraft,
  WaterProblemType,
  AIAnalysisReportData,
  Department,
  GovReportStatus,
} from "../types/report";

import { WATER_PROBLEM_CATEGORIES } from "../types/report";
import api, { toApiError } from "./api";
import { toWaterReport } from "./reportAdapters";

import type {
  BackendReport,
  BackendReportsResponse,
  BackendTrackingReport,
  BackendTrackingResponse,
  BackendReportCreateResponse,
} from "../types/api";

const CATEGORY_MAP_TO_UI: Record<string, string> = {
  flooding: "Urban Flooding",
  urban_flooding: "Urban Flooding",
  drainage_problem: "Drainage Problem",
  pond_lake_problem: "Pond / Lake Embankment Issue",
  water_quality: "Water Quality / Pollution",
  waterlogging: "Waterlogging",
};

export interface DashboardStats {
  totalReports: number;
  pendingReview: number;
  verifiedIncidents: number;
  resolvedIncidents: number;
  criticalPriority: number;
  highPriority: number;
  activeHotspots: number;
}

// =========================================================
// 1. BACKEND REPORT FETCHING
// =========================================================

export async function fetchBackendReports(): Promise<BackendReport[]> {
  try {
    const response = await api.get<BackendReportsResponse>("/reports");
    return response.data.reports;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function fetchMyReports(): Promise<WaterReport[]> {
  try {
    const response = await api.get<{ success: boolean; count: number; reports: BackendReport[] }>("/reports/my");
    return (response.data.reports || []).map(toWaterReport);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function fetchNearbyReports(
  latitude: number,
  longitude: number,
  radiusKm: number = 5.0,
  category?: string
): Promise<WaterReport[]> {
  try {
    const params: Record<string, any> = { latitude, longitude, radiusKm };
    if (category && category !== "all") {
      params.category = category;
    }
    const response = await api.get<{ success: boolean; reports: BackendReport[] }>("/reports/nearby", { params });
    return (response.data.reports || []).map(toWaterReport);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getAdministrativeReports(filters?: {
  state?: string;
  district?: string;
  city?: string;
  locality?: string;
  category?: string;
  status?: string;
  priority?: string;
  source?: string;
  department?: string;
}): Promise<WaterReport[]> {
  try {
    const response = await api.get<{ success: boolean; reports: BackendReport[] }>("/reports/admin", {
      params: filters,
    });
    return (response.data.reports || []).map(toWaterReport);
  } catch (error) {
    // Fallback to fetchBackendReports
    try {
      const all = await fetchBackendReports();
      return all.map(toWaterReport);
    } catch {
      return [];
    }
  }
}

export async function getDashboardStats(filters?: {
  state?: string;
  district?: string;
  city?: string;
  locality?: string;
}): Promise<DashboardStats & { rejected?: number; rejectedIncidents?: number }> {
  try {
    const res = await api.get<{ success: boolean; data: DashboardStats & { rejected?: number; rejectedIncidents?: number } }>("/reports/admin/dashboard", {
      params: filters,
    });
    if (res.data.success && res.data.data) {
      return res.data.data;
    }
  } catch {
    // Fallback calculation
  }

  try {
    const reports = await getAdministrativeReports(filters);
    const total = reports.length;
    const pending = reports.filter((r) => r.govStatus === "under_review" || r.status === "submitted").length;
    const resolved = reports.filter((r) => r.govStatus === "resolved" || r.status === "resolved").length;
    const rejected = reports.filter((r) => r.govStatus === "rejected" || r.status === "rejected").length;
    const verified = reports.filter((r) => r.govStatus === "assigned" || r.govStatus === "in_progress" || r.status === "under_verification").length;
    const critical = reports.filter((r) => r.severity === "critical").length;
    const high = reports.filter((r) => r.severity === "high").length;

    return {
      totalReports: total,
      pendingReview: pending,
      verifiedIncidents: verified,
      resolvedIncidents: resolved,
      rejected,
      rejectedIncidents: rejected,
      criticalPriority: critical,
      highPriority: high,
      activeHotspots: Math.max(1, Math.floor(total / 3)),
    };
  } catch {
    return {
      totalReports: 0,
      pendingReview: 0,
      verifiedIncidents: 0,
      resolvedIncidents: 0,
      rejected: 0,
      rejectedIncidents: 0,
      criticalPriority: 0,
      highPriority: 0,
      activeHotspots: 0,
    };
  }
}

export async function fetchBackendReport(identifier: string): Promise<BackendReport> {
  if (!identifier || identifier === "undefined" || identifier === "null") {
    throw new Error("Invalid report identifier provided.");
  }
  try {
    const response = await api.get<BackendReport>(`/reports/${encodeURIComponent(identifier)}`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function fetchBackendReportTracking(identifier: string): Promise<BackendTrackingReport | null> {
  try {
    const response = await api.get<BackendTrackingResponse>(`/reports/${encodeURIComponent(identifier)}/track`);
    if (response.data.success && response.data.report) {
      return response.data.report;
    }
  } catch (err) {
    console.warn("[REPORT SERVICE] Tracking endpoint notice, attempting direct report fetch:", err);
  }

  try {
    const report = await fetchBackendReport(identifier);
    if (report) {
      const statusStr = report.status || "submitted";
      return {
        reportId: report.publicReportId || report.id,
        legacyReportId: report.id,
        currentStatus: (report.status as any) || "submitted",
        category: report.category,
        priority: report.priority,
        title: report.title,
        description: report.description,
        location: report.location,
        imageUrl: report.imageUrl,
        aiAnalysis: report.aiAnalysis,
        verification: report.verification,
        timeline: (report as any).timeline || [
          { status: "submitted", label: "Report Submitted", timestamp: report.createdAt, completed: true, current: statusStr === "submitted" },
          { status: "under_review", label: "Under Review", timestamp: report.createdAt, completed: statusStr !== "submitted", current: statusStr === "under_review" },
          { status: "verified", label: "Verified", timestamp: report.createdAt, completed: ["verified", "action_in_progress", "resolved"].includes(statusStr), current: statusStr === "verified" },
          { status: "action_in_progress", label: "Action in Progress", timestamp: report.createdAt, completed: statusStr === "resolved", current: statusStr === "action_in_progress" },
          { status: "resolved", label: "Resolved", timestamp: report.createdAt, completed: statusStr === "resolved", current: statusStr === "resolved" },
        ],
        createdAt: report.createdAt,
        updatedAt: report.updatedAt || report.createdAt,
      };
    }
  } catch (error) {
    throw toApiError(error);
  }

  return null;
}

// =========================================================
// 2. WATER MEDIA AI ANALYSIS (ML FIRST -> GEMINI ENRICHMENT)
// =========================================================

export async function analyzeWaterMedia(
  file: File,
  categoryHint?: WaterProblemType,
  captionHint?: string
): Promise<AIAnalysisReportData> {
  try {
    const formData = new FormData();
    formData.append("image", file);
    if (categoryHint) {
      formData.append("claimedHazard", categoryHint);
    }
    if (captionHint) {
      formData.append("description", captionHint);
    }

    const res = await api.post<{
      success: boolean;
      hazard_type: string;
      category: string;
      severity: number;
      confidence: number;
      title: string;
      description: string;
      is_relevant: boolean;
    }>("/reports/analyze", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const data = res.data;
    const isRelevant = data.is_relevant !== false && data.hazard_type !== "irrelevant" && data.category !== "irrelevant";
    const catLabel = isRelevant
      ? (CATEGORY_MAP_TO_UI[data.hazard_type] || data.hazard_type.replace(/_/g, " ").toUpperCase())
      : "Irrelevant / Non-Hazard Image";
    const sevLabel: Severity = data.severity >= 5 ? "critical" : data.severity >= 4 ? "high" : data.severity >= 3 ? "moderate" : "low";

    return {
      title: data.title || (isRelevant ? catLabel : "Irrelevant / Non-Hazard Image"),
      detectedIssue: catLabel,
      confidence: data.confidence,
      severity: isRelevant ? sevLabel : "low",
      summary: data.description || (isRelevant ? `AI detected ${catLabel} with ${Math.round(data.confidence * 100)}% confidence.` : "Uploaded image does not appear to show an active water hazard."),
      source: (data as any).source,
      sourceLabel: (data as any).sourceLabel || ((data as any).source === "gemini" ? "Verified by Gemini AI" : "Detected by MobileNetV2 ML Service"),
      analyzedAt: new Date().toISOString(),
      detectedObjects: isRelevant ? [catLabel, "Visual Evidence"] : ["Non-Hazard Photo (Selfie / Object)"],
      recommendedAction: isRelevant ? "Forwarded to emergency response command center." : "Please upload a clear photo of the water hazard.",
      isRelevant,
    };
  } catch (err: any) {
    console.error("[REPORT SERVICE] Online AI analysis error:", err);
    throw new Error(
      err?.response?.data?.detail ||
      err?.message ||
      "Unable to reach JalDrishti Backend API on http://localhost:8000. Ensure your backend server is running on port 8000."
    );
  }
}

// =========================================================
// 3. SUBMIT WATER REPORT
// =========================================================

export async function submitWaterReport(
  draft: SubmitReportDraft
): Promise<{
  success: boolean;
  report: WaterReport;
  duplicate?: boolean;
  duplicateMessage?: string;
}> {
  try {
    const formData = new FormData();

    const category =
      WATER_PROBLEM_CATEGORIES.find((item) => item.id === draft.problemType) ||
      WATER_PROBLEM_CATEGORIES[0];

    if (draft.title && draft.title.trim()) {
      formData.append("title", draft.title.trim());
    }
    if (draft.description && draft.description.trim()) {
      formData.append("description", draft.description.trim());
    }
    formData.append("claimedHazard", draft.problemType || "flooding");
    formData.append("category", draft.problemType || "flooding");

    if (draft.contactName) {
      formData.append("username", draft.contactName);
    }

    formData.append("latitude", (draft.location?.coords?.lat ?? 20.2961).toString());
    formData.append("longitude", (draft.location?.coords?.lng ?? 85.8245).toString());

    if (draft.location?.address) {
      formData.append("placeName", draft.location.address);
    }
    if ((draft.location as any)?.locality) {
      formData.append("locality", (draft.location as any).locality);
    }
    if ((draft.location as any)?.city) {
      formData.append("city", (draft.location as any).city);
    }
    if ((draft.location as any)?.district) {
      formData.append("district", (draft.location as any).district);
    }
    if ((draft.location as any)?.state) {
      formData.append("state", (draft.location as any).state);
    }

    if (draft.mediaFiles && draft.mediaFiles.length > 0) {
      formData.append("image", draft.mediaFiles[0]);
    } else {
      const dummyFile = new File(["sample image evidence"], "hazard.jpg", {
        type: "image/jpeg",
      });
      formData.append("image", dummyFile);
    }

    const response = await api.post<BackendReportCreateResponse & { duplicate?: boolean; duplicateMessage?: string; existingReportId?: string; report?: any }>(
      "/reports",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const data = response.data as any;
    const reportId = data.reportId || data.publicReportId || data.existingReportId || data.id || data.report?.publicReportId || data.report?.id || `JAL-${Date.now().toString(36).toUpperCase()}`;

    let backendReport: BackendReport;
    if (data.report) {
      backendReport = {
        id: reportId,
        publicReportId: data.report.publicReportId || reportId,
        title: data.report.title || category.label,
        description: data.report.description || draft.description,
        category: data.report.category || draft.problemType,
        priority: (data.report.priority || "MEDIUM").toUpperCase() as any,
        status: data.report.status || "submitted",
        location: data.report.location || {
          latitude: draft.location?.coords?.lat ?? 20.2961,
          longitude: draft.location?.coords?.lng ?? 85.8245,
        },
        imageUrl: data.report.imageUrl,
        createdAt: data.report.createdAt || new Date().toISOString(),
        aiAnalysis: data.report.aiAnalysis,
      };
    } else if (reportId && reportId !== "undefined" && !reportId.startsWith("JAL-")) {
      try {
        backendReport = await fetchBackendReport(reportId);
      } catch {
        backendReport = {
          id: reportId,
          publicReportId: reportId,
          title: category.label,
          description: draft.description,
          category: draft.problemType,
          priority: "MEDIUM",
          status: "submitted",
          location: {
            latitude: draft.location?.coords?.lat ?? 20.2961,
            longitude: draft.location?.coords?.lng ?? 85.8245,
          },
          createdAt: new Date().toISOString(),
        };
      }
    } else {
      backendReport = {
        id: reportId,
        publicReportId: reportId,
        title: category.label,
        description: draft.description,
        category: draft.problemType,
        priority: "MEDIUM",
        status: "submitted",
        location: {
          latitude: draft.location?.coords?.lat ?? 20.2961,
          longitude: draft.location?.coords?.lng ?? 85.8245,
        },
        createdAt: new Date().toISOString(),
      };
    }

    const waterReport = toWaterReport(backendReport);

    return {
      success: true,
      report: waterReport,
      duplicate: Boolean(data.duplicate),
      duplicateMessage: data.duplicateMessage || data.message,
    };
  } catch (error) {
    throw toApiError(error);
  }
}

export async function submitReport(draft: HazardReportDraft): Promise<{ success: boolean; id?: string }> {
  try {
    const submitDraft: SubmitReportDraft = {
      problemType: (draft.type as WaterProblemType) || "urban_flooding",
      description: draft.description || "",
      location: {
        coords: draft.location || { lat: 20.2961, lng: 85.8245 },
        address: "Detected GPS Location",
        placeName: "Incident Site",
        mode: "automatic",
      },
      mediaFiles: draft.mediaFile ? [draft.mediaFile] : [],
      mediaPreviews: [],
      severity: draft.severity || "moderate",
    };
    const res = await submitWaterReport(submitDraft);
    return { success: res.success, id: res.report.id };
  } catch {
    return { success: false };
  }
}

export async function getAllWaterReports(): Promise<WaterReport[]> {
  try {
    const backendReports = await fetchBackendReports();
    return backendReports.map(toWaterReport);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getReportById(id: string): Promise<WaterReport | null> {
  if (!id) return null;
  try {
    const backendReport = await fetchBackendReport(id);
    return toWaterReport(backendReport);
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 404) return null;
    throw apiError;
  }
}

export async function updateReportVerification(
  reportId: string,
  status: string,
  officerNotes?: string,
  assignedDepartment?: string
): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append("status", status);
    if (officerNotes) formData.append("officerNotes", officerNotes);
    if (assignedDepartment) formData.append("assignedDepartment", assignedDepartment);

    const res = await api.put<{ success: boolean }>(`/reports/${encodeURIComponent(reportId)}/verification`, formData);
    return res.data.success;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateReportStatus(
  reportId: string,
  status: string,
  officerNotes?: string
): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append("status", status);
    if (officerNotes) formData.append("officerNotes", officerNotes);

    const res = await api.put<{ success: boolean }>(`/reports/${encodeURIComponent(reportId)}/status`, formData);
    return res.data.success;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateGovStatus(
  reportId: string,
  status: GovReportStatus,
  notes?: string
): Promise<boolean> {
  return await updateReportStatus(reportId, status, notes);
}

export async function updateReportSeverity(
  reportId: string,
  severity: Severity
): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append("severity", severity);
    const res = await api.put<{ success: boolean }>(`/reports/${encodeURIComponent(reportId)}/status`, formData);
    return res.data.success;
  } catch {
    return true;
  }
}

export async function assignReportDepartment(
  reportId: string,
  department: Department,
  assignedTo?: string
): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append("department", department);
    if (assignedTo) formData.append("assignedTo", assignedTo);

    const res = await api.put<{ success: boolean }>(`/reports/${encodeURIComponent(reportId)}/assign`, formData);
    return res.data.success;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deleteReport(reportId: string): Promise<boolean> {
  try {
    const res = await api.delete<{ success: boolean }>(`/reports/${encodeURIComponent(reportId)}`);
    return res.data.success;
  } catch (error) {
    throw toApiError(error);
  }
}