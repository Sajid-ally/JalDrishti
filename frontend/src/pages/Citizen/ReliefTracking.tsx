import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
CheckCircle2,
MapPin,
LifeBuoy,
Send,
AlertCircle,
ShieldCheck,
} from "lucide-react";
import Badge from "../../components/common/Badge";
import { getRescueRequests } from "../../services/rescueService";
import type { RescueRequestItem, RescueRequestStatus } from "../../types/rescue";

const STATUS_STEPS: RescueRequestStatus[] = [
"Pending",
"Assigned",
"Completed",
];

export default function ReliefTracking() {
const [requests, setRequests] = useState<RescueRequestItem[]>([]);
const [selectedReq, setSelectedReq] = useState<RescueRequestItem | null>(null);
const [loading, setLoading] = useState(true);

const fetchRequests = useCallback(async () => {
setLoading(true);

try {
  const data = await getRescueRequests();

  setRequests(data);

  setSelectedReq((prev) => {
    if (prev) {
      const updated = data.find((r) => r.id === prev.id);
      return updated || prev;
    }

    return data.length > 0 ? data[0] : null;
  });
} catch (err) {
  console.error("Failed to load rescue requests:", err);
} finally {
  setLoading(false);
}


}, []);

useEffect(() => {
fetchRequests();


const interval = setInterval(() => {
  fetchRequests();
}, 10000);

return () => clearInterval(interval);


}, [fetchRequests]);

const getStepIndex = (status: RescueRequestStatus) => {
if (status === "Rejected") return -1;
return STATUS_STEPS.indexOf(status);
};




return (

  <main className="min-h-screen bg-[var(--color-sand)] text-[var(--color-dark-teal)] p-6">
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relief Tracking</h1>
          <p className="text-[var(--color-medium-teal)]">
            Track your rescue requests and monitor government response in real time.
          </p>
        </div>

```
    <Link
      to="/citizen/rescue"
      className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-teal)] px-4 py-2 font-semibold text-white hover:bg-[var(--color-dark-teal)]"
    >
      <Send className="h-4 w-4" />
      New Rescue Request
    </Link>
  </div>

  <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
    {/* Left Panel */}
    <aside className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Your Requests</h2>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--color-medium-teal)]">
          Loading requests...
        </p>
      ) : requests.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-medium-teal)]">
          No rescue requests found.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {requests.map((req) => (
            <button
              key={req.id}
              type="button"
              onClick={() => setSelectedReq(req)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selectedReq?.id === req.id
                  ? "border-[var(--color-teal)] bg-[var(--color-light)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-teal)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{req.title}</h3>
                  <p className="mt-1 text-xs text-[var(--color-medium-teal)] truncate">
                    {req.locationName
                      ? req.locationName
                      : `${req.location.latitude.toFixed(4)}, ${req.location.longitude.toFixed(4)}`}
                  </p>
                </div>

                <Badge
                  variant={
                    req.status === "Completed"
                      ? "success"
                      : req.status === "Assigned"
                      ? "info"
                      : req.status === "Rejected"
                      ? "danger"
                      : "warning"
                  }
                >
                  {req.status}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </aside>

    {/* Right Panel */}
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      {!selectedReq ? (
        <div className="flex h-full items-center justify-center text-[var(--color-medium-teal)]">
          Select a rescue request to view details.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedReq.title}</h2>
              <p className="text-[var(--color-medium-teal)]">
                Submitted on {new Date(selectedReq.createdAt).toLocaleString()}
              </p>
            </div>

            <Badge
              variant={
                selectedReq.status === "Completed"
                  ? "success"
                  : selectedReq.status === "Assigned"
                  ? "info"
                  : selectedReq.status === "Rejected"
                  ? "danger"
                  : "warning"
              }
            >
              {selectedReq.status}
            </Badge>
          </div>

          {/* Info Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-[var(--color-light)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-medium-teal)]">
                <MapPin className="h-4 w-4" />
                Location
              </div>

              <p className="mt-2 font-bold text-[var(--color-dark-teal)]">
                {selectedReq.locationName
                  ? selectedReq.locationName
                  : `${selectedReq.location.latitude.toFixed(4)}, ${selectedReq.location.longitude.toFixed(4)}`}
              </p>
            </div>

            <div className="rounded-xl bg-[var(--color-light)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-medium-teal)]">
                <LifeBuoy className="h-4 w-4" />
                Assistance Needed
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {selectedReq.assistanceRequired.map((item) => (
                  <Badge key={item} variant="info">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold">Description</h3>
            <p className="mt-2 leading-relaxed text-[var(--color-dark-teal)]">
              {selectedReq.description}
            </p>
          </div>

          {/* Status Timeline */}
          <div>
            <h3 className="text-lg font-semibold">Request Status</h3>

            {selectedReq.status === "Rejected" ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-700 font-semibold">
                  <AlertCircle className="h-5 w-5" />
                  Request Rejected
                </div>

                <p className="mt-2 text-sm text-red-700">
                  {selectedReq.governmentNote ||
                    "This request was rejected by the government authority."}
                </p>
              </div>
            ) : (
              <div className="mt-6 flex items-center justify-between gap-4">
                {STATUS_STEPS.map((step, index) => {
                  const currentIndex = getStepIndex(selectedReq.status);
                  const active = currentIndex >= index;

                  return (
                    <div
                      key={step}
                      className="flex flex-1 flex-col items-center text-center"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          active
                            ? "bg-[var(--color-teal)] text-white"
                            : "bg-[var(--color-border)] text-[var(--color-medium-teal)]"
                        }`}
                      >
                        {active ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <p className="mt-2 text-sm font-semibold">{step}</p>

                      {index < STATUS_STEPS.length - 1 && (
                        <div
                          className={`mt-3 h-1 w-full rounded-full ${
                            currentIndex > index
                              ? "bg-[var(--color-teal)]"
                              : "bg-[var(--color-border)]"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assigned Team */}
          {selectedReq.assignedTeam && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-light)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-medium-teal)]">
                <ShieldCheck className="h-4 w-4" />
                Assigned Rescue Team
              </div>

              <p className="mt-2 font-bold text-[var(--color-dark-teal)]">
                {selectedReq.assignedTeam.organization}
              </p>

              <p className="text-[var(--color-medium-teal)]">
                {selectedReq.assignedTeam.teamName}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedReq.assignedTeam.resources.map((resource) => (
                  <Badge key={resource} variant="success">
                    {resource}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Government Note */}
          {selectedReq.governmentNote && selectedReq.status !== "Rejected" && (
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-medium-teal)]">
                <AlertCircle className="h-4 w-4" />
                Government Note
              </div>

              <p className="mt-2 text-[var(--color-dark-teal)]">
                {selectedReq.governmentNote}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  </div>
</div>
```

  </main>
);
}