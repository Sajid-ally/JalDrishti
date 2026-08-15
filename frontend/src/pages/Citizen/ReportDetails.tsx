import { useParams } from "react-router-dom";

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <div className="rounded-4xl bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
            Report details
          </p>
          <h1 className="mt-4 text-4xl font-black text-slate-950">
            Report {id ?? "—"}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            View the full timeline, status, and media for this hazard report.
          </p>
          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm text-slate-500">
              Detailed report view will load data from the API once connected.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
