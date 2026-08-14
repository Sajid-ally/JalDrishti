// src/pages/Citizen/ReportHazard.tsx
// Citizen Submit Report page for water hazard and disaster incidents.
// Features step-by-step mobile-friendly reporting, camera capture, multi-media preview,
// automatic GPS & manual location selection, problem categories, AI assist preview,
// and confirmation with unique Report ID generation & tracking link.

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Camera,
  X,
  MapPin,
  Navigation,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Droplets,
  Waves,
  Pipette,
  CircleDot,
  AlertTriangle,
  HelpCircle,
  Search,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

import { WATER_PROBLEM_CATEGORIES } from "../../types/report";
import type {
  WaterProblemType,
  SubmitReportDraft,
  UploadedMediaItem,
  ReportLocation,
} from "../../types/report";
import type { Severity } from "../../types/hazard";
import { SEVERITY_STYLES } from "../../types/hazard";
import { useGeolocation } from "../../hooks/useGeolocation";
import { submitWaterReport, analyzeWaterMedia } from "../../services/reportService";

// Category icon mapper
const CATEGORY_ICONS: Record<WaterProblemType, React.ReactNode> = {
  urban_flooding: <Waves className="h-6 w-6 text-blue-600" />,
  waterlogging: <Droplets className="h-6 w-6 text-cyan-600" />,
  drainage_problem: <Pipette className="h-6 w-6 text-teal-600" />,
  pond_lake_issue: <CircleDot className="h-6 w-6 text-emerald-600" />,
  water_quality_pollution: <AlertTriangle className="h-6 w-6 text-amber-600" />,
  other: <HelpCircle className="h-6 w-6 text-slate-600" />,
};

// Preset Puri coastal locations for quick manual selection
const PRESET_LOCATIONS = [
  {
    name: "VIP Road / Sea Beach, Puri",
    lat: 19.7983,
    lng: 85.8249,
    landmark: "Near Light House",
  },
  {
    name: "Grand Road / Badadanda Market",
    lat: 19.8135,
    lng: 85.8312,
    landmark: "Opposite Town Hall",
  },
  {
    name: "Chakratirtha Road (CT Road)",
    lat: 19.8052,
    lng: 85.8451,
    landmark: "Near Coastal Fishery Dock",
  },
  {
    name: "Swargadwar Beach Zone",
    lat: 19.7924,
    lng: 85.8172,
    landmark: "Beach Front Promenade",
  },
  {
    name: "Balia / Atharanala Drainage Canal",
    lat: 19.824,
    lng: 85.819,
    landmark: "Atharanala Bridge",
  },
];

type StepNumber = 1 | 2 | 3 | 4 | 5;

export default function ReportHazard() {
  const navigate = useNavigate();

  // Current active step (1 to 5)
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);

  // Form states
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<UploadedMediaItem[]>([]);
  const [problemType, setProblemType] = useState<WaterProblemType | null>(null);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("high");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Location state
  const [locationMode, setLocationMode] = useState<"automatic" | "manual">("automatic");
  const [manualAddress, setManualAddress] = useState("");
  const [manualLandmark, setManualLandmark] = useState("");
  const [manualCoords, setManualCoordsState] = useState<{ lat: number; lng: number } | null>(null);

  // AI Assist preview state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    detectedIssue: string;
    confidence: number;
    severity: Severity;
    summary: string;
  } | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  // Submission & Result state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Geolocation hook
  const { coords: autoCoords, loading: geoLoading, error: geoError, request: requestGeo } =
    useGeolocation();

  // Trigger geolocation on mount or when switching to automatic mode
  useEffect(() => {
    if (locationMode === "automatic" && !autoCoords && !geoLoading) {
      requestGeo();
    }
  }, [locationMode]);

  // Derived effective location
  const effectiveLocation: ReportLocation | null = useMemo(() => {
    if (locationMode === "automatic" && autoCoords) {
      return {
        coords: autoCoords,
        address: "Puri Coastal Zone (GPS Auto-Detected)",
        placeName: "Current GPS Location",
        landmark: "Detected via Device Sensor",
        mode: "automatic",
      };
    }

    if (locationMode === "manual" && (manualCoords || manualAddress.trim())) {
      return {
        coords: manualCoords || { lat: 19.8135, lng: 85.8312 },
        address: manualAddress.trim() || "Manual Selected Area, Puri",
        placeName: manualAddress.trim() || "Puri District",
        landmark: manualLandmark.trim() || undefined,
        mode: "manual",
      };
    }

    return null;
  }, [locationMode, autoCoords, manualCoords, manualAddress, manualLandmark]);

  // Handle media selection (File upload or camera capture)
  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...mediaFiles, ...files];
    setMediaFiles(newFiles);

    const newPreviews: UploadedMediaItem[] = files.map((file, idx) => ({
      id: `media-${Date.now()}-${idx}`,
      name: file.name,
      type: file.type.startsWith("video") ? "video" : "image",
      url: URL.createObjectURL(file),
      size: file.size,
    }));

    setMediaPreviews((prev) => [...prev, ...newPreviews]);

    // Run AI Assist on first media item
    if (files[0]) {
      setAiLoading(true);
      setAiSuggestion(null);
      setAiApplied(false);
      try {
        const aiRes = await analyzeWaterMedia(files[0], problemType || undefined, description);
        setAiSuggestion(aiRes);
      } catch (err) {
        console.warn("AI preview unavailable:", err);
      } finally {
        setAiLoading(false);
      }
    }
  };

  const removeMedia = (id: string) => {
    const idx = mediaPreviews.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const updatedPreviews = mediaPreviews.filter((p) => p.id !== id);
      const updatedFiles = mediaFiles.filter((_, i) => i !== idx);
      setMediaPreviews(updatedPreviews);
      setMediaFiles(updatedFiles);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    const matchedCategory = WATER_PROBLEM_CATEGORIES.find((c) =>
      c.label.toLowerCase().includes(aiSuggestion.detectedIssue.toLowerCase())
    );
    if (matchedCategory) {
      setProblemType(matchedCategory.id);
    }
    setSeverity(aiSuggestion.severity);
    if (!description.trim()) {
      setDescription(aiSuggestion.summary);
    }
    setAiApplied(true);
    toast.success("AI suggestion applied to report draft!");
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemType || !description.trim() || !effectiveLocation) {
      toast.error("Please fill in all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const draft: SubmitReportDraft = {
        problemType,
        description: description.trim(),
        location: effectiveLocation,
        mediaFiles,
        mediaPreviews,
        severity,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      };

      const result = await submitWaterReport(draft);

      if (result.success && result.report) {
        setSubmittedReportId(result.report.id);
        toast.success(`Report submitted successfully! ID: ${result.report.id}`);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (!submittedReportId) return;
    navigator.clipboard.writeText(submittedReportId);
    setCopied(true);
    toast.success("Report ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const resetForm = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
    setProblemType(null);
    setDescription("");
    setSeverity("high");
    setSubmittedReportId(null);
    setCurrentStep(1);
    setAiSuggestion(null);
    setAiApplied(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS CONFIRMATION SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (submittedReportId) {
    return (
      <main className="min-h-screen py-6 sm:py-10 text-[var(--color-dark-teal)]">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 sm:p-10 text-center shadow-[0_20px_70px_rgba(15,23,42,0.08)] space-y-6">
            {/* Animated Success Badge */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Submission Confirmed
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-black text-[var(--color-deep-ocean)]">
                Report Submitted Successfully
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[var(--color-medium-teal)] leading-relaxed">
                Your water problem incident has been logged with real-time location data. Municipal disaster control teams have received the dispatch notice.
              </p>
            </div>

            {/* Prominent Report ID Box */}
            <div className="rounded-3xl border-2 border-[var(--color-ocean)] bg-[var(--color-soft-mint)] p-5 sm:p-6 text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-medium-teal)]">
                Your Unique Report ID
              </p>
              <p className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-[var(--color-ocean)] select-all">
                {submittedReportId}
              </p>
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-[rgba(53,98,103,0.2)] px-4 py-2 text-xs font-bold text-[var(--color-deep-ocean)] hover:bg-[var(--color-pale-aqua)] active:scale-95 transition shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-[var(--color-ocean)]" />
                    <span>Copy Report ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Key Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/citizen/track-report?id=${submittedReportId}`)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[var(--color-deep-ocean)] active:scale-95 transition"
              >
                <Search className="h-4 w-4" />
                Track Report Now
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-6 py-3.5 text-sm font-bold text-[var(--color-deep-ocean)] hover:bg-[var(--color-soft-mint)] transition"
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP-BASED REPORT FORM
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen space-y-6 text-[var(--color-dark-teal)] pb-24 lg:pb-8">
      {/* Header Banner */}
      <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
              Citizen Reporting System
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[var(--color-deep-ocean)]">
              Submit Water Hazard Report
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-medium-teal)]">
              Capture evidence, select problem category, and submit with instant location tagging.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/citizen/track-report")}
            className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-ocean)] hover:underline self-start sm:self-auto"
          >
            <Search className="h-3.5 w-3.5" />
            Track an Existing Report
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="mt-6 border-t border-[rgba(53,98,103,0.1)] pt-4">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {[
              { num: 1, label: "Evidence" },
              { num: 2, label: "Problem Type" },
              { num: 3, label: "Details" },
              { num: 4, label: "Location" },
              { num: 5, label: "Review & Submit" },
            ].map((step) => {
              const isPassed = currentStep > step.num;
              const isCurrent = currentStep === step.num;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    // Allow jumping back to previously completed steps
                    if (step.num < currentStep) setCurrentStep(step.num as StepNumber);
                  }}
                  className={`flex flex-1 flex-col items-center gap-1 text-center group transition ${
                    step.num <= currentStep ? "cursor-pointer" : "cursor-default opacity-60"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                      isCurrent
                        ? "bg-[var(--color-ocean)] text-white ring-4 ring-[var(--color-ocean)]/20 shadow-sm"
                        : isPassed
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isPassed ? <Check className="h-4 w-4" /> : step.num}
                  </div>
                  <span
                    className={`hidden sm:inline-block text-[11px] font-semibold ${
                      isCurrent
                        ? "text-[var(--color-deep-ocean)] font-bold"
                        : "text-[var(--color-medium-teal)]"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Multi-Step Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ─────────────────────────────────────────────────────────────
            STEP 1: SELECT / CAPTURE EVIDENCE
        ───────────────────────────────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
            <div className="border-b border-[rgba(53,98,103,0.1)] pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ocean)]">
                Step 1 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--color-deep-ocean)]">
                Capture / Upload Evidence
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-medium-teal)] mt-1">
                Upload photos or short video clips from the ground. Visuals allow AI and responders to verify severity quickly.
              </p>
            </div>

            {/* Media Upload Buttons */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Camera Direct Capture */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-ocean)] bg-[var(--color-soft-mint)] p-5 text-left transition hover:bg-[var(--color-mint)]/40 active:scale-98"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-ocean)] text-white shadow-sm">
                  <Camera className="h-6 w-6" />
                </div>
                <div>
                  <span className="font-bold text-sm sm:text-base text-[var(--color-deep-ocean)]">
                    Take Photo / Video
                  </span>
                  <p className="text-xs text-[var(--color-medium-teal)]">
                    Open device camera directly
                  </p>
                </div>
              </button>

              {/* Gallery / File Picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[rgba(53,98,103,0.2)] bg-slate-50 p-5 text-left transition hover:border-[var(--color-ocean)] hover:bg-[var(--color-soft-mint)] active:scale-98"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-pale-aqua)] text-[var(--color-ocean)]">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <span className="font-bold text-sm sm:text-base text-[var(--color-deep-ocean)]">
                    Upload from Gallery
                  </span>
                  <p className="text-xs text-[var(--color-medium-teal)]">
                    Select JPEG, PNG, MP4 files
                  </p>
                </div>
              </button>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handleMediaSelect}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleMediaSelect}
            />

            {/* Uploaded Media Previews */}
            {mediaPreviews.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-dark-teal)]">
                    Selected Media ({mediaPreviews.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-[var(--color-ocean)] hover:underline"
                  >
                    + Add More Media
                  </button>
                </div>

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                  {mediaPreviews.map((item) => (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl border border-[rgba(53,98,103,0.16)] bg-slate-100 aspect-video flex items-center justify-center"
                    >
                      {item.type === "video" ? (
                        <video
                          src={item.url}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      )}

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeMedia(item.id)}
                        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600 transition"
                        title="Remove media"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <div className="absolute bottom-1 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                        {item.type.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Assistant Banner */}
            {(aiLoading || aiSuggestion) && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span>AI Assistant Detected Feature</span>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    Confidence: {aiSuggestion ? `${Math.round(aiSuggestion.confidence * 100)}%` : "Scanning…"}
                  </span>
                </div>

                {aiLoading ? (
                  <p className="text-xs text-indigo-700 flex items-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    Analyzing uploaded media for flood depth and problem type…
                  </p>
                ) : aiSuggestion ? (
                  <div className="space-y-2 text-xs text-indigo-950">
                    <p>
                      Suggested Type: <strong>{aiSuggestion.detectedIssue}</strong> (Severity:{" "}
                      <span className="uppercase font-bold" style={{ color: SEVERITY_STYLES[aiSuggestion.severity].hex }}>
                        {aiSuggestion.severity}
                      </span>
                      )
                    </p>
                    <p className="text-indigo-800 text-[11px] italic">"{aiSuggestion.summary}"</p>

                    {!aiApplied && (
                      <button
                        type="button"
                        onClick={applyAiSuggestion}
                        className="mt-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
                      >
                        Auto-Fill Problem Type &amp; Details
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[var(--color-deep-ocean)] active:scale-95 transition"
              >
                <span>Continue to Problem Type</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 2: SELECT PROBLEM TYPE
        ───────────────────────────────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
            <div className="border-b border-[rgba(53,98,103,0.1)] pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ocean)]">
                Step 2 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--color-deep-ocean)]">
                Select Problem Category
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-medium-teal)] mt-1">
                Choose the water-related hazard that best matches what you observed on site.
              </p>
            </div>

            {/* Problem Type Selection Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WATER_PROBLEM_CATEGORIES.map((cat) => {
                const isSelected = problemType === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setProblemType(cat.id)}
                    className={`flex flex-col items-start p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-[var(--color-ocean)] bg-[var(--color-mint)]/50 ring-4 ring-[var(--color-ocean)]/15 shadow-sm"
                        : "border-[rgba(53,98,103,0.14)] bg-white hover:border-[var(--color-ocean)] hover:bg-[var(--color-soft-mint)]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-xs border border-[rgba(53,98,103,0.12)]">
                        {CATEGORY_ICONS[cat.id]}
                      </div>

                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? "border-[var(--color-ocean)] bg-[var(--color-ocean)] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-[var(--color-deep-ocean)]">
                      {cat.label}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-medium-teal)] leading-relaxed">
                      {cat.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[rgba(53,98,103,0.1)]">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-[var(--color-dark-teal)] hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                disabled={!problemType}
                onClick={() => setCurrentStep(3)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[var(--color-deep-ocean)] disabled:opacity-50 active:scale-95 transition"
              >
                <span>Continue to Details</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 3: ADD DESCRIPTION & SEVERITY
        ───────────────────────────────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
            <div className="border-b border-[rgba(53,98,103,0.1)] pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ocean)]">
                Step 3 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--color-deep-ocean)]">
                Describe the Situation
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-medium-teal)] mt-1">
                Provide details regarding water levels, traffic blockage, or affected households.
              </p>
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
              <label htmlFor="report-desc" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-dark-teal)]">
                Incident Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="report-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Water is knee-deep on the main road causing vehicle breakdown. Drainage culvert is completely clogged with debris."
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50/50 p-4 text-sm text-[var(--color-deep-ocean)] focus:border-[var(--color-ocean)] focus:bg-white focus:ring-4 focus:ring-[var(--color-ocean)]/10 focus:outline-none transition"
              />
              <div className="flex justify-between text-[11px] text-[var(--color-medium-teal)]">
                <span>Minimum 10 characters</span>
                <span>{description.trim().length} chars</span>
              </div>
            </div>

            {/* Severity Level Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-dark-teal)]">
                Observed Severity Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["low", "moderate", "high", "critical"] as Severity[]).map((level) => {
                  const s = SEVERITY_STYLES[level];
                  const isSelected = severity === level;

                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSeverity(level)}
                      className={`p-3 rounded-2xl border text-center transition font-bold text-xs ${
                        isSelected
                          ? `${s.bg} ${s.border} ${s.text} ring-2 ring-current`
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {level.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Contact Information */}
            <div className="rounded-2xl border border-[rgba(53,98,103,0.12)] bg-[var(--color-soft-mint)] p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ocean)]">
                Citizen Contact (Optional)
              </span>
              <p className="text-xs text-[var(--color-medium-teal)]">
                Optional: Provide contact info if you wish to receive SMS updates from field officers.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your Name (optional)"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-[var(--color-deep-ocean)] focus:outline-none focus:border-[var(--color-ocean)]"
                />
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Phone Number (optional)"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-[var(--color-deep-ocean)] focus:outline-none focus:border-[var(--color-ocean)]"
                />
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[rgba(53,98,103,0.1)]">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-[var(--color-dark-teal)] hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                disabled={description.trim().length < 5}
                onClick={() => setCurrentStep(4)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[var(--color-deep-ocean)] disabled:opacity-50 active:scale-95 transition"
              >
                <span>Continue to Location</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 4: CHOOSE LOCATION (AUTOMATIC & MANUAL)
        ───────────────────────────────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
            <div className="border-b border-[rgba(53,98,103,0.1)] pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ocean)]">
                Step 4 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--color-deep-ocean)]">
                Incident Location
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-medium-teal)] mt-1">
                Pinpoint where the water problem is located using automatic GPS or manual area selection.
              </p>
            </div>

            {/* Location Mode Selector (Buttons) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setLocationMode("automatic");
                  if (!autoCoords) requestGeo();
                }}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 font-bold text-xs sm:text-sm transition ${
                  locationMode === "automatic"
                    ? "border-[var(--color-ocean)] bg-[var(--color-mint)]/60 text-[var(--color-deep-ocean)] shadow-xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Navigation className="h-4 w-4 text-[var(--color-ocean)]" />
                Use Current Location
              </button>

              <button
                type="button"
                onClick={() => setLocationMode("manual")}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 font-bold text-xs sm:text-sm transition ${
                  locationMode === "manual"
                    ? "border-[var(--color-ocean)] bg-[var(--color-mint)]/60 text-[var(--color-deep-ocean)] shadow-xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <MapPin className="h-4 w-4 text-[var(--color-ocean)]" />
                Select Manually
              </button>
            </div>

            {/* AUTOMATIC MODE DISPLAY */}
            {locationMode === "automatic" && (
              <div className="rounded-2xl border border-[rgba(53,98,103,0.14)] bg-[var(--color-soft-mint)] p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-800">
                      GPS Automatic Detection Active
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={requestGeo}
                    disabled={geoLoading}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-ocean)] hover:underline"
                  >
                    <RefreshCw className={`h-3 w-3 ${geoLoading ? "animate-spin" : ""}`} />
                    Refresh Coordinates
                  </button>
                </div>

                {geoLoading ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-medium-teal)] py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-ocean)]" />
                    Acquiring high-accuracy satellite coordinates…
                  </div>
                ) : autoCoords ? (
                  <div className="bg-white p-4 rounded-2xl border border-[rgba(53,98,103,0.12)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-deep-ocean)]">
                        Location Detected
                      </span>
                      <span className="font-mono text-xs text-[var(--color-ocean)] font-bold">
                        {autoCoords.lat.toFixed(5)}° N, {autoCoords.lng.toFixed(5)}° E
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-medium-teal)]">
                      Puri Coastal Monitored Zone · GPS Confidence High (&lt;10m accuracy)
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                    <p className="font-bold">Geolocation Notice:</p>
                    <p className="mt-0.5">
                      {geoError || "Unable to acquire GPS automatically. Please grant location permission or switch to manual selection."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setLocationMode("manual")}
                      className="mt-2 text-xs font-bold text-amber-900 underline"
                    >
                      Switch to Manual Location Entry
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MANUAL MODE DISPLAY */}
            {locationMode === "manual" && (
              <div className="space-y-4">
                {/* Search / Preset Area Chips */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-dark-teal)] mb-2">
                    Quick Preset Coastal Areas
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_LOCATIONS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setManualAddress(preset.name);
                          setManualLandmark(preset.landmark);
                          setManualCoordsState({ lat: preset.lat, lng: preset.lng });
                        }}
                        className={`rounded-xl border px-3 py-2 text-xs text-left transition ${
                          manualAddress === preset.name
                            ? "border-[var(--color-ocean)] bg-[var(--color-pale-aqua)] font-bold text-[var(--color-deep-ocean)]"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        📍 {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="manual-address" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-dark-teal)] mb-1">
                      Street / Area Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="manual-address"
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="e.g. VIP Road near Lighthouse, Puri"
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50/50 p-3 text-xs sm:text-sm text-[var(--color-deep-ocean)] focus:bg-white focus:border-[var(--color-ocean)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="manual-landmark" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-dark-teal)] mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      id="manual-landmark"
                      type="text"
                      value={manualLandmark}
                      onChange={(e) => setManualLandmark(e.target.value)}
                      placeholder="e.g. Opposite Post Office or Hotel Grand"
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50/50 p-3 text-xs sm:text-sm text-[var(--color-deep-ocean)] focus:bg-white focus:border-[var(--color-ocean)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[rgba(53,98,103,0.1)]">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-[var(--color-dark-teal)] hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                disabled={!effectiveLocation}
                onClick={() => setCurrentStep(5)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[var(--color-deep-ocean)] disabled:opacity-50 active:scale-95 transition"
              >
                <span>Review Report</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STEP 5: REVIEW REPORT & FINAL SUBMIT
        ───────────────────────────────────────────────────────────── */}
        {currentStep === 5 && (
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
            <div className="border-b border-[rgba(53,98,103,0.1)] pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ocean)]">
                Step 5 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--color-deep-ocean)]">
                Review &amp; Confirm Submission
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-medium-teal)] mt-1">
                Please verify the details below before submitting to the municipal response hub.
              </p>
            </div>

            {/* Summary Review Cards */}
            <div className="space-y-4">
              {/* Problem Type Card */}
              <div className="flex items-start justify-between rounded-2xl bg-[var(--color-soft-mint)] p-4 border border-[rgba(53,98,103,0.12)]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-medium-teal)]">
                    Problem Type
                  </span>
                  <p className="text-base font-black text-[var(--color-deep-ocean)] mt-0.5">
                    {WATER_PROBLEM_CATEGORIES.find((c) => c.id === problemType)?.label || problemType}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs font-bold text-[var(--color-ocean)] underline"
                >
                  Edit
                </button>
              </div>

              {/* Description & Severity Card */}
              <div className="rounded-2xl bg-[var(--color-soft-mint)] p-4 border border-[rgba(53,98,103,0.12)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-medium-teal)]">
                    Description &amp; Severity
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs font-bold text-[var(--color-ocean)] underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-[var(--color-deep-ocean)] leading-relaxed">
                  {description}
                </p>
                <div className="pt-1">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white uppercase"
                    style={{ background: SEVERITY_STYLES[severity].hex }}
                  >
                    {severity} Severity
                  </span>
                </div>
              </div>

              {/* Location Card */}
              <div className="flex items-start justify-between rounded-2xl bg-[var(--color-soft-mint)] p-4 border border-[rgba(53,98,103,0.12)]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-medium-teal)]">
                    Location Target
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[var(--color-deep-ocean)] mt-0.5">
                    📍 {effectiveLocation?.address || effectiveLocation?.placeName}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {effectiveLocation?.coords.lat.toFixed(4)}° N, {effectiveLocation?.coords.lng.toFixed(4)}° E ({effectiveLocation?.mode.toUpperCase()})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="text-xs font-bold text-[var(--color-ocean)] underline"
                >
                  Edit
                </button>
              </div>

              {/* Media Count */}
              <div className="flex items-center justify-between rounded-2xl bg-[var(--color-soft-mint)] p-4 border border-[rgba(53,98,103,0.12)]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-medium-teal)]">
                    Attached Evidence
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[var(--color-deep-ocean)] mt-0.5">
                    {mediaPreviews.length} File{mediaPreviews.length === 1 ? "" : "s"} attached
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-bold text-[var(--color-ocean)] underline"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Submission Action Button */}
            <div className="space-y-3 pt-4 border-t border-[rgba(53,98,103,0.1)]">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-[var(--color-deep-ocean)] active:scale-98 disabled:opacity-50 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Generating Unique Report ID…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Submit Official Water Report</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                disabled={isSubmitting}
                className="w-full text-center text-xs font-bold text-[var(--color-medium-teal)] hover:underline py-1"
              >
                Back to Location
              </button>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}
