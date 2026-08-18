import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../common/Badge";
import {
  assignReportDepartment,
  deleteReport,
  updateGovStatus,
  updateReportSeverity,
} from "../../services/reportService";
import {
  DEPARTMENT_OPTIONS,
  type Department,
  type GovReportStatus,
  type WaterReport,
} from "../../types/report";
import type { Severity } from "../../types/hazard";
import { SEVERITY_STYLES } from "../../types/hazard";

const STATUS_OPTIONS: { value: GovReportStatus; label: string }[] = [
  { value: "under_review", label: "Under Review" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const PRIORITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function statusLabel(status?: GovReportStatus) {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    "Under Review"
  );
}

function statusVariant(
  status?: GovReportStatus
): "info" | "warning" | "success" | "neutral" | "danger" {
  if (status === "resolved") return "success";
  if (status === "rejected") return "danger";
  if (status === "in_progress") return "warning";
  if (status === "assigned") return "info";
  return "neutral";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  report: WaterReport;
  onClose: () => void;
  onUpdated: () => void;
}

/** Shared Government report detail and assignment workflow. */
import RejectReasonModal from "./RejectReasonModal";

export default function GovernmentReportDetailDrawer({
  report,
  onClose,
  onUpdated,
}: Props) {
  const [department, setDepartment] = useState<Department | "">(
    report.assignedDepartment ?? ""
  );

  const [status, setStatus] = useState<GovReportStatus>(
    report.govStatus ?? "under_review"
  );

  const [severity, setSeverity] = useState<Severity>(report.severity);

  const [saving, setSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const image = report.media?.find((media) => media.type === "image");

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await deleteReport(report.id);

      toast.success("Report deleted successfully.");

      onUpdated();
      onClose();
    } catch (error) {
      console.error("Failed to delete report:", error);
      toast.error("Failed to delete report.");
    } finally {
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleDepartmentChange = (val: string) => {
    setDepartment(val as Department | "");
    if (val && (status === "under_review" || !status)) {
      setStatus("assigned");
    }
  };

  const save = async () => {
    if (status === "rejected") {
      setShowRejectModal(true);
      return;
    }

    setSaving(true);

    try {
      // 1. Update priority first
      if (severity !== report.severity) {
        await updateReportSeverity(report.id, severity);
      }

      // 2. Assign department second
      const isDeptChanged = Boolean(department && department !== report.assignedDepartment);
      if (isDeptChanged) {
        await assignReportDepartment(report.id, department as Department);
      }

      // 3. Update status only if changed
      if (
        status &&
        status !== report.govStatus &&
        !(isDeptChanged && status === "assigned")
      ) {
        await updateGovStatus(report.id, status);
      }

      toast.success("Report updated successfully.");

      onUpdated();
      onClose();
    } catch (error) {
      console.error("Failed to save changes:", error);
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmRejection = async (reason: string) => {
    setRejecting(true);
    try {
      await updateGovStatus(report.id, "rejected", reason);
      toast.success("Report rejected with reason and unlisted from active queue.");
      setShowRejectModal(false);
      onUpdated();
      onClose();
    } catch (error) {
      toast.error("Failed to reject report.");
    } finally {
      setRejecting(false);
    }
  };

  const handleQuickReject = () => {
    setShowRejectModal(true);
  };

  const handleQuickResolve = async () => {
    setSaving(true);
    try {
      await updateGovStatus(report.id, "resolved", "Field action completed, water hazard resolved.");
      toast.success("Report marked as Resolved.");
      onUpdated();
      onClose();
    } catch (error) {
      toast.error("Failed to resolve report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-[9999] flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl animate-slideRight"
        aria-label="Report details"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[rgba(53,98,103,0.14)] bg-white px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--color-ocean)">
              Report Details
            </p>

            <h2 className="mt-0.5 text-lg font-black text-(--color-deep-ocean)">
              {report.id}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-pale-aqua) text-(--color-dark-teal)"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {/* Social Media Origin Banner */}
          {report.source === "SOCIAL_MEDIA" && (
            <section className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">📱</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Ingested from CoastalSocial</p>
                  <p className="text-xs text-blue-700">Posted by <strong>@{report.socialUsername || "citizen"}</strong></p>
                </div>
              </div>
              {report.originalPostText && report.originalPostText !== report.description && (
                <div className="mt-2.5 rounded-lg bg-white/90 p-2.5 text-xs text-slate-700 border border-blue-100">
                  <p className="font-semibold text-slate-500 text-[10px] uppercase">Original User Caption:</p>
                  <p className="italic mt-0.5">"{report.originalPostText}"</p>
                </div>
              )}
            </section>
          )}

          {/* Problem */}
          <section>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
              Problem
            </p>

            <p className="text-base font-bold text-(--color-deep-ocean)">
              {report.categoryLabel}
            </p>
          </section>

          {/* Description */}
          <section>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
              Description
            </p>

            <p className="text-sm leading-relaxed text-(--color-dark-teal)">
              {report.description}
            </p>
          </section>

          {/* Image */}
          {image && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                Attached Image
              </p>

              <img
                src={image.url}
                alt={image.name}
                className="max-h-64 w-full rounded-2xl border border-[rgba(53,98,103,0.12)] object-cover"
              />
            </section>
          )}

          {/* Location */}
          <section className="flex gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                Location
              </p>

              <p className="text-sm font-medium text-(--color-dark-teal)">
                {report.location.placeName ??
                  report.location.address ??
                  "Unknown"}
              </p>

              {report.location.address && report.location.placeName && (
                <p className="mt-0.5 text-xs text-(--color-medium-teal)">
                  {report.location.address}
                </p>
              )}
            </div>
          </section>

          {/* Submitted */}
          <section className="flex gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                Submitted
              </p>

              <p className="text-sm text-(--color-dark-teal)">
                {formatDate(report.createdAt)}
              </p>
            </div>
          </section>

          {/* Priority + Status */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                Current Priority
              </p>

              <span
                className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_STYLES[report.severity].bg} ${SEVERITY_STYLES[report.severity].text}`}
              >
                {SEVERITY_STYLES[report.severity].label}
              </span>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">
                Workflow Status
              </p>

              <Badge variant={statusVariant(report.govStatus)}>
                {statusLabel(report.govStatus)}
              </Badge>
            </div>
          </section>

          {/* AI Analysis */}
          {report.aiAnalysis && (
            <section className="rounded-2xl border border-[rgba(53,98,103,0.12)] bg-(--color-soft-mint) p-4">
              <div className="mb-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-(--color-ocean)" />

                <p className="text-xs font-bold uppercase tracking-[0.15em] text-(--color-ocean)">
                  AI Analysis
                </p>
              </div>

              <p className="mb-1 text-sm font-semibold text-(--color-deep-ocean)">
                {report.aiAnalysis.detectedIssue}
              </p>

              <p className="text-xs leading-relaxed text-(--color-dark-teal)">
                {report.aiAnalysis.summary}
              </p>
            </section>
          )}

          {/* Quick Action Buttons */}
          <section className="rounded-2xl border border-teal-200/80 bg-teal-50/60 p-4 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-900">
              ⚡ Quick Status Actions
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatus("in_progress");
                  toast.success("Selected: In Progress. Click Save Changes.");
                }}
                className={`py-2 px-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
                  status === "in_progress"
                    ? "bg-amber-600 text-white border-amber-700 shadow-sm"
                    : "bg-white text-amber-800 border-amber-300 hover:bg-amber-100"
                }`}
              >
                In Progress
              </button>

              <button
                type="button"
                onClick={handleQuickResolve}
                disabled={saving}
                className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resolve
              </button>

              <button
                type="button"
                onClick={handleQuickReject}
                disabled={saving}
                className="py-2 px-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          </section>

          {/* Government Actions */}
          <section className="space-y-4 border-t border-[rgba(53,98,103,0.12)] pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--color-dark-teal)">
              Government Assignment & Priority
            </p>

            <SelectField
              label="Assign Department"
              value={department}
              onChange={handleDepartmentChange}
            >
              <>
                <option value="">— Select department —</option>

                {DEPARTMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </>
            </SelectField>

            <SelectField
              label="Update Priority"
              value={severity}
              onChange={(value) => setSeverity(value as Severity)}
            >
              <>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </>
            </SelectField>

            {/* Status */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-(--color-medium-teal)">
                Workflow Status
              </p>

              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`rounded-xl border px-2.5 py-2 text-xs font-semibold transition ${
                      status === option.value
                        ? option.value === "rejected"
                          ? "border-rose-600 bg-rose-600 text-white font-bold"
                          : option.value === "resolved"
                          ? "border-emerald-600 bg-emerald-600 text-white font-bold"
                          : "border-(--color-ocean) bg-(--color-ocean) text-white font-bold"
                        : "border-[rgba(53,98,103,0.2)] text-(--color-dark-teal) hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="space-y-3 border-t border-red-100 pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
              Danger Zone
            </p>

            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Delete Report
            </button>
          </section>
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 flex gap-3 border-t border-[rgba(53,98,103,0.14)] bg-white px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[rgba(53,98,103,0.2)] py-2.5 text-sm font-semibold text-(--color-dark-teal) hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-(--color-ocean) py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-(--color-deep-ocean) transition cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}

            {saving ? "Saving…" : "Save Changes"}
          </button>
        </footer>
      </aside>

      {/* Delete Confirmation */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-red-100 bg-white p-6 shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-bold text-slate-900">
              Delete this report?
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              This action permanently removes the report from the database
              and cannot be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}

                {deleting ? "Deleting…" : "Delete Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject with Reason Modal */}
      <RejectReasonModal
        isOpen={showRejectModal}
        reportId={report.id}
        reportTitle={report.title || report.categoryLabel}
        isLoading={rejecting}
        onConfirm={handleConfirmRejection}
        onClose={() => setShowRejectModal(false)}
      />
    </>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-(--color-medium-teal)">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2.5 pr-8 text-sm text-(--color-dark-teal)"
        >
          {children}
        </select>

        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />
      </div>
    </div>
  );
}