export default function Alerts() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8">
        <div className="rounded-[32px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">Coastal alerts</p>
          <h1 className="mt-4 text-4xl font-black text-slate-950">Active hazard notifications</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Monitor the latest official and community alerts for your area.</p>
          <div className="mt-8 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-700">Flood warning</p>
              <p className="mt-2 text-sm text-slate-500">River levels rising near the east coast. Stay clear of low-lying areas.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-700">High wave advisory</p>
              <p className="mt-2 text-sm text-slate-500">Strong surf expected along the shoreline. Avoid beach travel unless necessary.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
