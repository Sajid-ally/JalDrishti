import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  MapPin,
  Users,
  AlertTriangle,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { submitRescueRequest } from "../../services/rescueService";

type Urgency = "Low" | "Medium" | "High" | "Critical";

export default function CitizenRescueRequest() {
  const navigate = useNavigate();

  const [requestType, setRequestType] =
    useState("Flood Evacuation");

  const [location, setLocation] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [peopleCount, setPeopleCount] =
    useState<number>(1);

  const [urgency, setUrgency] =
    useState<Urgency>("High");

  const [photoPreview, setPhotoPreview] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

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
      toast.error(
        "File size must be under 5MB"
      );

      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error(
        "Please select a valid image file."
      );

      e.target.value = "";
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

  /* =========================================================
     REMOVE PHOTO
     ========================================================= */

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
  };

  /* =========================================================
     SUBMIT REQUEST
     ========================================================= */

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!location.trim()) {
      toast.error(
        "Please enter the exact location."
      );
      return;
    }

    if (!description.trim()) {
      toast.error(
        "Please describe the emergency."
      );
      return;
    }

    if (peopleCount < 1) {
      toast.error(
        "Number of people must be at least 1."
      );
      return;
    }

    setSubmitting(true);

    try {
      const created =
        await submitRescueRequest({
          type: requestType,
          location: location.trim(),
          description: description.trim(),
          peopleCount:
            Number(peopleCount) || 1,
          urgency,
        });

      toast.success(
        `Rescue Request #${created.id} submitted!`
      );

      navigate(
        "/citizen/relief-tracking"
      );
    } catch (error) {
      console.error(
        "Failed to submit rescue request:",
        error
      );

      toast.error(
        "Failed to submit rescue request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     UI
     ========================================================= */

  return (
    <main className="min-h-screen space-y-6 text-[var(--color-dark-teal)]">
      <div className="rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">

        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
            Emergency Response
          </p>

          <h1 className="mt-1 text-3xl font-black text-[var(--color-deep-ocean)]">
            Submit Rescue Request
          </h1>

          <p className="mt-1 text-sm text-[var(--color-medium-teal)]">
            Request assistance from disaster response
            units, NDRF, and local rescue teams.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 max-w-3xl space-y-6"
        >
          <div className="space-y-5 rounded-3xl border border-[rgba(53,98,103,0.16)] bg-[var(--color-soft-mint)]/20 p-6">

            {/* =================================================
                REQUEST TYPE
                ================================================= */}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)]">
                Request Type *
              </label>

              <select
                value={requestType}
                onChange={(e) =>
                  setRequestType(
                    e.target.value
                  )
                }
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
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

            {/* =================================================
                LOCATION
                ================================================= */}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)]">
                Exact Location / Landmark *
              </label>

              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />

                <input
                  type="text"
                  required
                  placeholder="e.g. House #42, Puri Beach Road Sector 4"
                  value={location}
                  onChange={(e) =>
                    setLocation(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
                />
              </div>
            </div>

            {/* =================================================
                PEOPLE + URGENCY
                ================================================= */}

            <div className="grid gap-4 sm:grid-cols-2">

              {/* People */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)]">
                  Number of People Needing Help *
                </label>

                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />

                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={peopleCount}
                    onChange={(e) => {
                      const value =
                        Number.parseInt(
                          e.target.value,
                          10
                        );

                      setPeopleCount(
                        Number.isNaN(value)
                          ? 1
                          : Math.min(
                              Math.max(
                                value,
                                1
                              ),
                              100
                            )
                      );
                    }}
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
                  />
                </div>
              </div>

              {/* Urgency */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)]">
                  Severity / Urgency *
                </label>

                <div className="relative">
                  <AlertTriangle className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />

                  <select
                    value={urgency}
                    onChange={(e) =>
                      setUrgency(
                        e.target.value as Urgency
                      )
                    }
                    className="w-full appearance-none rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm font-bold text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
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

            {/* =================================================
                DESCRIPTION
                ================================================= */}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)]">
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
                className="w-full resize-none rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
              />
            </div>

            {/* =================================================
                PHOTO
                ================================================= */}

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)]">
                Optional Site Photo / Evidence
              </label>

              {photoPreview ? (
                <div className="relative inline-block overflow-hidden rounded-3xl border-2 border-[var(--color-ocean)] bg-white p-2">

                  <img
                    src={photoPreview}
                    alt="Rescue evidence preview"
                    className="h-44 w-44 rounded-2xl object-cover"
                  />

                  <div className="mt-2 flex items-center justify-between gap-3 px-1">

                    <label className="cursor-pointer text-xs font-bold text-[var(--color-ocean)] hover:underline">
                      Change Image

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
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
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[rgba(53,98,103,0.25)] bg-white p-5 text-center transition hover:border-[var(--color-ocean)] hover:bg-[var(--color-pale-aqua)]/20">

                  <Upload className="mb-1 h-7 w-7 text-[var(--color-ocean)]" />

                  <span className="text-sm font-bold text-[var(--color-dark-teal)]">
                    Upload image of site or hazard
                  </span>

                  <span className="text-xs text-[var(--color-medium-teal)]">
                    PNG, JPG, WEBP up to 5MB
                  </span>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={
                      handlePhotoUpload
                    }
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* =================================================
              SUBMIT
              ================================================= */}

          <div className="flex items-center gap-4">

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[var(--color-deep-ocean)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />

              {submitting
                ? "Submitting Request..."
                : "Submit Rescue Request"}
            </button>

          </div>
        </form>
      </div>
    </main>
  );
}