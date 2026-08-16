// src/services/reportService.ts
// Service layer for submitting and tracking water hazard and disaster reports.
// Abstracted cleanly so mock/local storage implementation can seamlessly connect to backend API.

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
  WaterReportStatus,
  AIAnalysisReportData,
  Department,
  GovReportStatus,
} from "../types/report";
import { WATER_PROBLEM_CATEGORIES } from "../types/report";
import { generateReportId, formatReportId } from "../utils/reportId";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const STORAGE_KEY_REPORTS = "coastaleye_water_reports_db";

// Pre-seeded realistic reports for immediate search and demonstration
const SEED_REPORTS: WaterReport[] = [
  {
    id: "WR-2026-8F4K29",
    problemType: "urban_flooding",
    categoryLabel: "Urban Flooding",
    description:
      "Severe water accumulation along VIP Road and Beach Boulevard following continuous tidal surge. Road is impassable for small vehicles.",
    location: {
      coords: { lat: 19.7983, lng: 85.8249 },
      address: "VIP Road, Near Sea Beach, Puri, Odisha 752001",
      placeName: "VIP Road Coastal Zone",
      landmark: "Opposite Lighthouse Junction",
      mode: "automatic",
    },
    media: [
      {
        id: "media-1",
        name: "vip_road_flooding.jpg",
        type: "image",
        url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
      },
    ],
    severity: "high",
    status: "under_verification",
    createdAt: "2026-08-14T09:30:00.000Z",
    updatedAt: "2026-08-14T11:15:00.000Z",
    aiAnalysis: {
      detectedIssue: "Urban Flooding",
      confidence: 0.91,
      severity: "high",
      summary:
        "Significant water accumulation detected on the roadway. Depth estimated between 1.5 to 2.2 feet with high velocity runoff.",
      analyzedAt: "2026-08-14T09:31:30.000Z",
      detectedObjects: ["Submerged Roadway", "Standing Water", "Traffic Obstruction"],
      recommendedAction: "Dispatch emergency drainage pump unit and issue local traffic diversion.",
    },
    verification: {
      isVerified: true,
      status: "verified",
      agency: "Puri Municipal Corporation - Disaster Cell",
      verifiedBy: "Officer Rajesh Mohanty (Disaster Response Unit #4)",
      verifiedAt: "2026-08-14T11:15:00.000Z",
      officerNotes:
        "Field inspection confirmed 1.8ft waterlogging. High-capacity suction pump unit #03 deployed on site.",
    },
    timeline: [
      {
        status: "submitted",
        label: "Submitted",
        title: "Report Submitted",
        description: "Citizen report logged with evidence and geolocation.",
        timestamp: "2026-08-14T09:30:00.000Z",
        completed: true,
        current: false,
      },
      {
        status: "ai_analysis",
        label: "AI Analysis",
        title: "AI Analysis Completed",
        description: "Automated vision model confirmed Urban Flooding (91% confidence, High severity).",
        timestamp: "2026-08-14T09:31:30.000Z",
        completed: true,
        current: false,
      },
      {
        status: "under_verification",
        label: "Under Verification",
        title: "Government Field Verification",
        description: "Verified by Puri Municipal Corporation. Relief and suction pump team dispatched.",
        timestamp: "2026-08-14T11:15:00.000Z",
        completed: true,
        current: true,
      },
      {
        status: "resolved",
        label: "Resolved",
        title: "Resolution & Clearance",
        description: "Water cleared and road opened for normal traffic.",
        timestamp: "",
        completed: false,
        current: false,
      },
    ],
    contactName: "Sanjib Patnaik",
    contactPhone: "+91 98765 43210",
  },
  {
    id: "WR-2026-7A3B12",
    problemType: "drainage_problem",
    categoryLabel: "Drainage Problem",
    description:
      "Main stormwater drain overflowing near Grand Road market square. Solid waste blockage preventing discharge.",
    location: {
      coords: { lat: 19.8135, lng: 85.8312 },
      address: "Grand Road, Badadanda Market, Puri, Odisha 752002",
      placeName: "Grand Road Market Square",
      mode: "manual",
    },
    media: [
      {
        id: "media-2",
        name: "drain_clog.jpg",
        type: "image",
        url: "https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=800&q=80",
      },
    ],
    severity: "moderate",
    status: "ai_analysis",
    createdAt: "2026-08-14T13:10:00.000Z",
    updatedAt: "2026-08-14T13:12:00.000Z",
    aiAnalysis: {
      detectedIssue: "Drainage Problem / Culvert Blockage",
      confidence: 0.88,
      severity: "moderate",
      summary:
        "Severe culvert choking detected with municipal runoff backflow into pedestrian zone.",
      analyzedAt: "2026-08-14T13:12:00.000Z",
      detectedObjects: ["Clogged Drain Grate", "Surface Runoff"],
      recommendedAction: "Desiltation crew required.",
    },
    verification: {
      isVerified: false,
      status: "pending",
      agency: "Public Health Engineering Dept (PHED)",
    },
    timeline: [
      {
        status: "submitted",
        label: "Submitted",
        title: "Report Submitted",
        description: "Citizen report logged with evidence and geolocation.",
        timestamp: "2026-08-14T13:10:00.000Z",
        completed: true,
        current: false,
      },
      {
        status: "ai_analysis",
        label: "AI Analysis",
        title: "AI Analysis Completed",
        description: "Preliminary assessment generated. Awaiting municipal officer review.",
        timestamp: "2026-08-14T13:12:00.000Z",
        completed: true,
        current: true,
      },
      {
        status: "under_verification",
        label: "Under Verification",
        title: "Field Officer Assigned",
        description: "Municipal engineering team assigned for on-site inspection.",
        timestamp: "",
        completed: false,
        current: false,
      },
      {
        status: "resolved",
        label: "Resolved",
        title: "Cleared and Restored",
        description: "Blockage cleared and drainage capacity restored.",
        timestamp: "",
        completed: false,
        current: false,
      },
    ],
  },
  {
    id: "WR-2026-9C5D44",
    problemType: "water_quality_pollution",
    categoryLabel: "Water Quality / Pollution",
    description:
      "Discolored brownish water supply reported from municipal tap in Balia Ward #12.",
    location: {
      coords: { lat: 19.805, lng: 85.818 },
      address: "Balia Ward 12, Puri, Odisha",
      placeName: "Balia Colony",
      mode: "manual",
    },
    media: [
      {
        id: "media-3",
        name: "water_sample.jpg",
        type: "image",
        url: "https://images.unsplash.com/photo-1527066579998-dbbae57f45ce?auto=format&fit=crop&w=800&q=80",
      },
    ],
    severity: "high",
    status: "resolved",
    createdAt: "2026-08-13T10:00:00.000Z",
    updatedAt: "2026-08-14T08:00:00.000Z",
    aiAnalysis: {
      detectedIssue: "Water Quality / Turbidity Contamination",
      confidence: 0.94,
      severity: "high",
      summary:
        "High turbidity and organic matter discoloration detected in domestic water sample.",
      analyzedAt: "2026-08-13T10:01:20.000Z",
    },
    verification: {
      isVerified: true,
      status: "verified",
      agency: "Water Testing & Supply Board, Puri",
      verifiedBy: "Dr. A. Das (Chief Chemist)",
      verifiedAt: "2026-08-13T14:30:00.000Z",
      officerNotes:
        "Pipeline rupture at Sector 4 repaired. Chlorination and water safety tested normal.",
    },
    timeline: [
      {
        status: "submitted",
        label: "Submitted",
        title: "Report Submitted",
        description: "Contamination report received from resident.",
        timestamp: "2026-08-13T10:00:00.000Z",
        completed: true,
        current: false,
      },
      {
        status: "ai_analysis",
        label: "AI Analysis",
        title: "AI Quality Scan",
        description: "Turbidity flags marked as High priority.",
        timestamp: "2026-08-13T10:01:20.000Z",
        completed: true,
        current: false,
      },
      {
        status: "under_verification",
        label: "Under Verification",
        title: "Water Sample Tested",
        description: "Pipeline rupture identified and isolated for repair.",
        timestamp: "2026-08-13T14:30:00.000Z",
        completed: true,
        current: false,
      },
      {
        status: "resolved",
        label: "Resolved",
        title: "Issue Resolved",
        description: "Supply flushed and verified clean by municipal laboratory.",
        timestamp: "2026-08-14T08:00:00.000Z",
        completed: true,
        current: true,
      },
    ],
  },
];

function getStoredReports(): WaterReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(SEED_REPORTS));
      return SEED_REPORTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_REPORTS;
  } catch {
    return SEED_REPORTS;
  }
}

function saveStoredReports(reports: WaterReport[]) {
  try {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
  } catch (err) {
    console.warn("Failed to persist reports to localStorage:", err);
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
 * Submits a new water report. Generates a unique Report ID (e.g. WR-2026-8F4K29),
 * generates AI analysis preview, creates initial timeline, and persists report.
 */
export async function submitWaterReport(
  draft: SubmitReportDraft
): Promise<{ success: boolean; report: WaterReport }> {
  await delay(900); // Simulate network request

  const reportId = generateReportId();
  const category =
    WATER_PROBLEM_CATEGORIES.find((c) => c.id === draft.problemType) ||
    WATER_PROBLEM_CATEGORIES[0];

  const now = new Date().toISOString();

  // Create initial AI Analysis
  const aiAnalysis: AIAnalysisReportData = {
    detectedIssue: category.label,
    confidence: 0.91,
    severity: draft.severity || "high",
    summary: `Visual and contextual report indicates ${category.label.toLowerCase()} requiring municipal assessment.`,
    analyzedAt: now,
    detectedObjects: [category.label, "Urban Zone"],
    recommendedAction: "Forwarded to disaster response control center.",
  };

  const initialTimeline: WaterReport["timeline"] = [
    {
      status: "submitted",
      label: "Submitted",
      title: "Report Submitted",
      description: "Citizen water report logged with evidence and location coordinates.",
      timestamp: now,
      completed: true,
      current: false,
    },
    {
      status: "ai_analysis",
      label: "AI Analysis",
      title: "AI Analysis Generated",
      description: `Automated analysis categorized as ${category.label} (${Math.round(aiAnalysis.confidence * 100)}% confidence).`,
      timestamp: now,
      completed: true,
      current: true,
    },
    {
      status: "under_verification",
      label: "Under Verification",
      title: "Municipal Desk Review",
      description: "Assigned to regional flood monitoring and response desk.",
      timestamp: "",
      completed: false,
      current: false,
    },
    {
      status: "resolved",
      label: "Resolved",
      title: "Field Action Completed",
      description: "Municipal team resolved issue on site.",
      timestamp: "",
      completed: false,
      current: false,
    },
  ];

  const newReport: WaterReport = {
    id: reportId,
    problemType: draft.problemType,
    categoryLabel: category.label,
    description: draft.description,
    location: draft.location,
    media: draft.mediaPreviews,
    severity: draft.severity || "high",
    status: "ai_analysis" as WaterReportStatus,
    createdAt: now,
    updatedAt: now,
    aiAnalysis,
    verification: {
      isVerified: false,
      status: "pending",
      agency: "Puri Disaster & Water Management Authority",
    },
    timeline: initialTimeline,
    contactName: draft.contactName,
    contactPhone: draft.contactPhone,
  };

  // Save to database
  const reports = getStoredReports();
  reports.unshift(newReport);
  saveStoredReports(reports);

  return {
    success: true,
    report: newReport,
  };
}

/**
 * Retrieves a report by its Report ID (supports case-insensitive lookup).
 */
export async function getReportById(id: string): Promise<WaterReport | null> {
  await delay(400); // Simulate API latency
  if (!id) return null;

  const normalized = formatReportId(id);
  const reports = getStoredReports();

  const found = reports.find(
    (r) => formatReportId(r.id) === normalized
  );

  return found || null;
}

/**
 * Returns all active water reports.
 */
export async function getAllWaterReports(): Promise<WaterReport[]> {
  await delay(300);
  return getStoredReports();
}

// ─── Legacy / Hazard compatibility functions ─────────────────────────────────

const HAZARD_KEYWORDS: Array<{ match: RegExp; type: HazardType; severity: Severity }> = [
  { match: /tsunami|tidal wave/i, type: "tsunami", severity: "critical" },
  { match: /surge/i, type: "storm_surge", severity: "high" },
  { match: /flood|water.?logg|inundat/i, type: "flood", severity: "high" },
  { match: /wave|swell/i, type: "high_waves", severity: "moderate" },
  { match: /erosion|receding shore/i, type: "coastal_erosion", severity: "moderate" },
  { match: /damage|debris|collapsed|broken/i, type: "coastal_damage", severity: "moderate" },
];

export async function analyzeMedia(
  file: File,
  captionHint?: string
): Promise<AIAnalysisResult> {
  await delay(1200);

  const text = `${file.name} ${captionHint ?? ""}`;
  const matched = HAZARD_KEYWORDS.find((k) => k.match.test(text));

  if (matched) {
    return {
      suggestedType: matched.type,
      suggestedSeverity: matched.severity,
      suggestedDescription: `Possible ${matched.type.replace("_", " ")} detected from uploaded media. Water/debris patterns suggest ${matched.severity} severity — please confirm or edit before submitting.`,
      confidence: 0.72 + Math.random() * 0.2,
    };
  }

  return {
    suggestedType: "other",
    suggestedSeverity: "moderate",
    suggestedDescription:
      "Uploaded media reviewed — hazard type unclear from visuals alone. Please describe what you're seeing.",
    confidence: 0.75 + Math.random() * 0.15,
  };
}

// ─── Government action functions ─────────────────────────────────────────────

/**
 * Assigns a department to a report and sets govStatus to "assigned".
 */
export async function assignReportDepartment(
  id: string,
  department: Department
): Promise<boolean> {
  await delay(300);
  const reports = getStoredReports();
  const updated = reports.map((r) =>
    r.id === id
      ? {
          ...r,
          assignedDepartment: department,
          govStatus: "assigned" as GovReportStatus,
          assignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : r
  );
  saveStoredReports(updated);
  return true;
}

/**
 * Updates the government workflow status of a report.
 */
export async function updateGovStatus(
  id: string,
  govStatus: GovReportStatus
): Promise<boolean> {
  await delay(300);
  const reports = getStoredReports();
  const updated = reports.map((r) =>
    r.id === id
      ? { ...r, govStatus, updatedAt: new Date().toISOString() }
      : r
  );
  saveStoredReports(updated);
  return true;
}

/**
 * Updates the severity / priority of a report.
 */
export async function updateReportSeverity(
  id: string,
  severity: Severity
): Promise<boolean> {
  await delay(300);
  const reports = getStoredReports();
  const updated = reports.map((r) =>
    r.id === id
      ? { ...r, severity, updatedAt: new Date().toISOString() }
      : r
  );
  saveStoredReports(updated);
  return true;
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