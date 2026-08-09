import {
  useState,
  useEffect,
  useMemo,
  type ChangeEvent,
  type FormEvent,
} from "react";

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
  Send,
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

  // =========================================================
  // SEARCH & FILTER
  // =========================================================

  const [searchName, setSearchName] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // =========================================================
  // REPORT FORM
  // =========================================================

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

  // =========================================================
  // FOUND PERSON MODAL
  // =========================================================

  const [foundModalPerson, setFoundModalPerson] =
    useState<MissingPerson | null>(null);

  const [foundNotes, setFoundNotes] = useState("");
  const [foundSubmitting, setFoundSubmitting] = useState(false);

  // =========================================================
  // FETCH PEOPLE
  // =========================================================

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

  // =========================================================
  // PHOTO UPLOAD
  // =========================================================

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
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
      setPhotoPreview(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
  };

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await fetchPeople();
  };

  // =========================================================
  // SUBMIT MISSING PERSON REPORT
  // =========================================================

  const handleSubmitReport = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !name ||
      !age ||
      !lastLocation ||
      !dateLastSeen ||
      !contactInfo
    ) {
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
        photoUrl:
          photoPreview ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
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

      // Refresh people
      await fetchPeople();

      // Go back to Find tab
      setActiveTab("find");
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // REPORT PERSON AS FOUND
  // =========================================================

  const handleConfirmFound = async () => {
    if (!foundModalPerson) {
      return;
    }

    if (!foundNotes.trim()) {
      toast.error(
        "Please provide a note describing how/where the person was found."
      );
      return;
    }

    setFoundSubmitting(true);

    try {
      await reportPersonFound(
        foundModalPerson.id,
        foundNotes
      );

      toast.success(
        `Updated report for ${foundModalPerson.name}. Thank you!`
      );

      setFoundModalPerson(null);
      setFoundNotes("");

      await fetchPeople();
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setFoundSubmitting(false);
    }
  };

  // =========================================================
  // FILTER PEOPLE
  // =========================================================

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const matchName = person.name
        .toLowerCase()
        .includes(searchName.toLowerCase());

      const matchLocation = person.lastLocation
        .toLowerCase()
        .includes(filterLocation.toLowerCase());

      return matchName && matchLocation;
    });
  }, [people, searchName, filterLocation]);

  // =========================================================
  // URGENT COUNT
  // =========================================================

  const urgentCount = useMemo(() => {
    return people.filter(
      (person) =>
        person.status === "Searching" ||
        person.status === "Pending"
    ).length;
  }, [people]);

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen space-y-6 text-(--color-dark-teal)">

      {/* =====================================================
          EMERGENCY ALERT
      ====================================================== */}

      {!isAlertDismissed && urgentCount > 0 && (
        <EmergencyAlertCard
          title="Active Missing Persons Notice"
          message={`${urgentCount} active report${
            urgentCount > 1 ? "s" : ""
          } recorded in coastal areas. Please review the directory or submit a report.`}
          onClose={() => setIsAlertDismissed(true)}
        />
      )}

      {/* =====================================================
          MAIN CONTAINER
      ====================================================== */}

      <div className="rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">

        {/* ===================================================
            HEADER
        ==================================================== */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
              Community Missing Persons
            </p>

            <h1 className="mt-1 text-3xl font-black text-(--color-deep-ocean)">
              Missing Persons Directory
            </h1>

            <p className="mt-1 text-sm text-(--color-medium-teal)">
              Report missing community members or aid in search efforts during
              emergency evacuations.
            </p>
          </div>

          {/* =================================================
              ACTION BUTTONS
          ================================================== */}

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.14)] bg-(--color-pale-aqua)/50 p-1.5">

            {/* FIND MISSING PERSON */}

            <button
              type="button"
              onClick={() => setActiveTab("find")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                activeTab === "find"
                  ? "bg-(--color-ocean) text-white shadow-sm"
                  : "bg-white text-(--color-dark-teal) shadow-sm hover:bg-(--color-pale-aqua)"
              }`}
            >
              <Search className="h-4 w-4" />

              Find Missing Person
            </button>

            {/* REPORT MISSING PERSON */}

            <button
              type="button"
              onClick={() => setActiveTab("report")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                activeTab === "report"
                  ? "bg-(--color-ocean) text-white shadow-sm"
                  : "bg-white text-(--color-dark-teal) shadow-sm hover:bg-(--color-pale-aqua)"
              }`}
            >
              <UserPlus className="h-4 w-4" />

              Report Missing Person
            </button>

            {/* SUBMIT REPORT
                Only shown when Report tab is active */}

            {activeTab === "report" && (
              <button
                type="submit"
                form="missing-person-report-form"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-(--color-deep-ocean) px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-(--color-dark-teal) disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />

                {submitting
                  ? "Submitting..."
                  : "Submit Report"}
              </button>
            )}
          </div>
        </div>

        {/* =====================================================
            FIND MISSING PERSON TAB
        ====================================================== */}

        {activeTab === "find" && (
          <div className="mt-8 space-y-6">

            {/* SEARCH */}

            <form
              onSubmit={handleSearchSubmit}
              className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="grid gap-4 sm:grid-cols-2">

                {/* NAME SEARCH */}

                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />

                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchName}
                    onChange={(e) =>
                      setSearchName(e.target.value)
                    }
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-(--color-soft-mint)/30 py-2.5 pl-10 pr-4 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean) focus:bg-white"
                  />
                </div>

                {/* LOCATION SEARCH */}

                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />

                  <input
                    type="text"
                    placeholder="Filter by last known location..."
                    value={filterLocation}
                    onChange={(e) =>
                      setFilterLocation(e.target.value)
                    }
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-(--color-soft-mint)/30 py-2.5 pl-10 pr-4 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean) focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="rounded-2xl bg-(--color-ocean) px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-(--color-deep-ocean)"
              >
                Search
              </button>
            </form>

            {/* =================================================
                PEOPLE LIST
            ================================================== */}

            {loading ? (
              <div className="py-12 text-center text-sm text-(--color-medium-teal)">
                Loading missing person records...
              </div>
            ) : filteredPeople.length === 0 ? (
              <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint)/20 p-8 text-center">
                <p className="text-sm text-(--color-medium-teal)">
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

                      {/* PHOTO */}

                      <div className="relative h-56 w-full overflow-hidden bg-(--color-pale-aqua)/40">

                        {person.photoUrl ? (
                          <img
                            src={person.photoUrl}
                            alt={person.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-(--color-medium-teal)">
                            <ImageIcon className="h-12 w-12 opacity-40" />
                          </div>
                        )}

                        {/* STATUS */}

                        <div className="absolute right-3 top-3">

                          {person.status === "Found" ? (
                            <Badge variant="success">
                              Found
                            </Badge>
                          ) : person.status === "Searching" ? (
                            <Badge variant="danger">
                              Searching
                            </Badge>
                          ) : person.status === "Pending" ? (
                            <Badge variant="warning">
                              Pending Review
                            </Badge>
                          ) : (
                            <Badge variant="neutral">
                              Closed
                            </Badge>
                          )}

                        </div>
                      </div>

                      {/* DETAILS */}

                      <div className="space-y-3 p-5">

                        <div className="flex items-center justify-between">

                          <h2 className="text-xl font-bold text-(--color-deep-ocean)">
                            {person.name}
                          </h2>

                          <span className="text-xs font-semibold text-(--color-medium-teal)">
                            {person.age} yrs · {person.gender}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-(--color-dark-teal)">

                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

                            <span>
                              <strong>
                                Last Location:
                              </strong>{" "}
                              {person.lastLocation}
                            </span>
                          </div>

                          <div className="flex items-start gap-2">
                            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

                            <span>
                              <strong>
                                Last Seen:
                              </strong>{" "}
                              {person.dateLastSeen}
                            </span>
                          </div>

                        </div>

                        <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                          {person.description}
                        </p>

                        {person.clothingDetails && (
                          <div className="rounded-xl bg-(--color-pale-aqua)/30 p-2.5 text-xs text-(--color-dark-teal)">
                            <strong>
                              Details:
                            </strong>{" "}
                            {person.clothingDetails}
                          </div>
                        )}

                        {person.foundNotes && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                            <strong>
                              Found Note:
                            </strong>{" "}
                            {person.foundNotes}
                          </div>
                        )}

                      </div>
                    </div>

                    {/* FOOTER */}

                    <div className="border-t border-[rgba(53,98,103,0.1)] bg-(--color-soft-mint)/20 p-4">

                      {person.status !== "Found" &&
                      person.status !== "Closed" ? (

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

                        <div className="flex items-center justify-center gap-1.5 py-1 text-xs font-semibold text-emerald-700">
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

        {/* =====================================================
            REPORT MISSING PERSON TAB
        ====================================================== */}

        {activeTab === "report" && (
          <form
            id="missing-person-report-form"
            onSubmit={handleSubmitReport}
            className="mt-8 max-w-3xl space-y-6"
          >

            <div className="space-y-5 rounded-3xl border border-[rgba(53,98,103,0.16)] bg-(--color-soft-mint)/20 p-6">

              <h2 className="flex items-center gap-2 text-lg font-bold text-(--color-deep-ocean)">
                <UserPlus className="h-5 w-5 text-(--color-ocean)" />

                Missing Person Information
              </h2>

              {/* NAME + AGE + GENDER */}

              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                    Missing Person's Name *
                  </label>

                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">

                  {/* AGE */}

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                      Age *
                    </label>

                    <input
                      type="text"
                      required
                      placeholder="e.g. 24"
                      value={age}
                      onChange={(e) =>
                        setAge(e.target.value)
                      }
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                    />
                  </div>

                  {/* GENDER */}

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                      Gender *
                    </label>

                    <select
                      value={gender}
                      onChange={(e) =>
                        setGender(e.target.value)
                      }
                      className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                    >
                      <option value="Male">
                        Male
                      </option>

                      <option value="Female">
                        Female
                      </option>

                      <option value="Other">
                        Other
                      </option>
                    </select>
                  </div>

                </div>

                {/* LOCATION */}

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                    Last Known Location *
                  </label>

                  <input
                    type="text"
                    required
                    placeholder="e.g. Puri Beach Shelter 2"
                    value={lastLocation}
                    onChange={(e) =>
                      setLastLocation(e.target.value)
                    }
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                  />
                </div>

                {/* =================================================
                    DATE & TIME PICKER
                ================================================== */}

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                    Date &amp; Time Last Seen *
                  </label>

                  <input
                    type="datetime-local"
                    required
                    value={dateLastSeen}
                    onChange={(e) =>
                      setDateLastSeen(e.target.value)
                    }
                    className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean) focus:ring-2 focus:ring-(--color-ocean)/20"
                  />
                </div>

              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                  Description / Situation Circumstances
                </label>

                <textarea
                  rows={3}
                  placeholder="Describe the circumstances under which the person went missing..."
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                />
              </div>

              {/* CLOTHING */}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                  Clothing / Identifying Details
                </label>

                <input
                  type="text"
                  placeholder="e.g. Blue jacket, black cap, tattoo on wrist"
                  value={clothingDetails}
                  onChange={(e) =>
                    setClothingDetails(e.target.value)
                  }
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                />
              </div>

              {/* CONTACT */}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                  Contact Information *
                </label>

                <input
                  type="text"
                  required
                  placeholder="Phone number, family contact info"
                  value={contactInfo}
                  onChange={(e) =>
                    setContactInfo(e.target.value)
                  }
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                />
              </div>

              {/* =================================================
                  PHOTO UPLOAD
              ================================================== */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                  Photograph Upload
                </label>

                {photoPreview ? (

                  <div className="relative inline-block overflow-hidden rounded-3xl border-2 border-(--color-ocean) bg-white p-2">

                    <img
                      src={photoPreview}
                      alt="Missing person preview"
                      className="h-48 w-48 rounded-2xl object-cover"
                    />

                    <div className="mt-3 flex items-center justify-between gap-2 px-1">

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
                        <X className="h-3.5 w-3.5" />

                        Remove Image
                      </button>

                    </div>
                  </div>

                ) : (

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[rgba(53,98,103,0.25)] bg-white p-6 text-center transition hover:border-(--color-ocean) hover:bg-(--color-pale-aqua)/20">

                    <Upload className="mb-2 h-8 w-8 text-(--color-ocean)" />

                    <span className="text-sm font-bold text-(--color-dark-teal)">
                      Click to upload photograph
                    </span>

                    <span className="mt-1 text-xs text-(--color-medium-teal)">
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

            {/* =================================================
                BOTTOM SUBMIT BUTTON
            ================================================== */}

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-8 py-3.5 text-sm font-bold text-white transition hover:bg-(--color-deep-ocean) disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />

              {submitting
                ? "Submitting Report..."
                : "Submit Missing Person Report"}
            </button>

          </form>
        )}

      </div>

      {/* =====================================================
          FOUND PERSON MODAL
      ====================================================== */}

      <Modal
        isOpen={Boolean(foundModalPerson)}
        onClose={() => setFoundModalPerson(null)}
        title={`Report ${foundModalPerson?.name} as Found`}
      >

        <div className="space-y-4 pt-2">

          <p className="text-sm text-(--color-medium-teal)">
            Please provide details on where and how the person was found to
            assist officials and family members.
          </p>

          <div>

            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
              Found Details / Location Note *
            </label>

            <textarea
              rows={4}
              placeholder="e.g. Located safely at Community Shelter #2 receiving medical care..."
              value={foundNotes}
              onChange={(e) =>
                setFoundNotes(e.target.value)
              }
              className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-sm text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
            />

          </div>

          <div className="flex items-center justify-end gap-3 pt-2">

            <button
              type="button"
              onClick={() => setFoundModalPerson(null)}
              className="rounded-2xl px-5 py-2.5 text-xs font-bold text-(--color-medium-teal) hover:bg-(--color-pale-aqua)"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmFound}
              disabled={foundSubmitting}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {foundSubmitting
                ? "Updating..."
                : "Submit Found Details"}
            </button>

          </div>

        </div>

      </Modal>

    </main>
  );
}