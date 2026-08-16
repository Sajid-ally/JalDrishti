// src/services/reportService.ts
// Service layer for submitting and tracking water hazard and disaster reports.
// Abstracted cleanly so mock/local storage implementation seamlessly connects to backend API.

import type {
  Severity,
  HazardReportDraft,
} from "../types/hazard";
import { generateReportId } from "../utils/reportId";
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Phase 1 API foundation. These helpers connect pages directly to the backend.
 */
export async function fetchBackendReports(): Promise<BackendReport[]> {
  try {
    const response = await api.get<BackendReportsResponse>("/reports/");
    return response.data.reports;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function fetchBackendReport(identifier: string): Promise<BackendReport> {
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
    return response.data.success && response.data.report ? response.data.report : null;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * AI analysis simulation for water problem reports.
 * Structured so that a real vision / multimodal backend API call can replace this directly.
 */
export async function analyzeWaterMedia(
  file: File,
  categoryHint?: WaterProblemType,
  captionHint?: string
): Promise<AIAnalysisReportData> {
  await delay(1200); // Simulate inference latency

  const fileName = file.name.toLowerCase();
  const caption = (captionHint || "").toLowerCase();
  const combined = `${fileName} ${caption}`;

  let detectedIssue = "Water Hazard";
  let severity: Severity = "moderate";
  let confidence = 0.85 + Math.random() * 0.1;
  let summary = "Water-related anomaly identified from visual input.";

  if (categoryHint === "urban_flooding" || /flood|inundat|overflow|deep water/i.test(combined)) {
    detectedIssue = "Urban Flooding";
    severity = "high";
    confidence = 0.91;
    summary =
      "Significant water accumulation detected on the roadway. Water depth exceeds normal curb thresholds.";
  } else if (categoryHint === "waterlogging" || /logg|puddle|standing/i.test(combined)) {
    detectedIssue = "Waterlogging";
    severity = "moderate";
    confidence = 0.89;
    summary =
      "Prolonged surface water accumulation obstructing road and pedestrian movement.";
  } else if (categoryHint === "drainage_problem" || /drain|culvert|clog|sewer/i.test(combined)) {
    detectedIssue = "Drainage Problem";
    severity = "moderate";
    confidence = 0.93;
    summary =
      "Blockage or reverse discharge in stormwater drainage system detected.";
  } else if (categoryHint === "pond_lake_issue" || /pond|lake|embankment/i.test(combined)) {
    detectedIssue = "Pond / Lake Embankment Issue";
    severity = "high";
    confidence = 0.87;
    summary =
      "High water level approaching catchment embankment threshold.";
  } else if (categoryHint === "water_quality_pollution" || /pollut|dirty|smell|chem|color/i.test(combined)) {
    detectedIssue = "Water Quality / Pollution";
    severity = "high";
    confidence = 0.92;
    summary =
      "Discoloration and turbidity detected in water source.";
  }

  return {
    detectedIssue,
    confidence: Number(confidence.toFixed(2)),
    severity,
    summary,
    analyzedAt: new Date().toISOString(),
    detectedObjects: ["Water Surface", "Surrounding Infrastructure"],
    recommendedAction: "Forwarded to emergency response command center.",
  };
}

/**
 * Submits a new water report.
 */
export async function submitWaterReport(
  draft: SubmitReportDraft
): Promise<{ success: boolean; report: WaterReport }> {
  try {
    const formData = new FormData();
    const category = WATER_PROBLEM_CATEGORIES.find((c) => c.id === draft.problemType) || WATER_PROBLEM_CATEGORIES[0];
    

    formData.append("title", category.label);
    formData.append("description", draft.description);
    formData.append("username", draft.contactName || "anonymous");
    formData.append("latitude", draft.location.coords.lat.toString());
    formData.append("longitude", draft.location.coords.lng.toString());
    
    if (draft.mediaFiles && draft.mediaFiles.length > 0) {
      formData.append("image", draft.mediaFiles[0]);
    } else {
      const dummyFile = new File(["dummy content"], "dummy.jpg", { type: "image/jpeg" });
      formData.append("image", dummyFile);
    }

    const response = await api.post<BackendReportCreateResponse>("/reports/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const reportId = response.data.reportId;
    const backendReport = await fetchBackendReport(reportId);
    const waterReport = toWaterReport(backendReport);

    return {
      success: true,
      report: waterReport,
    };
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Retrieves a report by its Report ID.
 */
export async function getReportById(id: string): Promise<WaterReport | null> {
  try {
    const backendReport = await fetchBackendReport(id);
    return toWaterReport(backendReport);
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 404) {
      return null;
    }
    throw apiError;
  }
}

/**
 * Returns all active water reports.
 */
export async function getAllWaterReports(): Promise<WaterReport[]> {
  try {
    const backendReports = await fetchBackendReports();
    return backendReports.map(toWaterReport);
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Assigns a department to a report.
 */
export async function assignReportDepartment(
  id: string,
  department: Department
): Promise<boolean> {
  try {
    const assignedTo = "assigned_officer";
    const assignedBy = "admin";
    await api.put(`/reports/${encodeURIComponent(id)}/assign`, null, {
      params: { department, assignedTo, assignedBy }
    });
    return true;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Updates the government workflow status of a report.
 */
export async function updateGovStatus(
  id: string,
  govStatus: GovReportStatus
): Promise<boolean> {
  try {
    let status = "under_review";
    if (govStatus === "assigned") {
      status = "verified";
    } else if (govStatus === "in_progress") {
      status = "action_in_progress";
    } else if (govStatus === "resolved") {
      status = "resolved";
    }
    
    await api.put(`/reports/${encodeURIComponent(id)}/status`, null, {
      params: { status }
    });
    return true;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Updates the severity / priority of a report.
 */
export async function updateReportSeverity(
  id: string,
  severity: Severity
): Promise<boolean> {
  try {
    let priority: string = severity;
    if (severity === "moderate") {
      priority = "medium";
    }
    await api.put(`/reports/${encodeURIComponent(id)}/priority`, null, {
      params: { priority }
    });
    return true;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Updates report verification.
 */
export async function updateReportVerification(
  id: string,
  status: string,
  verifiedBy?: string
): Promise<boolean> {
  try {
    await api.put(`/reports/${encodeURIComponent(id)}/verification`, null, {
      params: { status, verifiedBy: verifiedBy || "admin" }
    });
    return true;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getAdministrativeReports(filters: {
  state?: string;
  district?: string;
  city?: string;
  locality?: string;
  category?: string;
  status?: string;
  priority?: string;
  department?: string;
} = {}): Promise<WaterReport[]> {
  try {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => Boolean(value))
    );
    const response = await api.get<{ reports: BackendReport[] }>("/reports/admin", { params });
    return response.data.reports.map(toWaterReport);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getDashboardStats(): Promise<any> {
  try {
    const response = await api.get("/reports/admin/dashboard");
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function submitReport(
  draft: HazardReportDraft
): Promise<{ success: boolean; reportId?: string }> {
  void draft;
  await delay(600);

  if (!navigator.onLine) {
    return { success: false };
  }

  const generatedId = generateReportId();
  return { success: true, reportId: generatedId };
}

/**
 * Permanently deletes a report.
 */
export async function deleteReport(id: string): Promise<boolean> {
  try {
    await api.delete(`/reports/${encodeURIComponent(id)}`);
    return true;
  } catch (error) {
    throw toApiError(error);
  }
}
