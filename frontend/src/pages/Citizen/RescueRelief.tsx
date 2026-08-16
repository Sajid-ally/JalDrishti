import {
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
} from "react";

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
  RescueUrgency,
  SubmitRescueRequestData,
} from "../../types/rescue";


/* ============================================================
   STATUS FLOW
   ============================================================ */

const STATUS_STEPS: RescueRequestStatus[] = [
  "Submitted",
  "Under Review",
  "Government Assigned",
  "Rescue Team Dispatched",
  "Help Arriving",
  "Resolved",
];


/* ============================================================
   COMPONENT
   ============================================================ */

export default function RescueRelief() {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const activeTab =
    searchParams.get("tab") === "status"
      ? "status"
      : "request";


  /* ==========================================================
     FORM STATE
     ========================================================== */

  const [
    requestType,
    setRequestType,
  ] = useState("Flood Evacuation");

  const [
    locationName,
    setLocationName,
  ] = useState("");

  const [
    latitude,
    setLatitude,
  ] = useState("");

  const [
    longitude,
    setLongitude,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    peopleCount,
    setPeopleCount,
  ] = useState<number>(1);

  const [
    urgency,
    setUrgency,
  ] = useState<RescueUrgency>("High");

  const [
    assistanceRequired,
    setAssistanceRequired,
  ] = useState<string[]>([
    "Evacuation",
  ]);

  const [
    photoFile,
    setPhotoFile,
  ] = useState<File | undefined>();

  const [
    photoPreview,
    setPhotoPreview,
  ] = useState<string | null>(null);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  /* ==========================================================
     TRACKING STATE
     ========================================================== */

  const [
    requests,
    setRequests,
  ] = useState<RescueRequestItem[]>([]);

  const [
    selectedReq,
    setSelectedReq,
  ] = useState<RescueRequestItem | null>(null);

  const [
    loadingTracking,
    setLoadingTracking,
  ] = useState(true);


  /* ==========================================================
     FETCH REQUESTS
     ========================================================== */

  const fetchRequests =
    useCallback(async () => {
      setLoadingTracking(true);

      try {
        const data =
          await getRescueRequests();

        setRequests(data);

        setSelectedReq(
          (previous) => {
            if (previous) {
              return (
                data.find(
                  (item) =>
                    item.id ===
                    previous.id
                ) ?? previous
              );
            }

            return data.length > 0
              ? data[0]
              : null;
          }
        );
      } catch (error) {
        console.error(
          "Failed to fetch rescue requests:",
          error
        );

        toast.error(
          "Unable to load rescue requests."
        );
      } finally {
        setLoadingTracking(false);
      }
    }, []);


  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);


  /* ==========================================================
     TAB
     ========================================================== */

  const switchTab = (
    tab: "request" | "status"
  ) => {
    setSearchParams({ tab });
  };


  /* ==========================================================
     PHOTO UPLOAD
     ========================================================== */

  const handlePhotoUpload = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }


    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      toast.error(
        "Please select an image file."
      );

      return;
    }


    if (
      file.size >
      5 * 1024 * 1024
    ) {
      toast.error(
        "File size must be under 5MB."
      );

      return;
    }


    setPhotoFile(file);


    const reader =
      new FileReader();

    reader.onloadend = () => {
      setPhotoPreview(
        reader.result as string
      );
    };

    reader.readAsDataURL(file);
  };


  /* ==========================================================
     REMOVE PHOTO
     ========================================================== */

  const handleRemovePhoto = () => {
    setPhotoFile(undefined);
    setPhotoPreview(null);
  };


  /* ==========================================================
     ASSISTANCE TOGGLE
     ========================================================== */

  const toggleAssistance = (
    option: string
  ) => {
    setAssistanceRequired(
      (current) => {
        if (
          current.includes(option)
        ) {
          return current.filter(
            (item) =>
              item !== option
          );
        }

        return [
          ...current,
          option,
        ];
      }
    );
  };


  /* ==========================================================
     GET CURRENT LOCATION
     ========================================================== */

  const handleUseCurrentLocation = () => {
    if (
      !navigator.geolocation
    ) {
      toast.error(
        "Geolocation is not supported by this browser."
      );

      return;
    }


    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(
          String(
            position.coords.latitude
          )
        );

        setLongitude(
          String(
            position.coords.longitude
          )
        );

        toast.success(
          "Current location detected."
        );
      },
      () => {
        toast.error(
          "Unable to get your current location."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };


  /* ==========================================================
     VALIDATE LOCATION
     ========================================================== */

  const getCoordinates = () => {
    const lat =
      Number(latitude);

    const lng =
      Number(longitude);


    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return null;
    }


    if (
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return null;
    }


    return {
      latitude: lat,
      longitude: lng,
    };
  };


  /* ==========================================================
     SUBMIT
     ========================================================== */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();


    if (
      !locationName.trim()
    ) {
      toast.error(
        "Please enter the emergency location."
      );

      return;
    }


    if (
      !description.trim()
    ) {
      toast.error(
        "Please describe the emergency."
      );

      return;
    }


    if (
      peopleCount < 1 ||
      peopleCount > 100
    ) {
      toast.error(
        "People affected must be between 1 and 100."
      );

      return;
    }


    if (
      assistanceRequired.length ===
      0
    ) {
      toast.error(
        "Please select at least one assistance type."
      );

      return;
    }


    const coordinates =
      getCoordinates();


    if (!coordinates) {
      toast.error(
        "Please provide valid latitude and longitude, or use current location."
      );

      return;
    }


    const payload: SubmitRescueRequestData = {
      disasterType:
        requestType,

      description:
        description.trim(),

      latitude:
        coordinates.latitude,

      longitude:
        coordinates.longitude,

      locationName:
        locationName.trim(),

      peopleAffected:
        peopleCount,

      assistanceRequired:
        assistanceRequired,

      urgency,

      photo:
        photoFile,
    };


    setSubmitting(true);


    try {
      const created =
        await submitRescueRequest(
          payload
        );


      toast.success(
        `Rescue Request #${created.id} submitted successfully.`
      );


      /* Reset form */

      setLocationName("");

      setLatitude("");

      setLongitude("");

      setDescription("");

      setPeopleCount(1);

      setUrgency("High");

      setAssistanceRequired([
        "Evacuation",
      ]);

      setPhotoFile(undefined);

      setPhotoPreview(null);


      /* Refresh requests */

      await fetchRequests();


      setSelectedReq(
        created
      );


      switchTab(
        "status"
      );

    } catch (error) {
      console.error(
        "Rescue request submission failed:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit rescue request."
      );
    } finally {
      setSubmitting(false);
    }
  };


  /* ==========================================================
     STATUS INDEX
     ========================================================== */

  const getStepIndex = (
    status: RescueRequestStatus
  ) => {
    if (
      status ===
      "Rejected"
    ) {
      return -1;
    }

    return STATUS_STEPS.indexOf(
      status
    );
  };


  /* ==========================================================
     LOCATION LABEL
     ========================================================== */

  const getLocationLabel = (
    request: RescueRequestItem
  ) => {
    if (
      request.locationName
    ) {
      return request.locationName;
    }

    return `${request.location.latitude.toFixed(
      4
    )}, ${request.location.longitude.toFixed(
      4
    )}`;
  };


  /* ==========================================================
     ASSIGNED TEAM LABEL
     ========================================================== */

  const getAssignedTeamLabel = (
    request: RescueRequestItem
  ) => {
    if (
      !request.assignedTeam
    ) {
      return "Awaiting Assignment";
    }

    return request
      .assignedTeam
      .teamName;
  };


  /* ==========================================================
     STATUS BADGE
     ========================================================== */

  const getStatusVariant = (
    status: RescueRequestStatus
  ) => {
    switch (status) {
      case "Resolved":
        return "success" as const;

      case "Rejected":
        return "danger" as const;

      case "Government Assigned":
      case "Rescue Team Dispatched":
      case "Help Arriving":
        return "info" as const;

      case "Under Review":
        return "warning" as const;

      case "Submitted":
      default:
        return "warning" as const;
    }
  };


  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <main className="min-h-screen text-(--color-dark-teal) space-y-6">

      <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">

        {/* ==================================================
            HEADER
            ================================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[rgba(53,98,103,0.12)]">

          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
              Emergency Services
            </p>

            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-(--color-deep-ocean)">
              Rescue &amp; Relief
            </h1>

            <p className="mt-1 text-xs sm:text-sm text-(--color-medium-teal)">
              Request emergency rescue assistance and track real-time operational status.
            </p>

          </div>


          {/* TAB BUTTONS */}

          <div className="flex items-center gap-1.5 rounded-2xl bg-(--color-soft-mint) p-1.5 border border-[rgba(53,98,103,0.15)] self-start sm:self-auto">

            <button
              type="button"
              onClick={() =>
                switchTab(
                  "request"
                )
              }
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab ===
                "request"
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
                switchTab(
                  "status"
                )
              }
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab ===
                "status"
                  ? "bg-(--color-ocean) text-white shadow-sm"
                  : "text-(--color-dark-teal) hover:bg-(--color-pale-aqua)/50"
              }`}
            >

              <ClipboardList className="h-4 w-4" />

              Track Status

              {requests.length >
                0 &&
                ` (${requests.length})`}

            </button>

          </div>

        </div>


        {/* ==================================================
            REQUEST TAB
            ================================================== */}

        {activeTab ===
          "request" && (

          <div className="pt-6">

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-6 max-w-3xl"
            >

              <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-(--color-soft-mint)/20 p-5 sm:p-6 space-y-5">


                {/* REQUEST TYPE */}

                <div>

                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-1">
                    Request Type *
                  </label>

                  <select
                    value={
                      requestType
                    }
                    onChange={(event) =>
                      setRequestType(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-(--color-ocean)"
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

                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-1">
                    Exact Location / Landmark *
                  </label>

                  <div className="relative">

                    <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />

                    <input
                      type="text"
                      required
                      placeholder="e.g. House #42, Beach Road Sector 4"
                      value={
                        locationName
                      }
                      onChange={(event) =>
                        setLocationName(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-(--color-ocean)"
                    />

                  </div>

                </div>


                {/* GPS */}

                <div>

                  <div className="flex items-center justify-between mb-1">

                    <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                      GPS Location *
                    </label>

                    <button
                      type="button"
                      onClick={
                        handleUseCurrentLocation
                      }
                      className="text-xs font-bold text-(--color-ocean) hover:underline"
                    >
                      Use Current Location
                    </button>

                  </div>


                  <div className="grid gap-4 sm:grid-cols-2">

                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={
                        latitude
                      }
                      onChange={(event) =>
                        setLatitude(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm outline-none focus:border-(--color-ocean)"
                    />


                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={
                        longitude
                      }
                      onChange={(event) =>
                        setLongitude(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm outline-none focus:border-(--color-ocean)"
                    />

                  </div>

                </div>


                {/* PEOPLE + URGENCY */}

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-1">
                      People Needing Help *
                    </label>

                    <div className="relative">

                      <Users className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />

                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={
                          peopleCount
                        }
                        onChange={(event) =>
                          setPeopleCount(
                            Number(
                              event.target
                                .value
                            ) || 1
                          )
                        }
                        className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-(--color-ocean)"
                      />

                    </div>

                  </div>


                  <div>

                    <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-1">
                      Urgency *
                    </label>

                    <div className="relative">

                      <AlertTriangle className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />

                      <select
                        value={
                          urgency
                        }
                        onChange={(event) =>
                          setUrgency(
                            event.target
                              .value as RescueUrgency
                          )
                        }
                        className="w-full appearance-none rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm font-bold outline-none focus:border-(--color-ocean)"
                      >

                        <option value="Low">
                          Low
                        </option>

                        <option value="Medium">
                          Medium
                        </option>

                        <option value="High">
                          High
                        </option>

                        <option value="Critical">
                          Critical
                        </option>

                      </select>

                    </div>

                  </div>

                </div>


                {/* ASSISTANCE */}

                <div>

                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-2">
                    Assistance Required *
                  </label>

                  <div className="flex flex-wrap gap-2">

                    {[
                      "Evacuation",
                      "Medical",
                      "Food",
                      "Water",
                      "Shelter",
                      "Rescue Boat",
                    ].map(
                      (
                        option
                      ) => {

                        const selected =
                          assistanceRequired.includes(
                            option
                          );

                        return (
                          <button
                            key={
                              option
                            }
                            type="button"
                            onClick={() =>
                              toggleAssistance(
                                option
                              )
                            }
                            className={`rounded-full px-4 py-2 text-xs font-bold border transition ${
                              selected
                                ? "border-(--color-ocean) bg-(--color-ocean) text-white"
                                : "border-[rgba(53,98,103,0.2)] bg-white text-(--color-dark-teal) hover:border-(--color-ocean)"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      }
                    )}

                  </div>

                </div>


                {/* DESCRIPTION */}

                <div>

                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-1">
                    Description of Emergency *
                  </label>

                  <textarea
                    rows={4}
                    required
                    placeholder="Describe the current situation..."
                    value={
                      description
                    }
                    onChange={(event) =>
                      setDescription(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm outline-none focus:border-(--color-ocean)"
                  />

                </div>


                {/* PHOTO */}

                <div>

                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal) mb-2">
                    Optional Site Photo
                  </label>


                  {photoPreview ? (

                    <div className="relative inline-block overflow-hidden rounded-3xl border-2 border-(--color-ocean) bg-white p-2">

                      <img
                        src={
                          photoPreview
                        }
                        alt="Rescue evidence preview"
                        className="h-44 w-44 object-cover rounded-2xl"
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

                    <label className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[rgba(53,98,103,0.25)] bg-white p-5 text-center cursor-pointer hover:border-(--color-ocean)">

                      <Upload className="h-7 w-7 text-(--color-ocean) mb-1" />

                      <span className="text-sm font-bold">
                        Upload image
                      </span>

                      <span className="text-xs text-(--color-medium-teal)">
                        PNG/JPG up to 5MB
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


              {/* SUBMIT */}

              <button
                type="submit"
                disabled={
                  submitting
                }
                className="flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-3.5 text-sm font-bold text-white transition hover:bg-(--color-deep-ocean) disabled:opacity-50"
              >

                <Send className="h-4 w-4" />

                {submitting
                  ? "Submitting..."
                  : "Submit Rescue Request"}

              </button>

            </form>

          </div>
        )}


        {/* ==================================================
            STATUS TAB
            ================================================== */}

        {activeTab ===
          "status" && (

          <div className="pt-6">

            {loadingTracking ? (

              <div className="py-12 text-center text-sm text-(--color-medium-teal)">
                Loading your rescue requests...
              </div>

            ) : requests.length ===
              0 ? (

              <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint)/20 p-8 text-center">

                <AlertCircle className="h-10 w-10 text-(--color-ocean) mx-auto" />

                <p className="mt-3 text-base font-bold">
                  No Rescue Requests
                </p>

                <p className="mt-1 text-xs text-(--color-medium-teal)">
                  You currently have no rescue requests.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    switchTab(
                      "request"
                    )
                  }
                  className="mt-4 rounded-2xl bg-(--color-ocean) px-6 py-2.5 text-xs font-bold text-white"
                >
                  Submit Rescue Request
                </button>

              </div>

            ) : (

              <div className="grid gap-8 lg:grid-cols-12">


                {/* REQUEST LIST */}

                <div className="lg:col-span-4 space-y-3">

                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                    Submitted Requests ({requests.length})
                  </p>


                  {requests.map(
                    (request) => (

                      <button
                        key={
                          request.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedReq(
                            request
                          )
                        }
                        className={`w-full rounded-3xl border p-4 text-left transition ${
                          selectedReq?.id ===
                          request.id
                            ? "border-(--color-ocean) bg-(--color-soft-mint)"
                            : "border-[rgba(53,98,103,0.16)] bg-white hover:border-(--color-ocean)"
                        }`}
                      >

                        <div className="flex items-center justify-between gap-2">

                          <span className="font-mono text-xs font-bold">
                            #{request.id}
                          </span>

                          <Badge
                            variant={getStatusVariant(
                              request.status
                            )}
                          >
                            {request.status}
                          </Badge>

                        </div>


                        <p className="mt-2 text-sm font-bold">
                          {request.title}
                        </p>


                        <p className="mt-1 text-xs text-(--color-medium-teal) truncate">
                          {getLocationLabel(
                            request
                          )}
                        </p>

                      </button>

                    )
                  )}

                </div>


                {/* DETAIL */}

                {selectedReq && (

                  <div className="lg:col-span-8 rounded-3xl border border-[rgba(53,98,103,0.16)] bg-(--color-soft-mint)/20 p-6 space-y-6">


                    {/* HEADER */}

                    <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[rgba(53,98,103,0.12)]">

                      <div>

                        <span className="font-mono text-sm font-bold text-(--color-ocean)">
                          Request ID: #
                          {
                            selectedReq.id
                          }
                        </span>

                        <h2 className="mt-1 text-xl font-bold">
                          {
                            selectedReq.title
                          }
                        </h2>

                      </div>


                      <Badge
                        variant={getStatusVariant(
                          selectedReq.status
                        )}
                      >
                        {
                          selectedReq.status
                        }
                      </Badge>

                    </div>


                    {/* INFO */}

                    <div className="grid gap-4 sm:grid-cols-3 bg-white p-4 rounded-2xl border border-[rgba(53,98,103,0.12)]">

                      <div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-(--color-medium-teal)">

                          <MapPin className="h-4 w-4" />

                          Location

                        </div>

                        <p className="mt-1 text-sm font-bold">
                          {getLocationLabel(
                            selectedReq
                          )}
                        </p>

                      </div>


                      <div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-(--color-medium-teal)">

                          <LifeBuoy className="h-4 w-4" />

                          Assigned Team

                        </div>

                        <p className="mt-1 text-sm font-bold">
                          {getAssignedTeamLabel(
                            selectedReq
                          )}
                        </p>

                      </div>


                      <div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-(--color-medium-teal)">

                          <Clock className="h-4 w-4" />

                          Response

                        </div>

                        <p className="mt-1 text-sm font-bold">
                          {
                            selectedReq.estimatedResponse ||
                            "Awaiting assessment"
                          }
                        </p>

                      </div>

                    </div>


                    {/* STATUS FLOW */}

                    {selectedReq.status ===
                      "Rejected" ? (

                      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

                        <div className="flex items-start gap-3">

                          <AlertCircle className="h-5 w-5 text-red-600" />

                          <div>

                            <p className="font-bold text-red-800">
                              Request Rejected
                            </p>

                            <p className="mt-1 text-sm text-red-700">
                              {
                                selectedReq.governmentNote ||
                                "The request was rejected during government review."
                              }
                            </p>

                          </div>

                        </div>

                      </div>

                    ) : (

                      <div className="bg-white p-6 rounded-3xl border border-[rgba(53,98,103,0.14)]">

                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                          Live Status Flow
                        </p>


                        <div className="mt-4 space-y-2">

                          {STATUS_STEPS.map(
                            (
                              step,
                              index
                            ) => {

                              const currentIndex =
                                getStepIndex(
                                  selectedReq.status
                                );

                              const completed =
                                index <=
                                currentIndex;

                              const current =
                                index ===
                                currentIndex;


                              return (
                                <div
                                  key={
                                    step
                                  }
                                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                                    current
                                      ? "border-(--color-ocean) bg-(--color-soft-mint)"
                                      : completed
                                      ? "border-emerald-200 bg-emerald-50"
                                      : "border-[rgba(53,98,103,0.1)] bg-slate-50"
                                  }`}
                                >

                                  <div
                                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                                      completed
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 text-slate-500"
                                    }`}
                                  >

                                    {completed ? (

                                      <CheckCircle2 className="h-4 w-4" />

                                    ) : (

                                      <span className="text-xs font-bold">
                                        {
                                          index +
                                          1
                                        }
                                      </span>

                                    )}

                                  </div>


                                  <span className="text-sm font-bold">
                                    {
                                      step
                                    }
                                  </span>


                                  {current && (

                                    <span className="ml-auto rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase text-(--color-ocean)">
                                      Current
                                    </span>

                                  )}

                                </div>
                              );
                            }
                          )}

                        </div>

                      </div>

                    )}


                    {/* DESCRIPTION */}

                    <div className="rounded-2xl border border-[rgba(53,98,103,0.12)] bg-white p-5">

                      <h3 className="font-bold">
                        Emergency Description
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-(--color-medium-teal)">
                        {
                          selectedReq.description
                        }
                      </p>

                    </div>


                    {/* ASSISTANCE */}

                    <div className="rounded-2xl border border-[rgba(53,98,103,0.12)] bg-white p-5">

                      <h3 className="font-bold">
                        Assistance Required
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2">

                        {selectedReq.assistanceRequired.map(
                          (
                            item: string
                          ) => (

                            <span
                              key={
                                item
                              }
                              className="rounded-full bg-(--color-soft-mint) px-3 py-1 text-xs font-bold"
                            >
                              {
                                item
                              }
                            </span>

                          )
                        )}

                      </div>

                    </div>


                    {/* TEAM */}

                    {selectedReq.assignedTeam && (

                      <div className="rounded-2xl border border-[rgba(53,98,103,0.12)] bg-white p-5">

                        <div className="flex items-center gap-2">

                          <ShieldCheck className="h-5 w-5 text-(--color-ocean)" />

                          <h3 className="font-bold">
                            Assigned Rescue Team
                          </h3>

                        </div>


                        <p className="mt-3 text-xs text-(--color-medium-teal)">
                          Organization
                        </p>

                        <p className="font-bold">
                          {
                            selectedReq
                              .assignedTeam
                              .organization
                          }
                        </p>


                        <p className="mt-3 text-xs text-(--color-medium-teal)">
                          Team
                        </p>

                        <p className="font-bold">
                          {
                            selectedReq
                              .assignedTeam
                              .teamName
                          }
                        </p>


                        {selectedReq
                          .assignedTeam
                          .resources
                          .length >
                          0 && (

                          <div className="mt-3">

                            <p className="text-xs text-(--color-medium-teal)">
                              Resources
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">

                              {selectedReq
                                .assignedTeam
                                .resources
                                .map(
                                  (
                                    resource: string
                                  ) => (

                                    <span
                                      key={
                                        resource
                                      }
                                      className="rounded-full bg-(--color-soft-mint) px-3 py-1 text-xs font-bold"
                                    >
                                      {
                                        resource
                                      }
                                    </span>

                                  )
                                )}

                            </div>

                          </div>

                        )}

                      </div>

                    )}


                    {/* GOVERNMENT NOTE */}

                    {selectedReq.governmentNote && (

                      <div className="rounded-2xl bg-(--color-pale-aqua)/30 p-4 text-sm">

                        <div className="flex items-center gap-2 font-bold">

                          <ShieldCheck className="h-4 w-4 text-(--color-ocean)" />

                          Government Update

                        </div>

                        <p className="mt-2 text-(--color-medium-teal)">
                          {
                            selectedReq.governmentNote
                          }
                        </p>

                      </div>

                    )}


                    {/* LAST UPDATE */}

                    <div className="flex flex-wrap justify-between gap-3 rounded-2xl bg-(--color-soft-mint) p-4 text-xs">

                      <div>

                        <p className="text-(--color-medium-teal)">
                          Submitted
                        </p>

                        <p className="font-bold">
                          {
                            selectedReq.submittedAt ||
                            selectedReq.createdAt
                          }
                        </p>

                      </div>


                      <div>

                        <p className="text-(--color-medium-teal)">
                          Last Update
                        </p>

                        <p className="font-bold">
                          {
                            selectedReq.lastUpdate
                          }
                        </p>

                      </div>

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