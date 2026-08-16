import { AlertTriangle, X } from "lucide-react";

interface EmergencyAlertCardProps {
  title: string;
  message: string;
  onClose?: () => void;
}

export default function EmergencyAlertCard({ title, message, onClose }: EmergencyAlertCardProps) {
  return (
    <div className="fixed right-4 top-4 z-50 max-w-md rounded-3xl border border-rose-200 bg-rose-600 p-4 text-white shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-white/20 p-2">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">Emergency Alert</p>
            <h3 className="mt-1 text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-rose-50">{message}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alert"
            className="rounded-full p-1 text-rose-100 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
