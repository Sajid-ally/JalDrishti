import { DashboardCards } from "../../components/common/Card";

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8">
        <header className="mb-10 rounded-4xl bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
            Analyst dashboard
          </p>
          <h1 className="mt-4 text-4xl font-black text-slate-950">
            Intelligence overview
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Analyze hazard trends, heatmaps, and AI-generated insights.
          </p>
        </header>
        <DashboardCards />
      </div>
    </main>
  );
}
