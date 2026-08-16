import { useState, useEffect, useCallback, type ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Send,
  MapPin,
  Users,
  AlertTriangle,
  Upload,
  X,
  CheckCircle2,
  Clock,
  LifeBuoy,
  AlertCircle,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../../components/common/Badge";
import {
  getRescueRequests,
  submitRescueRequest,
} from "../../services/rescueService";
import type {
  RescueRequestItem,
  RescueRequestStatus,
} from "../../types/rescue";

const STATUS_STEPS: RescueRequestStatus[] = [
  "Submitted",
  "Under Review",
  "Government Assigned",
  "Rescue Team Dispatched",
  "Help Arriving",
  "Resolved",
];

export default function RescueRelief() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "status" ? "status" : "request";

  // ─── Form State ─────────────────────────────────────────────────────────────
  const [requestType, setRequestType] = useState("Flood Evacuation");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [urgency, setUrgency] = useState<"Low" | "Medium" | "High" | "Critical">("High");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── Tracking State ─────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<RescueRequestItem[]>([]);
  const [selectedReq, setSelectedReq] = useState<RescueRequestItem | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoadingTracking(true);
    try {
      const data = await getRescueRequests();
      setRequests(data);
      if (data.length > 0) {
        setSelectedReq((prev) => prev ?? data[0]);
      }
    } finally {
      setLoadingTracking(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const switchTab = (tab: "request" | "status") => {
    setSearchParams({ tab });
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be under 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!location || !description) {
      toast.error("Please enter location and description details.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitRescueRequest({
        type: requestType,
        location,
        description,
        peopleCount: Number(peopleCount) || 1,
        urgency,
        photoUrl: photoPreview || undefined,
      });

      toast.success(`Rescue Request #${created.id} submitted!`);
      // Reset form
      setLocation("");
      setDescription("");
      setPhotoPreview(null);
      setPeopleCount(1);
      setUrgency("High");

      // Refresh list & switch to status tab
      await fetchRequests();
      setSelectedReq(created);
      switchTab("status");
    } catch {
      toast.error("Failed to submit rescue request.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStepIndex = (status: RescueRequestStatus) => {
    return STATUS_STEPS.indexOf(status);
  };

  return (
    <main className="min-h-screen text-(--color-dark-teal) space-y-6">
      <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[rgba(53,98,103,0.12)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
              Emergency Services
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-(--color-deep-ocean)">
              Rescue &amp; Relief
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-(--color-medium-teal)">
              Request emergency rescue assistance and track real-time operational status of ongoing relief efforts.
            </p>
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-(--color-soft-mint) p-1.5 border border-[rgba(53,98,103,0.15)] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => switchTab("request")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "request"
                  ? "bg-(--color-ocean) text-white shadow-sm"
                  : "text-(--color-dark-teal) hover:bg-(--color-pale-aqua)/50"
              }`}
            >
              <Send className="h-4 w-4" />
              Request Rescue
            </button>

            <button
              type="button"
              onClick={() => switchTab("status")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "status"
                  ? "bg-(--color-ocean) text-white shadow-sm"
                  : "text-(--color-dark-teal) hover:bg-(--color-pale-aqua)/50"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Track Status {requests.length > 0 && `(${requests.length})`}
            </button>
          </div>
        </div>

        {/* ================= TAB 1: REQUEST RESCUE FORM ================= */}
        {activeTab === "request" && (
          <div className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
              <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-(--color-soft-mint)/20 p-5 sm:p-6 space-y-5">
                {/* Request Type */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-1">
                    Request Type *
                  </label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean) font-medium"
                  >
                    <option value="Flood Evacuation">Flood Evacuation</option>
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Food & Water Relief">Food &amp; Water Relief</option>
                    <option value="Structural Collapse">Structural Collapse</option>
                    <option value="Other Assistance">Other Emergency Assistance</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-1">
                    Exact Location / Landmark *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. House #42, Beach Road Sector 4"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                    />
                  </div>
                </div>

                {/* Grid for People Count & Urgency */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-1">
                      Number of People Needing Help *
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={peopleCount}
                        onChange={(e) => setPeopleCount(parseInt(e.target.value) || 1)}
                        className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean) font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-1">
                      Severity / Urgency *
                    </label>
                    <div className="relative">
                      <AlertTriangle className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />
                      <select
                        value={urgency}
                        onChange={(e) =>
                          setUrgency(e.target.value as "Low" | "Medium" | "High" | "Critical")
                        }
                        className="w-full appearance-none rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean) font-bold cursor-pointer"
                      >
                        <option value="Low">Low - Non Immediate</option>
                        <option value="Medium">Medium - Standard Request</option>
                        <option value="High">High - Urgent Response Needed</option>
                        <option value="Critical">Critical - Immediate Life Threat</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-1">
                    Description of Emergency *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe current situation, water levels, medical conditions, or hazards..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                  />
                </div>

                {/* Optional Image Upload with Preview */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-2">
                    Optional Site Photo / Evidence
                  </label>

                  {photoPreview ? (
                    <div className="relative inline-block overflow-hidden rounded-3xl border-2 border-(--color-ocean) bg-white p-2">
                      <img
                        src={photoPreview}
                        alt="Rescue preview"
                        className="h-44 w-44 object-cover rounded-2xl"
                      />
                      <div className="mt-2 flex items-center justify-between gap-2 px-1">
                        <label className="cursor-pointer text-xs font-bold text-(--color-ocean) hover:underline">
                          Change Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline"
                        >
                          <X className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[rgba(53,98,103,0.25)] bg-white p-5 text-center cursor-pointer transition hover:border-(--color-ocean) hover:bg-(--color-pale-aqua)/20">
                      <Upload className="h-7 w-7 text-(--color-ocean) mb-1" />
                      <span className="text-sm font-bold text-(--color-dark-teal)">
                        Upload image of site or hazard
                      </span>
                      <span className="text-xs text-(--color-medium-teal)">PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-3.5 text-sm font-bold text-white transition hover:bg-(--color-deep-ocean) disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting Request..." : "Submit Rescue Request"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= TAB 2: RELIEF & RESCUE STATUS TRACKING ================= */}
        {activeTab === "status" && (
          <div className="pt-6">
            {loadingTracking ? (
              <div className="py-12 text-center text-sm text-(--color-medium-teal)">
                Loading your relief tracking records...
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint)/20 p-8 text-center space-y-4">
                <AlertCircle className="h-10 w-10 text-(--color-ocean) mx-auto opacity-70" />
                <div>
                  <p className="text-base font-bold text-(--color-deep-ocean)">No Active Relief Requests</p>
                  <p className="text-xs text-(--color-medium-teal) mt-1">
                    You currently have no active rescue or relief tracking tickets on file.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => switchTab("request")}
                  className="inline-block rounded-2xl bg-(--color-ocean) px-6 py-2.5 text-xs font-bold text-white hover:bg-(--color-deep-ocean) transition"
                >
                  Submit Rescue Request
                </button>
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-12">
                {/* Request Selector List */}
                <div className="lg:col-span-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal) px-1">
                    Your Submitted Requests ({requests.length})
                  </p>
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => setSelectedReq(req)}
                        className={`w-full rounded-3xl border p-4 text-left transition-all ${
                          selectedReq?.id === req.id
                            ? "border-(--color-ocean) bg-(--color-mint)/40 shadow-sm ring-2 ring-(--color-ocean)/20"
                            : "border-[rgba(53,98,103,0.16)] bg-white hover:bg-(--color-soft-mint)/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-(--color-deep-ocean)">
                            #{req.id}
                          </span>
                          <Badge
                            variant={
                              req.status === "Resolved"
                                ? "success"
                                : req.urgency === "Critical"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {req.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm font-bold text-(--color-deep-ocean)">
                          {req.type}
                        </p>
                        <p className="mt-1 text-xs text-(--color-medium-teal) truncate">
                          {req.location}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step Tracker Detail View */}
                {selectedReq && (
                  <div className="lg:col-span-8 rounded-3xl border border-[rgba(53,98,103,0.16)] bg-(--color-soft-mint)/20 p-6 space-y-6">
                    {/* Details Header */}
                    <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[rgba(53,98,103,0.12)]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-(--color-ocean)">
                            Request ID: #{selectedReq.id}
                          </span>
                          <Badge variant="info">{selectedReq.type}</Badge>
                        </div>
                        <h2 className="mt-1 text-xl font-bold text-(--color-deep-ocean)">
                          Relief Request Progress
                        </h2>
                      </div>
                      <div className="text-right text-xs text-(--color-medium-teal)">
                        <p>Submitted: <strong>{selectedReq.submittedAt}</strong></p>
                        <p className="mt-0.5">Last Update: <strong>{selectedReq.lastUpdate}</strong></p>
                      </div>
                    </div>

                    {/* Information Chips */}
                    <div className="grid gap-4 sm:grid-cols-3 text-xs bg-white p-4 rounded-2xl border border-[rgba(53,98,103,0.12)]">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-(--color-ocean) shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-(--color-medium-teal)">Location</span>
                          <p className="font-bold text-(--color-dark-teal)">{selectedReq.location}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <LifeBuoy className="h-4 w-4 text-(--color-ocean) shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-(--color-medium-teal)">Assigned Team</span>
                          <p className="font-bold text-(--color-dark-teal)">
                            {selectedReq.assignedTeam || "Awaiting Assignment"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-(--color-ocean) shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-(--color-medium-teal)">Est. Response</span>
                          <p className="font-bold text-(--color-dark-teal)">
                            {selectedReq.estimatedResponse || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Flow Diagram Tracker */}
                    <div className="bg-white p-6 rounded-3xl border border-[rgba(53,98,103,0.14)] space-y-4">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                        Live Status Flow
                      </p>

                      <div className="relative py-2">
                        {STATUS_STEPS.map((step, idx) => {
                          const currentIdx = getStepIndex(selectedReq.status);
                          const isCompleted = idx <= currentIdx;
                          const isCurrent = idx === currentIdx;

                          return (
                            <div key={step} className="flex flex-col items-center">
                              {/* Step Node */}
                              <div
                                className={`flex w-full items-center justify-between rounded-2xl px-5 py-3 border transition-all ${
                                  isCurrent
                                    ? "border-(--color-ocean) bg-(--color-mint)/50 shadow-sm"
                                    : isCompleted
                                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                                    : "border-[rgba(53,98,103,0.1)] bg-slate-50 text-slate-400 opacity-60"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                      isCurrent
                                        ? "bg-(--color-ocean) text-white"
                                        : isCompleted
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 text-slate-500"
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                      idx + 1
                                    )}
                                  </div>
                                  <span className="text-sm font-bold">{step}</span>
                                </div>

                                {isCurrent && (
                                  <span className="text-xs font-semibold uppercase tracking-wider text-(--color-ocean) bg-white px-3 py-1 rounded-full border border-(--color-ocean)/30">
                                    Current Status
                                  </span>
                                )}
                              </div>

                              {/* Connector Arrow */}
                              {idx < STATUS_STEPS.length - 1 && (
                                <div className="my-1.5 flex justify-center text-(--color-medium-teal)/40">
                                  <span className="text-lg font-bold">↓</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-(--color-pale-aqua)/30 p-4 text-xs text-(--color-dark-teal) flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-(--color-ocean) shrink-0 mt-0.5" />
                      <span>
                        Emergency dispatch units update status automatically as field teams communicate with central control. If severity increases, submit an updated report or call emergency helpline.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
