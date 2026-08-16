import { useState, useEffect, useMemo } from "react";
import { Search, MapPin, Filter, Eye, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import {
  getMissingPersons,
  updateMissingPersonStatus,
} from "../../services/missingPersonService";
import type { MissingPerson, MissingPersonStatus } from "../../types/missingPerson";

export default function GovernmentMissingPersons() {
  const [people, setPeople] = useState<MissingPerson[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchName, setSearchName] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  // Detailed Modal
  const [selectedPerson, setSelectedPerson] = useState<MissingPerson | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getMissingPersons();
      setPeople(data);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: MissingPersonStatus) => {
    try {
      await updateMissingPersonStatus(id, newStatus);
      toast.success(`Updated status to "${newStatus}"`);
      await fetchData();
      if (selectedPerson && selectedPerson.id === id) {
        setSelectedPerson((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      const matchName = p.name.toLowerCase().includes(searchName.toLowerCase());
      const matchLoc = p.lastLocation.toLowerCase().includes(filterLocation.toLowerCase());
      const matchStatus = filterStatus === "All" || p.status === filterStatus;
      return matchName && matchLoc && matchStatus;
    });
  }, [people, searchName, filterLocation, filterStatus]);

  return (
    <main className="min-h-screen text-[var(--color-dark-teal)] space-y-6">
      {/* Header */}
      <div className="rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
            Government Registry
          </p>
          <h1 className="mt-1 text-3xl font-black text-[var(--color-deep-ocean)]">
            Missing Persons Official Management
          </h1>
          <p className="mt-1 text-sm text-[var(--color-medium-teal)]">
            Review missing-person reports, coordinate field search status, and update record clearance.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
              placeholder="Filter by location..."
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-[var(--color-soft-mint)]/30 py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] focus:bg-white"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-[rgba(53,98,103,0.2)] bg-[var(--color-soft-mint)]/30 py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] focus:bg-white cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Searching">Searching</option>
              <option value="Found">Found</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Directory Grid */}
        {loading ? (
          <div className="py-12 text-center text-sm text-[var(--color-medium-teal)]">
            Loading missing-person records...
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-[var(--color-soft-mint)]/20 p-8 text-center">
            <p className="text-sm text-[var(--color-medium-teal)]">
              No records found matching filters.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPeople.map((person) => (
              <article
                key={person.id}
                className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm transition hover:shadow-md"
              >
                <div>
                  {/* Photo Display - Clearly Visible */}
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
                    <div className="absolute top-3 right-3">
                      {person.status === "Found" ? (
                        <Badge variant="success">Found</Badge>
                      ) : person.status === "Searching" ? (
                        <Badge variant="danger">Searching</Badge>
                      ) : person.status === "Pending" ? (
                        <Badge variant="warning">Pending</Badge>
                      ) : (
                        <Badge variant="neutral">Closed</Badge>
                      )}
                    </div>
                  </div>

                  {/* Details */}
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
                      <p>
                        <strong>Last Location:</strong> {person.lastLocation}
                      </p>
                      <p>
                        <strong>Reported/Last Seen:</strong> {person.dateLastSeen}
                      </p>
                      <p className="text-slate-600 line-clamp-2">
                        <strong>Description:</strong> {person.description}
                      </p>
                    </div>

                    {person.foundNotes && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800">
                        <strong>Found Note:</strong> {person.foundNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Update Control */}
                <div className="border-t border-[rgba(53,98,103,0.1)] p-4 bg-[var(--color-soft-mint)]/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-medium-teal)]">
                      Status Control:
                    </label>
                    <select
                      value={person.status}
                      onChange={(e) =>
                        handleStatusChange(person.id, e.target.value as MissingPersonStatus)
                      }
                      className="rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] cursor-pointer"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Searching">Searching</option>
                      <option value="Found">Found</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPerson(person)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-dark-teal)] hover:bg-[var(--color-pale-aqua)]/40 transition"
                  >
                    <Eye className="h-3.5 w-3.5 text-[var(--color-ocean)]" />
                    Review Full Report
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Review Report Detail Modal */}
      <Modal
        isOpen={Boolean(selectedPerson)}
        onClose={() => setSelectedPerson(null)}
        title={`Review Report: ${selectedPerson?.name}`}
      >
        {selectedPerson && (
          <div className="space-y-4 pt-2">
            <div className="flex gap-4 items-start">
              {selectedPerson.photoUrl && (
                <img
                  src={selectedPerson.photoUrl}
                  alt={selectedPerson.name}
                  className="h-28 w-28 rounded-2xl object-cover border border-[rgba(53,98,103,0.2)] shrink-0"
                />
              )}
              <div className="space-y-1 text-xs text-[var(--color-dark-teal)]">
                <p className="text-base font-bold text-[var(--color-deep-ocean)]">
                  {selectedPerson.name} ({selectedPerson.age} yrs, {selectedPerson.gender})
                </p>
                <p>
                  <strong>Contact Info:</strong> {selectedPerson.contactInfo}
                </p>
                <p>
                  <strong>Last Location:</strong> {selectedPerson.lastLocation}
                </p>
                <p>
                  <strong>Date/Time Last Seen:</strong> {selectedPerson.dateLastSeen}
                </p>
                <p>
                  <strong>Report ID:</strong> {selectedPerson.id}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--color-soft-mint)]/40 p-4 space-y-2 text-xs">
              <p>
                <strong>Description:</strong> {selectedPerson.description}
              </p>
              <p>
                <strong>Clothing / Identifying details:</strong>{" "}
                {selectedPerson.clothingDetails || "N/A"}
              </p>
              {selectedPerson.foundNotes && (
                <p className="text-emerald-800 font-medium">
                  <strong>Found Notes:</strong> {selectedPerson.foundNotes}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[rgba(53,98,103,0.1)]">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-medium-teal)]">
                <span>Update Status:</span>
                <select
                  value={selectedPerson.status}
                  onChange={(e) =>
                    handleStatusChange(
                      selectedPerson.id,
                      e.target.value as MissingPersonStatus
                    )
                  }
                  className="rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-dark-teal)] outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Searching">Searching</option>
                  <option value="Found">Found</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="rounded-xl bg-[var(--color-ocean)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--color-deep-ocean)]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
