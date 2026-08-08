export default function Profile() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <div className="rounded-[32px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
            Government profile
          </p>
          <h1 className="mt-4 text-4xl font-black text-slate-950">Agency settings</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Manage your agency account and notification preferences.
          </p>
        </div>
      </div>
    </main>
  );
}
