import { useEffect, useState } from "react";
import {
  LifeBuoy,
  MapPin,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Users,
  ChevronDown,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import Badge from "../../components/common/Badge";
import api from "../../services/api";
import { deleteReliefRequest } from "../../services/rescueService";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ReliefRequest {
  id: string;
  title: string;
  description: string;

  location: {
    latitude: number;
    longitude: number;
    address?: string;
    landmark?: string;
  };

  peopleAffected: number;
  assistanceRequired: string[];
  urgency: string;

  username?: string;

  status: string;

  createdAt: string;
  updatedAt: string;

  assignedAt?: string;

  assignedTeam?: {
    organization: string;
    teamName: string;
    resources: string[];
  };

  governmentNote?: string;
}

interface ReliefListResponse {
  count: number;
  requests: ReliefRequest[];
}

interface AssignmentResponse {
  success?: boolean;
  message?: string;
  request: ReliefRequest;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESCUE TEAMS
// ─────────────────────────────────────────────────────────────────────────────

const RESCUE_TEAMS = [
  {
    organization: "NDRF",
    teamName: "NDRF Rescue Team Alpha",
    resources: [
      "Rescue Boat",
      "Medical Kit",
      "Food Packets",
      "Drinking Water",
    ],
  },
  {
    organization: "SDRF",
    teamName: "SDRF Rescue Team Bravo",
    resources: [
      "Rescue Boat",
      "First Aid Kit",
      "Food Packets",
      "Drinking Water",
    ],
  },
  {
    organization: "Coast Guard",
    teamName: "Coast Guard Rescue Team",
    resources: [
      "Rescue Boat",
      "Medical Kit",
      "Emergency Supplies",
    ],
  },
  {
    organization: "Kanpur Municipal Corporation",
    teamName: "Flood Rescue Team Alpha",
    resources: [
      "Rescue Boat",
      "Medical Kit",
      "Food Packets",
      "Drinking Water",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getUrgencyVariant(
  urgency: string
): "danger" | "warning" | "info" | "success" {
  const value = urgency.toLowerCase();

  if (value === "critical") return "danger";
  if (value === "high") return "warning";
  if (value === "medium" || value === "moderate") return "info";

  return "success";
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST CARD
// ─────────────────────────────────────────────────────────────────────────────

interface RequestCardProps {
  request: ReliefRequest;
  onAssigned: (request: ReliefRequest) => void;
  onDeleted: (requestId: string) => void;
}

function RequestCard({
  request,
  onAssigned,
  onDeleted,
}: RequestCardProps) {
  const [selectedTeamIndex, setSelectedTeamIndex] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  const statusLower = request.status.toLowerCase();
  const isResolved = statusLower === "resolved" || statusLower === "completed";
  const isAssigned =
    (statusLower === "assigned" || Boolean(request.assignedTeam)) && !isResolved;

  const selectedTeam =
    selectedTeamIndex !== ""
      ? RESCUE_TEAMS[Number(selectedTeamIndex)]
      : null;

  const handleAssign = async () => {
    if (!selectedTeam) return;

    setAssigning(true);
    setError("");

    try {
      const response = await api.patch<AssignmentResponse>(
        `/relief/${request.id}/assign`,
        {
          organization: selectedTeam.organization,
          teamName: selectedTeam.teamName,
          resources: selectedTeam.resources,
        }
      );

      toast.success(`Assigned ${selectedTeam.teamName} to rescue request.`);
      onAssigned(response.data.request);
    } catch (err: any) {
      console.error("Failed to assign rescue team:", err);

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to assign rescue team.";

      setError(
        typeof message === "string"
          ? message
          : "Failed to assign rescue team."
      );
      toast.error("Failed to assign rescue team.");
    } finally {
      setAssigning(false);
    }
  };

  const handleResolve = async () => {
    setResolving(true);
    setError("");

    try {
      const response = await api.patch<AssignmentResponse>(
        `/relief/${request.id}/status`,
        {
          status: "Resolved",
          governmentNote: "Rescue operations completed successfully on ground.",
        }
      );

      toast.success("Rescue operation marked as Resolved.");
      onAssigned(response.data.request);
    } catch (err: any) {
      console.error("Failed to resolve rescue request:", err);
      toast.error("Failed to mark rescue as resolved.");
    } finally {
      setResolving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteReliefRequest(request.id);
      toast.success("Rescue request permanently removed from database.");
      onDeleted(request.id);
    } catch (err: any) {
      console.error("Failed to delete rescue request:", err);
      toast.error("Failed to delete rescue request.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm overflow-hidden transition hover:shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-[rgba(53,98,103,0.08)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl bg-(--color-pale-aqua) p-2 shrink-0">
            <LifeBuoy className="h-5 w-5 text-(--color-ocean)" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-semibold text-(--color-medium-teal)">
                {request.id}
              </span>

              <Badge variant={getUrgencyVariant(request.urgency)}>
                {formatStatus(request.urgency)}
              </Badge>

              {isResolved ? (
                <Badge variant="success">
                  Resolved &amp; Safe
                </Badge>
              ) : isAssigned ? (
                <Badge variant="info">
                  Team Assigned
                </Badge>
              ) : (
                <Badge variant="warning">
                  Pending Dispatch
                </Badge>
              )}
            </div>

            <p className="mt-0.5 text-sm font-bold text-(--color-deep-ocean)">
              {request.title}
            </p>
          </div>
        </div>

        {/* Remove Button Header / Card Action */}
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={deleting}
          title="Remove rescue request from database"
          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 hover:border-red-300 disabled:opacity-50 cursor-pointer"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
          )}
          <span>Remove</span>
        </button>
      </div>

      {/* Details */}
      <div className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-2">
        {/* Location */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-(--color-ocean) mt-0.5 shrink-0" />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--color-medium-teal) mb-0.5">
              Location
            </p>

            <p className="text-(--color-dark-teal) font-medium">
              {request.location.address ||
                request.location.landmark ||
                "Unknown location"}
            </p>

            {request.location.landmark && (
              <p className="text-xs text-(--color-medium-teal)/70 mt-0.5">
                {request.location.landmark}
              </p>
            )}

            <p className="text-xs text-(--color-medium-teal)/70 mt-0.5">
              {request.location.latitude.toFixed(4)}°N,{" "}
              {request.location.longitude.toFixed(4)}°E
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--color-medium-teal) mb-0.5">
            Description
          </p>

          <p className="text-(--color-dark-teal) leading-relaxed line-clamp-3">
            {request.description}
          </p>
        </div>

        {/* People affected */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--color-medium-teal) mb-0.5">
            People Affected
          </p>

          <p className="text-(--color-dark-teal) font-semibold">
            {request.peopleAffected}
          </p>
        </div>

        {/* Assistance */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--color-medium-teal) mb-0.5">
            Assistance Required
          </p>

          <div className="flex flex-wrap gap-1.5 mt-1">
            {request.assistanceRequired?.map((item) => (
              <span
                key={item}
                className="rounded-full bg-(--color-pale-aqua) px-2.5 py-1 text-xs font-medium text-(--color-dark-teal)"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Team Assignment / Resolution Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(53,98,103,0.08)] px-5 py-4 bg-(--color-soft-mint)/30">
        <div className="flex flex-wrap items-center gap-3">
          <Users className="h-4 w-4 text-(--color-ocean) shrink-0" />

          <span className="text-sm font-semibold text-(--color-dark-teal)">
            Response Status:
          </span>

          {isResolved ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-100/90 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>Rescue Completed &amp; Ground Safe</span>
            </div>
          ) : isAssigned && request.assignedTeam ? (
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />

              <span className="text-sm font-bold text-emerald-700">
                {request.assignedTeam.teamName}
              </span>

              <span className="text-xs text-(--color-medium-teal)">
                — {request.assignedTeam.organization}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {/* Team dropdown */}
              <div className="relative">
                <select
                  value={selectedTeamIndex}
                  onChange={(e) =>
                    setSelectedTeamIndex(e.target.value)
                  }
                  className="appearance-none rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2 pr-8 text-sm font-medium text-(--color-dark-teal) outline-none focus:border-(--color-ocean) cursor-pointer"
                  aria-label="Select rescue team"
                  disabled={assigning}
                >
                  <option value="">
                    — Select team —
                  </option>

                  {RESCUE_TEAMS.map((team, index) => (
                    <option
                      key={`${team.organization}-${team.teamName}`}
                      value={index}
                    >
                      {team.organization} — {team.teamName}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />
              </div>

              {/* Assign button */}
              <button
                type="button"
                onClick={handleAssign}
                disabled={!selectedTeam || assigning}
                className="flex items-center gap-1.5 rounded-2xl bg-(--color-ocean) px-4 py-2 text-sm font-semibold text-white transition hover:bg-(--color-deep-ocean) disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {assigning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LifeBuoy className="h-4 w-4" />
                )}

                {assigning ? "Assigning..." : "Assign Team"}
              </button>
            </div>
          )}
        </div>

        {/* Action Controls: Resolve / Resolved info */}
        <div className="flex items-center gap-2 ml-auto">
          {isAssigned && !isResolved && (
            <button
              type="button"
              onClick={handleResolve}
              disabled={resolving}
              className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {resolving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {resolving ? "Resolving..." : "Mark as Resolved"}
            </button>
          )}
        </div>

        {/* Critical alert */}
        {!isAssigned &&
          !isResolved &&
          request.urgency.toLowerCase() === "critical" && (
            <span className="w-full sm:w-auto flex items-center gap-1 text-xs font-semibold text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Critical — assign immediately
            </span>
          )}
      </div>

      {/* Assignment error */}
      {error && (
        <div className="border-t border-red-100 bg-red-50 px-5 py-3">
          <p className="text-sm font-medium text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-red-100 p-2.5 text-red-600">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-(--color-deep-ocean)">
                    Delete Rescue Request?
                  </h3>
                  <p className="text-xs text-(--color-medium-teal)">
                    Request ID: <strong>{request.id}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl p-1 text-(--color-medium-teal) hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-(--color-dark-teal) leading-relaxed">
              Are you sure you want to permanently remove this rescue request from the database? This action will immediately delete it from both the government dispatch console and citizen tracking.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2 text-sm font-semibold text-(--color-dark-teal) hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function RescueRequests() {
  const [requests, setRequests] = useState<ReliefRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH REAL CITIZEN RESCUE REQUESTS
  // ─────────────────────────────────────────────────────────────────────────

  const fetchRequests = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<ReliefListResponse>(
        "/relief"
      );

      setRequests(response.data.requests || []);
    } catch (err: any) {
      console.error(
        "Failed to fetch rescue requests:",
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load rescue requests.";

      setError(
        typeof message === "string"
          ? message
          : "Unable to load rescue requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE CARD AFTER ASSIGNMENT OR RESOLUTION
  // ─────────────────────────────────────────────────────────────────────────

  const handleAssigned = (updatedRequest: ReliefRequest) => {
    setRequests((previous) =>
      previous.map((request) =>
        request.id === updatedRequest.id
          ? updatedRequest
          : request
      )
    );
  };

  const handleDeleted = (deletedId: string) => {
    setRequests((previous) =>
      previous.filter((request) => request.id !== deletedId)
    );
  };

  const resolvedCount = requests.filter(
    (r) =>
      r.status.toLowerCase() === "resolved" ||
      r.status.toLowerCase() === "completed"
  ).length;

  const assignedCount = requests.filter(
    (request) =>
      (request.status.toLowerCase() === "assigned" ||
        Boolean(request.assignedTeam)) &&
      request.status.toLowerCase() !== "resolved" &&
      request.status.toLowerCase() !== "completed"
  ).length;

  const unassignedCount = requests.filter(
    (r) =>
      r.status.toLowerCase() === "pending" &&
      !r.assignedTeam
  ).length;

  // ─────────────────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <main>
      {/* Header */}
      <div className="mb-6">
        <h1 className="mt-2 text-3xl font-black text-(--color-deep-ocean)">
          Rescue Team Dispatch
        </h1>

        <p className="mt-1 text-sm text-(--color-medium-teal)">
          Select and dispatch rescue teams to citizen rescue and relief requests. Coordinate NDRF, SDRF, Coast Guard, and local response units with instant resolution and database purge controls.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white px-5 py-3 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
            Total Requests
          </p>

          <p className="text-2xl font-black text-(--color-deep-ocean)">
            {requests.length}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">
            Awaiting Assignment
          </p>

          <p className="text-2xl font-black text-amber-800">
            {unassignedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">
            Teams Dispatched
          </p>

          <p className="text-2xl font-black text-blue-800">
            {assignedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">
            Resolved Missions
          </p>

          <p className="text-2xl font-black text-emerald-800">
            {resolvedCount}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-(--color-ocean)" />

          <p className="mt-3 text-sm text-(--color-medium-teal)">
            Loading rescue requests...
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <p className="font-semibold text-red-800">
                Unable to load rescue requests
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchRequests}
                className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unassigned alert */}
      {!loading &&
        !error &&
        unassignedCount > 0 && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />

            <p className="text-sm font-semibold text-amber-700">
              {unassignedCount} rescue request
              {unassignedCount > 1 ? "s" : ""} still need
              {unassignedCount === 1 ? "s" : ""} a rescue
              team.
            </p>
          </div>
        )}

      {/* Request list */}
      {!loading &&
        !error &&
        requests.length === 0 && (
          <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-8 text-center">
            <LifeBuoy className="mx-auto h-8 w-8 text-(--color-medium-teal)" />

            <p className="mt-3 text-sm text-(--color-medium-teal)">
              No citizen rescue requests available.
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        requests.length > 0 && (
          <div className="space-y-4">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onAssigned={handleAssigned}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
    </main>
  );
}