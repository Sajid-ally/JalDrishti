export default function SOS() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8">
        <div className="rounded-[32px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-600">Emergency SOS</p>
          <h1 className="mt-4 text-4xl font-black text-slate-950">Request immediate assistance</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Activate an emergency alert and notify nearby responders quickly.</p>
          <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-slate-700">
            <p className="font-medium">Emergency status: Ready</p>
            <button className="rounded-3xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">Trigger SOS</button>
          </div>
        </div>
      </div>
    </main>
  );
}
