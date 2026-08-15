import { useNavigate } from "react-router-dom";
import {
  MapPinned,
  Siren,
  Waves,
  FileCheck,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

import Card from "../../components/common/Card";
import useAuth from "../../hooks/useAuth";
import { MOCK_HAZARD_REPORTS } from "../../services/hazardService";

// Compute stat values from mock reports
// TODO: Replace with GET /api/dashboard/stats
function computeStats(reports: typeof MOCK_HAZARD_REPORTS) {
  const total = reports.length;
  const pending = reports.filter((r) => r.status === "pending").length;
  const verified = reports.filter((r) => r.status === "verified").length;
  const rejected = reports.filter((r) => r.status === "rejected").length;

  return { total, pending, verified, rejected };
}

const quickLinks = [
  {
    to: "/government/live-map",
    label: "Live Map",
    desc: "Monitor live incidents and citizen reports across India",
    icon: MapPinned,
    accent: "bg-(--color-soft-mint) border-[rgba(53,98,103,0.2)] text-(--color-dark-teal)",
    iconBg: "bg-(--color-pale-aqua) text-(--color-ocean)",
  },
  {
    to: "/government/emergency-operations",
    label: "Emergency Operations",
    desc: "Coordinate alerts and rescue response operations",
    icon: Siren,
    accent: "bg-red-50 border-red-200 text-red-700",
    iconBg: "bg-red-100 text-red-700",
  },
  {
    to: "/government/review-reports",
    label: "Review Reports",
    desc: "Review, assign, and update citizen-submitted reports",
    icon: Waves,
    accent: "bg-sky-50 border-sky-200 text-sky-700",
    iconBg: "bg-sky-100 text-sky-700",
  },
];

export default function GovernmentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const stats = computeStats(MOCK_HAZARD_REPORTS);

  // Show only a few reports on the dashboard.
  // The complete list is available on Department Tracking.
  const trackingPreview = MOCK_HAZARD_REPORTS.slice(0, 4);

  return (
    <main>
      {/* Header */}
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-(--color-ocean)" />

          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
            Government Response Hub
          </p>
        </div>

        <h1 className="mt-1 text-3xl font-black text-(--color-deep-ocean)">
          Disaster Response Overview
        </h1>

        <p className="mt-1 text-sm text-(--color-medium-teal)">
          Welcome{user?.name ? `, ${user.name}` : ""}. Monitor verified
          reports, coordinate rescue, and publish alerts.
        </p>
      </div>
      {/* Stats Grid */}
      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card
          variant="stat"
          className="rounded-2xl p-5"
          title="Total Reports"
          value={stats.total}
          subtitle="Citizen submissions"
        />

        <Card
          variant="stat"
          className="rounded-2xl p-5"
          title="Pending Review"
          value={stats.pending}
          subtitle="Awaiting your action"
        />

        <Card
          variant="stat"
          className="rounded-2xl p-5"
          title="Verified"
          value={stats.verified}
          subtitle="Confirmed incidents"
        />

        <Card
          variant="stat"
          className="rounded-2xl p-5"
          title="Rejected"
          value={stats.rejected}
          subtitle="False or duplicate"
        />
      </section>

      {/* Department Tracking Preview */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-ocean)">
              Operations
            </p>

            <h2 className="mt-1 text-xl font-bold text-(--color-deep-ocean)">
              Department Tracking
            </h2>

            <p className="mt-1 text-sm text-(--color-medium-teal)">
              Track the progress of reported incidents and department response.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/government/department-tracking")}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(53,98,103,0.18)] bg-white px-4 py-2 text-xs font-semibold text-(--color-ocean) transition hover:bg-(--color-pale-aqua)"
          >
            View all
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm">
          <table className="w-full min-w-175 text-left">
            <thead>
              <tr className="border-b border-[rgba(53,98,103,0.12)] bg-(--color-soft-mint)/40">
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)">
                  Report
                </th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)">
                  Type
                </th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)">
                  Location
                </th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)">
                  Status
                </th>

                <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-(--color-medium-teal)">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {trackingPreview.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-[rgba(53,98,103,0.08)] last:border-b-0 hover:bg-(--color-soft-mint)/20"
                >
                  {/* Report */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--color-pale-aqua)">
                        <FileCheck className="h-4 w-4 text-(--color-ocean)" />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-(--color-deep-ocean)">
                          {report.id}
                        </p>

                        <p className="text-xs text-(--color-medium-teal)">
                          Citizen report
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold capitalize text-(--color-dark-teal)">
                      {report.type
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </td>

                  {/* Location */}
                  <td className="px-5 py-4">
                    <span className="text-sm text-(--color-dark-teal)">
                      {report.placeName || "Unknown location"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        report.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : report.status === "verified"
                            ? "bg-teal-100 text-teal-700"
                            : report.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                      }`}
                    >
                      {report.status.charAt(0).toUpperCase() +
                        report.status.slice(1)}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/government/department-tracking")
                      }
                      className="text-xs font-semibold text-(--color-ocean) hover:underline"
                    >
                      Track
                    </button>
                  </td>
                </tr>
              ))}

              {trackingPreview.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-(--color-medium-teal)"
                  >
                    No reports available for tracking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending Action Alert */}
      {stats.pending > 0 && (
        <div className="mt-8 mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />

          <p className="text-sm font-semibold text-amber-700">
            {stats.pending} report
            {stats.pending > 1 ? "s" : ""} pending verification — review them
            in Verify Reports.
          </p>

          <button
            type="button"
            onClick={() => navigate("/government/verify")}
            className="ml-auto shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
          >
            Review
          </button>
        </div>
      )}

      {/* Quick Navigation */}
      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.15em] text-(--color-dark-teal)">
          Management Areas
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;

            return (
              <button
                key={link.to}
                type="button"
                onClick={() => navigate(link.to)}
                className={`flex items-center gap-4 rounded-3xl border px-6 py-5 text-left transition hover:shadow-md ${link.accent}`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${link.iconBg}`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div>
                  <p className="font-bold">{link.label}</p>
                  <p className="text-sm opacity-75">{link.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Reports Preview */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-(--color-dark-teal)">
            Recent Reports
          </h2>

          <button
            type="button"
            onClick={() => navigate("/government/verify")}
            className="text-xs font-semibold text-(--color-ocean) hover:underline"
          >
            View all →
          </button>
        </div>

        <div className="space-y-2">
          {MOCK_HAZARD_REPORTS.slice(0, 3).map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(53,98,103,0.12)] bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <FileCheck className="h-4 w-4 shrink-0 text-(--color-ocean)" />

                <div>
                  <p className="text-sm font-semibold text-(--color-deep-ocean)">
                    {report.id} —{" "}
                    {report.type
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>

                  <p className="text-xs text-(--color-medium-teal)">
                    {report.placeName}
                  </p>
                </div>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  report.status === "pending"
                    ? "bg-amber-100 text-amber-700"
                    : report.status === "verified"
                      ? "bg-teal-100 text-teal-700"
                      : report.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                }`}
              >
                {report.status.charAt(0).toUpperCase() +
                  report.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
