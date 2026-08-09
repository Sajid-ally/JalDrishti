import { useState, useEffect, useMemo, type ChangeEvent } from "react";
import {
  UserPlus,
  Search,
  MapPin,
  Clock,
  UserCheck,
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import EmergencyAlertCard from "../../components/alerts/EmergencyAlertCard";
import {
  getMissingPersons,
  addMissingPerson,
  reportPersonFound,
} from "../../services/missingPersonService";
import type { MissingPerson } from "../../types/missingPerson";

export default function CitizenMissingPersons() {
  const [activeTab, setActiveTab] = useState<"find" | "report">("find");
  const [people, setPeople] = useState<MissingPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  // Search & Filter state
  const [searchName, setSearchName] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // Report Form state
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [lastLocation, setLastLocation] = useState("");
  const [dateLastSeen, setDateLastSeen] = useState("");
  const [description, setDescription] = useState("");
  const [clothingDetails, setClothingDetails] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Found Person Modal state
  const [foundModalPerson, setFoundModalPerson] = useState<MissingPerson | null>(null);
  const [foundNotes, setFoundNotes] = useState("");
  const [foundSubmitting, setFoundSubmitting] = useState(false);

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    setLoading(true);
    try {
      const data = await getMissingPersons();
      setPeople(data);
    } finally {
      setLoading(false);
    }
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

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !lastLocation || !dateLastSeen || !contactInfo) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await addMissingPerson({
        name,
        age,
        gender,
        lastLocation,
        dateLastSeen,
        description,
        clothingDetails,
        contactInfo,
        photoUrl: photoPreview || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      });

      toast.success("Missing person report submitted successfully.");

      // Reset form
      setName("");
      setAge("");
      setGender("Male");
      setLastLocation("");
      setDateLastSeen("");
      setDescription("");
      setClothingDetails("");
      setContactInfo("");
      setPhotoPreview(null);

      // Refresh list & switch tab
      await fetchPeople();
      setActiveTab("find");
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmFound = async () => {
    if (!foundModalPerson) return;
    if (!foundNotes.trim()) {
      toast.error("Please provide a note describing how/where the person was found.");
      return;
    }

    setFoundSubmitting(true);
    try {
      await reportPersonFound(foundModalPerson.id, foundNotes);
      toast.success(`Updated report for ${foundModalPerson.name}. Thank you!`);
      setFoundModalPerson(null);
      setFoundNotes("");
      await fetchPeople();
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setFoundSubmitting(false);
    }
  };

  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      const matchName = p.name.toLowerCase().includes(searchName.toLowerCase());
      const matchLoc = p.lastLocation.toLowerCase().includes(filterLocation.toLowerCase());
      return matchName && matchLoc;
    });
  }, [people, searchName, filterLocation]);

  const urgentCount = useMemo(
    () => people.filter((p) => p.status === "Searching" || p.status === "Pending").length,
    [people]
  );

  return (
    <main className="min-h-screen text-[var(--color-dark-teal)] space-y-6">
      {/* Header Banner */}
      {!isAlertDismissed && urgentCount > 0 && (
        <EmergencyAlertCard
          title="Active Missing Persons Notice"
          message={`${urgentCount} active report${urgentCount > 1 ? "s" : ""} recorded in coastal areas. Please review the directory or submit a report.`}
          onClose={() => setIsAlertDismissed(true)}
        />
      )}

      {/* Main Container */}
      <div className="rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
              Community Missing Persons
            </p>
            <h1 className="mt-1 text-3xl font-black text-[var(--color-deep-ocean)]">
              Missing Persons Directory
            </h1>
            <p className="mt-1 text-sm text-[var(--color-medium-teal)]">
              Report missing community members or aid in search efforts during emergency evacuations.
            </p>
          </div>

          {/* Action Tabs */}
          <div className="flex items-center gap-2 rounded-2xl bg-[var(--color-pale-aqua)]/50 p-1.5 border border-[rgba(53,98,103,0.14)]">
            <button
              type="button"
              onClick={() => setActiveTab("find")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                activeTab === "find"
                  ? "bg-[var(--color-ocean)] text-white shadow-sm"
                  : "text-[var(--color-dark-teal)] hover:bg-[var(--color-pale-aqua)]"
              }`}
            >
              <Search className="h-4 w-4" />
              Find Missing Person
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("report")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                activeTab === "report"
                  ? "bg-[var(--color-ocean)] text-white shadow-sm"
                  : "text-[var(--color-dark-teal)] hover:bg-[var(--color-pale-aqua)]"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Report Missing Person
            </button>
          </div>
        </div>

        {/* ── TAB 1: FIND MISSING PERSON ── */}
        {activeTab === "find" && (
          <div className="mt-8 space-y-6">
            {/* Simple Search & Filter */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-[var(--color-soft-mint)]/30 py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] focus:bg-white"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
                <input
                  type="text"
                  placeholder="Filter by last known location..."
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-[var(--color-soft-mint)]/30 py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] focus:bg-white"
                />
              </div>
            </div>

            {/* List / Cards Layout */}
            {loading ? (
              <div className="py-12 text-center text-sm text-[var(--color-medium-teal)]">
                Loading missing person records...
              </div>
            ) : filteredPeople.length === 0 ? (
              <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-[var(--color-soft-mint)]/20 p-8 text-center">
                <p className="text-sm text-[var(--color-medium-teal)]">
                  No missing person records found matching your search.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPeople.map((person) => (
                  <article
                    key={person.id}
                    className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div>
                      {/* Photo Header */}
                      <div className="relative h-56 w-full bg-[var(--color-pale-aqua)]/40 overflow-hidden">
                        {person.photoUrl ? (
                          <img
                            src={person.photoUrl}
                            alt={person.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--color-medium-teal)]">
                            <ImageIcon className="h-12 w-12 opacity-40" />
                          </div>
                        )}
                        {/* Status Badge Overlay */}
                        <div className="absolute top-3 right-3">
                          {person.status === "Found" ? (
                            <Badge variant="success">Found</Badge>
                          ) : person.status === "Searching" ? (
                            <Badge variant="danger">Searching</Badge>
                          ) : person.status === "Pending" ? (
                            <Badge variant="warning">Pending Review</Badge>
                          ) : (
                            <Badge variant="neutral">Closed</Badge>
                          )}
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-bold text-[var(--color-deep-ocean)]">
                            {person.name}
                          </h2>
                          <span className="text-xs font-semibold text-[var(--color-medium-teal)]">
                            {person.age} yrs · {person.gender}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-[var(--color-dark-teal)]">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-[var(--color-ocean)] shrink-0 mt-0.5" />
                            <span>
                              <strong>Last Location:</strong> {person.lastLocation}
                            </span>
                          </div>

                          <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 text-[var(--color-ocean)] shrink-0 mt-0.5" />
                            <span>
                              <strong>Last Seen:</strong> {person.dateLastSeen}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {person.description}
                        </p>

                        {person.clothingDetails && (
                          <div className="rounded-xl bg-[var(--color-pale-aqua)]/30 p-2.5 text-xs text-[var(--color-dark-teal)]">
                            <strong>Details:</strong> {person.clothingDetails}
                          </div>
                        )}

                        {person.foundNotes && (
                          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800">
                            <strong>Found Note:</strong> {person.foundNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Action */}
                    <div className="border-t border-[rgba(53,98,103,0.1)] p-4 bg-[var(--color-soft-mint)]/20">
                      {person.status !== "Found" && person.status !== "Closed" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setFoundModalPerson(person);
                            setFoundNotes("");
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                        >
                          <UserCheck className="h-4 w-4" />
                          Found the Person
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 py-1">
                          <CheckCircle className="h-4 w-4" />
                          Status: {person.status}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: REPORT MISSING PERSON ── */}
        {activeTab === "report" && (
          <form onSubmit={handleSubmitReport} className="mt-8 space-y-6 max-w-3xl">
            <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-[var(--color-soft-mint)]/20 p-6 space-y-5">
              <h2 className="text-lg font-bold text-[var(--color-deep-ocean)] flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[var(--color-ocean)]" />
                Missing Person Information
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                    Missing Person's Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                      Age *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 24"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                      Gender *
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                    Last Known Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Puri Beach Shelter 2"
                    value={lastLocation}
                    onChange={(e) => setLastLocation(e.target.value)}
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                    Date &amp; Time Last Seen *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026-08-08 08:30 AM"
                    value={dateLastSeen}
                    onChange={(e) => setDateLastSeen(e.target.value)}
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                  Description / Situation Circumstances
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the circumstances under which the person went missing..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                  Clothing / Identifying Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blue jacket, black cap, tattoo on wrist"
                  value={clothingDetails}
                  onChange={(e) => setClothingDetails(e.target.value)}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                  Contact Information *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Phone number, family contact info"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
                />
              </div>

              {/* Photograph Upload with Required Preview */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-2">
                  Photograph Upload
                </label>

                {photoPreview ? (
                  <div className="relative inline-block overflow-hidden rounded-3xl border-2 border-[var(--color-ocean)] bg-white p-2">
                    <img
                      src={photoPreview}
                      alt="Missing person preview"
                      className="h-48 w-48 object-cover rounded-2xl"
                    />
                    <div className="mt-3 flex items-center justify-between gap-2 px-1">
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
                        <X className="h-3.5 w-3.5" /> Remove Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[rgba(53,98,103,0.25)] bg-white p-6 text-center cursor-pointer transition hover:border-[var(--color-ocean)] hover:bg-[var(--color-pale-aqua)]/20">
                    <Upload className="h-8 w-8 text-[var(--color-ocean)] mb-2" />
                    <span className="text-sm font-bold text-[var(--color-dark-teal)]">
                      Click to upload photograph
                    </span>
                    <span className="text-xs text-[var(--color-medium-teal)] mt-1">
                      PNG, JPG up to 5MB
                    </span>
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

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[var(--color-deep-ocean)] disabled:opacity-50"
            >
              {submitting ? "Submitting Report..." : "Submit Missing Person Report"}
            </button>
          </form>
        )}
      </div>

      {/* Modal for 'Found the Person' */}
      <Modal
        isOpen={Boolean(foundModalPerson)}
        onClose={() => setFoundModalPerson(null)}
        title={`Report ${foundModalPerson?.name} as Found`}
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-[var(--color-medium-teal)]">
            Please provide details on where and how the person was found to assist officials and family members.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
              Found Details / Location Note *
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Located safely at Community Shelter #2 receiving medical care..."
              value={foundNotes}
              onChange={(e) => setFoundNotes(e.target.value)}
              className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFoundModalPerson(null)}
              className="rounded-2xl px-5 py-2.5 text-xs font-bold text-[var(--color-medium-teal)] hover:bg-[var(--color-pale-aqua)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmFound}
              disabled={foundSubmitting}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {foundSubmitting ? "Updating..." : "Submit Found Details"}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
