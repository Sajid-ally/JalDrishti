import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";

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

import {
  WATER_PROBLEM_CATEGORIES,
} from "../../types/report";

import type {
  WaterProblemType,
  SubmitReportDraft,
  UploadedMediaItem,
  ReportLocation,
} from "../../types/report";

import type { Severity } from "../../types/hazard";

import {
  SEVERITY_STYLES,
} from "../../types/hazard";

import {
  useGeolocation,
} from "../../hooks/useGeolocation";

import {
  submitWaterReport,
  analyzeWaterMedia,
} from "../../services/reportService";

/* ============================================================
   CATEGORY ICONS
   ============================================================ */

const CATEGORY_ICONS: Record<
  WaterProblemType,
  React.ReactNode
> = {
  urban_flooding: (
    <Waves className="h-6 w-6 text-blue-600" />
  ),

  waterlogging: (
    <Droplets className="h-6 w-6 text-cyan-600" />
  ),

  drainage_problem: (
    <Pipette className="h-6 w-6 text-teal-600" />
  ),

  pond_lake_issue: (
    <CircleDot className="h-6 w-6 text-emerald-600" />
  ),

  water_quality_pollution: (
    <AlertTriangle className="h-6 w-6 text-amber-600" />
  ),

  other: (
    <HelpCircle className="h-6 w-6 text-slate-600" />
  ),
};



type StepNumber = 1 | 2 | 3 | 4 | 5;

/* ============================================================
   COMPONENT
   ============================================================ */

export default function ReportHazard() {
  const navigate = useNavigate();

  /* ============================================================
     STEP
     ============================================================ */

  const [currentStep, setCurrentStep] =
    useState<StepNumber>(1);

  /* ============================================================
     REPORT FORM
     ============================================================ */

  const [mediaFiles, setMediaFiles] =
    useState<File[]>([]);

  const [mediaPreviews, setMediaPreviews] =
    useState<UploadedMediaItem[]>([]);

  const [problemType, setProblemType] =
    useState<WaterProblemType | null>(null);

  /*
   * Title is optional.
   *
   * If citizen leaves it empty:
   * backend can generate a title.
   */
  const [title, setTitle] =
    useState("");

  /*
   * Description is optional.
   *
   * If citizen leaves it empty:
   * backend can generate description
   * from image/category/context.
   */
  const [description, setDescription] =
    useState("");

  const [severity, setSeverity] =
    useState<Severity>("high");

  const [contactName, setContactName] =
    useState("");

  const [contactPhone, setContactPhone] =
    useState("");

  /* ============================================================
     LOCATION
     ============================================================ */

  const [locationMode, setLocationMode] =
    useState<"automatic" | "manual">(
      "automatic"
    );

  const [manualAddress, setManualAddress] =
    useState("");

  const [manualLandmark, setManualLandmark] =
    useState("");

  const [manualCoords, setManualCoordsState] =
    useState<{
      lat: number;
      lng: number;
    } | null>(null);

  /* ============================================================
     AI PREVIEW
     ============================================================ */

  const [aiLoading, setAiLoading] =
    useState(false);

  const [aiSuggestion, setAiSuggestion] =
    useState<{
      detectedIssue: string;
      confidence: number;
      severity: Severity;
      summary: string;
      title?: string;
    } | null>(null);

  const [aiApplied, setAiApplied] =
    useState(false);

  /* ============================================================
     SUBMISSION
     ============================================================ */

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submittedReportId, setSubmittedReportId] =
    useState<string | null>(null);

  const [copied, setCopied] =
    useState(false);

  /* ============================================================
     REFS
     ============================================================ */

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const cameraInputRef =
    useRef<HTMLInputElement>(null);

  /* ============================================================
     GEOLOCATION
     ============================================================ */

  const {
    coords: autoCoords,
    loading: geoLoading,
    error: geoError,
    request: requestGeo,
  } = useGeolocation();

  useEffect(() => {
    if (
      locationMode === "automatic" &&
      !autoCoords &&
      !geoLoading
    ) {
      requestGeo();
    }
  }, [
    locationMode,
    autoCoords,
    geoLoading,
    requestGeo,
  ]);

  /* ============================================================
     EFFECTIVE LOCATION
     ============================================================ */

const effectiveLocation: ReportLocation | null = useMemo(() => {
  /*
   * AUTOMATIC GPS
   *
   * Never attach a hardcoded city/address here.
   * The coordinates come directly from the browser.
   *
   * Backend will reverse-geocode these coordinates.
   */
  if (locationMode === "automatic" && autoCoords) {
    return {
      coords: autoCoords,
      address: `GPS Location (${autoCoords.lat.toFixed(5)}, ${autoCoords.lng.toFixed(5)})`,
      placeName: "Current GPS Location",
      landmark: "Detected via Device Sensor",
      mode: "automatic",
    };
  }

  /*
   * MANUAL LOCATION
   *
   * A manual location MUST have coordinates.
   *
   * Never use fake/default Puri coordinates.
   */
  if (
  locationMode === "manual" &&
  manualCoords
) {
  return {
    coords: manualCoords,
    address: manualAddress.trim() || undefined,
    placeName: manualAddress.trim() || undefined,
    landmark: manualLandmark.trim() || undefined,
    mode: "manual",
  };
}

  return null;
}, [
  locationMode,
  autoCoords,
  manualCoords,
  manualAddress,
  manualLandmark,
]);

  /* ============================================================
     MEDIA VALIDATION
     ============================================================ */

  const validateMediaFile = (
    file: File
  ): string | null => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (
      !allowedTypes.includes(file.type)
    ) {
      return `${file.name}: unsupported file type.`;
    }

    /*
     * Frontend validation only.
     *
     * Backend MUST validate again.
     */
    const MAX_SIZE =
      10 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      return `${file.name}: maximum file size is 10 MB.`;
    }

    return null;
  };

  /* ============================================================
     MEDIA SELECT
     ============================================================ */

  const handleMediaSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      e.target.files || []
    );

    if (files.length === 0) {
      return;
    }

    const validFiles: File[] = [];

    for (const file of files) {
      const error =
        validateMediaFile(file);

      if (error) {
        toast.error(error);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      e.target.value = "";
      return;
    }

    /*
     * Maximum 5 files on frontend.
     *
     * Backend must enforce its own limit.
     */
    const remainingSlots =
      5 - mediaFiles.length;

    if (remainingSlots <= 0) {
      toast.error(
        "Maximum 5 media files allowed."
      );

      e.target.value = "";
      return;
    }

    const filesToAdd =
      validFiles.slice(
        0,
        remainingSlots
      );

    if (
      validFiles.length >
      remainingSlots
    ) {
      toast.error(
        `Only ${remainingSlots} more media file${
          remainingSlots === 1
            ? ""
            : "s"
        } can be added.`
      );
    }

    const newFiles = [
      ...mediaFiles,
      ...filesToAdd,
    ];

    setMediaFiles(newFiles);

    const newPreviews:
      UploadedMediaItem[] =
      filesToAdd.map(
        (file, index) => ({
          id:
            `media-${Date.now()}-${index}`,

          name: file.name,

          type:
            file.type.startsWith(
              "video/"
            )
              ? "video"
              : "image",

          url:
            URL.createObjectURL(
              file
            ),

          size: file.size,
        })
      );

    setMediaPreviews(
      (previous) => [
        ...previous,
        ...newPreviews,
      ]
    );

    /*
     * Run AI preview only for the
     * first newly selected image.
     */
    const firstFile =
      filesToAdd[0];

    if (
      firstFile &&
      firstFile.type.startsWith(
        "image/"
      )
    ) {
      setAiLoading(true);

      setAiSuggestion(null);

      setAiApplied(false);

      try {
        const aiRes =
          await analyzeWaterMedia(
            firstFile,
            problemType ||
              undefined,
            description
          );

        setAiSuggestion(
          aiRes
        );
      } catch (error) {
        console.warn(
          "AI preview unavailable:",
          error
        );
      } finally {
        setAiLoading(false);
      }
    }

    e.target.value = "";
  };

  /* ============================================================
     REMOVE MEDIA
     ============================================================ */

  const removeMedia = (
    id: string
  ) => {
    const index =
      mediaPreviews.findIndex(
        (preview) =>
          preview.id === id
      );

    if (index === -1) {
      return;
    }

    const preview =
      mediaPreviews[index];

    if (
      preview?.url.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        preview.url
      );
    }

    const updatedPreviews =
      mediaPreviews.filter(
        (_, i) => i !== index
      );

    const updatedFiles =
      mediaFiles.filter(
        (_, i) => i !== index
      );

    setMediaPreviews(
      updatedPreviews
    );

    setMediaFiles(
      updatedFiles
    );
  };

  /* ============================================================
     APPLY AI SUGGESTION
     ============================================================ */

  const applyAiSuggestion =
    () => {
      if (!aiSuggestion) {
        return;
      }

      const detected =
        aiSuggestion.detectedIssue
          .toLowerCase()
          .trim();

      let matchedType:
        | WaterProblemType
        | undefined;

      if (
        detected.includes(
          "flood"
        )
      ) {
        matchedType =
          "urban_flooding";
      } else if (
        detected.includes(
          "waterlogging"
        ) ||
        detected.includes(
          "water logging"
        )
      ) {
        matchedType =
          "waterlogging";
      } else if (
        detected.includes(
          "drain"
        )
      ) {
        matchedType =
          "drainage_problem";
      } else if (
        detected.includes(
          "pond"
        ) ||
        detected.includes(
          "lake"
        )
      ) {
        matchedType =
          "pond_lake_issue";
      } else if (
        detected.includes(
          "pollution"
        ) ||
        detected.includes(
          "water quality"
        )
      ) {
        matchedType =
          "water_quality_pollution";
      }

      if (matchedType) {
        setProblemType(
          matchedType
        );
      }

      setSeverity(
        aiSuggestion.severity
      );

      /*
       * IMPORTANT:
       *
       * Do NOT automatically overwrite
       * citizen description.
       *
       * Citizen text must remain intact.
       *
       * Backend is responsible for
       * generating missing title/description.
       */

      setAiApplied(true);

      toast.success(
        "AI category and severity applied."
      );
    };

  /* ============================================================
     VALIDATE BEFORE SUBMISSION
     ============================================================ */

  const validateBeforeSubmit =
    (): boolean => {
      if (!problemType) {
        toast.error(
          "Please select a problem type."
        );

        setCurrentStep(2);

        return false;
      }

      if (!effectiveLocation) {
        toast.error(
          "Please provide an incident location."
        );

        setCurrentStep(4);

        return false;
      }

      /*
       * Title is optional.
       *
       * Description is optional.
       *
       * Backend can generate both.
       */

      return true;
    };

  /* ============================================================
     SUBMIT
     ============================================================ */

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !validateBeforeSubmit()
    ) {
      return;
    }

    /*
     * Explicit narrowing required because
     * problemType is WaterProblemType | null.
     */
    if (!problemType) {
      toast.error(
        "Please select a problem type."
      );

      setCurrentStep(2);

      return;
    }

    if (!effectiveLocation) {
      toast.error(
        "Please provide an incident location."
      );

      setCurrentStep(4);

      return;
    }

    setIsSubmitting(true);

    try {
      const draft:
        SubmitReportDraft & {
          title?: string;
        } = {
        /*
         * Citizen title.
         *
         * Empty title becomes undefined.
         * Backend can generate one.
         */
        title:
          title.trim() ||
          undefined,

        problemType,

        /*
         * Empty description is allowed.
         * Backend can generate one.
         */
        description:
          description.trim(),

        location:
          effectiveLocation,

        mediaFiles,

        mediaPreviews,

        severity,

        contactName:
          contactName.trim() ||
          undefined,

        contactPhone:
          contactPhone.trim() ||
          undefined,
      };

      console.log(
        "Submitting report draft:",
        {
          ...draft,
          mediaFiles:
            `${mediaFiles.length} file(s)`,
        }
      );

      const result =
        await submitWaterReport(
          draft
        );

      if (
        result.success &&
        result.report
      ) {
        setSubmittedReportId(
          result.report.id
        );

        toast.success(
          `Report submitted successfully! ID: ${result.report.id}`
        );

        return;
      }

      toast.error(
        result.error ||
          "Failed to submit report."
      );
    } catch (error) {
      console.error(
        "Submission failed:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit report. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ============================================================
     COPY REPORT ID
     ============================================================ */

  const handleCopyId =
    async () => {
      if (
        !submittedReportId
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          submittedReportId
        );

        setCopied(true);

        toast.success(
          "Report ID copied to clipboard!"
        );

        setTimeout(
          () => setCopied(false),
          2500
        );
      } catch {
        toast.error(
          "Unable to copy report ID."
        );
      }
    };

  /* ============================================================
     RESET FORM
     ============================================================ */

  const resetForm =
    () => {
      mediaPreviews.forEach(
        (preview) => {
          if (
            preview.url.startsWith(
              "blob:"
            )
          ) {
            URL.revokeObjectURL(
              preview.url
            );
          }
        }
      );

      setMediaFiles([]);

      setMediaPreviews([]);

      setProblemType(null);

      setTitle("");

      setDescription("");

      setSeverity("high");

      setContactName("");

      setContactPhone("");

      setSubmittedReportId(
        null
      );

      setCurrentStep(1);

      setAiSuggestion(null);

      setAiApplied(false);

      setLocationMode(
        "automatic"
      );

      setManualAddress("");

      setManualLandmark("");

      setManualCoordsState(
        null
      );
    };

  /* ============================================================
     SUCCESS SCREEN
     ============================================================ */

  if (submittedReportId) {
    return (
      <main className="min-h-screen py-6 sm:py-10 text-(--color-dark-teal)">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 sm:p-10 text-center shadow-[0_20px_70px_rgba(15,23,42,0.08)] space-y-6">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Submission Confirmed
              </span>

              <h1 className="mt-3 text-2xl sm:text-3xl font-black text-(--color-deep-ocean)">
                Report Submitted Successfully
              </h1>

              <p className="mt-2 text-xs sm:text-sm text-(--color-medium-teal) leading-relaxed">
                Your water problem incident has been logged with location and evidence data. The response system can now process and verify the report.
              </p>
            </div>

            <div className="rounded-3xl border-2 border-(--color-ocean) bg-(--color-soft-mint) p-5 sm:p-6 text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-(--color-medium-teal)">
                Your Unique Report ID
              </p>

              <p className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-(--color-ocean) select-all">
                {submittedReportId}
              </p>

              <button
                type="button"
                onClick={
                  handleCopyId
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-[rgba(53,98,103,0.2)] px-4 py-2 text-xs font-bold text-(--color-deep-ocean) hover:bg-(--color-pale-aqua) active:scale-95 transition shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />

                    <span className="text-emerald-700">
                      Copied to Clipboard
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-(--color-ocean)" />

                    <span>
                      Copy Report ID
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/citizen/track-report?id=${submittedReportId}`
                  )
                }
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--color-deep-ocean) active:scale-95 transition"
              >
                <Search className="h-4 w-4" />
                Track Report Now
              </button>

              <button
                type="button"
                onClick={
                  resetForm
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-6 py-3.5 text-sm font-bold text-(--color-deep-ocean) hover:bg-(--color-soft-mint) transition"
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================
     MAIN FORM
     ============================================================ */

  return (
    <main className="min-h-screen space-y-6 text-(--color-dark-teal) pb-24 lg:pb-8">

      {/* HEADER */}

      <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
              Citizen Reporting System
            </span>

            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-(--color-deep-ocean)">
              Submit Water Hazard Report
            </h1>

            <p className="mt-1 text-xs sm:text-sm text-(--color-medium-teal)">
              Capture evidence, describe the problem, and submit with instant location tagging.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/citizen/track-report"
              )
            }
            className="inline-flex items-center gap-2 text-xs font-bold text-(--color-ocean) hover:underline self-start sm:self-auto"
          >
            <Search className="h-3.5 w-3.5" />
            Track an Existing Report
          </button>
        </div>

        {/* STEP INDICATOR */}

        <div className="mt-6 border-t border-[rgba(53,98,103,0.1)] pt-4">

          <div className="flex items-center justify-between gap-1 sm:gap-2">

            {[
              {
                num: 1,
                label: "Evidence",
              },
              {
                num: 2,
                label: "Problem Type",
              },
              {
                num: 3,
                label: "Details",
              },
              {
                num: 4,
                label: "Location",
              },
              {
                num: 5,
                label: "Review & Submit",
              },
            ].map((step) => {
              const isPassed =
                currentStep >
                step.num;

              const isCurrent =
                currentStep ===
                step.num;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (
                      step.num <
                      currentStep
                    ) {
                      setCurrentStep(
                        step.num as StepNumber
                      );
                    }
                  }}
                  className={`flex flex-1 flex-col items-center gap-1 text-center group transition ${
                    step.num <=
                    currentStep
                      ? "cursor-pointer"
                      : "cursor-default opacity-60"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                      isCurrent
                        ? "bg-(--color-ocean) text-white ring-4 ring-(--color-ocean)/20 shadow-sm"
                        : isPassed
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isPassed ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.num
                    )}
                  </div>

                  <span
                    className={`hidden sm:inline-block text-[11px] font-semibold ${
                      isCurrent
                        ? "text-(--color-deep-ocean) font-bold"
                        : "text-(--color-medium-teal)"
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

      {/* FORM */}

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-6"
      >

        {/* ======================================================
            STEP 1 — EVIDENCE
        ====================================================== */}

        {currentStep === 1 && (
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-sm space-y-6 animate-fadeIn">

            <div className="border-b border-[rgba(53,98,103,0.1)] pb-4">

              <span className="text-xs font-bold uppercase tracking-wider text-(--color-ocean)">
                Step 1 of 5
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-(--color-deep-ocean)">
                Capture / Upload Evidence
              </h2>

              <p className="text-xs sm:text-sm text-(--color-medium-teal) mt-1">
                Upload photos or short video clips. Visual evidence helps ML and responders verify the hazard.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                onClick={() =>
                  cameraInputRef.current?.click()
                }
                className="flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-(--color-ocean) bg-(--color-soft-mint) p-5 text-left transition hover:bg-(--color-mint)/40 active:scale-98"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--color-ocean) text-white shadow-sm">
                  <Camera className="h-6 w-6" />
                </div>

                <div>
                  <span className="font-bold text-sm sm:text-base text-(--color-deep-ocean)">
                    Take Photo / Video
                  </span>

                  <p className="text-xs text-(--color-medium-teal)">
                    Open device camera directly
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[rgba(53,98,103,0.2)] bg-slate-50 p-5 text-left transition hover:border-(--color-ocean) hover:bg-(--color-soft-mint) active:scale-98"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--color-pale-aqua) text-(--color-ocean)">
                  <Upload className="h-6 w-6" />
                </div>

                <div>
                  <span className="font-bold text-sm sm:text-base text-(--color-deep-ocean)">
                    Upload from Gallery
                  </span>

                  <p className="text-xs text-(--color-medium-teal)">
                    JPG, PNG, WEBP, MP4
                  </p>
                </div>
              </button>

            </div>

            <input
              ref={
                cameraInputRef
              }
              type="file"
              accept="image/*,video/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={
                handleMediaSelect
              }
            />

            <input
              ref={
                fileInputRef
              }
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={
                handleMediaSelect
              }
            />

            {mediaPreviews.length >
              0 && (
              <div className="space-y-3">

                <div className="flex items-center justify-between">

                  <h3 className="text-xs font-bold uppercase tracking-wider text-(--color-dark-teal)">
                    Selected Media (
                    {
                      mediaPreviews.length
                    }
                    )
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={
                      mediaPreviews.length >=
                      5
                    }
                    className="text-xs font-bold text-(--color-ocean) hover:underline disabled:opacity-40"
                  >
                    + Add More Media
                  </button>

                </div>

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">

                  {mediaPreviews.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="group relative overflow-hidden rounded-2xl border border-[rgba(53,98,103,0.16)] bg-slate-100 aspect-video flex items-center justify-center"
                      >

                        {item.type ===
                        "video" ? (
                          <video
                            src={
                              item.url
                            }
                            className="h-full w-full object-cover"
                            controls
                          />
                        ) : (
                          <img
                            src={
                              item.url
                            }
                            alt={
                              item.name
                            }
                            className="h-full w-full object-cover"
                          />
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            removeMedia(
                              item.id
                            )
                          }
                          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600 transition"
                          title="Remove media"
                        >
                          <X className="h-4 w-4" />
                        </button>

                        <div className="absolute bottom-1 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                          {item.type.toUpperCase()}
                        </div>

                      </div>
                    )
                  )}

                </div>
              </div>
            )}

            {(aiLoading ||
              aiSuggestion) && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-2">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                    <Sparkles className="h-4 w-4 text-indigo-600" />

                    <span>
                      AI Hazard Detection
                    </span>
                  </div>

                  <span className="text-[10px] text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    {aiSuggestion
                      ? `Confidence: ${(
                          aiSuggestion.confidence *
                          100
                        ).toFixed(1)}%`
                      : "Scanning..."}
                  </span>

                </div>

                {aiLoading ? (
                  <p className="text-xs text-indigo-700 flex items-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />

                    Analyzing uploaded image...
                  </p>
                ) : aiSuggestion ? (
                  <div className="space-y-3 text-xs text-indigo-950">

                    <p>
                      Suggested Type:{" "}
                      <strong>
                        {
                          aiSuggestion.detectedIssue
                        }
                      </strong>
                    </p>

                    <p>
                      Severity:{" "}
                      <strong className="uppercase">
                        {
                          aiSuggestion.severity
                        }
                      </strong>
                    </p>

                    <div className="rounded-xl bg-white/70 border border-indigo-200 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                        AI Description Suggestion
                      </p>

                      <p className="mt-1 text-indigo-800 text-[11px] italic">
                        "{aiSuggestion.summary}"
                      </p>
                    </div>

                    {aiSuggestion.title && (
                      <div className="rounded-xl bg-white/70 border border-indigo-200 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          AI Title Suggestion
                        </p>

                        <p className="mt-1 text-indigo-900 font-semibold text-xs">
                          {aiSuggestion.title}
                        </p>
                      </div>
                    )}

                    {!aiApplied && (
                      <button
                        type="button"
                        onClick={
                          applyAiSuggestion
                        }
                        className="mt-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
                      >
                        Apply AI Category &amp; Severity
                      </button>
                    )}

                    {aiApplied && (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <Check className="h-3.5 w-3.5" />
                        AI category and severity applied
                      </div>
                    )}

                  </div>
                ) : null}

              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />

                <p className="text-[11px] leading-relaxed text-slate-600">
                  AI preview is only a suggestion. Final hazard detection,
                  validation, duplicate checking, title/description generation,
                  and priority calculation are handled by the backend.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4">

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(2)
                }
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--color-deep-ocean) active:scale-95 transition"
              >
                Continue to Problem Type
                <ArrowRight className="h-4 w-4" />
              </button>

            </div>

          </div>
        )}

        {/* ======================================================
            STEP 2 — PROBLEM TYPE
        ====================================================== */}

        {currentStep === 2 && (
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-sm space-y-6 animate-fadeIn">

            <div className="border-b border-[rgba(53,98,103,0.1)] pb-4">

              <span className="text-xs font-bold uppercase tracking-wider text-(--color-ocean)">
                Step 2 of 5
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-(--color-deep-ocean)">
                Select Problem Category
              </h2>

              <p className="text-xs sm:text-sm text-(--color-medium-teal) mt-1">
                Choose the water-related hazard that best matches what you observed.
              </p>

            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

              {WATER_PROBLEM_CATEGORIES.map(
                (category) => {
                  const isSelected =
                    problemType ===
                    category.id;

                  return (
                    <button
                      key={
                        category.id
                      }
                      type="button"
                      onClick={() =>
                        setProblemType(
                          category.id
                        )
                      }
                      className={`flex flex-col items-start p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-(--color-ocean) bg-(--color-mint)/50 ring-4 ring-(--color-ocean)/15 shadow-sm"
                          : "border-[rgba(53,98,103,0.14)] bg-white hover:border-(--color-ocean) hover:bg-(--color-soft-mint)"
                      }`}
                    >

                      <div className="flex items-center justify-between w-full mb-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-xs border border-[rgba(53,98,103,0.12)]">
                          {
                            CATEGORY_ICONS[
                              category.id
                            ]
                          }
                        </div>

                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-(--color-ocean) bg-(--color-ocean) text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>

                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-(--color-deep-ocean)">
                        {
                          category.label
                        }
                      </h3>

                      <p className="mt-1 text-xs text-(--color-medium-teal) leading-relaxed">
                        {
                          category.description
                        }
                      </p>

                    </button>
                  );
                }
              )}

            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[rgba(53,98,103,0.1)]">

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(1)
                }
                className="flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-(--color-dark-teal) hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                disabled={
                  !problemType
                }
                onClick={() =>
                  setCurrentStep(3)
                }
                className="flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--color-deep-ocean) disabled:opacity-50 active:scale-95 transition"
              >
                Continue to Details
                <ArrowRight className="h-4 w-4" />
              </button>

            </div>

          </div>
        )}

        {/* ======================================================
            STEP 3 — DETAILS
        ====================================================== */}

        {currentStep === 3 && (
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-sm space-y-6 animate-fadeIn">

            <div className="border-b border-[rgba(53,98,103,0.1)] pb-4">

              <span className="text-xs font-bold uppercase tracking-wider text-(--color-ocean)">
                Step 3 of 5
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-(--color-deep-ocean)">
                Describe the Situation
              </h2>

              <p className="text-xs sm:text-sm text-(--color-medium-teal) mt-1">
                Title and description are optional. If you leave either empty,
                the backend AI pipeline can generate it.
              </p>

            </div>

            {/* TITLE */}

            <div className="space-y-2">

              <label
                htmlFor="report-title"
                className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal)"
              >
                Report Title

                <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-(--color-medium-teal)">
                  Optional — AI can generate this
                </span>
              </label>

              <input
                id="report-title"
                type="text"
                value={
                  title
                }
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="e.g. Drain blocked near Atharanala Bridge"
                maxLength={200}
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50/50 p-4 text-sm text-(--color-deep-ocean) focus:border-(--color-ocean) focus:bg-white focus:ring-4 focus:ring-(--color-ocean)/10 focus:outline-none transition"
              />

              <div className="flex justify-between text-[11px] text-(--color-medium-teal)">

                <span>
                  Leave empty to let backend generate a title.
                </span>

                <span>
                  {
                    title.trim()
                      .length
                  } / 200
                </span>

              </div>

            </div>

            {/* DESCRIPTION */}

            <div className="space-y-2">

              <label
                htmlFor="report-desc"
                className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal)"
              >
                Incident Description

                <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-(--color-medium-teal)">
                  Optional — AI can generate this
                </span>
              </label>

              <textarea
                id="report-desc"
                rows={5}
                value={
                  description
                }
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Optional: e.g. Water is knee-deep on the main road and the drainage culvert appears blocked."
                maxLength={2000}
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50/50 p-4 text-sm text-(--color-deep-ocean) focus:border-(--color-ocean) focus:bg-white focus:ring-4 focus:ring-(--color-ocean)/10 focus:outline-none transition"
              />

              <div className="flex justify-between text-[11px] text-(--color-medium-teal)">

                <span>
                  You can leave this empty.
                </span>

                <span>
                  {
                    description.trim()
                      .length
                  } / 2000
                </span>

              </div>

            </div>

            {/* SEVERITY */}

            <div className="space-y-2">

              <label className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal)">
                Observed Severity Level
              </label>

              <p className="text-[11px] text-(--color-medium-teal)">
                This is a citizen-side value. Backend/ML performs the final severity decision.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

                {(
                  [
                    "low",
                    "moderate",
                    "high",
                    "critical",
                  ] as Severity[]
                ).map(
                  (level) => {
                    const style =
                      SEVERITY_STYLES[
                        level
                      ];

                    const isSelected =
                      severity ===
                      level;

                    return (
                      <button
                        key={
                          level
                        }
                        type="button"
                        onClick={() =>
                          setSeverity(
                            level
                          )
                        }
                        className={`p-3 rounded-2xl border text-center transition font-bold text-xs ${
                          isSelected
                            ? `${style.bg} ${style.border} ${style.text} ring-2 ring-current`
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {level.toUpperCase()}
                      </button>
                    );
                  }
                )}

              </div>

            </div>

            {/* CONTACT */}

            <div className="rounded-2xl border border-[rgba(53,98,103,0.12)] bg-(--color-soft-mint) p-4 space-y-3">

              <span className="text-xs font-bold uppercase tracking-wider text-(--color-ocean)">
                Citizen Contact (Optional)
              </span>

              <p className="text-xs text-(--color-medium-teal)">
                Optional contact details for status notifications.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">

                <input
                  type="text"
                  value={
                    contactName
                  }
                  onChange={(
                    event
                  ) =>
                    setContactName(
                      event.target.value
                    )
                  }
                  placeholder="Your Name (optional)"
                  maxLength={100}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-(--color-deep-ocean) focus:outline-none focus:border-(--color-ocean)"
                />

                <input
                  type="tel"
                  value={
                    contactPhone
                  }
                  onChange={(
                    event
                  ) =>
                    setContactPhone(
                      event.target.value
                    )
                  }
                  placeholder="Phone Number (optional)"
                  maxLength={20}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-(--color-deep-ocean) focus:outline-none focus:border-(--color-ocean)"
                />

              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[rgba(53,98,103,0.1)]">

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(2)
                }
                className="flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-(--color-dark-teal) hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                disabled={
                  !problemType
                }
                onClick={() =>
                  setCurrentStep(4)
                }
                className="flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--color-deep-ocean) disabled:opacity-50 active:scale-95 transition"
              >
                Continue to Location
                <ArrowRight className="h-4 w-4" />
              </button>

            </div>

          </div>
        )}

        {/* ======================================================
            STEP 4 — LOCATION
        ====================================================== */}

        {currentStep === 4 && (
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-sm space-y-6 animate-fadeIn">

            <div className="border-b border-[rgba(53,98,103,0.1)] pb-4">

              <span className="text-xs font-bold uppercase tracking-wider text-(--color-ocean)">
                Step 4 of 5
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-(--color-deep-ocean)">
                Incident Location
              </h2>

              <p className="text-xs sm:text-sm text-(--color-medium-teal) mt-1">
                Pinpoint where the water problem is located.
              </p>

            </div>

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() => {
                  setLocationMode(
                    "automatic"
                  );

                  if (!autoCoords) {
                    requestGeo();
                  }
                }}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 font-bold text-xs sm:text-sm transition ${
                  locationMode ===
                  "automatic"
                    ? "border-(--color-ocean) bg-(--color-mint)/60 text-(--color-deep-ocean) shadow-xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Navigation className="h-4 w-4 text-(--color-ocean)" />
                Use Current Location
              </button>

              <button
                type="button"
                onClick={() =>
                  setLocationMode(
                    "manual"
                  )
                }
                className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 font-bold text-xs sm:text-sm transition ${
                  locationMode ===
                  "manual"
                    ? "border-(--color-ocean) bg-(--color-mint)/60 text-(--color-deep-ocean) shadow-xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <MapPin className="h-4 w-4 text-(--color-ocean)" />
                Select Manually
              </button>

            </div>

            {locationMode ===
              "automatic" && (
              <div className="rounded-2xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint) p-4 sm:p-5 space-y-4">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />

                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>

                    <span className="text-xs font-bold text-emerald-800">
                      GPS Automatic Detection Active
                    </span>

                  </div>

                  <button
                    type="button"
                    onClick={
                      requestGeo
                    }
                    disabled={
                      geoLoading
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold text-(--color-ocean) hover:underline"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${
                        geoLoading
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    Refresh Coordinates
                  </button>

                </div>

                {geoLoading ? (
                  <div className="flex items-center gap-2 text-xs text-(--color-medium-teal) py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-(--color-ocean)" />

                    Acquiring coordinates...
                  </div>
                ) : autoCoords ? (
                  <div className="bg-white p-4 rounded-2xl border border-[rgba(53,98,103,0.12)] space-y-2">

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-bold text-(--color-deep-ocean)">
                        Location Detected
                      </span>

                      <span className="font-mono text-xs text-(--color-ocean) font-bold">
                        {autoCoords.lat.toFixed(
                          5
                        )}
                        ° N,{" "}
                        {autoCoords.lng.toFixed(
                          5
                        )}
                        ° E
                      </span>

                    </div>

                    <p className="text-xs text-(--color-medium-teal)">
                      GPS location captured from device.
                    </p>

                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">

                    <p className="font-bold">
                      Geolocation Notice
                    </p>

                    <p className="mt-0.5">
                      {geoError ||
                        "Unable to acquire GPS automatically."}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setLocationMode(
                          "manual"
                        )
                      }
                      className="mt-2 text-xs font-bold text-amber-900 underline"
                    >
                      Switch to Manual Location
                    </button>

                  </div>
                )}

              </div>
            )}

            {locationMode ===
              "manual" && (
              <div className="space-y-4">

                <div>

                  <label className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal) mb-2">
                    Quick Preset Coastal Areas
                  </label>

                  

                </div>

                <div>

                  <label
                    htmlFor="manual-address"
                    className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal) mb-1"
                  >
                    Street / Area Name{" "}
                    <span className="text-rose-500">
                      *
                    </span>
                  </label>

                  <input
                    id="manual-address"
                    type="text"
                    value={
                      manualAddress
                    }
                    onChange={(
                      event
                    ) =>
                      setManualAddress(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Main Road near drainage junction"
                    maxLength={300}
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50/50 p-3 text-xs sm:text-sm text-(--color-deep-ocean) focus:bg-white focus:border-(--color-ocean) focus:outline-none"
                  />

                </div>

                <div>

                  <label
                    htmlFor="manual-landmark"
                    className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal) mb-1"
                  >
                    Landmark (Optional)
                  </label>

                  <input
                    id="manual-landmark"
                    type="text"
                    value={
                      manualLandmark
                    }
                    onChange={(
                      event
                    ) =>
                      setManualLandmark(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Opposite Post Office"
                    maxLength={200}
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50/50 p-3 text-xs sm:text-sm text-(--color-deep-ocean) focus:bg-white focus:border-(--color-ocean) focus:outline-none"
                  />

                </div>

              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[rgba(53,98,103,0.1)]">

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(3)
                }
                className="flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-(--color-dark-teal) hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
              disabled={
  !effectiveLocation ||
  (locationMode === "manual" &&
    !manualCoords)
}
                onClick={() =>
                  setCurrentStep(5)
                }
                className="flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--color-deep-ocean) disabled:opacity-50 active:scale-95 transition"
              >
                Review Report
                <ArrowRight className="h-4 w-4" />
              </button>

            </div>

          </div>
        )}

        {/* ======================================================
            STEP 5 — REVIEW
        ====================================================== */}

        {currentStep === 5 && (
          <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-sm space-y-6 animate-fadeIn">

            <div className="border-b border-[rgba(53,98,103,0.1)] pb-4">

              <span className="text-xs font-bold uppercase tracking-wider text-(--color-ocean)">
                Step 5 of 5
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-(--color-deep-ocean)">
                Review &amp; Confirm Submission
              </h2>

              <p className="text-xs sm:text-sm text-(--color-medium-teal) mt-1">
                Verify your report before sending it to the backend processing pipeline.
              </p>

            </div>

            {/* PROBLEM */}

            <div className="flex items-start justify-between rounded-2xl bg-(--color-soft-mint) p-4 border border-[rgba(53,98,103,0.12)]">

              <div>

                <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-medium-teal)">
                  Problem Type
                </span>

                <p className="text-base font-black text-(--color-deep-ocean) mt-0.5">
                  {
                    WATER_PROBLEM_CATEGORIES.find(
                      (category) =>
                        category.id ===
                        problemType
                    )?.label ||
                    problemType
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(2)
                }
                className="text-xs font-bold text-(--color-ocean) underline"
              >
                Edit
              </button>

            </div>

            {/* TITLE */}

            <div className="rounded-2xl bg-(--color-soft-mint) p-4 border border-[rgba(53,98,103,0.12)] space-y-2">

              <div className="flex items-center justify-between">

                <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-medium-teal)">
                  Report Title
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentStep(3)
                  }
                  className="text-xs font-bold text-(--color-ocean) underline"
                >
                  Edit
                </button>

              </div>

              <p className="text-sm font-bold text-(--color-deep-ocean)">
                {title.trim()
                  ? title
                  : "Title will be generated by the backend AI pipeline if left empty."}
              </p>

            </div>

            {/* DESCRIPTION */}

            <div className="rounded-2xl bg-(--color-soft-mint) p-4 border border-[rgba(53,98,103,0.12)] space-y-2">

              <div className="flex items-center justify-between">

                <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-medium-teal)">
                  Description &amp; Severity
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentStep(3)
                  }
                  className="text-xs font-bold text-(--color-ocean) underline"
                >
                  Edit
                </button>

              </div>

              <p className="text-xs sm:text-sm text-(--color-deep-ocean) leading-relaxed">

                {description.trim()
                  ? description
                  : "No description provided — backend AI can generate a description from the report evidence and category."}

              </p>

              <div className="pt-1">

                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white uppercase"
                  style={{
                    background:
                      SEVERITY_STYLES[
                        severity
                      ].hex,
                  }}
                >
                  {severity} Severity
                </span>

              </div>

            </div>

            {/* LOCATION */}

            <div className="flex items-start justify-between rounded-2xl bg-(--color-soft-mint) p-4 border border-[rgba(53,98,103,0.12)]">

              <div>

                <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-medium-teal)">
                  Location Target
                </span>

                <p className="text-xs sm:text-sm font-bold text-(--color-deep-ocean) mt-0.5">
  📍{" "}
  {effectiveLocation?.mode === "automatic"
    ? "Current GPS Location"
    : effectiveLocation?.address ||
      effectiveLocation?.placeName ||
      "Manual Location"}
</p>

                {effectiveLocation && (
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">

                    {effectiveLocation.coords.lat.toFixed(
                      4
                    )}
                    ° N,{" "}
                    {effectiveLocation.coords.lng.toFixed(
                      4
                    )}
                    ° E (
                    {
                      effectiveLocation.mode
                    }
                    )

                  </p>
                )}

              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(4)
                }
                className="text-xs font-bold text-(--color-ocean) underline"
              >
                Edit
              </button>

            </div>

            {/* EVIDENCE */}

            <div className="flex items-center justify-between rounded-2xl bg-(--color-soft-mint) p-4 border border-[rgba(53,98,103,0.12)]">

              <div>

                <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-medium-teal)">
                  Attached Evidence
                </span>

                <p className="text-xs sm:text-sm font-bold text-(--color-deep-ocean) mt-0.5">
                  {
                    mediaPreviews.length
                  }{" "}
                  File
                  {mediaPreviews.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  attached
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(1)
                }
                className="text-xs font-bold text-(--color-ocean) underline"
              >
                Edit
              </button>

            </div>

            {/* BACKEND AI NOTICE */}

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">

              <div className="flex items-start gap-3">

                <Sparkles className="h-5 w-5 shrink-0 text-indigo-600" />

                <div>

                  <p className="text-xs font-bold text-indigo-900">
                    Final AI Processing
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-indigo-700">
                    The backend performs final validation, media checks,
                    hazard analysis, ML/Gemini fallback processing,
                    duplicate checking, confidence evaluation, and
                    priority calculation. If title or description is empty,
                    the backend can generate them.
                  </p>

                </div>

              </div>

            </div>

            {/* SUBMIT */}

            <div className="space-y-3 pt-4 border-t border-[rgba(53,98,103,0.1)]">

              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-(--color-deep-ocean) active:scale-98 disabled:opacity-50 transition"
              >

                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />

                    <span>
                      Processing Report...
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />

                    <span>
                      Submit Official Water Report
                    </span>
                  </>
                )}

              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(4)
                }
                disabled={
                  isSubmitting
                }
                className="w-full text-center text-xs font-bold text-(--color-medium-teal) hover:underline py-1"
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