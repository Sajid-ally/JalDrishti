import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  Send,
  MapPin,
  Users,
  AlertTriangle,
  Upload,
  X,
  Navigation,
  Loader2,
} from "lucide-react";

import toast from "react-hot-toast";

import {
  submitRescueRequest,
} from "../../services/rescueService";

import {
  useGeolocation,
} from "../../hooks/useGeolocation";

import type {
  RescueUrgency,
  SubmitRescueRequestData,
} from "../../types/rescue";

/* ============================================================
   OPTIONS
   ============================================================ */

const DISASTER_TYPES = [
  "Flood",
  "Tsunami",
  "Cyclone",
  "Storm Surge",
  "Landslide",
  "Coastal Erosion",
] as const;

const ASSISTANCE_OPTIONS = [
  "Evacuation",
  "Medical",
  "Food",
  "Water",
  "Shelter",
  "Rescue Boat",
] as const;

/* ============================================================
   COMPONENT
   ============================================================ */

export default function RescueRequest() {
  const navigate = useNavigate();

  /* ============================================================
     LOCATION
     ============================================================ */

  const {
    coords,
    request: requestLocation,
    loading: locationLoading,
    error: geoError,
  } = useGeolocation();

  const [
    locationError,
    setLocationError,
  ] = useState<string | null>(null);

  const [editableAddress, setEditableAddress] =
    useState("");

  const [landmark, setLandmark] =
    useState("");

  /* ============================================================
     FORM
     ============================================================ */

  const [disasterType, setDisasterType] =
    useState<string>("Flood");

  const [description, setDescription] =
    useState("");

  const [peopleCount, setPeopleCount] =
    useState<number>(1);

  const [urgency, setUrgency] =
    useState<RescueUrgency>("High");

  const [assistanceRequired, setAssistanceRequired] =
    useState<string[]>([]);

  /* ============================================================
     PHOTO
     ============================================================ */

  const [photoFile, setPhotoFile] =
    useState<File | null>(null);

  const [photoPreview, setPhotoPreview] =
    useState<string | null>(null);

  /* ============================================================
     SUBMISSION
     ============================================================ */

  const [submitting, setSubmitting] =
    useState(false);

  /* ============================================================
     GET LOCATION
     ============================================================ */

  useEffect(() => {
    const getLocation = async () => {
      try {
        setLocationError(null);
        await requestLocation();
      } catch (error) {
        console.error(
          "Location error:",
          error
        );

        setLocationError(
          "Unable to get your current location."
        );
      }
    };

    getLocation();
  }, [requestLocation]);

  /* ============================================================
     HANDLE GEOLOCATION ERROR
     ============================================================ */

  useEffect(() => {
    if (geoError) {
      setLocationError(
        geoError
      );
    }
  }, [geoError]);

  /* ============================================================
     REVERSE GEOCODING
     ============================================================ */

  useEffect(() => {
    if (!coords) {
      return;
    }

    const getAddress =
      async () => {
        try {
          const response =
            await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`,
              {
                headers: {
                  Accept:
                    "application/json",
                },
              }
            );

          if (!response.ok) {
            throw new Error(
              "Reverse geocoding failed"
            );
          }

          const data =
            await response.json();

          const address =
            data.display_name ||
            `${coords.lat.toFixed(
              5
            )}, ${coords.lng.toFixed(5)}`;

          setEditableAddress(
            address
          );

          setLocationError(
            null
          );
        } catch (error) {
          console.warn(
            "Address lookup failed:",
            error
          );

          /*
           * GPS coordinates are still valid
           * even when reverse geocoding fails.
           */

          setEditableAddress(
            `${coords.lat.toFixed(
              5
            )}, ${coords.lng.toFixed(5)}`
          );
        }
      };

    getAddress();
  }, [coords]);

  /* ============================================================
     ASSISTANCE TOGGLE
     ============================================================ */

  const toggleAssistance = (
    option: string
  ) => {
    setAssistanceRequired(
      (previous) => {
        if (
          previous.includes(
            option
          )
        ) {
          return previous.filter(
            (item) =>
              item !== option
          );
        }

        return [
          ...previous,
          option,
        ];
      }
    );
  };

  /* ============================================================
     PHOTO UPLOAD
     ============================================================ */

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

    const MAX_SIZE =
      5 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      toast.error(
        "Image must be smaller than 5 MB."
      );

      return;
    }

    /*
     * Revoke previous preview.
     */

    if (photoPreview) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    setPhotoFile(file);

    setPhotoPreview(
      URL.createObjectURL(file)
    );
  };

  /* ============================================================
     REMOVE PHOTO
     ============================================================ */

  const removePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    setPhotoFile(null);

    setPhotoPreview(null);
  };

  /* ============================================================
     VALIDATION
     ============================================================ */

  const validateForm = (): boolean => {
    if (!description.trim()) {
      toast.error(
        "Please describe the emergency."
      );

      return false;
    }

    if (
      assistanceRequired.length ===
      0
    ) {
      toast.error(
        "Please select at least one type of assistance."
      );

      return false;
    }

    if (
      peopleCount < 1 ||
      peopleCount > 100
    ) {
      toast.error(
        "People count must be between 1 and 100."
      );

      return false;
    }

    if (!coords) {
      toast.error(
        "Your location is required for a rescue request."
      );

      return false;
    }

    return true;
  };

  /* ============================================================
     SUBMIT
     ============================================================ */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    /*
     * TypeScript narrowing.
     *
     * validateForm() cannot narrow coords,
     * so explicitly check it here.
     */

    if (!coords) {
      toast.error(
        "Location unavailable."
      );

      return;
    }

    setSubmitting(true);

    try {
      const locationName =
        landmark.trim()
          ? `${landmark.trim()}, ${
              editableAddress ||
              `${coords.lat.toFixed(
                5
              )}, ${coords.lng.toFixed(5)}`
            }`
          : editableAddress ||
            `${coords.lat.toFixed(
              5
            )}, ${coords.lng.toFixed(5)}`;

      const payload:
        SubmitRescueRequestData = {
        disasterType,

        description:
          description.trim(),

        latitude: coords.lat,

        longitude: coords.lng,

        locationName,

        peopleAffected:
          peopleCount,

        assistanceRequired,

        urgency,

        photo:
          photoFile || undefined,
      };

      await submitRescueRequest(
        payload
      );

      toast.success(
        "Rescue request submitted successfully!"
      );

      /*
       * Go to tracking page after
       * successful backend submission.
       */

      navigate(
        "/citizen/relief-tracking"
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

  /* ============================================================
     UI
     ============================================================ */

  return (
    <main className="min-h-screen text-(--color-dark-teal) space-y-6">

      <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="border-b border-[rgba(53,98,103,0.1)] pb-5">

          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
            Emergency Response
          </p>

          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-(--color-deep-ocean)">
            Submit Rescue Request
          </h1>

          <p className="mt-1 text-xs sm:text-sm text-(--color-medium-teal)">
            Request emergency assistance from government and rescue teams.
          </p>

        </div>

        {/* ======================================================
            FORM
        ====================================================== */}

        <form
          onSubmit={handleSubmit}
          className="mt-6 max-w-4xl space-y-6"
        >

          {/* ====================================================
              DISASTER TYPE
          ==================================================== */}

          <section className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint)/20 p-5 sm:p-6">

            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)">
              Disaster Type
            </label>

            <select
              value={disasterType}
              onChange={(event) =>
                setDisasterType(
                  event.target.value
                )
              }
              className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-3 text-sm font-medium text-(--color-dark-teal) outline-none focus:border-(--color-ocean) focus:ring-4 focus:ring-(--color-ocean)/10"
            >
              {DISASTER_TYPES.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}
            </select>

          </section>

          {/* ====================================================
              ASSISTANCE
          ==================================================== */}

          <section className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint)/20 p-5 sm:p-6">

            <div className="flex items-center gap-2">

              <LifeBuoyIcon />

              <div>

                <h2 className="text-sm font-bold text-(--color-deep-ocean)">
                  Assistance Required
                </h2>

                <p className="text-xs text-(--color-medium-teal)">
                  Select all types of help you need.
                </p>

              </div>

            </div>

            <div className="mt-4 flex flex-wrap gap-2">

              {ASSISTANCE_OPTIONS.map(
                (option) => {

                  const selected =
                    assistanceRequired.includes(
                      option
                    );

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        toggleAssistance(
                          option
                        )
                      }
                      className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                        selected
                          ? "border-(--color-ocean) bg-(--color-ocean) text-white shadow-sm"
                          : "border-[rgba(53,98,103,0.2)] bg-white text-(--color-dark-teal) hover:border-(--color-ocean) hover:bg-(--color-soft-mint)"
                      }`}
                    >
                      {option}
                    </button>
                  );
                }
              )}

            </div>

          </section>

          {/* ====================================================
              LOCATION
          ==================================================== */}

          <section className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint)/20 p-5 sm:p-6">

            <div className="flex items-start justify-between gap-4">

              <div className="flex items-center gap-2">

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--color-pale-aqua) text-(--color-ocean)">
                  <MapPin className="h-5 w-5" />
                </div>

                <div>

                  <h2 className="text-sm font-bold text-(--color-deep-ocean)">
                    Emergency Location
                  </h2>

                  <p className="text-xs text-(--color-medium-teal)">
                    GPS coordinates are captured automatically.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  requestLocation()
                }
                disabled={
                  locationLoading
                }
                className="inline-flex items-center gap-1 rounded-xl border border-[rgba(53,98,103,0.18)] bg-white px-3 py-2 text-xs font-bold text-(--color-ocean) hover:bg-(--color-soft-mint) disabled:opacity-50"
              >
                {locationLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Navigation className="h-3.5 w-3.5" />
                )}

                Refresh
              </button>

            </div>

            <div className="mt-4 space-y-3">

              <input
                type="text"
                value={
                  editableAddress
                }
                onChange={(event) =>
                  setEditableAddress(
                    event.target.value
                  )
                }
                placeholder="Detecting your current location..."
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-3 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean) focus:ring-4 focus:ring-(--color-ocean)/10"
              />

              <input
                type="text"
                value={landmark}
                onChange={(event) =>
                  setLandmark(
                    event.target.value
                  )
                }
                placeholder="Landmark / additional location details (optional)"
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-3 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean) focus:ring-4 focus:ring-(--color-ocean)/10"
              />

              {coords && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">

                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">

                    <MapPin className="h-4 w-4" />

                    GPS Location Detected

                  </div>

                  <p className="mt-1 font-mono text-[11px] text-emerald-700">

                    {coords.lat.toFixed(
                      6
                    )}
                    ° N,{" "}
                    {coords.lng.toFixed(
                      6
                    )}
                    ° E

                  </p>

                </div>
              )}

              {locationError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">

                  <p className="font-bold">
                    Location Notice
                  </p>

                  <p className="mt-1">
                    {locationError}
                  </p>

                </div>
              )}

            </div>

          </section>

          {/* ====================================================
              PEOPLE + URGENCY
          ==================================================== */}

          <section className="grid gap-4 sm:grid-cols-2">

            <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-5">

              <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)">

                <Users className="h-4 w-4" />

                People Needing Help

              </label>

              <input
                type="number"
                min={1}
                max={100}
                value={
                  peopleCount
                }
                onChange={(event) =>
                  setPeopleCount(
                    Math.max(
                      1,
                      Math.min(
                        100,
                        Number(
                          event.target
                            .value
                        ) || 1
                      )
                    )
                  )
                }
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50 px-4 py-3 text-sm font-bold text-(--color-dark-teal) outline-none focus:border-(--color-ocean) focus:bg-white"
              />

            </div>

            <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-5">

              <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)">

                <AlertTriangle className="h-4 w-4" />

                Urgency

              </label>

              <select
                value={urgency}
                onChange={(event) =>
                  setUrgency(
                    event.target
                      .value as RescueUrgency
                  )
                }
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50 px-4 py-3 text-sm font-bold text-(--color-dark-teal) outline-none focus:border-(--color-ocean) focus:bg-white"
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

          </section>

          {/* ====================================================
              DESCRIPTION
          ==================================================== */}

          <section className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-5 sm:p-6">

            <label
              htmlFor="rescue-description"
              className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)"
            >
              Emergency Description *
            </label>

            <textarea
              id="rescue-description"
              value={
                description
              }
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              rows={5}
              maxLength={2000}
              required
              placeholder="Describe the emergency, people affected, injuries, water level, trapped persons, or any immediate danger..."
              className="w-full resize-none rounded-2xl border border-[rgba(53,98,103,0.2)] bg-slate-50 px-4 py-3 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean) focus:bg-white focus:ring-4 focus:ring-(--color-ocean)/10"
            />

            <div className="mt-2 flex justify-between text-[10px] text-(--color-medium-teal)">

              <span>
                Provide clear information so responders can act faster.
              </span>

              <span>
                {description.length}
                /2000
              </span>

            </div>

          </section>

          {/* ====================================================
              PHOTO
          ==================================================== */}

          <section className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-5 sm:p-6">

            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-(--color-medium-teal)">
              Site Evidence (Optional)
            </label>

            {photoPreview ? (
              <div className="relative w-fit">

                <img
                  src={photoPreview}
                  alt="Emergency evidence preview"
                  className="h-48 w-48 rounded-3xl border border-[rgba(53,98,103,0.18)] object-cover shadow-sm"
                />

                <button
                  type="button"
                  onClick={
                    removePhoto
                  }
                  className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>

                <p className="mt-2 max-w-48 truncate text-xs text-(--color-medium-teal)">
                  {photoFile?.name}
                </p>

              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[rgba(53,98,103,0.22)] bg-slate-50 p-8 text-center transition hover:border-(--color-ocean) hover:bg-(--color-soft-mint)">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--color-pale-aqua) text-(--color-ocean)">
                  <Upload className="h-6 w-6" />
                </div>

                <p className="mt-3 text-sm font-bold text-(--color-deep-ocean)">
                  Upload Emergency Evidence
                </p>

                <p className="mt-1 text-xs text-(--color-medium-teal)">
                  JPG, PNG or WEBP · Maximum 5 MB
                </p>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handlePhotoUpload
                  }
                  className="hidden"
                />

              </label>
            )}

          </section>

          {/* ====================================================
              SUBMIT
          ==================================================== */}

          <button
            type="submit"
            disabled={
              submitting ||
              locationLoading
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-(--color-deep-ocean) active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >

            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />

                Submitting Rescue Request...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />

                Submit Rescue Request
              </>
            )}

          </button>

          <p className="text-center text-[11px] text-(--color-medium-teal)">
            Your location and emergency information will be shared with the authorized response system.
          </p>

        </form>

      </div>
    </main>
  );
}

/* ============================================================
   SMALL ICON COMPONENT
   ============================================================ */

function LifeBuoyIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--color-pale-aqua) text-(--color-ocean)">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
        />

        <circle
          cx="12"
          cy="12"
          r="3"
        />

        <path d="m14.5 9.5 4-4" />

        <path d="m9.5 14.5-4 4" />

        <path d="m14.5 14.5 4 4" />

        <path d="m9.5 9.5-4-4" />
      </svg>
    </div>
  );
}