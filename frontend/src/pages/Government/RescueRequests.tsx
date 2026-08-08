// pages/Government/RescueRequests.tsx
//
// Government officials use this page to assign rescue teams to verified
// hazard incidents.
//
// State is managed locally. All API integration points are marked TODO.
// TODO: POST /api/incidents/:id/assign-team { team: RescueTeam }

import { useState } from "react";
import {
  LifeBuoy,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Users,
  ChevronDown,
} from "lucide-react";
import Badge from "../../components/common/Badge";
import {
  MOCK_HAZARD_REPORTS,
  RESCUE_TEAMS,
} from "../../services/hazardService";
import type { RescueTeam } from "../../services/hazardService";
import type { HazardReport, HazardType, Severity } from "../../types/hazard";

// ─── Types ──────────────────────────────────────────────────────────────────

interface IncidentAssignment {
  report: HazardReport;
  assignedTeam: RescueTeam | "";
  assignmentStatus: "unassigned" | "assigned";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const HAZARD_LABELS: Record<HazardType, string> = {
  flood: "Flood",
  tsunami: "Tsunami",
  storm_surge: "Storm Surge",
  high_waves: "High Waves",
  coastal_erosion: "Coastal Erosion",
  coastal_damage: "Coastal Damage",
  other: "Other Hazard",
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, "danger" | "warning" | "info" | "success"> = {
    critical: "danger",
    high: "warning",
    moderate: "info",
    low: "success",
  };
  return (
    <Badge variant={map[severity]}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
}

// ─── Incident Card ───────────────────────────────────────────────────────────

interface IncidentCardProps {
  incident: IncidentAssignment;
  onAssign: (reportId: string, team: RescueTeam) => void;
}

function IncidentCard({ incident, onAssign }: IncidentCardProps) {
  const { report, assignedTeam, assignmentStatus } = incident;
  const [selectedTeam, setSelectedTeam] = useState<RescueTeam | "">(assignedTeam);

  const isAssigned = assignmentStatus === "assigned";

  const handleAssign = () => {
    if (!selectedTeam) return;
    // TODO: POST /api/incidents/:id/assign-team { team: selectedTeam }
    onAssign(report.id, selectedTeam as RescueTeam);
  };

  return (
    <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-[rgba(53,98,103,0.08)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl bg-[var(--color-pale-aqua)] p-2 shrink-0">
            <LifeBuoy className="h-5 w-5 text-[var(--color-ocean)]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-semibold text-[var(--color-medium-teal)]">
                {report.id}
              </span>
              <SeverityBadge severity={report.severity} />
              {isAssigned && <Badge variant="success">Team Assigned</Badge>}
            </div>
            <p className="mt-0.5 text-sm font-bold text-[var(--color-deep-ocean)]">
              {HAZARD_LABELS[report.type]}
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-[var(--color-ocean)] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-medium-teal)] mb-0.5">
              Location
            </p>
            <p className="text-[var(--color-dark-teal)] font-medium">
              {report.placeName ?? "Unknown"}
            </p>
            <p className="text-xs text-[var(--color-medium-teal)]/70 mt-0.5">
              {report.location.lat.toFixed(4)}°N, {report.location.lng.toFixed(4)}°E
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-medium-teal)] mb-0.5">
            Description
          </p>
          <p className="text-[var(--color-dark-teal)] leading-relaxed line-clamp-3">
            {report.description}
          </p>
        </div>
      </div>

      {/* Team Assignment */}
      <div className="flex flex-wrap items-center gap-3 border-t border-[rgba(53,98,103,0.08)] px-5 py-4 bg-[var(--color-soft-mint)]/30">
        <Users className="h-4 w-4 text-[var(--color-ocean)] shrink-0" />
        <span className="text-sm font-semibold text-[var(--color-dark-teal)]">
          Assign Rescue Team:
        </span>

        {isAssigned ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{assignedTeam}</span>
            <span className="text-xs text-[var(--color-medium-teal)]">— team dispatched</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-0">
            {/* Team dropdown */}
            <div className="relative">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value as RescueTeam)}
                className="appearance-none rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2 pr-8 text-sm font-medium text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] cursor-pointer"
                aria-label="Select rescue team"
              >
                <option value="">— Select team —</option>
                {RESCUE_TEAMS.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
            </div>

            <button
              type="button"
              onClick={handleAssign}
              disabled={!selectedTeam}
              className="flex items-center gap-1.5 rounded-2xl bg-[var(--color-ocean)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-deep-ocean)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <LifeBuoy className="h-4 w-4" />
              Assign
            </button>
          </div>
        )}

        {/* Alert if critical and unassigned */}
        {!isAssigned && report.severity === "critical" && (
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            Critical — assign immediately
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RescueRequests() {
  // Only show verified (or pending) reports that need rescue coordination
  // TODO: Fetch from GET /api/reports?status=verified or similar
  const verifiedReports = MOCK_HAZARD_REPORTS.filter(
    (r) => r.status === "verified" || r.status === "pending"
  );

  const [incidents, setIncidents] = useState<IncidentAssignment[]>(
    verifiedReports.map((r) => ({
      report: r,
      assignedTeam: "",
      assignmentStatus: "unassigned",
    }))
  );

  const assignedCount = incidents.filter((i) => i.assignmentStatus === "assigned").length;
  const unassignedCount = incidents.length - assignedCount;

  // TODO: POST /api/incidents/:id/assign-team { team }
  const handleAssign = (reportId: string, team: RescueTeam) => {
    setIncidents((prev) =>
      prev.map((i) =>
        i.report.id === reportId
          ? { ...i, assignedTeam: team, assignmentStatus: "assigned" }
          : i
      )
    );
  };

  return (
    <main>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
          Rescue Coordination
        </p>
        <h1 className="mt-2 text-3xl font-black text-[var(--color-deep-ocean)]">
          Rescue Team Assignment
        </h1>
        <p className="mt-1 text-sm text-[var(--color-medium-teal)]">
          Select and dispatch rescue teams to verified coastal incidents. Coordinate NDRF, SDRF, Coast Guard, and local response units.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)]">
            Total Incidents
          </p>
          <p className="text-2xl font-black text-[var(--color-deep-ocean)]">{incidents.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">
            Awaiting Assignment
          </p>
          <p className="text-2xl font-black text-amber-800">{unassignedCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">
            Teams Dispatched
          </p>
          <p className="text-2xl font-black text-emerald-800">{assignedCount}</p>
        </div>
      </div>

      {/* Unassigned alert */}
      {unassignedCount > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-700">
            {unassignedCount} incident{unassignedCount > 1 ? "s" : ""} still need{unassignedCount === 1 ? "s" : ""} a rescue team.
          </p>
        </div>
      )}

      {/* Incident list */}
      {incidents.length === 0 ? (
        <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-8 text-center">
          <p className="text-sm text-[var(--color-medium-teal)]">
            No verified incidents requiring rescue assignment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <IncidentCard
              key={incident.report.id}
              incident={incident}
              onAssign={handleAssign}
            />
          ))}
        </div>
      )}
    </main>
  );
}
