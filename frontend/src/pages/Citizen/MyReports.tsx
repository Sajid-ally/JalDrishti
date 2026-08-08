export default function MyReports() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8">
        <div className="rounded-[32px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">My reports</p>
          <h1 className="mt-4 text-4xl font-black text-slate-950">Your submitted reports</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Review the status of reports you’ve created and see when they were last updated.</p>
          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm text-slate-500">You have no reports yet. Use the report page to submit a new hazard.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
