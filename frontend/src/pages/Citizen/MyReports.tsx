import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, ArrowRight, ShieldAlert } from "lucide-react";
import Badge from "../../components/common/Badge";
import { getAllWaterReports } from "../../services/reportService";
import type { WaterReport } from "../../types/report";

export default function MyReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<WaterReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getAllWaterReports();
      setReports(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen text-(--color-dark-teal) space-y-6">
      <div className="rounded-3xl sm:rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-5 sm:p-8 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
              Citizen Reports History
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-(--color-deep-ocean)">
              Your Submitted Reports
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-(--color-medium-teal)">
              Review and track all water problem incident tickets submitted from your device.
            </p>
          </div>

          <Link
            to="/citizen/report"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-(--color-ocean) px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-(--color-deep-ocean) transition self-start sm:self-auto"
          >
            <ShieldAlert className="h-4 w-4" />
            Submit New Report
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-(--color-medium-teal)">
            Loading your reports…
          </div>
        ) : reports.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint)/30 p-8 text-center space-y-3">
            <p className="text-sm font-bold text-(--color-deep-ocean)">No reports found on this device</p>
            <p className="text-xs text-(--color-medium-teal) max-w-sm mx-auto">
              You haven't submitted any water-related hazard reports yet. Use the submit report tool to log ground incidents.
            </p>
            <Link
              to="/citizen/report"
              className="inline-block rounded-2xl bg-(--color-ocean) px-6 py-2.5 text-xs font-bold text-white hover:bg-(--color-deep-ocean)"
            >
              Submit First Report
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-5 shadow-sm hover:shadow-md hover:border-(--color-ocean)/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[rgba(53,98,103,0.1)]">
                    <span className="font-mono text-xs font-bold text-(--color-ocean)">
                      {item.id}
                    </span>
                    <Badge variant={item.status === "resolved" ? "success" : "info"}>
                      {item.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-(--color-deep-ocean)">
                    {item.categoryLabel}
                  </h3>
                  <p className="mt-1 text-xs text-(--color-medium-teal) line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[rgba(53,98,103,0.1)] space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-(--color-medium-teal)">
                    <MapPin className="h-3.5 w-3.5 text-(--color-ocean) shrink-0" />
                    <span className="truncate">
                      {item.location.address || item.location.placeName || "GPS Location"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/citizen/track-report?id=${item.id}`)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-(--color-soft-mint) px-4 py-2.5 text-xs font-bold text-(--color-ocean) border border-[rgba(53,98,103,0.16)] hover:bg-(--color-pale-aqua) transition active:scale-98"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Track Report Status
                    <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
