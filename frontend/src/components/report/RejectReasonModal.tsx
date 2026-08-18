import { useState } from "react";
import { AlertOctagon, X, Loader2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  reportId?: string;
  reportTitle?: string;
  isLoading?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
  onClose: () => void;
}

const REASON_PRESETS = [
  "Duplicate submission / already reported by another citizen",
  "Not a valid water hazard or flooding emergency (False alarm)",
  "Incorrect or unreachable location coordinates",
  "Issue already resolved prior to inspection",
  "Insufficient photographic evidence / unverified report",
];

export default function RejectReasonModal({
  isOpen,
  reportId,
  reportTitle,
  isLoading = false,
  onConfirm,
  onClose,
}: Props) {
  const [selectedPreset, setSelectedPreset] = useState<string>(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = isCustom
      ? customReason.trim()
      : selectedPreset.trim();

    if (!finalReason) {
      return;
    }

    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Reject Hazard Report
              </h2>
              {reportId && (
                <p className="text-xs font-semibold text-slate-500">
                  Ref: <span className="font-mono text-slate-700">{reportId}</span>
                  {reportTitle ? ` — ${reportTitle}` : ""}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-600">
            Please provide a valid official reason for rejecting this report. This reason will be logged in the permanent audit timeline and visible to the reporting citizen. After rejection, this report will be <strong className="text-red-700">unlisted from active department tracking and review queue</strong>.
          </p>

          {/* Preset Options */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Official Reason
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {REASON_PRESETS.map((preset) => (
                <label
                  key={preset}
                  className={`flex items-start gap-2.5 rounded-2xl border p-3 text-xs font-medium cursor-pointer transition ${
                    !isCustom && selectedPreset === preset
                      ? "border-red-500 bg-red-50/60 text-red-900 font-semibold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectionPreset"
                    checked={!isCustom && selectedPreset === preset}
                    onChange={() => {
                      setSelectedPreset(preset);
                      setIsCustom(false);
                    }}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <span>{preset}</span>
                </label>
              ))}

              <label
                className={`flex items-start gap-2.5 rounded-2xl border p-3 text-xs font-medium cursor-pointer transition ${
                  isCustom
                    ? "border-red-500 bg-red-50/60 text-red-900 font-semibold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="rejectionPreset"
                  checked={isCustom}
                  onChange={() => setIsCustom(true)}
                  className="mt-0.5 text-red-600 focus:ring-red-500"
                />
                <span>Other / Custom reason</span>
              </label>
            </div>
          </div>

          {/* Custom Reason Textarea */}
          {isCustom && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Custom Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Explain why this report is being rejected..."
                rows={3}
                required
                className="w-full rounded-2xl border border-slate-300 p-3 text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading || (isCustom && !customReason.trim())}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Rejection & Unlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
