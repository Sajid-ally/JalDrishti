import { useEffect, useState } from "react";
import {
  LifeBuoy,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Users,
  ChevronDown,
  Loader2,
} from "lucide-react";

import Badge from "../../components/common/Badge";
import api from "../../services/api";

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
}

function RequestCard({
  request,
  onAssigned,
}: RequestCardProps) {
  const [selectedTeamIndex, setSelectedTeamIndex] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");

  const isAssigned =
    request.status.toLowerCase() === "assigned" ||
    Boolean(request.assignedTeam);

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
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm overflow-hidden">
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

              {isAssigned && (
                <Badge variant="success">
                  Team Assigned
                </Badge>
              )}
            </div>

            <p className="mt-0.5 text-sm font-bold text-(--color-deep-ocean)">
              {request.title}
            </p>
          </div>
        </div>
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

      {/* Team Assignment */}
      <div className="flex flex-wrap items-center gap-3 border-t border-[rgba(53,98,103,0.08)] px-5 py-4 bg-(--color-soft-mint)/30">
        <Users className="h-4 w-4 text-(--color-ocean) shrink-0" />

        <span className="text-sm font-semibold text-(--color-dark-teal)">
          Assign Rescue Team:
        </span>

        {isAssigned && request.assignedTeam ? (
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
          <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-0">
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
              className="flex items-center gap-1.5 rounded-2xl bg-(--color-ocean) px-4 py-2 text-sm font-semibold text-white transition hover:bg-(--color-deep-ocean) disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {assigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LifeBuoy className="h-4 w-4" />
              )}

              {assigning ? "Assigning..." : "Assign"}
            </button>
          </div>
        )}

        {/* Critical alert */}
        {!isAssigned &&
          request.urgency.toLowerCase() === "critical" && (
            <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-600">
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
        "/relief/"
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
  // UPDATE CARD AFTER ASSIGNMENT
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

  const assignedCount = requests.filter(
    (request) =>
      request.status.toLowerCase() === "assigned" ||
      Boolean(request.assignedTeam)
  ).length;

  const unassignedCount =
    requests.length - assignedCount;

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
          Select and dispatch rescue teams to citizen
          rescue and relief requests. Coordinate NDRF,
          SDRF, Coast Guard, and local response units.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
            Total Requests
          </p>

          <p className="text-2xl font-black text-(--color-deep-ocean)">
            {requests.length}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">
            Awaiting Assignment
          </p>

          <p className="text-2xl font-black text-amber-800">
            {unassignedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">
            Teams Dispatched
          </p>

          <p className="text-2xl font-black text-emerald-800">
            {assignedCount}
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
                className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
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
              />
            ))}
          </div>
        )}
    </main>
  );
}