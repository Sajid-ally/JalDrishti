// src/pages/Government/EmergencyOperations.tsx
// Renders the Emergency Operations Dashboard focusing on Rescue Teams and Relief coordination.

import RescueRequests from "./RescueRequests";

export default function EmergencyOperations() {
  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-(--color-deep-ocean)">
          Rescue Operations
        </h1>
      </div>

      {/* Main Content */}
      <section>
        <RescueRequests />
      </section>
    </main>
  );
}