import { useNavigate } from "react-router-dom";
import { LifeBuoy, AlertOctagon, PhoneCall, ShieldAlert, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function SOS() {
  const navigate = useNavigate();

  const handleTriggerSOS = () => {
    toast.error("Emergency SOS Broadcast Triggered. Local dispatchers notified.", {
      duration: 5000,
    });
  };

  return (
    <main className="min-h-screen text-[var(--color-dark-teal)] space-y-6">
      <div className="rounded-3xl sm:rounded-4xl border border-red-200 bg-white p-6 sm:p-10 shadow-[0_20px_70px_rgba(239,68,68,0.12)]">
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-5 w-5 text-red-600 animate-pulse" />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-600">
            Emergency SOS Portal
          </p>
        </div>

        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-[var(--color-deep-ocean)]">
          Request Immediate Emergency Assistance
        </h1>

        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[var(--color-medium-teal)]">
          Activate an emergency SOS broadcast or submit a targeted rescue request directly to disaster response teams and NDRF units.
        </p>

        {/* Prominent Action Cards Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 max-w-4xl">
          {/* Card 1: Ask for Help (Rescue & Relief) */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-[var(--color-ocean)] bg-[var(--color-soft-mint)]/40 p-6 sm:p-8 shadow-sm hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-ocean)] text-white shadow-sm">
                <LifeBuoy className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[var(--color-deep-ocean)]">
                Submit Detailed Rescue Request
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-medium-teal)] leading-relaxed">
                Provide GPS location, headcount, hazard details, and site photos to coordinate dispatch of rescue personnel.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/citizen/rescue-relief")}
              className="mt-6 flex items-center justify-center gap-2 w-full rounded-2xl bg-[var(--color-ocean)] px-6 py-4 text-sm font-bold text-white shadow-md hover:bg-[var(--color-deep-ocean)] transition active:scale-98"
            >
              Ask for Help
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Card 2: Instant 1-Click SOS Trigger */}
          <div className="flex flex-col justify-between rounded-3xl border border-rose-200 bg-rose-50/60 p-6 sm:p-8 shadow-sm hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-sm">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-red-950">
                Instant SOS Broadcast
              </h2>
              <p className="text-xs sm:text-sm text-red-700 leading-relaxed">
                Transmits your current device coordinates immediately to regional emergency response command centers.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTriggerSOS}
              className="mt-6 flex items-center justify-center gap-2 w-full rounded-2xl bg-red-600 px-6 py-4 text-sm font-bold text-white shadow-md hover:bg-red-700 transition active:scale-98"
            >
              <AlertOctagon className="h-4 w-4" />
              Trigger SOS Alert
            </button>
          </div>
        </div>

        {/* Emergency Hotlines Strip */}
        <div className="mt-8 rounded-2xl border border-[rgba(53,98,103,0.14)] bg-[var(--color-pale-aqua)]/25 p-5 max-w-4xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PhoneCall className="h-5 w-5 text-[var(--color-ocean)] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--color-deep-ocean)]">
                National Disaster Helpline (Toll Free)
              </p>
              <p className="text-xs text-[var(--color-medium-teal)]">
                Direct phone support for immediate life-threatening situations
              </p>
            </div>
          </div>
          <a
            href="tel:1070"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[var(--color-ocean)] border border-[var(--color-ocean)]/30 hover:bg-[var(--color-soft-mint)] transition"
          >
            Call 1070 (Disaster) / 112 (Emergency)
          </a>
        </div>
      </div>
    </main>
  );
}
