


import type {
  HazardType,
  Severity,
  AIAnalysisResult,
  HazardReportDraft,
} from "../types/hazard";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const HAZARD_KEYWORDS: Array<{ match: RegExp; type: HazardType; severity: Severity }> = [
  { match: /tsunami|tidal wave/i, type: "tsunami", severity: "critical" },
  { match: /surge/i, type: "storm_surge", severity: "high" },
  { match: /flood|water.?logg|inundat/i, type: "flood", severity: "high" },
  { match: /wave|swell/i, type: "high_waves", severity: "moderate" },
  { match: /erosion|receding shore/i, type: "coastal_erosion", severity: "moderate" },
  { match: /damage|debris|collapsed|broken/i, type: "coastal_damage", severity: "moderate" },
];

/**
 * Mocked AI analysis of an uploaded photo/video + optional citizen caption.
 * Real implementation will call a vision model to detect hazard type,
 * estimate severity from visual cues, and return a confidence score.
 */
export async function analyzeMedia(
  file: File,
  captionHint?: string
): Promise<AIAnalysisResult> {
  await delay(1400); // simulate model inference latency

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
    confidence: 0.4 + Math.random() * 0.15,
  };
}

/** Mocked report submission. Returns the server-assigned report id on success. */
export async function submitReport(
  draft: HazardReportDraft
): Promise<{ success: boolean; reportId?: string }> {
  void draft;
  await delay(900);

  // Simulate an occasional transient failure so the offline-queue path is exercised.
  if (!navigator.onLine) {
    return { success: false };
  }

  return { success: true, reportId: `RPT-${Date.now().toString(36).toUpperCase()}` };
}