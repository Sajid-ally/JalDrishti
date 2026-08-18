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
  AIAnalysisReportData,
} from "../../types/report";
import type { Severity } from "../../types/hazard";
import { SEVERITY_STYLES } from "../../types/hazard";
import { useGeolocation } from "../../hooks/useGeolocation";
import { submitWaterReport, analyzeWaterMedia } from "../../services/reportService";
import { CITY_LOCALITIES_MAP } from "../../data/indiaLocations";

// Category icon mapper
const CATEGORY_ICONS: Record<WaterProblemType, React.ReactNode> = {
  urban_flooding: <Waves className="h-6 w-6 text-blue-600" />,
  waterlogging: <Droplets className="h-6 w-6 text-cyan-600" />,
  drainage_problem: <Pipette className="h-6 w-6 text-teal-600" />,
  pond_lake_issue: <CircleDot className="h-6 w-6 text-emerald-600" />,
  water_quality_pollution: <AlertTriangle className="h-6 w-6 text-amber-600" />,
  other: <HelpCircle className="h-6 w-6 text-slate-600" />,
};

// Preset coastal & urban locations for quick manual selection
const PRESET_LOCATIONS = [
  {
    name: "Bhauti / PSIT, Kanpur",
    lat: 26.4485,
    lng: 80.2085,
    locality: "Bhauti",
    city: "Kanpur",
    landmark: "Near PSIT Campus",
  },
  {
    name: "Colonelganj, Kanpur",
    lat: 26.4675,
    lng: 80.3325,
    locality: "Colonelganj",
    city: "Kanpur",
    landmark: "Near Main Market",
  },
  {
    name: "Bakarmandi / Sisamau, Kanpur",
    lat: 26.4635,
    lng: 80.3295,
    locality: "Bakarmandi",
    city: "Kanpur",
    landmark: "Near Sisamau Drain",
  },
  {
    name: "Kidwai Nagar, Kanpur",
    lat: 26.4410,
    lng: 80.3420,
    locality: "Kidwai Nagar",
    city: "Kanpur",
    landmark: "Near Block H Park",
  },
  {
    name: "Civil Lines, Kanpur",
    lat: 26.4760,
    lng: 80.3465,
    locality: "Civil Lines",
    city: "Kanpur",
    landmark: "Near VIP Road",
  },
  {
    name: "VIP Road / Sea Beach, Puri",
    lat: 19.7983,
    lng: 85.8249,
    locality: "Sea Beach",
    city: "Puri",
    landmark: "Near Light House",
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
  const [title, setTitle] = useState("");
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
  const [manualLocality, setManualLocality] = useState<string>("");
  const [manualCity, setManualCity] = useState<string>("");
  const [manualDistrict, setManualDistrict] = useState<string>("");
  const [manualState, setManualState] = useState<string>("");

  // AI Assist preview state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AIAnalysisReportData | null>(null);
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

  // Live Geocoding for manual typed location
  useEffect(() => {
    if (locationMode !== "manual" || !manualAddress.trim() || manualAddress.length < 3) return;
    const timer = setTimeout(async () => {
      try {
        const query = encodeURIComponent(manualAddress.trim() + " India");
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&addressdetails=1`, {
          headers: { "Accept-Language": "en" }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const item = data[0];
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            setManualCoordsState({ lat, lng });
            const addr = item.address || {};
            const city = addr.city || addr.town || addr.municipality || addr.village || addr.district || "Kanpur";
            const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || manualAddress.trim();
            const state = addr.state || "Uttar Pradesh";
            const district = addr.state_district || addr.district || addr.county || city;
            setManualLocality(locality);
            setManualCity(city);
            setManualDistrict(district);
            setManualState(state);
          }
        }
      } catch {
        // preserve fallback
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [manualAddress, locationMode]);

  // Reverse geocoded location details for live automatic GPS mode
  const [geoAddress, setGeoAddress] = useState<string>("");
  const [geoCity, setGeoCity] = useState<string>("");
  const [geoDistrict, setGeoDistrict] = useState<string>("");
  const [geoState, setGeoState] = useState<string>("");
  const [geoLocality, setGeoLocality] = useState<string>("");
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  useEffect(() => {
    if (autoCoords) {
      let isMounted = true;
      setIsGeocoding(true);
      const fetchReverseGeocode = async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${autoCoords.lat}&lon=${autoCoords.lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok && isMounted) {
            const data = await res.json();
            const addr = data.address || {};
            const state = addr.state || "";
            const district = addr.state_district || addr.district || addr.county || "";
            const city = addr.city || addr.town || addr.municipality || addr.village || "";
            const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.quarter || "";
            const parts = [locality, city, district, state].filter(Boolean);
            const formatted = data.display_name || parts.join(", ");

            setGeoAddress(formatted);
            setGeoCity(city);
            setGeoDistrict(district);
            setGeoState(state);
            setGeoLocality(locality);
          }
        } catch (err) {
          console.warn("Client reverse geocoding notice:", err);
        } finally {
          if (isMounted) setIsGeocoding(false);
        }
      };
      fetchReverseGeocode();
      return () => {
        isMounted = false;
      };
    }
  }, [autoCoords]);

  // Smart parser for manual addresses and landmarks
  const parseManualAddressDetails = (text: string) => {
    const t = (text || "").toLowerCase();
    let city = "Kanpur";
    let state = "Uttar Pradesh";
    let district = "Kanpur Nagar";
    let locality = text.trim();
    let lat = 26.4730;
    let lng = 80.3345;

    if (
      t.includes("kanpur") ||
      t.includes("bhauti") ||
      t.includes("psit") ||
      t.includes("green park") ||
      t.includes("vip road") ||
      t.includes("hazelnut") ||
      t.includes("civil lines") ||
      t.includes("bakarmandi") ||
      t.includes("sisamau") ||
      t.includes("kidwai nagar") ||
      t.includes("kakadeo")
    ) {
      city = "Kanpur";
      state = "Uttar Pradesh";
      district = "Kanpur Nagar";
      if (t.includes("bhauti") || t.includes("psit")) {
        lat = 26.4485;
        lng = 80.2085;
        locality = "Bhauti / PSIT";
      } else if (t.includes("green park") || t.includes("vip road") || t.includes("hazelnut")) {
        lat = 26.4760;
        lng = 80.3465;
        locality = "VIP Road / Green Park";
      } else if (t.includes("bakarmandi") || t.includes("sisamau")) {
        lat = 26.4635;
        lng = 80.3295;
        locality = "Bakarmandi / Sisamau";
      } else if (t.includes("kidwai nagar")) {
        lat = 26.4410;
        lng = 80.3420;
        locality = "Kidwai Nagar";
      } else if (t.includes("kakadeo")) {
        lat = 26.4735;
        lng = 80.2930;
        locality = "Kakadeo";
      }
    } else if (t.includes("puri") || t.includes("swargadwar") || t.includes("badadanda") || t.includes("sea beach")) {
      city = "Puri";
      state = "Odisha";
      district = "Puri";
      lat = 19.8135;
      lng = 85.8312;
    } else if (t.includes("lucknow") || t.includes("hazratganj") || t.includes("gomti")) {
      city = "Lucknow";
      state = "Uttar Pradesh";
      district = "Lucknow";
      lat = 26.8467;
      lng = 80.9462;
    } else if (t.includes("bhubaneswar") || t.includes("nandankanan") || t.includes("patia")) {
      city = "Bhubaneswar";
      state = "Odisha";
      district = "Khordha";
      lat = 20.2961;
      lng = 85.8245;
    }

    return { city, state, district, locality, lat, lng };
  };

  // Derived effective location
  const effectiveLocation: ReportLocation | null = useMemo(() => {
    if (locationMode === "automatic" && autoCoords) {
      const parts = [geoLocality, geoCity, geoDistrict, geoState].filter(Boolean);
      const place = parts.length > 0 ? parts.join(", ") : `GPS Location (${autoCoords.lat.toFixed(4)}, ${autoCoords.lng.toFixed(4)})`;
      const fullAddress = geoAddress || place;

      const locObj: ReportLocation = {
        coords: autoCoords,
        address: fullAddress,
        placeName: place,
        landmark: geoLocality ? `Near ${geoLocality}` : "Detected via Device Geolocation",
        mode: "automatic",
      };
      (locObj as any).locality = geoLocality;
      (locObj as any).city = geoCity;
      (locObj as any).district = geoDistrict;
      (locObj as any).state = geoState;
      return locObj;
    }

    if (locationMode === "manual" && (manualCoords || manualAddress.trim())) {
      const parsed = parseManualAddressDetails(manualAddress);
      const userLat = manualCoords?.lat ?? parsed.lat;
      const userLng = manualCoords?.lng ?? parsed.lng;

      const locObj: ReportLocation = {
        coords: { lat: userLat, lng: userLng },
        address: manualAddress.trim() || parsed.locality || "Manual Selected Incident Area",
        placeName: manualAddress.trim() || parsed.locality || "Incident Location",
        landmark: manualLandmark.trim() || undefined,
        mode: "manual",
      };
      (locObj as any).locality = manualLocality || parsed.locality;
      (locObj as any).city = manualCity || parsed.city;
      (locObj as any).district = manualDistrict || parsed.district;
      (locObj as any).state = manualState || parsed.state;
      return locObj;
    }

    return null;
  }, [
    locationMode,
    autoCoords,
    manualCoords,
    manualAddress,
    manualLandmark,
    manualLocality,
    manualCity,
    manualDistrict,
    manualState,
    geoAddress,
    geoCity,
    geoDistrict,
    geoState,
    geoLocality,
  ]);

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

  const mapIssueToCategory = (detectedIssue: string): WaterProblemType => {
    const raw = (detectedIssue || "").toLowerCase().replace(/[-_]/g, " ");
    if (raw.includes("pond") || raw.includes("lake")) return "pond_lake_issue";
    if (raw.includes("drain") || raw.includes("sewage")) return "drainage_problem";
    if (raw.includes("flood") || raw.includes("inundat")) return "urban_flooding";
    if (raw.includes("waterlog")) return "waterlogging";
    if (raw.includes("pollut") || raw.includes("quality") || raw.includes("contaminat")) return "water_quality_pollution";
    return "other";
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    const catId = mapIssueToCategory(aiSuggestion.detectedIssue);
    setProblemType(catId);
    if (aiSuggestion.severity) {
      setSeverity(aiSuggestion.severity);
    }
    if (aiSuggestion.title) {
      setTitle(aiSuggestion.title);
    }
    if (aiSuggestion.summary) {
      setDescription(aiSuggestion.summary);
    }
    setAiApplied(true);
    toast.success("AI Analysis applied: Problem Type, Title & Description auto-filled!");
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemType || !effectiveLocation) {
      toast.error("Please select a problem category and location before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const draft: SubmitReportDraft = {
        title: title.trim() || undefined,
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
        if (result.duplicate && result.duplicateMessage) {
          toast(result.duplicateMessage, { icon: "ℹ️" });
        }
        toast.success(`Report submitted successfully! ID: ${result.report.id}`);
      }
    } catch (err: any) {
      console.error("Submission failed:", err);
      toast.error(err?.message || "Failed to submit report. Please try again.");
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
      <main className="min-h-screen py-6 sm:py-10 text-(--color-dark-teal)">
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
              <h1 className="mt-3 text-2xl sm:text-3xl font-black text-(--color-deep-ocean)">
                Report Submitted Successfully
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-(--color-medium-teal) leading-relaxed">
                Your water problem incident has been logged with real-time location data. Municipal disaster control teams have received the dispatch notice.
              </p>
            </div>

            {/* Prominent Report ID Box */}
            <div className="rounded-3xl border-2 border-(--color-ocean) bg-(--color-soft-mint) p-5 sm:p-6 text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-(--color-medium-teal)">
                Your Unique Report ID
              </p>
              <p className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-(--color-ocean) select-all">
                {submittedReportId}
              </p>
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-[rgba(53,98,103,0.2)] px-4 py-2 text-xs font-bold text-(--color-deep-ocean) hover:bg-(--color-pale-aqua) active:scale-95 transition shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-(--color-ocean)" />
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
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--color-deep-ocean) active:scale-95 transition"
              >
                <Search className="h-4 w-4" />
                Track Report Now
              </button>

              <button
                type="button"
                onClick={resetForm}
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

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP-BASED REPORT FORM
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen space-y-6 text-(--color-dark-teal) pb-24 lg:pb-8">
      {/* Header Banner */}
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
              Capture evidence, select problem category, and submit with instant location tagging.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/citizen/track-report")}
            className="inline-flex items-center gap-2 text-xs font-bold text-(--color-ocean) hover:underline self-start sm:self-auto"
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
                        ? "bg-(--color-ocean) text-white ring-4 ring-(--color-ocean)/20 shadow-sm"
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

      {/* Main Multi-Step Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ─────────────────────────────────────────────────────────────
            STEP 1: SELECT / CAPTURE EVIDENCE
        ───────────────────────────────────────────────────────────── */}
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
                Upload photos or short video clips from the ground. Visuals allow AI and responders to verify severity quickly.
              </p>
            </div>

            {/* Media Upload Buttons */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Camera Direct Capture */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
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

              {/* Gallery / File Picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-(--color-dark-teal)">
                    Selected Media ({mediaPreviews.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-(--color-ocean) hover:underline"
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

            {/* AI Assistant Banner & Quality Gate */}
            {(aiLoading || aiSuggestion) && (
              aiSuggestion && aiSuggestion.isRelevant === false ? (
                <div className="rounded-3xl border-2 border-red-300 bg-red-50/95 p-5 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-red-900">
                      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                      <span>⚠️ Non-Hazard Image Detected (Rejected)</span>
                    </div>
                    <span className="text-[11px] font-bold text-red-800 bg-white px-2.5 py-1 rounded-full border border-red-200 shadow-2xs">
                      {aiSuggestion.sourceLabel || "JalDrishti Quality Gate"}
                    </span>
                  </div>

                  <p className="text-xs text-red-800 leading-relaxed bg-white/70 p-3 rounded-xl border border-red-200">
                    {aiSuggestion.summary || "The uploaded image appears to be a selfie, portrait, animal, indoor photo, or non-hazard subject. No outdoor water hazard was detected."}
                  </p>

                  <div className="pt-1 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMediaFiles([]);
                        setMediaPreviews([]);
                        setAiSuggestion(null);
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 active:scale-95 transition shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Clear Hazard Photo
                    </button>
                    <span className="text-[11px] text-red-700 font-semibold">
                      Please upload a photo of flooding, waterlogging, or drainage issues.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-indigo-200 bg-indigo-50/80 p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <span>AI Vision Verification &amp; Enrichment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-indigo-900 bg-white px-2.5 py-1 rounded-full border border-indigo-200 shadow-2xs">
                        {aiSuggestion?.sourceLabel || (aiSuggestion?.source === "gemini" ? "Verified by Gemini AI" : "Detected by MobileNetV2 ML Service")}
                      </span>
                      <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100/80 px-2 py-1 rounded-full">
                        {aiSuggestion ? `${Math.round(aiSuggestion.confidence * 100)}% Conf` : "Scanning…"}
                      </span>
                    </div>
                  </div>

                  {aiLoading ? (
                    <p className="text-xs text-indigo-700 flex items-center gap-2 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      Analyzing hazard with MobileNetV2 ML &amp; Gemini AI quality check…
                    </p>
                  ) : aiSuggestion ? (
                    <div className="space-y-2.5 text-xs text-indigo-950">
                      <div>
                        <span className="font-semibold text-indigo-800 text-[11px]">Suggested Title:</span>
                        <p className="font-bold text-sm text-indigo-950">{aiSuggestion.title || `${aiSuggestion.detectedIssue} Incident`}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-indigo-800 text-[11px]">Suggested Description:</span>
                        <p className="text-indigo-900 text-xs italic bg-white/70 p-2.5 rounded-xl border border-indigo-100">{aiSuggestion.summary}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-indigo-800">
                        <span>Problem Type: <strong>{aiSuggestion.detectedIssue}</strong></span>
                        <span>·</span>
                        <span>Severity: <strong className="uppercase" style={{ color: SEVERITY_STYLES[aiSuggestion.severity as Severity]?.hex || "#0284c7" }}>{aiSuggestion.severity}</strong></span>
                      </div>

                      {!aiApplied && (
                        <button
                          type="button"
                          onClick={applyAiSuggestion}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition shadow-sm"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Use This Suggestion (Auto-Fill Title &amp; Description)
                        </button>
                      )}
                      {aiApplied && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 pt-1">
                          <Check className="h-3.5 w-3.5" />
                          Suggestion applied to report draft
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  if (aiSuggestion && aiSuggestion.isRelevant === false) {
                    toast.error("Please upload a photo of a real water hazard (selfies / non-hazard photos are rejected).");
                    return;
                  }
                  setCurrentStep(2);
                }}
                disabled={aiSuggestion?.isRelevant === false}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--color-deep-ocean) active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              <span className="text-xs font-bold uppercase tracking-wider text-(--color-ocean)">
                Step 2 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-(--color-deep-ocean)">
                Select Problem Category
              </h2>
              <p className="text-xs sm:text-sm text-(--color-medium-teal) mt-1">
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
                        ? "border-(--color-ocean) bg-(--color-mint)/50 ring-4 ring-(--color-ocean)/15 shadow-sm"
                        : "border-[rgba(53,98,103,0.14)] bg-white hover:border-(--color-ocean) hover:bg-(--color-soft-mint)"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-xs border border-[rgba(53,98,103,0.12)]">
                        {CATEGORY_ICONS[cat.id]}
                      </div>

                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? "border-(--color-ocean) bg-(--color-ocean) text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-(--color-deep-ocean)">
                      {cat.label}
                    </h3>
                    <p className="mt-1 text-xs text-(--color-medium-teal) leading-relaxed">
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
                className="flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-(--color-dark-teal) hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                disabled={!problemType}
                onClick={() => setCurrentStep(3)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--color-deep-ocean) disabled:opacity-50 active:scale-95 transition"
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
              <span className="text-xs font-bold uppercase tracking-wider text-(--color-ocean)">
                Step 3 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-(--color-deep-ocean)">
                Describe the Situation
              </h2>
              <p className="text-xs sm:text-sm text-(--color-medium-teal) mt-1">
                Provide details regarding water levels, traffic blockage, or affected households.
              </p>
            </div>

            {/* Report Title (Optional — AI auto-generates if empty) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="report-title" className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal)">
                  Report Title
                </label>
                <span className="text-[11px] text-slate-400 font-normal">Optional — AI auto-generates if empty</span>
              </div>
              <input
                id="report-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Severe Waterlogging on Main Road (or leave blank for AI auto-title)"
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50/50 p-3.5 text-xs sm:text-sm text-(--color-deep-ocean) focus:border-(--color-ocean) focus:bg-white focus:ring-4 focus:ring-(--color-ocean)/10 focus:outline-none transition"
              />
            </div>

            {/* Description Textarea (Optional — AI auto-generates if empty) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="report-desc" className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal)">
                  Detailed Description
                </label>
                <span className="text-[11px] text-slate-400 font-normal">Optional — AI auto-generates if empty</span>
              </div>
              <textarea
                id="report-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened (or leave empty to let JalDrishti AI generate a concise description from your image)..."
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50/50 p-4 text-sm text-(--color-deep-ocean) focus:border-(--color-ocean) focus:bg-white focus:ring-4 focus:ring-(--color-ocean)/10 focus:outline-none transition resize-none"
              />
              <div className="flex justify-between text-[11px] text-(--color-medium-teal)">
                <span>Optional: Leave empty for automatic AI generation</span>
                <span>{description.trim().length} chars</span>
              </div>
            </div>

            {/* Severity Level Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal)">
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
            <div className="rounded-2xl border border-[rgba(53,98,103,0.12)] bg-(--color-soft-mint) p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-(--color-ocean)">
                Citizen Contact (Optional)
              </span>
              <p className="text-xs text-(--color-medium-teal)">
                Optional: Provide contact info if you wish to receive SMS updates from field officers.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your Name (optional)"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-(--color-deep-ocean) focus:outline-none focus:border-(--color-ocean)"
                />
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Phone Number (optional)"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-(--color-deep-ocean) focus:outline-none focus:border-(--color-ocean)"
                />
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[rgba(53,98,103,0.1)]">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-(--color-dark-teal) hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--color-deep-ocean) active:scale-95 transition"
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
              <span className="text-xs font-bold uppercase tracking-wider text-(--color-ocean)">
                Step 4 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-(--color-deep-ocean)">
                Incident Location
              </h2>
              <p className="text-xs sm:text-sm text-(--color-medium-teal) mt-1">
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
                    ? "border-(--color-ocean) bg-(--color-mint)/60 text-(--color-deep-ocean) shadow-xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Navigation className="h-4 w-4 text-(--color-ocean)" />
                Use Current Location
              </button>

              <button
                type="button"
                onClick={() => setLocationMode("manual")}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 font-bold text-xs sm:text-sm transition ${
                  locationMode === "manual"
                    ? "border-(--color-ocean) bg-(--color-mint)/60 text-(--color-deep-ocean) shadow-xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <MapPin className="h-4 w-4 text-(--color-ocean)" />
                Select Manually
              </button>
            </div>

            {/* AUTOMATIC MODE DISPLAY */}
            {locationMode === "automatic" && (
              <div className="rounded-2xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint) p-4 sm:p-5 space-y-4">
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
                    className="inline-flex items-center gap-1 text-xs font-bold text-(--color-ocean) hover:underline"
                  >
                    <RefreshCw className={`h-3 w-3 ${geoLoading ? "animate-spin" : ""}`} />
                    Refresh Coordinates
                  </button>
                </div>

                {geoLoading ? (
                  <div className="flex items-center gap-2 text-xs text-(--color-medium-teal) py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-(--color-ocean)" />
                    Acquiring high-accuracy satellite coordinates…
                  </div>
                ) : autoCoords ? (
                  <div className="bg-white p-4 rounded-2xl border border-[rgba(53,98,103,0.12)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-(--color-deep-ocean)">
                        {geoCity ? `${geoCity}, ${geoState}` : "Current Location Detected"}
                      </span>
                      <span className="font-mono text-xs text-(--color-ocean) font-bold">
                        {autoCoords.lat.toFixed(5)}° N, {autoCoords.lng.toFixed(5)}° E
                      </span>
                    </div>

                    {isGeocoding ? (
                      <p className="text-xs text-(--color-medium-teal) flex items-center gap-1.5 py-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-(--color-ocean)" />
                        Detecting city, district &amp; area name…
                      </p>
                    ) : geoAddress ? (
                      <p className="text-xs text-(--color-deep-ocean) font-medium leading-relaxed bg-(--color-soft-mint) p-2.5 rounded-xl border border-[rgba(53,98,103,0.1)]">
                        📍 {geoAddress}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-(--color-dark-teal)">
                      {geoLocality && <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Area: <strong>{geoLocality}</strong></span>}
                      {geoCity && <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">City: <strong>{geoCity}</strong></span>}
                      {geoDistrict && <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">District: <strong>{geoDistrict}</strong></span>}
                      {geoState && <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">State: <strong>{geoState}</strong></span>}
                    </div>

                    {/* Area / Locality Specific Entry & Suggestions (e.g. Bakarmandi, Lakarmandi, Colonelganj, Civil Lines) */}
                    <div className="pt-2 border-t border-[rgba(53,98,103,0.1)] space-y-2">
                      <label className="block text-xs font-bold text-(--color-deep-ocean) uppercase tracking-wider">
                        Specific Locality / Road Name (Optional):
                      </label>
                      <input
                        type="text"
                        value={geoLocality}
                        onChange={(e) => setGeoLocality(e.target.value)}
                        placeholder={`e.g. Bakarmandi, Lakarmandi, Colonelganj, Civil Lines, etc.`}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-(--color-deep-ocean) focus:outline-none focus:border-(--color-ocean)"
                      />

                      {/* Quick Locality Chips */}
                      {geoCity && CITY_LOCALITIES_MAP[geoCity] && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-bold text-(--color-medium-teal) mr-1">
                            {geoCity} Localities:
                          </span>
                          {CITY_LOCALITIES_MAP[geoCity].slice(0, 8).map((loc) => (
                            <button
                              key={loc.name}
                              type="button"
                              onClick={() => setGeoLocality(loc.name)}
                              className={`px-2.5 py-1 rounded-lg text-xs transition ${
                                geoLocality === loc.name
                                  ? "bg-(--color-ocean) text-white font-bold shadow-2xs"
                                  : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-(--color-pale-aqua)"
                              }`}
                            >
                              📍 {loc.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal) mb-2">
                    Quick Preset Coastal & Urban Areas
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
                          setManualLocality(preset.locality);
                          setManualCity(preset.city);
                          setManualDistrict(preset.city);
                          setManualState(preset.city === "Puri" ? "Odisha" : "Uttar Pradesh");
                        }}
                        className={`rounded-xl border px-3 py-2 text-xs text-left transition ${
                          manualAddress === preset.name
                            ? "border-(--color-ocean) bg-(--color-pale-aqua) font-bold text-(--color-deep-ocean)"
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
                    <label htmlFor="manual-address" className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal) mb-1">
                      Street / Area Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="manual-address"
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="e.g. MG Road near Town Hall or Sector 4 Beach Promenade"
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50/50 p-3 text-xs sm:text-sm text-(--color-deep-ocean) focus:bg-white focus:border-(--color-ocean) focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="manual-landmark" className="block text-xs font-bold uppercase tracking-wider text-(--color-dark-teal) mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      id="manual-landmark"
                      type="text"
                      value={manualLandmark}
                      onChange={(e) => setManualLandmark(e.target.value)}
                      placeholder="e.g. Opposite Post Office or Hotel Grand"
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50/50 p-3 text-xs sm:text-sm text-(--color-deep-ocean) focus:bg-white focus:border-(--color-ocean) focus:outline-none"
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
                className="flex items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-5 py-3 text-xs sm:text-sm font-bold text-(--color-dark-teal) hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                disabled={!effectiveLocation}
                onClick={() => setCurrentStep(5)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--color-deep-ocean) disabled:opacity-50 active:scale-95 transition"
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
              <span className="text-xs font-bold uppercase tracking-wider text-(--color-ocean)">
                Step 5 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-(--color-deep-ocean)">
                Review &amp; Confirm Submission
              </h2>
              <p className="text-xs sm:text-sm text-(--color-medium-teal) mt-1">
                Please verify the details below before submitting to the municipal response hub.
              </p>
            </div>

            {/* Summary Review Cards */}
            <div className="space-y-4">
              {/* Problem Type Card */}
              <div className="flex items-start justify-between rounded-2xl bg-(--color-soft-mint) p-4 border border-[rgba(53,98,103,0.12)]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-medium-teal)">
                    Problem Type
                  </span>
                  <p className="text-base font-black text-(--color-deep-ocean) mt-0.5">
                    {WATER_PROBLEM_CATEGORIES.find((c) => c.id === problemType)?.label || problemType}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs font-bold text-(--color-ocean) underline"
                >
                  Edit
                </button>
              </div>

              {/* Title & Description Card */}
              <div className="rounded-2xl bg-(--color-soft-mint) p-4 border border-[rgba(53,98,103,0.12)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-medium-teal)">
                    Report Title &amp; Description
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs font-bold text-(--color-ocean) underline"
                  >
                    Edit
                  </button>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Title:</span>
                  <p className="text-sm font-bold text-(--color-deep-ocean)">
                    {title.trim() || <span className="italic text-indigo-700 font-normal">Will be auto-generated by JalDrishti AI</span>}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description:</span>
                  <p className="text-xs sm:text-sm text-(--color-deep-ocean) leading-relaxed">
                    {description.trim() || <span className="italic text-indigo-700 font-normal">Will be auto-generated by JalDrishti AI from image evidence</span>}
                  </p>
                </div>
                <div className="pt-1 flex items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white uppercase"
                    style={{ background: SEVERITY_STYLES[severity].hex }}
                  >
                    {severity} Severity
                  </span>
                </div>
              </div>

              {/* Location Card */}
              <div className="flex items-start justify-between rounded-2xl bg-(--color-soft-mint) p-4 border border-[rgba(53,98,103,0.12)]">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-medium-teal)">
                    Location Target
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-(--color-deep-ocean)">
                    📍 {effectiveLocation?.address || effectiveLocation?.placeName}
                  </p>
                  {(geoCity || geoDistrict || geoState) && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5 text-[11px] text-(--color-dark-teal)">
                      {geoLocality && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Area: <strong>{geoLocality}</strong></span>}
                      {geoCity && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">City: <strong>{geoCity}</strong></span>}
                      {geoDistrict && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">District: <strong>{geoDistrict}</strong></span>}
                      {geoState && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">State: <strong>{geoState}</strong></span>}
                    </div>
                  )}
                  <p className="text-[10px] font-mono text-slate-500">
                    GPS: {effectiveLocation?.coords.lat.toFixed(5)}° N, {effectiveLocation?.coords.lng.toFixed(5)}° E ({effectiveLocation?.mode.toUpperCase()})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="text-xs font-bold text-(--color-ocean) underline shrink-0"
                >
                  Edit
                </button>
              </div>

              {/* Media Count */}
              <div className="flex items-center justify-between rounded-2xl bg-(--color-soft-mint) p-4 border border-[rgba(53,98,103,0.12)]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-medium-teal)">
                    Attached Evidence
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-(--color-deep-ocean) mt-0.5">
                    {mediaPreviews.length} File{mediaPreviews.length === 1 ? "" : "s"} attached
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-bold text-(--color-ocean) underline"
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
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-(--color-deep-ocean) active:scale-98 disabled:opacity-50 transition"
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
