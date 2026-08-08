import { useNavigate } from "react-router-dom";
import {
  CheckSquare,
  LifeBuoy,
  Siren,
  Users,
  FileCheck,
  AlertTriangle,
  ShieldCheck,
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
    to: "/government/verify",
    label: "Verify Reports",
    desc: "Review and approve citizen-submitted hazard reports",
    icon: CheckSquare,
    accent: "bg-amber-50 border-amber-200 text-amber-700",
    iconBg: "bg-amber-100 text-amber-700",
  },
  {
    to: "/government/rescue",
    label: "Rescue Teams",
    desc: "Assign rescue teams to verified incidents",
    icon: LifeBuoy,
    accent: "bg-[var(--color-soft-mint)] border-[rgba(53,98,103,0.2)] text-[var(--color-dark-teal)]",
    iconBg: "bg-[var(--color-pale-aqua)] text-[var(--color-ocean)]",
  },
  {
    to: "/government/alerts",
    label: "Disaster Alerts",
    desc: "Publish and manage official coastal alerts",
    icon: Siren,
    accent: "bg-red-50 border-red-200 text-red-700",
    iconBg: "bg-red-100 text-red-700",
  },
  {
    to: "/government/missing",
    label: "Missing Persons",
    desc: "Manage and update missing person records",
    icon: Users,
    accent: "bg-blue-50 border-blue-200 text-blue-700",
    iconBg: "bg-blue-100 text-blue-700",
  },
];

export default function GovernmentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const stats = computeStats(MOCK_HAZARD_REPORTS);

  return (
    <main>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4 text-[var(--color-ocean)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
            Government Response Hub
          </p>
        </div>
        <h1 className="mt-1 text-3xl font-black text-[var(--color-deep-ocean)]">
          Disaster Response Overview
        </h1>
        <p className="mt-1 text-sm text-[var(--color-medium-teal)]">
          Welcome{user?.name ? `, ${user.name}` : ""}. Monitor verified reports, coordinate rescue, and publish alerts.
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

      {/* Pending Action Alert */}
      {stats.pending > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-700">
            {stats.pending} report{stats.pending > 1 ? "s" : ""} pending verification — review them in Verify Reports.
          </p>
          <button
            type="button"
            onClick={() => navigate("/government/verify")}
            className="ml-auto shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition"
          >
            Review
          </button>
        </div>
      )}

      {/* Quick Navigation */}
      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.15em] text-[var(--color-dark-teal)]">
          Management Areas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.to}
                type="button"
                onClick={() => navigate(link.to)}
                className={`flex items-center gap-4 rounded-3xl border px-6 py-5 text-left transition hover:shadow-md ${link.accent}`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 ${link.iconBg}`}>
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
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-[var(--color-dark-teal)]">
            Recent Reports
          </h2>
          <button
            type="button"
            onClick={() => navigate("/government/verify")}
            className="text-xs font-semibold text-[var(--color-ocean)] hover:underline"
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
                <FileCheck className="h-4 w-4 text-[var(--color-ocean)] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-deep-ocean)]">
                    {report.id} — {report.type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                  <p className="text-xs text-[var(--color-medium-teal)]">{report.placeName}</p>
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
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
