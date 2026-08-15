export default function DepartmentTracking() {
    return (<div className="p-4">
      <h1 className="text-2xl font-black mb-4 text-[var(--color-deep-ocean)]">
        Department Tracking
      </h1>

      {/* placeholder until we have real backend data */}
      <div className="mt-8 rounded-lg border border-dashed border-(--color-soft-mint) p-8 text-center">
        <p className="text-(--color-coral) font-medium mb-2">Under Construction</p>
        <p className="text-sm text-[var(--color-slate-gray)]">
          This page will show real-time location and status of disaster response teams and vehicles.
        </p>
      </div>
    </div>
  );
}
