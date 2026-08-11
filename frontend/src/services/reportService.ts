import type {
  HazardType,
  Severity,
  AIAnalysisResult,
  HazardReportDraft,
} from "../types/hazard";

const API_BASE = "http://192.168.1.2:8000";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const HAZARD_KEYWORDS: Array<{
  match: RegExp;
  type: HazardType;
  severity: Severity;
}> = [
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
  try {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_BASE}/reports/analyze`, {
  method: "POST",
  body: formData,
});

    if (!res.ok) {
      throw new Error("Image analysis failed");
    }

    const data = await res.json();
return {
  title: data.title,
  suggestedType: data.hazard_type ,
  suggestedSeverity:
    data.severity >= 5
      ? "critical"
      : data.severity >= 4
      ? "high"
      : data.severity >= 2
      ? "moderate"
      : "low",
  suggestedDescription:
    data.description ??
    captionHint ??
    "Uploaded media reviewed. Please verify before submitting.",
  confidence: data.confidence,
};
  } catch (error) {
    console.error("Error analyzing media:", error);

    await delay(500);

    const text = `${file.name} ${captionHint ?? ""}`;
    const matched = HAZARD_KEYWORDS.find((k) => k.match.test(text));

    if (matched) {
      return {
        suggestedType: matched.type,
        suggestedSeverity: matched.severity,
        suggestedDescription: `Possible ${matched.type.replace(
          "_",
          " "
        )} detected from uploaded media. Water/debris patterns suggest ${matched.severity} severity — please confirm or edit before submitting.`,
        confidence: 0.7,
      };
    }

    return {
      suggestedType: "other",
      suggestedSeverity: "moderate",
      suggestedDescription:
        "Uploaded media reviewed — hazard type unclear from visuals alone. Please describe what you're seeing.",
      confidence: 0.5,
    };
  }
}

export async function submitReport(
  draft: HazardReportDraft
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const formData = new FormData();

    formData.append("title", draft.title || "Citizen Report");
    formData.append("description", draft.description);
    formData.append("latitude", String(draft.latitude));
    formData.append("longitude", String(draft.longitude));
    formData.append("claimedHazard", draft.hazardType || draft.type || "other");

    const imageFile = draft.file || draft.mediaFile;
    if (imageFile) {
      formData.append("image", imageFile);
    }

    const res = await fetch(`${API_BASE}/reports/`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      let message = "Failed to submit report.";

      switch (data.detail) {
        case "DUPLICATE_IMAGE":
          message = "This image is already reported. Please do not submit duplicate reports.";
          break;

        case "NOT_RELEVANT_IMAGE":
          message = "This image is not related to a disaster or coastal hazard.";
          break;

        case "CLAIM_MISMATCH":
          message = `The uploaded image appears to be '${data.detectedHazard}', not '${data.claimedHazard}'. Please review the report.`;
          break;

        default:
          if (typeof data.detail === "string") {
            message = data.detail;
          }
      }

      return { success: false, error: message };
    }

    return {
      success: true,
      reportId: data.reportId || data.report_id || data.id,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: "Unable to connect to the server. Please try again.",
    };
  }
}