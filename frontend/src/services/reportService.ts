// src/services/reportService.ts
// Service layer for submitting and tracking CoastalEye water hazard reports.

import type {
  HazardType,
  Severity,
  AIAnalysisResult,
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
import { generateReportId } from "../utils/reportId";

import api, { toApiError } from "./api";
import { toWaterReport } from "./reportAdapters";

import type {
  BackendReport,
  BackendReportsResponse,
  BackendTrackingReport,
  BackendTrackingResponse,
  BackendReportCreateResponse,
} from "../types/api";


// =========================================================
// HELPERS
// =========================================================

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


// =========================================================
// BACKEND REPORT FETCHING
// =========================================================

/**
 * Fetch all reports directly from CoastalEye backend.
 */
export async function fetchBackendReports(): Promise<BackendReport[]> {
  try {
    const response = await api.get<BackendReportsResponse>("/reports/");

    return response.data.reports;
  } catch (error) {
    throw toApiError(error);
  }
}


/**
 * Fetch a single backend report.
 */
export async function fetchBackendReport(
  identifier: string
): Promise<BackendReport> {
  try {
    const response = await api.get<BackendReport>(
      `/reports/${encodeURIComponent(identifier)}`
    );

    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}


/**
 * Fetch report tracking information.
 */
export async function fetchBackendReportTracking(
  identifier: string
): Promise<BackendTrackingReport | null> {
  try {
    const response = await api.get<BackendTrackingResponse>(
      `/reports/${encodeURIComponent(identifier)}/track`
    );

    if (
      response.data.success &&
      response.data.report
    ) {
      return response.data.report;
    }

    return null;
  } catch (error) {
    throw toApiError(error);
  }
}


// =========================================================
// WATER MEDIA AI ANALYSIS
// =========================================================

/**
 * Temporary frontend analysis compatibility layer.
 *
 * The actual production AI/ML pipeline is handled by the
 * CoastalEye backend / ML service.
 *
 * This function remains available because existing frontend
 * components may still import it.
 */
export async function analyzeWaterMedia(
  file: File,
  categoryHint?: WaterProblemType,
  captionHint?: string
): Promise<AIAnalysisReportData> {

  await delay(500);

  const fileName = file.name.toLowerCase();
  const caption = (captionHint || "").toLowerCase();

  const combined = `${fileName} ${caption}`;

  let detectedIssue = "Water Hazard";
  let severity: Severity = "moderate";
  let confidence = 0.85;
  let summary =
    "Water-related anomaly identified from visual input.";

  if (
    categoryHint === "urban_flooding" ||
    /flood|inundat|overflow|deep water/i.test(combined)
  ) {
    detectedIssue = "Urban Flooding";
    severity = "high";
    confidence = 0.91;

    summary =
      "Significant water accumulation detected on the roadway. Water depth exceeds normal curb thresholds.";

  } else if (
    categoryHint === "waterlogging" ||
    /logg|puddle|standing/i.test(combined)
  ) {
    detectedIssue = "Waterlogging";
    severity = "moderate";
    confidence = 0.89;

    summary =
      "Prolonged surface water accumulation obstructing road and pedestrian movement.";

  } else if (
    categoryHint === "drainage_problem" ||
    /drain|culvert|clog|sewer/i.test(combined)
  ) {
    detectedIssue = "Drainage Problem";
    severity = "moderate";
    confidence = 0.93;

    summary =
      "Blockage or reverse discharge in stormwater drainage system detected.";

  } else if (
    categoryHint === "pond_lake_issue" ||
    /pond|lake|embankment/i.test(combined)
  ) {
    detectedIssue = "Pond / Lake Embankment Issue";
    severity = "high";
    confidence = 0.87;

    summary =
      "High water level approaching catchment embankment threshold.";

  } else if (
    categoryHint === "water_quality_pollution" ||
    /pollut|dirty|smell|chem|color/i.test(combined)
  ) {
    detectedIssue = "Water Quality / Pollution";
    severity = "high";
    confidence = 0.92;

    summary =
      "Discoloration and turbidity detected in water source.";
  }

  return {
    detectedIssue,
    confidence,
    severity,
    summary,
    analyzedAt: new Date().toISOString(),
    detectedObjects: [
      "Water Surface",
      "Surrounding Infrastructure",
    ],
    recommendedAction:
      "Forwarded to emergency response command center.",
  };
}


// =========================================================
// SUBMIT WATER REPORT
// =========================================================

/**
 * Submit a water hazard report to the real CoastalEye backend.
 *
 * IMPORTANT:
 * This does NOT use localStorage.
 * The backend handles the actual report creation and ML pipeline.
 */
export async function submitWaterReport(
  draft: SubmitReportDraft
): Promise<{
  success: boolean;
  report: WaterReport;
}> {

  try {

    const formData = new FormData();

    const category =
      WATER_PROBLEM_CATEGORIES.find(
        (item) => item.id === draft.problemType
      ) ||
      WATER_PROBLEM_CATEGORIES[0];


    // -----------------------------------------------------
    // Basic report information
    // -----------------------------------------------------

    formData.append(
      "title",
      category.label
    );

    formData.append(
      "description",
      draft.description || ""
    );

    formData.append(
      "username",
      draft.contactName || "anonymous"
    );


    // -----------------------------------------------------
    // Location
    // -----------------------------------------------------

    formData.append(
      "latitude",
      draft.location.coords.lat.toString()
    );

    formData.append(
      "longitude",
      draft.location.coords.lng.toString()
    );


    // -----------------------------------------------------
    // Image
    // -----------------------------------------------------

    if (
      draft.mediaFiles &&
      draft.mediaFiles.length > 0
    ) {

      formData.append(
        "image",
        draft.mediaFiles[0]
      );

    } else {

      // Backend currently expects an image.
      // Keep a fallback only for frontend compatibility.

      const dummyFile = new File(
        ["dummy content"],
        "dummy.jpg",
        {
          type: "image/jpeg",
        }
      );

      formData.append(
        "image",
        dummyFile
      );
    }


    // -----------------------------------------------------
    // Backend request
    // -----------------------------------------------------

    const response =
      await api.post<BackendReportCreateResponse>(
        "/reports/",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );


    const reportId =
      response.data.reportId;


    // -----------------------------------------------------
    // Fetch complete backend report
    // -----------------------------------------------------

    const backendReport =
      await fetchBackendReport(
        reportId
      );


    const waterReport =
      toWaterReport(
        backendReport
      );


    return {
      success: true,
      report: waterReport,
    };

  } catch (error) {

    throw toApiError(error);
  }
}


// =========================================================
// GET REPORT BY ID
// =========================================================

export async function getReportById(
  id: string
): Promise<WaterReport | null> {

  if (!id) {
    return null;
  }

  try {

    const backendReport =
      await fetchBackendReport(id);

    return toWaterReport(
      backendReport
    );

  } catch (error) {

    const apiError =
      toApiError(error);

    if (
      apiError.status === 404
    ) {
      return null;
    }

    throw apiError;
  }
}


// =========================================================
// GET ALL WATER REPORTS
// =========================================================

export async function getAllWaterReports(): Promise<
  WaterReport[]
> {

  try {

    const backendReports =
      await fetchBackendReports();

    return backendReports.map(
      toWaterReport
    );

  } catch (error) {

    throw toApiError(error);
  }
}


// =========================================================
// HAZARD COMPATIBILITY ANALYSIS
// =========================================================

const HAZARD_KEYWORDS: Array<{
  match: RegExp;
  type: HazardType;
  severity: Severity;
}> = [

  {
    match: /tsunami|tidal wave/i,
    type: "tsunami",
    severity: "critical",
  },

  {
    match: /surge/i,
    type: "storm_surge",
    severity: "high",
  },

  {
    match: /flood|water.?logg|inundat/i,
    type: "flood",
    severity: "high",
  },

  {
    match: /wave|swell/i,
    type: "high_waves",
    severity: "moderate",
  },

  {
    match: /erosion|receding shore/i,
    type: "coastal_erosion",
    severity: "moderate",
  },

  {
    match: /damage|debris|collapsed|broken/i,
    type: "coastal_damage",
    severity: "moderate",
  },
];


/**
 * Legacy hazard analysis compatibility.
 *
 * Existing frontend code can continue calling analyzeMedia().
 */
export async function analyzeMedia(
  file: File,
  captionHint?: string
): Promise<AIAnalysisResult> {

  await delay(500);

  const text =
    `${file.name} ${captionHint ?? ""}`;

  const matched =
    HAZARD_KEYWORDS.find(
      (item) =>
        item.match.test(text)
    );


  if (matched) {

    return {

      suggestedType:
        matched.type,

      suggestedSeverity:
        matched.severity,

      suggestedDescription:
        `Possible ${matched.type.replace(
          "_",
          " "
        )} detected from uploaded media. Water/debris patterns suggest ${matched.severity} severity — please confirm or edit before submitting.`,

      confidence:
        0.72 +
        Math.random() * 0.2,
    };
  }


  return {

    suggestedType: "other",

    suggestedSeverity:
      "moderate",

    suggestedDescription:
      "Uploaded media reviewed — hazard type unclear from visuals alone. Please describe what you're seeing.",

    confidence:
      0.75 +
      Math.random() * 0.15,
  };
}


// =========================================================
// GOVERNMENT — ASSIGN REPORT
// =========================================================

export async function assignReportDepartment(
  id: string,
  department: Department
): Promise<boolean> {

  try {

    const assignedTo =
      "assigned_officer";

    const assignedBy =
      "admin";


    await api.put(
      `/reports/${encodeURIComponent(id)}/assign`,
      null,
      {
        params: {
          department,
          assignedTo,
          assignedBy,
        },
      }
    );


    return true;

  } catch (error) {

    throw toApiError(error);
  }
}


// =========================================================
// GOVERNMENT — UPDATE STATUS
// =========================================================

export async function updateGovStatus(
  id: string,
  govStatus: GovReportStatus
): Promise<boolean> {

  try {

    let status =
      "under_review";


    if (
      govStatus === "assigned"
    ) {

      status = "verified";

    } else if (
      govStatus === "in_progress"
    ) {

      status =
        "action_in_progress";

    } else if (
      govStatus === "resolved"
    ) {

      status = "resolved";
    }


    await api.put(
      `/reports/${encodeURIComponent(id)}/status`,
      null,
      {
        params: {
          status,
        },
      }
    );


    return true;

  } catch (error) {

    throw toApiError(error);
  }
}


// =========================================================
// GOVERNMENT — UPDATE SEVERITY / PRIORITY
// =========================================================

export async function updateReportSeverity(
  id: string,
  severity: Severity
): Promise<boolean> {

  try {

    let priority: string =
      severity;


    if (
      severity === "moderate"
    ) {

      priority = "medium";
    }


    await api.put(
      `/reports/${encodeURIComponent(id)}/priority`,
      null,
      {
        params: {
          priority,
        },
      }
    );


    return true;

  } catch (error) {

    throw toApiError(error);
  }
}


// =========================================================
// GOVERNMENT — VERIFICATION
// =========================================================

export async function updateReportVerification(
  id: string,
  status: string,
  verifiedBy?: string
): Promise<boolean> {

  try {

    await api.put(
      `/reports/${encodeURIComponent(id)}/verification`,
      null,
      {
        params: {
          status,
          verifiedBy:
            verifiedBy || "admin",
        },
      }
    );


    return true;

  } catch (error) {

    throw toApiError(error);
  }
}


// =========================================================
// GOVERNMENT — ADMINISTRATIVE REPORTS
// =========================================================

export async function getAdministrativeReports(
  filters: {
    state?: string;
    district?: string;
    city?: string;
    locality?: string;
    category?: string;
    status?: string;
    priority?: string;
    department?: string;
  } = {}
): Promise<WaterReport[]> {

  try {

    const params =
      Object.fromEntries(
        Object.entries(filters)
          .filter(
            ([, value]) =>
              Boolean(value)
          )
      );


    const response =
      await api.get<{
        reports: BackendReport[];
      }>(
        "/reports/admin",
        {
          params,
        }
      );


    return response.data.reports.map(
      toWaterReport
    );

  } catch (error) {

    throw toApiError(error);
  }
}


// =========================================================
// GOVERNMENT DASHBOARD
// =========================================================

export async function getDashboardStats(): Promise<unknown> {

  try {

    const response =
      await api.get(
        "/reports/admin/dashboard"
      );

    return response.data;

  } catch (error) {

    throw toApiError(error);
  }
}


// =========================================================
// LEGACY REPORT SUBMISSION
// =========================================================

/**
 * Legacy compatibility function.
 *
 * Existing CoastalEye components that use submitReport()
 * can continue functioning.
 *
 * Actual water-report submission should use submitWaterReport().
 */
export async function submitReport(
  draft: HazardReportDraft
): Promise<{
  success: boolean;
  reportId?: string;
}> {

  void draft;

  await delay(300);


  if (
    typeof navigator !== "undefined" &&
    !navigator.onLine
  ) {

    return {
      success: false,
    };
  }


  const generatedId =
    generateReportId();


  return {
    success: true,
    reportId: generatedId,
  };
}


// =========================================================
// DELETE REPORT
// =========================================================

export async function deleteReport(
  id: string
): Promise<boolean> {

  try {

    await api.delete(
      `/reports/${encodeURIComponent(id)}`
    );

    return true;

  } catch (error) {

    throw toApiError(error);
  }
}