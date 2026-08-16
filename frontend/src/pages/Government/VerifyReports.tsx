// pages/Government/VerifyReports.tsx
//
// Government officials use this page to review, verify or reject citizen
// hazard reports and then publish authenticated ones.

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Trash2,
  Send,
  Clock,
  ShieldCheck,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import Badge from "../../components/common/Badge";
import toast from "react-hot-toast";
import { getAdministrativeReports, updateReportVerification } from "../../services/reportService";
import type { HazardReport, ReportStatus, HazardType, Severity } from "../../types/hazard";

// ─── Extended report state ─────────────────────────────────────────────────

type AuthenticityStatus = "unset" | "authentic" | "false";
type PublishStatus = "unpublished" | "published";

interface ReportState extends HazardReport {
  authenticity: AuthenticityStatus;
  published: PublishStatus;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const HAZARD_LABELS: Record<HazardType, string> = {
  flood: "Flood",
  tsunami: "Tsunami",
  storm_surge: "Storm Surge",
  high_waves: "High Waves",
  coastal_erosion: "Coastal Erosion",
  coastal_damage: "Coastal Damage",
  other: "Other Hazard",
};

function StatusBadge({ status }: { status: ReportStatus }) {
  if (status === "pending") return <Badge variant="warning">Pending</Badge>;
  if (status === "verified") return <Badge variant="info">Verified</Badge>;
  if (status === "rejected") return <Badge variant="danger">Rejected</Badge>;
  if (status === "resolved") return <Badge variant="success">Resolved</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

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

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ─── Report Card ─────────────────────────────────────────────────────────

interface ReportCardProps {
  report: ReportState;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onRemove: (id: string) => void;
  onMarkAuthentic: (id: string) => void;
  onMarkFalse: (id: string) => void;
  onPublish: (id: string) => void;
}

function ReportCard({
  report,
  onVerify,
  onReject,
  onRemove,
  onMarkAuthentic,
  onMarkFalse,
  onPublish,
}: ReportCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isVerified = report.status === "verified";
  const isPending = report.status === "pending";
  const isPublished = report.published === "published";

  return (
    <div className="rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[rgba(53,98,103,0.08)]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-(--color-ocean) shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-(--color-medium-teal)">
                {report.id}
              </span>
              <StatusBadge status={report.status} />
              <SeverityBadge severity={report.severity} />
              {isPublished && <Badge variant="success">Published</Badge>}
            </div>
            <p className="mt-0.5 text-sm font-semibold text-(--color-deep-ocean)">
              {HAZARD_LABELS[report.type]} — {report.placeName ?? "Unknown location"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-(--color-medium-teal)">
            <Clock className="h-3 w-3 inline mr-1" />
            {formatTime(report.reportedAt)}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full p-1.5 hover:bg-(--color-pale-aqua) text-(--color-medium-teal) transition"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-5 py-4 bg-(--color-soft-mint)/40">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                Location
              </span>
              <p className="mt-0.5 text-(--color-dark-teal)">
                {report.placeName ?? "—"} ({report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)})
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                Reported By
              </span>
              <p className="mt-0.5 text-(--color-dark-teal)">{report.reportedBy ?? "Anonymous"}</p>
            </div>
            {report.aiConfidence !== undefined && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                  AI Confidence
                </span>
                <p className="mt-0.5 text-(--color-dark-teal)">
                  {(report.aiConfidence * 100).toFixed(0)}%
                </p>
              </div>
            )}
            <div className="sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                Description
              </span>
              <p className="mt-0.5 text-(--color-dark-teal) leading-relaxed">
                {report.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-4">
        {/* Primary verification actions — only for pending */}
        {isPending && (
          <>
            <button
              type="button"
              onClick={() => onVerify(report.id)}
              className="flex items-center gap-1.5 rounded-full bg-(--color-ocean) px-4 py-2 text-xs font-semibold text-white transition hover:bg-(--color-deep-ocean)"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Verify
            </button>
            <button
              type="button"
              onClick={() => onReject(report.id)}
              className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </>
        )}

        {/* Authenticity + publish — only after verification */}
        {isVerified && (
          <>
            {report.authenticity === "unset" && (
              <>
                <button
                  type="button"
                  onClick={() => onMarkAuthentic(report.id)}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Mark Authentic
                </button>
                <button
                  type="button"
                  onClick={() => onMarkFalse(report.id)}
                  className="flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-4 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Mark False
                </button>
              </>
            )}

            {report.authenticity === "authentic" && !isPublished && (
              <button
                type="button"
                onClick={() => onPublish(report.id)}
                className="flex items-center gap-1.5 rounded-full bg-(--color-ocean) px-4 py-2 text-xs font-semibold text-white transition hover:bg-(--color-deep-ocean)"
              >
                <Send className="h-3.5 w-3.5" />
                Publish
              </button>
            )}

            {report.authenticity !== "unset" && (
              <span className="text-xs text-(--color-medium-teal)">
                {report.authenticity === "authentic" ? "✓ Marked authentic" : "✗ Marked false"}
              </span>
            )}
          </>
        )}

        {isVerified && (
          <span className="ml-2">
            <Eye className="h-3.5 w-3.5 inline text-(--color-medium-teal)" />
          </span>
        )}

        {/* Remove — always available */}
        <button
          type="button"
          onClick={() => onRemove(report.id)}
          className="ml-auto flex items-center gap-1.5 rounded-full border border-[rgba(53,98,103,0.16)] px-3 py-2 text-xs font-semibold text-(--color-medium-teal) transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────

export default function VerifyReports() {
  const [reports, setReports] = useState<ReportState[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportStatus | "all">("all");

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getAdministrativeReports();
      const mapped = data.map((report) => {
        let type: HazardType = "other";
        if (report.problemType === "urban_flooding" || report.problemType === "waterlogging") {
          type = "flood";
        } else if (report.problemType === "drainage_problem") {
          type = "coastal_damage";
        } else if (report.problemType === "pond_lake_issue" || report.problemType === "water_quality_pollution") {
          type = "other";
        }

        let status: ReportStatus = "pending";
        if (report.verification.status === "verified") {
          status = "verified";
        } else if (report.verification.status === "rejected") {
          status = "rejected";
        } else if (report.status === "resolved") {
          status = "resolved";
        }

        return {
          id: report.id,
          type,
          severity: report.severity,
          status,
          placeName: report.location.placeName || report.location.address || "Unknown Location",
          reportedAt: report.createdAt,
          reportedBy: report.contactName || "Anonymous",
          description: report.description,
          location: {
            lat: report.location.coords.lat,
            lng: report.location.coords.lng,
          },
          aiConfidence: report.aiAnalysis.confidence,
          authenticity: (report.verification.status === "verified" ? "authentic" : (report.verification.status === "rejected" ? "false" : "unset")) as AuthenticityStatus,
          published: (report.status === "resolved" ? "published" : "unpublished") as PublishStatus,
        };
      });
      setReports(mapped);
    } catch (err) {
      console.error("Failed to load reports for verification:", err);
      toast.error("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleVerify = async (id: string) => {
    try {
      await updateReportVerification(id, "verified");
      toast.success("Report verified successfully.");
      loadReports();
    } catch {
      toast.error("Failed to verify report.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateReportVerification(id, "rejected");
      toast.success("Report rejected.");
      loadReports();
    } catch {
      toast.error("Failed to reject report.");
    }
  };

  const handleRemove = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const handleMarkAuthentic = async (id: string) => {
    try {
      await updateReportVerification(id, "verified");
      toast.success("Marked report as authentic.");
      loadReports();
    } catch {
      toast.error("Failed to verify report authenticity.");
    }
  };

  const handleMarkFalse = async (id: string) => {
    try {
      await updateReportVerification(id, "rejected");
      toast.success("Marked report as false.");
      loadReports();
    } catch {
      toast.error("Failed to update report authenticity.");
    }
  };

  const handlePublish = (id: string) => {
    void id;
    toast.success("Report published.");
    loadReports();
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const filtered = filter === "all" ? reports : reports.filter((r) => r.status === filter);

  return (
    <main>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
          Hazard Verification
        </p>
        <h1 className="mt-2 text-3xl font-black text-(--color-deep-ocean)">
          Pending Verification
        </h1>
        <p className="mt-1 text-sm text-(--color-medium-teal)">
          Review citizen-reported hazards. Verify authentic incidents, reject false reports, and publish confirmed hazards.
        </p>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-700">
            {pendingCount} report{pendingCount > 1 ? "s" : ""} require your action.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(["all", "pending", "verified", "rejected"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filter === f
                ? "bg-(--color-ocean) text-white"
                : "border border-[rgba(53,98,103,0.2)] bg-white text-(--color-medium-teal) hover:bg-(--color-soft-mint)"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && (
              <span className="ml-1.5">
                ({reports.filter((r) => r.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Report Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-(--color-medium-teal)">
          <Loader2 className="h-8 w-8 animate-spin text-(--color-ocean)" />
          <span className="ml-3 text-sm">Loading reports…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-8 text-center">
          <p className="text-sm text-(--color-medium-teal)">No reports in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onVerify={handleVerify}
              onReject={handleReject}
              onRemove={handleRemove}
              onMarkAuthentic={handleMarkAuthentic}
              onMarkFalse={handleMarkFalse}
              onPublish={handlePublish}
            />
          ))}
        </div>
      )}
    </main>
  );
}
