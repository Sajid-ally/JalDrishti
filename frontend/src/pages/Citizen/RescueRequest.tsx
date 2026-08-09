import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Send, MapPin, Users, AlertTriangle, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { submitRescueRequest } from "../../services/rescueService";

export default function CitizenRescueRequest() {
  const navigate = useNavigate();

  const [requestType, setRequestType] = useState("Flood Evacuation");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [urgency, setUrgency] = useState<"Low" | "Medium" | "High" | "Critical">("High");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      navigate("/citizen/relief-tracking");
    } catch {
      toast.error("Failed to submit rescue request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen text-[var(--color-dark-teal)] space-y-6">
      <div className="rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
            Emergency Response
          </p>
          <h1 className="mt-1 text-3xl font-black text-[var(--color-deep-ocean)]">
            Submit Rescue Request
          </h1>
          <p className="mt-1 text-sm text-[var(--color-medium-teal)]">
            Request assistance from disaster response units, NDRF, and local rescue teams.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 max-w-3xl">
          <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-[var(--color-soft-mint)]/20 p-6 space-y-5">
            {/* Request Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                Request Type *
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] font-medium"
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
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                Exact Location / Landmark *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
                <input
                  type="text"
                  required
                  placeholder="e.g. House #42, Puri Beach Road Sector 4"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
                />
              </div>
            </div>

            {/* Grid for People Count & Urgency */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
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
                    onChange={(e) => setPeopleCount(parseInt(e.target.value) || 1)}
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                  Severity / Urgency *
                </label>
                <div className="relative">
                  <AlertTriangle className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
                  <select
                    value={urgency}
                    onChange={(e) =>
                      setUrgency(e.target.value as "Low" | "Medium" | "High" | "Critical")
                    }
                    className="w-full appearance-none rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] font-bold cursor-pointer"
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
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                Description of Emergency *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe current situation, water levels, medical conditions, or hazards..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
              />
            </div>

            {/* Optional Image Upload with Preview */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-2">
                Optional Site Photo / Evidence
              </label>

              {photoPreview ? (
                <div className="relative inline-block overflow-hidden rounded-3xl border-2 border-[var(--color-ocean)] bg-white p-2">
                  <img
                    src={photoPreview}
                    alt="Rescue preview"
                    className="h-44 w-44 object-cover rounded-2xl"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2 px-1">
                    <label className="cursor-pointer text-xs font-bold text-[var(--color-ocean)] hover:underline">
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
                <label className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[rgba(53,98,103,0.25)] bg-white p-5 text-center cursor-pointer transition hover:border-[var(--color-ocean)] hover:bg-[var(--color-pale-aqua)]/20">
                  <Upload className="h-7 w-7 text-[var(--color-ocean)] mb-1" />
                  <span className="text-sm font-bold text-[var(--color-dark-teal)]">
                    Upload image of site or hazard
                  </span>
                  <span className="text-xs text-[var(--color-medium-teal)]">PNG, JPG up to 5MB</span>
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
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[var(--color-deep-ocean)] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting Request..." : "Submit Rescue Request"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
