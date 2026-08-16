import type {
  WaterReport,
  SubmitReportDraft,
  AIAnalysisReportData,
} from "../types/report";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/* ============================================================
   TYPES
   ============================================================ */

export interface DetectionResult {
  hazard_type: string;
  severity: number;
  confidence: number;
  second_prediction?: string;
  second_confidence?: number;
  description?: string;
  title?: string;
}

export interface WaterMediaAnalysis {
  detectedIssue: string;
  confidence: number;
  severity: WaterReport["severity"];
  summary: string;

  /* AI generated fields */
  title: string;
  description: string;

  /* Useful for frontend display */
  source?: string;
  isRelevant?: boolean;
}

export interface ReportSubmissionResponse {
  success: boolean;
  report?: WaterReport;
  reportId?: string;
  message?: string;
  error?: string;
  status?: string;
}

interface BackendValidationError {
  type?: string;
  loc?: unknown[];
  msg?: string;
  input?: unknown;
}

interface BackendReport {
  id?: string;
  report_id?: string;

  title?: string;
  description?: string;
  content?: string;

  category?: string;
  hazard_type?: string;

  latitude?: number;
  longitude?: number;

  location?: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    address?: string;
    placeName?: string;
    landmark?: string;
  };

  imageUrl?: string;
  image_url?: string;

  severity?: number | string;
  priority?: string;

  status?: string;

  createdAt?: string;
  updatedAt?: string;

  mlAnalysis?: {
    category?: string;
    severity?: number;
    confidence?: number;
    isRelevant?: boolean;
  };

  aiAnalysis?: {
    detectedIssue?: string;
    confidence?: number;
    severity?: number;
    summary?: string;
    analyzedAt?: string;
    title?: string;
    description?: string;
  };

  verification?: {
    status?: string;
    verifiedBy?: string | null;
    verifiedAt?: string | null;
  };
}

interface BackendAnalysisResponse {
  hazard_type?: string;
  category?: string;

  severity?: number | string;

  confidence?: number;

  second_prediction?: string;
  second_confidence?: number;

  title?: string;
  description?: string;
  summary?: string;

  source?: string;
  isRelevant?: boolean;
  is_relevant?: boolean;

  detail?: string | BackendValidationError[];
  message?: string;
}

/* ============================================================
   ERROR NORMALIZATION
   ============================================================ */

/**
 * FastAPI validation errors can be:
 *
 * {
 *   "detail": [
 *     {
 *       "type": "...",
 *       "loc": ["body", "title"],
 *       "msg": "..."
 *     }
 *   ]
 * }
 *
 * Never return the raw object to React.
 */
function getErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (!data) {
    return fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (
    typeof data === "object" &&
    data !== null
  ) {
    const value = data as {
      detail?: unknown;
      message?: unknown;
      error?: unknown;
    };

    if (typeof value.message === "string") {
      return value.message;
    }

    if (typeof value.error === "string") {
      return value.error;
    }

    if (typeof value.detail === "string") {
      return value.detail;
    }

    if (Array.isArray(value.detail)) {
      const messages = value.detail
        .map((item) => {
          if (
            typeof item === "string"
          ) {
            return item;
          }

          if (
            typeof item === "object" &&
            item !== null
          ) {
            const error =
              item as BackendValidationError;

            const location =
              error.loc
                ?.filter(
                  (part) =>
                    part !== "body"
                )
                .join(" → ");

            if (
              error.msg &&
              location
            ) {
              return `${location}: ${error.msg}`;
            }

            return (
              error.msg ||
              "Validation error"
            );
          }

          return "Validation error";
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join("\n");
      }
    }
  }

  return fallback;
}

/* ============================================================
   SEVERITY
   Backend / ML:
      1 = low
      2 = moderate
      3 = high
      4 = critical

   Frontend:
      "low"
      "moderate"
      "high"
      "critical"
   ============================================================ */

function normalizeSeverity(
  value: number | string | undefined
): WaterReport["severity"] {
  if (typeof value === "string") {
    const normalized =
      value.toLowerCase().trim();

    if (
      normalized === "low" ||
      normalized === "moderate" ||
      normalized === "high" ||
      normalized === "critical"
    ) {
      return normalized;
    }

    const numeric =
      Number(normalized);

    if (!Number.isNaN(numeric)) {
      return normalizeSeverity(
        numeric
      );
    }

    return "low";
  }

  const severity =
    Number(value ?? 1);

  if (severity >= 4) {
    return "critical";
  }

  if (severity >= 3) {
    return "high";
  }

  if (severity >= 2) {
    return "moderate";
  }

  return "low";
}

/* ============================================================
   IMAGE VALIDATION
   ============================================================ */

function validateImage(
  file: File
): void {
  if (!file) {
    throw new Error(
      "No image selected."
    );
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (
    !allowedTypes.includes(
      file.type
    )
  ) {
    throw new Error(
      "Only JPG, PNG and WEBP images are allowed."
    );
  }

  const MAX_FILE_SIZE =
    10 * 1024 * 1024;

  if (
    file.size > MAX_FILE_SIZE
  ) {
    throw new Error(
      "Image size must be less than 10 MB."
    );
  }
}

/* ============================================================
   ANALYZE WATER MEDIA
   IMPORTANT:
   Frontend calls BACKEND.
   Backend decides:
      ML
      ↓
      confidence threshold
      ↓
      Gemini fallback if needed
      ↓
      final result
   ============================================================ */

export async function analyzeWaterMedia(
  file: File,
  problemType?: string,
  description?: string
): Promise<WaterMediaAnalysis> {
  validateImage(file);

  const formData =
    new FormData();

  formData.append(
    "image",
    file
  );

  /*
   * These are optional.
   * Backend can still perform AI detection
   * without them.
   */
  if (problemType) {
    formData.append(
      "claimedHazard",
      problemType
    );
  }

  if (description?.trim()) {
    formData.append(
      "description",
      description.trim()
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/reports/analyze`,
      {
        method: "POST",
        body: formData,
      }
    );
  } catch {
    throw new Error(
      "Unable to connect to CoastalEye backend."
    );
  }

  let data:
    | BackendAnalysisResponse
    | null = null;

  try {
    data =
      (await response.json()) as BackendAnalysisResponse;
  } catch {
    throw new Error(
      "Backend returned an invalid analysis response."
    );
  }

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        `AI analysis failed (${response.status}).`
      )
    );
  }

  const hazard =
    data.hazard_type ||
    data.category ||
    "other";

  const confidence =
    Number(
      data.confidence ?? 0
    );

  const severity =
    normalizeSeverity(
      data.severity
    );

  const generatedTitle =
    data.title?.trim() ||
    "";

  const generatedDescription =
    data.description?.trim() ||
    data.summary?.trim() ||
    "";

  return {
    detectedIssue: hazard,

    confidence,

    severity,

    summary:
      generatedDescription ||
      `Detected ${hazard} with ${Math.round(
        confidence * 100
      )}% confidence.`,

    title:
      generatedTitle ||
      "",

    description:
      generatedDescription ||
      "",

    source:
      data.source,

    isRelevant:
      data.isRelevant ??
      data.is_relevant,
  };
}

/* ============================================================
   CATEGORY LABEL
   ============================================================ */

function getCategoryLabel(
  category: string
): string {
  const value =
    category?.toLowerCase().trim() ||
    "";

  switch (value) {
    case "flooding":
    case "urban_flooding":
      return "Urban Flooding";

    case "waterlogging":
      return "Waterlogging";

    case "drainage_problem":
      return "Drainage Problem";

    case "pond_lake_problem":
    case "pond_lake_issue":
      return "Pond / Lake Issue";

    case "water_quality_pollution":
      return "Water Quality / Pollution";

    default:
      return "Other Water Problem";
  }
}

/* ============================================================
   PROBLEM TYPE
   ============================================================ */

function getProblemType(
  category: string
): WaterReport["problemType"] {
  const value =
    category?.toLowerCase().trim() ||
    "";

  switch (value) {
    case "flooding":
    case "urban_flooding":
      return "urban_flooding";

    case "waterlogging":
      return "waterlogging";

    case "drainage_problem":
      return "drainage_problem";

    case "pond_lake_problem":
    case "pond_lake_issue":
      return "pond_lake_issue";

    case "water_quality_pollution":
      return "water_quality_pollution";

    default:
      return "other";
  }
}

/* ============================================================
   IMAGE URL
   ============================================================ */

function getImageUrl(
  imageUrl?: string
): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  if (
    imageUrl.startsWith(
      "http://"
    ) ||
    imageUrl.startsWith(
      "https://"
    )
  ) {
    return imageUrl;
  }

  return `${API_BASE_URL}${imageUrl}`;
}

/* ============================================================
   BACKEND -> FRONTEND
   ============================================================ */

function convertBackendReport(
  report: BackendReport
): WaterReport {
  const id =
    report.id ||
    report.report_id ||
    crypto.randomUUID();

  const category =
    report.hazard_type ||
    report.category ||
    report.mlAnalysis?.category ||
    "other";

  const problemType =
    getProblemType(category);

  const createdAt =
    report.createdAt ||
    new Date().toISOString();

  const updatedAt =
    report.updatedAt ||
    createdAt;

  const severity =
    normalizeSeverity(
      report.severity ??
        report.mlAnalysis?.severity
    );

  const latitude =
    report.location?.latitude ??
    report.location?.lat ??
    report.latitude ??
    0;

  const longitude =
    report.location?.longitude ??
    report.location?.lng ??
    report.longitude ??
    0;

  const imageUrl =
    getImageUrl(
      report.imageUrl ||
        report.image_url
    );

  const verificationStatus =
    report.verification?.status;

  const isVerified =
    verificationStatus ===
      "approved" ||
    verificationStatus ===
      "verified";

  const verificationState =
    verificationStatus ===
    "rejected"
      ? "rejected"
      : isVerified
        ? "verified"
        : "pending";

  const reportDescription =
    report.description ||
    report.content ||
    "Water-related problem reported.";

  const aiAnalysis:
    AIAnalysisReportData = {
    detectedIssue:
      report.mlAnalysis?.category ||
      report.hazard_type ||
      report.category ||
      "Unknown",

    confidence:
      report.mlAnalysis
        ?.confidence ??
      report.aiAnalysis
        ?.confidence ??
      0,

    severity,

    summary:
      report.aiAnalysis
        ?.summary ||
      reportDescription,

    analyzedAt:
      report.aiAnalysis
        ?.analyzedAt ||
      createdAt,
  };

  return {
    id,

    problemType,

    categoryLabel:
      getCategoryLabel(
        category
      ),

    description:
      reportDescription,

    location: {
      coords: {
        lat: latitude,
        lng: longitude,
      },

      address:
        report.location
          ?.address,

      placeName:
        report.location
          ?.placeName,

      landmark:
        report.location
          ?.landmark,

      mode: "automatic",
    },

    media: imageUrl
      ? [
          {
            id: `${id}-image`,
            name: "Report image",
            type: "image",
            url: imageUrl,
          },
        ]
      : [],

    severity,

    status:
      "under_verification",

    createdAt,

    updatedAt,

    aiAnalysis,

    verification: {
      isVerified,

      status:
        verificationState,

      verifiedBy:
        report.verification
          ?.verifiedBy ||
        undefined,

      verifiedAt:
        report.verification
          ?.verifiedAt ||
        undefined,
    },

    timeline: [
      {
        status: "submitted",

        label: "Submitted",

        title:
          "Report Submitted",

        description:
          "Your water-related hazard report was submitted.",

        timestamp: createdAt,

        completed: true,

        current: !isVerified,
      },
    ],
  };
}

/* ============================================================
   SUBMIT REPORT
   Backend endpoint:
      POST /reports/
   ============================================================ */

export async function submitWaterReport(
  draft: SubmitReportDraft & {
    title?: string;
  }
): Promise<ReportSubmissionResponse> {
  if (!draft.problemType) {
    return {
      success: false,
      error:
        "Please select a water problem type.",
    };
  }

  if (!draft.location?.coords) {
    return {
      success: false,
      error:
        "Location is required.",
    };
  }

  if (
    !draft.mediaFiles ||
    draft.mediaFiles.length === 0
  ) {
    return {
      success: false,
      error:
        "Please upload an image.",
    };
  }

  const image =
    draft.mediaFiles[0];

  try {
    validateImage(image);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Invalid image.",
    };
  }

  const formData =
    new FormData();

  /*
   * Backend accepts these as optional.
   * If empty, backend generates them.
   */
  formData.append(
    "title",
    draft.title?.trim() || ""
  );

  formData.append(
    "description",
    draft.description?.trim() || ""
  );

  /*
   * IMPORTANT:
   * Backend expects claimedHazard,
   * not category.
   */
  formData.append(
    "claimedHazard",
    draft.problemType
  );

  formData.append(
    "latitude",
    String(
      draft.location.coords.lat
    )
  );

  formData.append(
    "longitude",
    String(
      draft.location.coords.lng
    )
  );

  /*
   * The backend's primary image field
   * is "image".
   */
  formData.append(
    "image",
    image
  );

  /*
   * Optional location information.
   */
  if (
    draft.location.address
  ) {
    formData.append(
      "address",
      draft.location.address
    );
  }

  if (
    draft.location.placeName
  ) {
    formData.append(
      "placeName",
      draft.location.placeName
    );
  }

  if (
    draft.location.landmark
  ) {
    formData.append(
      "landmark",
      draft.location.landmark
    );
  }

  if (draft.contactName) {
    formData.append(
      "contactName",
      draft.contactName
    );
  }

  if (draft.contactPhone) {
    formData.append(
      "contactPhone",
      draft.contactPhone
    );
  }

  /*
   * Severity is optional because backend
   * can determine it from ML.
   */
  if (draft.severity) {
    formData.append(
      "severity",
      draft.severity
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/reports/`,
      {
        method: "POST",
        body: formData,
      }
    );
  } catch (error) {
    console.error(
      "Report submission network error:",
      error
    );

    return {
      success: false,
      error:
        "Unable to connect to CoastalEye backend.",
    };
  }

  let data:
    | (BackendReport & {
        success?: boolean;
        message?: string;
        detail?: unknown;
        reportId?: string;
        report?: BackendReport;
        status?: string;
      })
    | null = null;

  try {
    data =
      await response.json();
  } catch {
    return {
      success: false,
      error:
        "Backend returned an invalid response.",
    };
  }

  if (!response.ok) {
    return {
      success: false,

      error:
        getErrorMessage(
          data,
          `Report submission failed (${response.status}).`
        ),

      status:
        data?.status,
    };
  }

  const backendReport =
    data?.report ||
    data;

  const report =
    backendReport &&
    (
      backendReport.id ||
      backendReport.report_id ||
      data?.reportId
    )
      ? convertBackendReport(
          backendReport
        )
      : undefined;

  return {
    success: true,

    report,

    reportId:
      data?.reportId ||
      report?.id,

    message:
      data?.message ||
      "Report submitted successfully.",

    status:
      data?.status ||
      "submitted",
  };
}

/* ============================================================
   ALIAS USED BY App.tsx
   ============================================================ */

export const submitReport =
  submitWaterReport;

/* ============================================================
   GET ALL REPORTS
   ============================================================ */

export async function getAllWaterReports(): Promise<
  WaterReport[]
> {
  const response =
    await fetch(
      `${API_BASE_URL}/reports/`
    );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch reports (${response.status})`
    );
  }

  const data =
    await response.json();

  const reports =
    Array.isArray(data)
      ? data
      : data.reports || [];

  return reports.map(
    (report: BackendReport) =>
      convertBackendReport(
        report
      )
  );
}

/* ============================================================
   GET REPORT BY ID
   ============================================================ */

export async function getReportById(
  reportId: string
): Promise<WaterReport | null> {
  const response =
    await fetch(
      `${API_BASE_URL}/reports/${reportId}`
    );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch report (${response.status})`
    );
  }

  const data =
    await response.json();

  return convertBackendReport(
    data.report || data
  );
}

/* ============================================================
   RANKED REPORTS
   ============================================================ */

export async function getRankedReports(): Promise<
  WaterReport[]
> {
  const response =
    await fetch(
      `${API_BASE_URL}/reports/ranked`
    );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ranked reports (${response.status})`
    );
  }

  const data =
    await response.json();

  const reports =
    Array.isArray(data)
      ? data
      : data.reports || [];

  return reports.map(
    (report: BackendReport) =>
      convertBackendReport(
        report
      )
  );
}

/* ============================================================
   GOVERNMENT ACTIONS
   ============================================================ */

export async function assignReportDepartment(
  reportId: string,
  department: string
) {
  const response =
    await fetch(
      `${API_BASE_URL}/reports/${reportId}/department`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          department,
        }),
      }
    );

  if (!response.ok) {
    throw new Error(
      `Failed to assign department (${response.status})`
    );
  }

  return response.json();
}

export async function updateGovStatus(
  reportId: string,
  status: string
) {
  const response =
    await fetch(
      `${API_BASE_URL}/reports/${reportId}/status`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          status,
        }),
      }
    );

  if (!response.ok) {
    throw new Error(
      `Failed to update report status (${response.status})`
    );
  }

  return response.json();
}

export async function updateReportSeverity(
  reportId: string,
  severity: WaterReport["severity"]
) {
  const response =
    await fetch(
      `${API_BASE_URL}/reports/${reportId}/severity`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          severity,
        }),
      }
    );

  if (!response.ok) {
    throw new Error(
      `Failed to update severity (${response.status})`
    );
  }

  return response.json();
}

/* ============================================================
   HOTSPOTS
   ============================================================ */

export interface Hotspot {
  cluster_id: number;

  hazard_type: string;

  report_count: number;

  center: {
    latitude: number;
    longitude: number;
  };

  report_ids: string[];

  level:
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";
}

export async function getHotspots(): Promise<
  Hotspot[]
> {
  const response =
    await fetch(
      `${API_BASE_URL}/reports/hotspots`
    );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch hotspots (${response.status})`
    );
  }

  const data =
    await response.json();

  return data.hotspots || [];
}