import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  Map,
  Newspaper,
  AlertTriangle,
  Droplets,
  Wind,
  Waves,
  Megaphone,
  Search,
} from "lucide-react";
import Card, { DashboardCards } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import useAuth from "../../hooks/useAuth";
import { MOCK_NEWS_FEED } from "../../services/hazardService";
import type { NewsFeedItem } from "../../services/hazardService";
import type { Severity } from "../../types/hazard";

// ─── helpers ───────────────────────────────────────────────────────────────

function severityBadge(severity: Severity) {
  const map: Record<Severity, "danger" | "warning" | "info" | "success"> = {
    critical: "danger",
    high: "warning",
    moderate: "info",
    low: "success",
  };
  return <Badge variant={map[severity]}>{severity.charAt(0).toUpperCase() + severity.slice(1)}</Badge>;
}

function newsIcon(title: string) {
  if (/wave/i.test(title)) return <Waves className="h-5 w-5 text-(--color-ocean)" />;
  if (/flood/i.test(title)) return <Droplets className="h-5 w-5 text-(--color-ocean)" />;
  if (/rain|storm|surge/i.test(title)) return <Wind className="h-5 w-5 text-(--color-ocean)" />;
  if (/emergency|government/i.test(title)) return <Megaphone className="h-5 w-5 text-(--color-ocean)" />;
  return <AlertTriangle className="h-5 w-5 text-(--color-ocean)" />;
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours === 1) return "1 hr ago";
  return `${hours} hrs ago`;
}

// ─── News Feed Card ─────────────────────────────────────────────────────────

function NewsFeedCard({ item }: { item: NewsFeedItem }) {
  return (
    <Card variant="news" className="p-4 rounded-2xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-xl bg-[(--color-pale-aqua)] p-2">
          {newsIcon(item.title)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[(--color-deep-ocean)] leading-snug">
              {item.title}
            </h3>
            {severityBadge(item.severity)}
          </div>
          <p className="text-xs text-[(--color-medium-teal)] leading-relaxed line-clamp-2">
            {item.body}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-[(--color-medium-teal)]/70">
            <span>{item.source}</span>
            <span>·</span>
            <span>{formatTime(item.issuedAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <main className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
          Citizen Dashboard
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-(--color-deep-ocean)">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-(--color-medium-teal)">
          Your coastal overview — alerts, reports, and live hazard status.
        </p>
      </div>

      {/* Stats */}
      <section>
        <DashboardCards />
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-sm sm:text-base font-bold text-(--color-dark-teal) uppercase tracking-[0.15em]">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Submit Report */}
          <button
            type="button"
            onClick={() => navigate("/citizen/report")}
            className="flex items-center gap-4 rounded-3xl border-2 border-(--color-ocean) bg-(--color-soft-mint) p-5 text-left transition hover:bg-[(--color-mint)] hover:shadow-md active:scale-98"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--color-ocean) text-white shrink-0 shadow-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-(--color-deep-ocean)">Submit Report</p>
              <p className="text-xs text-(--color-medium-teal)">
                Report water problem with photo/GPS
              </p>
            </div>
          </button>

          {/* Track Report */}
          <button
            type="button"
            onClick={() => navigate("/citizen/track-report")}
            className="flex items-center gap-4 rounded-3xl border border-[rgba(53,98,103,0.2)] bg-white p-5 text-left transition hover:border-(--color-ocean) hover:bg-[(--color-soft-mint)] hover:shadow-md active:scale-98"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--color-pale-aqua) text-(--color-ocean) shrink-0">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-(--color-deep-ocean)">Track Your Reports</p>
              <p className="text-xs text-(--color-medium-teal)">
                Search live status via Report ID
              </p>
            </div>
          </button>

          {/* Live Map */}
          <button
            type="button"
            onClick={() => navigate("/citizen/live-map")}
            className="flex items-center gap-4 rounded-3xl border border-[rgba(53,98,103,0.2)] bg-white p-5 text-left transition hover:border-(--color-ocean) hover:bg-[(--color-soft-mint)] hover:shadow-md active:scale-98 sm:col-span-2 lg:col-span-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--color-pale-aqua) text-(--color-ocean) shrink-0">
              <Map className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-(--color-deep-ocean)">Live Map</p>
              <p className="text-xs text-(--color-medium-teal)">
                View live nationwide hazard map
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* News Feed */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-(--color-ocean)" />
          <h2 className="text-sm sm:text-base font-bold text-(--color-dark-teal) uppercase tracking-[0.15em]">
            Advisories &amp; Announcements
          </h2>
        </div>
        {/* TODO: Replace MOCK_NEWS_FEED with API data from GET /api/advisories */}
        <div className="space-y-3">
          {MOCK_NEWS_FEED.map((item) => (
            <NewsFeedCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
