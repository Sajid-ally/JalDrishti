import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Loader2,
  MapPin,
} from "lucide-react";
import Badge from "../../components/common/Badge";
import toast from "react-hot-toast";
import {
  getSocialReports,
  reviewSocialReport,
  convertSocialReport,
  type SocialReport,
} from "../../services/socialReportService";
import { API_BASE_URL } from "../../utils/constants";

function toMediaUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const normalizedPath = imageUrl.replace(/^\/+/, "");
  return `${API_BASE_URL.replace(/\/$/, "")}/${normalizedPath}`;
}

export default function SocialReports() {
  const [reports, setReports] = useState<SocialReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      // Fetch only pending verifications
      const data = await getSocialReports("pending_verification");
      setReports(data);
    } catch (err) {
      console.error("Failed to load social reports:", err);
      toast.error("Failed to load social reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleApprove = async (id: string) => {
    const toastId = toast.loading("Reviewing and converting social media post...");
    try {
      // 1. Mark as approved
      await reviewSocialReport(id, "approved", "admin");
      // 2. Convert to JalDrishti report
      const convertRes = await convertSocialReport(id);
      
      toast.success(
        `Approved & converted to JalDrishti report: ${convertRes.reportId || id}`,
        { id: toastId }
      );
      loadReports();
    } catch (err) {
      console.error("Approval flow failed:", err);
      toast.error("Failed to approve and convert social report.", { id: toastId });
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter reason for rejection (optional):") || "Irrelevant / False alarm";
    const toastId = toast.loading("Rejecting social media report...");
    try {
      await reviewSocialReport(id, "rejected", "admin", reason);
      toast.success("Social report rejected.", { id: toastId });
      loadReports();
    } catch (err) {
      console.error("Rejection failed:", err);
      toast.error("Failed to reject social report.", { id: toastId });
    }
  };

  return (
    <main className="space-y-6 text-(--color-dark-teal)">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
            Social Media Verification
          </p>
          <h1 className="mt-1 text-2xl font-black text-(--color-deep-ocean) sm:text-3xl">
            Coastal Social Reports
          </h1>
          <p className="mt-1 text-xs text-(--color-medium-teal) sm:text-sm">
            Review potential water-related posts from social networks. Verify/Approve to convert them into official JalDrishti reports.
          </p>
        </div>
        <button
          type="button"
          onClick={loadReports}
          className="flex self-start items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2 text-sm font-semibold text-(--color-dark-teal)"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-(--color-ocean)" />
          <span className="ml-3 text-sm text-(--color-medium-teal)">Loading social reports…</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-10 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-(--color-medium-teal)" />
          <p className="text-sm text-(--color-medium-teal)">No pending social media reports found.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {reports.map((report) => {
            const imgUrl = toMediaUrl(report.imageUrl);
            return (
              <div
                key={report.id}
                className="flex flex-col justify-between rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm overflow-hidden"
              >
                {/* Header info */}
                <div>
                  {imgUrl && (
                    <img
                      src={imgUrl}
                      alt={report.title}
                      className="h-48 w-full object-cover border-b border-[rgba(53,98,103,0.08)]"
                    />
                  )}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge variant="info">
                        {report.platform.toUpperCase()} POST
                      </Badge>
                      {report.mlConfidence !== undefined && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                          ML Confidence: {(report.mlConfidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-(--color-deep-ocean)">
                        {report.title}
                      </h3>
                      <p className="text-xs text-(--color-medium-teal) font-mono">
                        Posted by @{report.username || "anonymous"} • ID: {report.sourcePostId}
                      </p>
                    </div>

                    <p className="text-sm leading-relaxed text-(--color-dark-teal)">
                      {report.description}
                    </p>

                    <div className="grid gap-2 text-xs pt-2 border-t border-[rgba(53,98,103,0.08)]">
                      <div className="flex items-center gap-1.5 text-(--color-dark-teal)">
                        <MapPin className="h-3.5 w-3.5 text-(--color-ocean) shrink-0" />
                        <span className="truncate">
                          {[
                            report.location.locality,
                            report.location.city,
                            report.location.district,
                            report.location.state,
                          ]
                            .filter(Boolean)
                            .join(", ") || "Unknown GPS Location"}
                        </span>
                      </div>
                      {report.postedAt && (
                        <div className="flex items-center gap-1.5 text-(--color-medium-teal)">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{new Date(report.postedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-[var(--color-soft-mint)]/30 border-t border-[rgba(53,98,103,0.08)] px-5 py-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleApprove(report.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-(--color-ocean) px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-(--color-deep-ocean)"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve &amp; Convert
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(report.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
