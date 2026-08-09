// src/pages/Citizen/ReportHazard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  MapPin,
  Navigation,
  CheckCircle2,
  WifiOff,
  Droplets,
  Waves,
  Wind,
  Mountain,
  AlertOctagon,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { SEVERITY_STYLES, HAZARD_LABELS } from "../../types/hazard";
import type {
  HazardType,
  Severity,
  HazardReportDraft,
  AIAnalysisResult,
} from "../../types/hazard";
import { useGeolocation } from "../../hooks/useGeolocation";
import { analyzeMedia, submitReport } from "../../services/reportService";
import {
  enqueueReport,
  fileToDataUrl,
  flushQueue,
  queueLength,
} from "../../utils/offlineQueue";

const HAZARD_ICONS: Record<HazardType, LucideIcon> = {
  flood: Droplets,
  tsunami: Waves,
  storm_surge: Wind,
  high_waves: Waves,
  coastal_erosion: Mountain,
  coastal_damage: AlertOctagon,
  other: HelpCircle,
};

const HAZARD_ORDER: HazardType[] = [
  "flood",
  "tsunami",
  "storm_surge",
  "high_waves",
  "coastal_erosion",
  "coastal_damage",
  "other",
];

const SEVERITY_ORDER: Severity[] = ["low", "moderate", "high", "critical"];

type SubmitState = "idle" | "submitting" | "success" | "queued" | "error";

const ReportHazard: React.FC = () => {
  const [hazardType, setHazardType] = useState<HazardType | null>(null);
  const [description, setDescription] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [severity, setSeverity] = useState<Severity | null>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(queueLength());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { coords, loading: locLoading, error: locError, request: requestLocation } =
    useGeolocation();

  // Track connectivity and flush any queued offline reports once we're back online.
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const { remaining } = await flushQueue(async (item) => {
        const draft = {
          type: item.draft.type ?? "other",
          description: item.draft.description ?? "",
          location: item.draft.location ?? { lat: 0, lng: 0 },
          severity: item.draft.severity ?? "moderate",
          mediaFile: null,
        };
        const res = await submitReport(draft);
        return res.success;
      });
      setPendingCount(remaining);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isValid = useMemo(
    () => Boolean(hazardType && description.trim().length >= 10 && severity && coords),
    [hazardType, description, severity, coords]
  );

  async function handleFileSelect(file: File) {
    setMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    setAiResult(null);
    setAiApplied(false);
    setAiLoading(true);

    try {
      const result = await analyzeMedia(file, description);
      setAiResult(result);
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiSuggestion() {
    if (!aiResult) return;
    setHazardType(aiResult.suggestedType);
    setSeverity(aiResult.suggestedSeverity);
    setDescription((prev) => (prev.trim() ? prev : aiResult.suggestedDescription));
    setAiApplied(true);
  }

  function clearMedia() {
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setAiResult(null);
    setAiApplied(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !coords) return;

    setSubmitState("submitting");

    const draft: HazardReportDraft = {
      type: hazardType,
      description: description.trim(),
      location: coords,
      placeName: placeName.trim() || undefined,
      severity,
      mediaFile,
    };

    if (!isOnline) {
      const mediaDataUrl = mediaFile ? await fileToDataUrl(mediaFile) : undefined;
      enqueueReport({
        localId: `local-${Date.now()}`,
        draft: { ...draft, mediaFile: undefined },
        mediaDataUrl,
        queuedAt: new Date().toISOString(),
      });
      setPendingCount(queueLength());
      setSubmitState("queued");
      return;
    }

    const res = await submitReport(draft);
    if (res.success) {
      setSubmittedId(res.reportId ?? null);
      setSubmitState("success");
    } else {
      // Fall back to the offline queue rather than losing the report.
      const mediaDataUrl = mediaFile ? await fileToDataUrl(mediaFile) : undefined;
      enqueueReport({
        localId: `local-${Date.now()}`,
        draft: { ...draft, mediaFile: undefined },
        mediaDataUrl,
        queuedAt: new Date().toISOString(),
      });
      setPendingCount(queueLength());
      setSubmitState("queued");
    }
  }

  function resetForm() {
    setHazardType(null);
    setDescription("");
    setPlaceName("");
    setSeverity(null);
    clearMedia();
    setSubmitState("idle");
    setSubmittedId(null);
  }

  // ---- Success / queued confirmation screens ----
  if (submitState === "success" || submitState === "queued") {
    const queued = submitState === "queued";
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            queued ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
          }`}
        >
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          {queued ? "Report saved — will sync automatically" : "Report submitted"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {queued
            ? "You're offline right now, so this report is stored on your device. It'll upload the moment you're back online — no need to resubmit."
            : "Thank you. Government officials will review and verify this report shortly."}
        </p>
        {submittedId && (
          <p className="mt-3 font-mono text-xs text-slate-400">Reference ID: {submittedId}</p>
        )}
        <button
          type="button"
          onClick={resetForm}
          className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Report another hazard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Report a Coastal Hazard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a photo or video if you can — our AI will suggest a hazard type and severity to
          speed up verification.
        </p>
      </header>

      {!isOnline && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <WifiOff className="h-4 w-4 shrink-0" />
          You're offline. Your report will be saved on this device and sent automatically once
          you reconnect.
        </div>
      )}
      {pendingCount > 0 && isOnline && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          Syncing {pendingCount} report{pendingCount === 1 ? "" : "s"} saved while offline…
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Media upload */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Photo or video <span className="font-normal text-slate-400">(recommended)</span>
          </label>

          {!mediaPreviewUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-100"
            >
              <Upload className="h-6 w-6" />
              <span className="text-sm font-medium">Tap to upload photo or video</span>
              <span className="text-xs text-slate-400">JPG, PNG, MP4 up to 25MB</span>
            </button>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-slate-200">
              {mediaFile?.type.startsWith("video") ? (
                <video src={mediaPreviewUrl} controls className="max-h-64 w-full object-cover" />
              ) : (
                <img src={mediaPreviewUrl} alt="Uploaded hazard evidence" className="max-h-64 w-full object-cover" />
              )}
              <button
                type="button"
                onClick={clearMedia}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {/* AI assist panel */}
          {(aiLoading || aiResult) && (
            <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                <Sparkles className="h-4 w-4" />
                AI Assist
              </div>
              {aiLoading ? (
                <p className="mt-1.5 flex items-center gap-2 text-xs text-indigo-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing media for hazard type and severity…
                </p>
              ) : aiResult ? (
                <div className="mt-1.5 space-y-2">
                  <p className="text-xs text-indigo-900">{aiResult.suggestedDescription}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-white px-2 py-0.5 font-medium text-indigo-700 border border-indigo-200">
                      {HAZARD_LABELS[aiResult.suggestedType]}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 font-medium text-white"
                      style={{ background: SEVERITY_STYLES[aiResult.suggestedSeverity].hex }}
                    >
                      {SEVERITY_STYLES[aiResult.suggestedSeverity].label} severity
                    </span>
                    <span className="font-mono text-indigo-400">
                      {Math.round(aiResult.confidence * 100)}% confidence
                    </span>
                  </div>
                  {!aiApplied && (
                    <button
                      type="button"
                      onClick={applyAiSuggestion}
                      className="mt-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                    >
                      Use this suggestion
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Hazard type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Hazard type</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {HAZARD_ORDER.map((type) => {
              const Icon = HAZARD_ICONS[type];
              const active = hazardType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setHazardType(type)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {HAZARD_LABELS[type]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="mb-2 block text-sm font-medium text-slate-700">
            What are you seeing?
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe water levels, damage, or anything that helps officials verify this report…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
          />
          <p className="mt-1 text-xs text-slate-400">{description.trim().length}/10 characters minimum</p>
        </div>

        {/* Severity */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Severity</label>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_ORDER.map((level) => {
              const s = SEVERITY_STYLES[level];
              const active = severity === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(level)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active ? `${s.border} ${s.bg} ${s.text}` : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
          {coords ? (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="flex items-center gap-2 font-mono text-xs text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
              <button
                type="button"
                onClick={requestLocation}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Refresh
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={requestLocation}
              disabled={locLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-60"
            >
              {locLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              {locLoading ? "Getting your location…" : "Use my current location"}
            </button>
          )}
          {locError && <p className="mt-1.5 text-xs text-red-500">{locError}</p>}

          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="Landmark or place name (optional)"
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
          />
        </div>

        <button
          type="submit"
          disabled={!isValid || submitState === "submitting"}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitState === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitState === "submitting" ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </div>
  );
};

export default ReportHazard;
