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
  createReliefRequest,
  getReliefRequests,
} from "../../services/rescueService";

import type { ReliefRequest } from "../../services/rescueService";

const STATUS_STEPS = ["Pending", "Assigned", "Resolved"] as const;

type Urgency = "Low" | "Medium" | "High" | "Critical";

/* =========================================================
   HELPERS
========================================================= */

function formatLocation(location: unknown): string {
  if (!location) {
    return "Location unavailable";
  }

  if (typeof location === "string") {
    return location;
  }

  if (typeof location === "object") {
    const value = location as Record<string, unknown>;

    if (typeof value.address === "string" && value.address.trim()) {
      return value.address;
    }

    const latitude = value.latitude;
    const longitude = value.longitude;

    if (
      typeof latitude === "number" &&
      typeof longitude === "number"
    ) {
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  return "Location unavailable";
}

function formatAssignedTeam(team: unknown): string {
  if (!team) {
    return "Awaiting Assignment";
  }

  if (typeof team === "string") {
    return team;
  }

  if (typeof team === "object") {
    const value = team as Record<string, unknown>;

    if (
      typeof value.teamName === "string" &&
      value.teamName.trim()
    ) {
      return value.teamName;
    }

    if (
      typeof value.name === "string" &&
      value.name.trim()
    ) {
      return value.name;
    }

    if (
      typeof value.department === "string" &&
      value.department.trim()
    ) {
      return value.department;
    }

    if (
      typeof value.id === "string" &&
      value.id.trim()
    ) {
      return `Team ${value.id}`;
    }
  }

  return "Rescue Team Assigned";
}

function getStatusIndex(status: string): number {
  const index = STATUS_STEPS.indexOf(
    status as (typeof STATUS_STEPS)[number]
  );

  return index === -1 ? 0 : index;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function RescueRelief() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab =
    searchParams.get("tab") === "status"
      ? "status"
      : "request";

  /* =========================================================
     FORM STATE
  ========================================================= */

  const [requestType, setRequestType] =
    useState("Flood Evacuation");

  const [location, setLocation] = useState("");

  const [description, setDescription] = useState("");

  const [peopleCount, setPeopleCount] =
    useState<number>(1);

  const [urgency, setUrgency] =
    useState<Urgency>("High");

  const [photoPreview, setPhotoPreview] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  /* =========================================================
     TRACKING STATE
  ========================================================= */

  const [requests, setRequests] =
    useState<ReliefRequest[]>([]);

  const [selectedReq, setSelectedReq] =
    useState<ReliefRequest | null>(null);

  const [loadingTracking, setLoadingTracking] =
    useState(true);

  /* =========================================================
     FETCH REQUESTS
  ========================================================= */

  const fetchRequests = useCallback(async () => {
    try {
      const data = await getReliefRequests();

      setRequests(data);

      setSelectedReq((prev) => {
        if (!data.length) {
          return null;
        }

        if (!prev) {
          return data[0];
        }

        return (
          data.find(
            (item) => item.id === prev.id
          ) ?? data[0]
        );
      });

      return data;
    } catch (error) {
      console.error(
        "Failed to load relief requests:",
        error
      );

      toast.error(
        "Unable to load your rescue requests."
      );

      setRequests([]);
      setSelectedReq(null);

      return [];
    }
  }, []);

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      try {
        const data = await getReliefRequests();

        if (cancelled) {
          return;
        }

        setRequests(data);

        setSelectedReq(
          data.length > 0 ? data[0] : null
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load relief requests:",
          error
        );

        toast.error(
          "Unable to load your rescue requests."
        );

        setRequests([]);
        setSelectedReq(null);
      } finally {
        if (!cancelled) {
          setLoadingTracking(false);
        }
      }
    };

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     TAB SWITCH
  ========================================================= */

  const switchTab = (
    tab: "request" | "status"
  ) => {
    setSearchParams({ tab });
  };

  /* =========================================================
     PHOTO UPLOAD
  ========================================================= */

  const handlePhotoUpload = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setPhotoPreview(
        reader.result as string
      );
    };

    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
  };

  /* =========================================================
     CURRENT LOCATION
  ========================================================= */

  const getCurrentCoordinates =
    (): Promise<{
      latitude: number;
      longitude: number;
    }> => {
      return new Promise(
        (resolve, reject) => {
          if (!navigator.geolocation) {
            reject(
              new Error(
                "Geolocation is not supported by this browser."
              )
            );
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude:
                  position.coords.latitude,
                longitude:
                  position.coords.longitude,
              });
            },
            (error) => {
              reject(error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        }
      );
    };

  /* =========================================================
     ASSISTANCE TYPE
  ========================================================= */

  const getAssistanceRequired = (): string[] => {
    switch (requestType) {
      case "Flood Evacuation":
        return ["Evacuation", "Rescue"];

      case "Medical Emergency":
        return ["Medical Assistance"];

      case "Food & Water Relief":
        return ["Food", "Water"];

      case "Structural Collapse":
        return [
          "Rescue",
          "Structural Assistance",
        ];

      case "Other Assistance":
      default:
        return ["Emergency Assistance"];
    }
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!location.trim()) {
      toast.error(
        "Please enter location details."
      );
      return;
    }

    if (!description.trim()) {
      toast.error(
        "Please enter description details."
      );
      return;
    }

    if (peopleCount < 1) {
      toast.error(
        "At least one affected person is required."
      );
      return;
    }

    setSubmitting(true);

    try {
      const coordinates =
        await getCurrentCoordinates();

      const payload = {
        title: requestType,

        description:
          description.trim(),

        location: {
          latitude:
            coordinates.latitude,

          longitude:
            coordinates.longitude,

          address:
            location.trim(),
        },

        peopleAffected:
          Number(peopleCount) || 1,

        assistanceRequired:
          getAssistanceRequired(),

        urgency,
      };

      const created =
        await createReliefRequest(payload);

      toast.success(
        `Rescue Request #${created.id} submitted!`
      );

      setLocation("");
      setDescription("");
      setPhotoPreview(null);
      setPeopleCount(1);
      setUrgency("High");

      /*
       * Refresh backend data.
       */
      await fetchRequests();

      /*
       * IMPORTANT:
       * Don't search the old `requests` state here.
       * React state updates are asynchronous.
       *
       * Select the newly-created backend response directly.
       */
      setSelectedReq(created);

      switchTab("status");
    } catch (error) {
      console.error(
        "Failed to submit rescue request:",
        error
      );

      if (
        error instanceof GeolocationPositionError
      ) {
        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {
          toast.error(
            "Location permission is required to submit a rescue request."
          );
        } else if (
          error.code ===
          error.POSITION_UNAVAILABLE
        ) {
          toast.error(
            "Unable to determine your current location."
          );
        } else {
          toast.error(
            "Location request timed out. Please try again."
          );
        }
      } else {
        toast.error(
          "Failed to submit rescue request."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="min-h-screen space-y-6 text-(--color-dark-teal)">
      <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:rounded-4xl sm:p-8">

        {/* HEADER */}
        <div className="flex flex-col gap-4 border-b border-[rgba(53,98,103,0.12)] pb-6 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
              Emergency Services
            </p>

            <h1 className="mt-1 text-2xl font-black text-(--color-deep-ocean) sm:text-3xl">
              Rescue &amp; Relief
            </h1>

            <p className="mt-1 text-xs text-(--color-medium-teal) sm:text-sm">
              Request emergency rescue assistance and track real-time operational status of ongoing relief efforts.
            </p>
          </div>

          {/* TABS */}
          <div className="flex self-start items-center gap-1.5 rounded-2xl border border-[rgba(53,98,103,0.15)] bg-(--color-soft-mint) p-1.5 sm:self-auto">

            <button
              type="button"
              onClick={() =>
                switchTab("request")
              }
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
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
              onClick={() =>
                switchTab("status")
              }
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                activeTab === "status"
                  ? "bg-(--color-ocean) text-white shadow-sm"
                  : "text-(--color-dark-teal) hover:bg-(--color-pale-aqua)/50"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Track Status{" "}
              {requests.length > 0 &&
                `(${requests.length})`}
            </button>
          </div>
        </div>

        {/* =====================================================
            REQUEST TAB
        ===================================================== */}

        {activeTab === "request" && (
          <div className="pt-6">
            <form
              onSubmit={handleSubmit}
              className="max-w-3xl space-y-6"
            >
              <div className="space-y-5 rounded-3xl border border-[rgba(53,98,103,0.16)] bg-(--color-soft-mint)/20 p-5 sm:p-6">

                {/* REQUEST TYPE */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                    Request Type *
                  </label>

                  <select
                    value={requestType}
                    onChange={(e) =>
                      setRequestType(
                        e.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm font-medium text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                  >
                    <option value="Flood Evacuation">
                      Flood Evacuation
                    </option>

                    <option value="Medical Emergency">
                      Medical Emergency
                    </option>

                    <option value="Food & Water Relief">
                      Food &amp; Water Relief
                    </option>

                    <option value="Structural Collapse">
                      Structural Collapse
                    </option>

                    <option value="Other Assistance">
                      Other Emergency Assistance
                    </option>
                  </select>
                </div>

                {/* LOCATION */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                    Exact Location / Landmark *
                  </label>

                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />

                    <input
                      type="text"
                      required
                      placeholder="e.g. House #42, Beach Road Sector 4"
                      value={location}
                      onChange={(e) =>
                        setLocation(
                          e.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                    />
                  </div>
                </div>

                {/* PEOPLE + URGENCY */}
                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
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
                        onChange={(e) =>
                          setPeopleCount(
                            parseInt(
                              e.target.value,
                              10
                            ) || 1
                          )
                        }
                        className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                      Severity / Urgency *
                    </label>

                    <div className="relative">
                      <AlertTriangle className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />

                      <select
                        value={urgency}
                        onChange={(e) =>
                          setUrgency(
                            e.target.value as Urgency
                          )
                        }
                        className="w-full appearance-none rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm font-bold text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                      >
                        <option value="Low">
                          Low - Non Immediate
                        </option>

                        <option value="Medium">
                          Medium - Standard Request
                        </option>

                        <option value="High">
                          High - Urgent Response Needed
                        </option>

                        <option value="Critical">
                          Critical - Immediate Life Threat
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                    Description of Emergency *
                  </label>

                  <textarea
                    rows={4}
                    required
                    placeholder="Describe current situation, water levels, medical conditions, or hazards..."
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                  />
                </div>

                {/* PHOTO */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                    Optional Site Photo / Evidence
                  </label>

                  {photoPreview ? (
                    <div className="relative inline-block overflow-hidden rounded-3xl border-2 border-(--color-ocean) bg-white p-2">

                      <img
                        src={photoPreview}
                        alt="Rescue preview"
                        className="h-44 w-44 rounded-2xl object-cover"
                      />

                      <div className="mt-2 flex items-center justify-between gap-2 px-1">

                        <label className="cursor-pointer text-xs font-bold text-(--color-ocean) hover:underline">
                          Change Image

                          <input
                            type="file"
                            accept="image/*"
                            onChange={
                              handlePhotoUpload
                            }
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={
                            handleRemovePhoto
                          }
                          className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[rgba(53,98,103,0.25)] bg-white p-5 text-center transition hover:border-(--color-ocean) hover:bg-(--color-pale-aqua)/20">

                      <Upload className="mb-1 h-7 w-7 text-(--color-ocean)" />

                      <span className="text-sm font-bold text-(--color-dark-teal)">
                        Upload image of site or hazard
                      </span>

                      <span className="text-xs text-(--color-medium-teal)">
                        PNG, JPG up to 5MB
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={
                          handlePhotoUpload
                        }
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

                  {submitting
                    ? "Submitting Request..."
                    : "Submit Rescue Request"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =====================================================
            STATUS TAB
        ===================================================== */}

        {activeTab === "status" && (
          <div className="pt-6">

            {loadingTracking ? (
              <div className="py-12 text-center text-sm text-(--color-medium-teal)">
                Loading your relief tracking records...
              </div>
            ) : requests.length === 0 ? (
              <div className="space-y-4 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint)/20 p-8 text-center">

                <AlertCircle className="mx-auto h-10 w-10 text-(--color-ocean) opacity-70" />

                <div>
                  <p className="text-base font-bold text-(--color-deep-ocean)">
                    No Active Relief Requests
                  </p>

                  <p className="mt-1 text-xs text-(--color-medium-teal)">
                    You currently have no active rescue or relief tracking tickets on file.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    switchTab("request")
                  }
                  className="inline-block rounded-2xl bg-(--color-ocean) px-6 py-2.5 text-xs font-bold text-white transition hover:bg-(--color-deep-ocean)"
                >
                  Submit Rescue Request
                </button>
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-12">

                {/* REQUEST SELECTOR */}
                <div className="space-y-3 lg:col-span-4">

                  <p className="px-1 text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                    Your Submitted Requests (
                    {requests.length})
                  </p>

                  <div className="space-y-3">
                    {requests.map((req) => (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() =>
                          setSelectedReq(req)
                        }
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
                              req.status ===
                              "Resolved"
                                ? "success"
                                : req.urgency ===
                                  "Critical"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {String(req.status)}
                          </Badge>
                        </div>

                        <p className="mt-2 text-sm font-bold text-(--color-deep-ocean)">
                          {req.type}
                        </p>

                        <p className="mt-1 truncate text-xs text-(--color-medium-teal)">
                          {formatLocation(
                            req.location
                          )}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* DETAIL */}
                {selectedReq && (
                  <div className="space-y-6 rounded-3xl border border-[rgba(53,98,103,0.16)] bg-(--color-soft-mint)/20 p-6 lg:col-span-8">

                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(53,98,103,0.12)] pb-4">

                      <div>
                        <div className="flex items-center gap-2">

                          <span className="font-mono text-sm font-bold text-(--color-ocean)">
                            Request ID: #
                            {selectedReq.id}
                          </span>

                          <Badge variant="info">
                            {selectedReq.type}
                          </Badge>
                        </div>

                        <h2 className="mt-1 text-xl font-bold text-(--color-deep-ocean)">
                          Relief Request Progress
                        </h2>
                      </div>

                      <div className="text-right text-xs text-(--color-medium-teal)">
                        <p>
                          Submitted:{" "}
                          <strong>
                            {selectedReq.submittedAt}
                          </strong>
                        </p>

                        <p className="mt-0.5">
                          Last Update:{" "}
                          <strong>
                            {selectedReq.lastUpdate}
                          </strong>
                        </p>
                      </div>
                    </div>

                    {/* INFORMATION */}
                    <div className="grid gap-4 rounded-2xl border border-[rgba(53,98,103,0.12)] bg-white p-4 text-xs sm:grid-cols-3">

                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

                        <div>
                          <span className="font-semibold text-(--color-medium-teal)">
                            Location
                          </span>

                          <p className="font-bold text-(--color-dark-teal)">
                            {formatLocation(
                              selectedReq.location
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

                        <div>
                          <span className="font-semibold text-(--color-medium-teal)">
                            Assigned Team
                          </span>

                          <p className="font-bold text-(--color-dark-teal)">
                            {formatAssignedTeam(
                              selectedReq.assignedTeam
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

                        <div>
                          <span className="font-semibold text-(--color-medium-teal)">
                            Est. Response
                          </span>

                          <p className="font-bold text-(--color-dark-teal)">
                            {selectedReq.estimatedResponse ||
                              "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* STATUS FLOW */}
                    <div className="space-y-4 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-6">

                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                        Live Status Flow
                      </p>

                      <div className="relative py-2">
                        {STATUS_STEPS.map(
                          (step, idx) => {
                            const currentIdx =
                              getStatusIndex(
                                String(
                                  selectedReq.status
                                )
                              );

                            const isCompleted =
                              idx <= currentIdx;

                            const isCurrent =
                              idx === currentIdx;

                            return (
                              <div
                                key={step}
                                className="flex flex-col items-center"
                              >
                                <div
                                  className={`flex w-full items-center justify-between rounded-2xl border px-5 py-3 transition-all ${
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

                                    <span className="text-sm font-bold">
                                      {step}
                                    </span>
                                  </div>

                                  {isCurrent && (
                                    <span className="rounded-full border border-(--color-ocean)/30 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-(--color-ocean)">
                                      Current Status
                                    </span>
                                  )}
                                </div>

                                {idx <
                                  STATUS_STEPS.length -
                                    1 && (
                                  <div className="my-1.5 flex justify-center text-(--color-medium-teal)/40">
                                    <span className="text-lg font-bold">
                                      ↓
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* INFORMATION NOTICE */}
                    <div className="flex items-start gap-2 rounded-2xl bg-(--color-pale-aqua)/30 p-4 text-xs text-(--color-dark-teal)">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

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