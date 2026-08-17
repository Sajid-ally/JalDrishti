import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Eye,
  MessageSquare,
  AlertTriangle,
  X
} from "lucide-react";
import Badge from "../../components/common/Badge";
import toast from "react-hot-toast";
import {
  getSocialReports,
  reviewSocialReport,
  convertSocialReport,
  type SocialReport
} from "../../services/socialReportService";
import { API_BASE_URL } from "../../utils/constants";

function toMediaUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const normalizedPath = imageUrl.replace(/^\/+/, "");
  return `${API_BASE_URL.replace(/\/$/, "")}/${normalizedPath}`;
}

function formatDate(iso?: string) {
  if (!iso) return "Unknown date";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getStatusBadgeVariant(status: string): "info" | "success" | "danger" | "neutral" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "neutral";
}

function getStatusLabel(status: string) {
  if (status === "approved") return "VERIFIED";
  if (status === "rejected") return "REJECTED";
  return "PENDING_REVIEW";
}

export default function SocialMediaVerification() {
  const [reports, setReports] = useState<SocialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending_verification");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  
  // Drawer states
  const [selectedReport, setSelectedReport] = useState<SocialReport | null>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getSocialReports(statusFilter || undefined, platformFilter || undefined);
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
  }, [statusFilter, platformFilter]);

  const handleApprove = async (id: string) => {
    setSubmittingReview(true);
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
      setSelectedReport(null);
      loadReports();
    } catch (err) {
      console.error("Approval flow failed:", err);
      toast.error("Failed to approve and convert social report.", { id: toastId });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a reason for rejection.");
      return;
    }
    setSubmittingReview(true);
    const toastId = toast.loading("Rejecting social media report...");
    try {
      await reviewSocialReport(id, "rejected", "admin", rejectionReason);
      toast.success("Social report rejected.", { id: toastId });
      setShowRejectConfirm(false);
      setRejectionReason("");
      setSelectedReport(null);
      loadReports();
    } catch (err) {
      console.error("Rejection failed:", err);
      toast.error("Failed to reject social report.", { id: toastId });
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (categoryFilter) {
      const reportCat = (r.category || "").toLowerCase();
      if (categoryFilter === "flooding") {
        if (!reportCat.includes("flood")) return false;
      } else if (categoryFilter === "coastal_erosion") {
        if (!reportCat.includes("erosion")) return false;
      } else if (categoryFilter === "water_logging") {
        if (!reportCat.includes("log") && !reportCat.includes("logging")) return false;
      } else if (categoryFilter === "storm_surge") {
        if (!reportCat.includes("surge")) return false;
      } else if (categoryFilter === "high_tide") {
        if (!reportCat.includes("tide")) return false;
      } else if (categoryFilter === "drowning") {
        if (!reportCat.includes("drowning") && !reportCat.includes("accident")) return false;
      } else if (categoryFilter === "other") {
        const known = ["flood", "erosion", "log", "logging", "surge", "tide", "drowning", "accident"];
        if (known.some(k => reportCat.includes(k))) return false;
      }
    }
    return true;
  });

  return (
    <main className="space-y-6 text-(--color-dark-teal)">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
            Government Administration
          </p>
          <h1 className="mt-1 text-2xl font-black text-(--color-deep-ocean) sm:text-3xl">
            Social Media Verification
          </h1>
          <p className="mt-1 text-xs text-(--color-medium-teal) sm:text-sm">
            Review water-related reports received from social media before they enter the JalDrishti response workflow.
          </p>
        </div>
        <button
          type="button"
          onClick={loadReports}
          className="flex self-start items-center gap-2 rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2 text-sm font-semibold text-(--color-dark-teal) hover:bg-(--color-pale-aqua)/30"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap gap-4 sm:items-center">
          {/* Status filter */}
          <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
            <label className="text-xs font-semibold text-(--color-medium-teal)">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs text-(--color-dark-teal) w-full"
            >
              <option value="pending_verification">Pending Review</option>
              <option value="approved">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
          </div>

          {/* Platform filter */}
          <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
            <label className="text-xs font-semibold text-(--color-medium-teal)">Platform</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs text-(--color-dark-teal) w-full"
            >
              <option value="">All Platforms</option>
              <option value="CoastalSocial">CoastalSocial</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
            <label className="text-xs font-semibold text-(--color-medium-teal)">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-3 py-2 text-xs text-(--color-dark-teal) w-full"
            >
              <option value="">All Categories</option>
              <option value="flooding">Flooding</option>
              <option value="coastal_erosion">Coastal Erosion</option>
              <option value="water_logging">Water Logging</option>
              <option value="storm_surge">Storm Surge</option>
              <option value="high_tide">High Tide</option>
              <option value="drowning">Drowning / Accidents</option>
              <option value="other">Others</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Queue View */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-(--color-ocean)" />
          <span className="ml-3 text-sm text-(--color-medium-teal)">Loading verification queue…</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-3xl border border-[rgba(53,98,103,0.14)] bg-white p-10 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-(--color-medium-teal)" />
          <p className="text-sm text-(--color-medium-teal)">No social media reports match the filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredReports.map((report) => {
            const imgUrl = toMediaUrl(report.imageUrl);
            return (
              <div
                key={report.id}
                className="flex flex-col justify-between rounded-3xl border border-[rgba(53,98,103,0.16)] bg-white shadow-sm overflow-hidden"
              >
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
                        COASTALSOCIAL
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(report.status)}>
                        {getStatusLabel(report.status)}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-(--color-deep-ocean)">
                        {report.title}
                      </h3>
                      <p className="text-xs text-(--color-medium-teal) font-mono">
                        Posted by @{report.username || "anonymous"} • ID: {report.sourcePostId}
                      </p>
                    </div>

                    <p className="text-sm leading-relaxed text-(--color-dark-teal) line-clamp-2">
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
                            .join(", ") || "Unknown Location"}
                        </span>
                      </div>
                      {report.mlConfidence !== undefined && (
                        <div className="flex items-center gap-1 text-indigo-700 font-semibold">
                          <span className="h-2 w-2 rounded-full bg-indigo-600 inline-block mr-1"></span>
                          ML Confidence: {(report.mlConfidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-[var(--color-soft-mint)]/30 border-t border-[rgba(53,98,103,0.08)] px-5 py-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReport(report);
                      setShowRejectConfirm(false);
                      setRejectionReason("");
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[rgba(53,98,103,0.2)] bg-white px-4 py-2.5 text-xs font-semibold text-(--color-dark-teal) hover:bg-(--color-pale-aqua)/40 transition"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Drawer */}
      {selectedReport && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!submittingReview) setSelectedReport(null);
            }}
          />
          <aside className="fixed right-0 top-0 z-[9999] flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl animate-slideRight" aria-label="Social report details">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[rgba(53,98,103,0.14)] bg-white px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--color-ocean)">Social Verification</p>
                <h2 className="mt-0.5 text-lg font-black text-(--color-deep-ocean)">ID: {selectedReport.sourcePostId}</h2>
              </div>
              <button
                type="button"
                disabled={submittingReview}
                onClick={() => setSelectedReport(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-pale-aqua) text-(--color-dark-teal) disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
              {/* Full Image */}
              {toMediaUrl(selectedReport.imageUrl) && (
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">Posted Image</p>
                  <img
                    src={toMediaUrl(selectedReport.imageUrl)}
                    alt={selectedReport.title}
                    className="max-h-64 w-full rounded-2xl border border-[rgba(53,98,103,0.12)] object-cover shadow-xs"
                  />
                </section>
              )}

              {/* Title & Caption */}
              <section>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">Title / Caption</p>
                <p className="text-base font-bold text-(--color-deep-ocean)">{selectedReport.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-(--color-dark-teal)">{selectedReport.description}</p>
              </section>

              {/* Source/Platform info */}
              <section className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">Platform</p>
                  <Badge variant="info">COASTALSOCIAL</Badge>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">User Handle</p>
                  <p className="text-sm font-semibold text-(--color-dark-teal)">@{selectedReport.username || "anonymous"}</p>
                </div>
              </section>

              {/* Location */}
              <section className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">Reported Location</p>
                  <p className="text-sm font-medium text-(--color-dark-teal)">
                    {[
                      selectedReport.location.locality,
                      selectedReport.location.city,
                      selectedReport.location.district,
                      selectedReport.location.state,
                    ]
                      .filter(Boolean)
                      .join(", ") || "GPS coordinates provided without address"}
                  </p>
                  <p className="mt-0.5 text-xs font-mono text-(--color-medium-teal)">
                    Lat: {selectedReport.location.latitude.toFixed(6)}, Lng: {selectedReport.location.longitude.toFixed(6)}
                  </p>
                </div>
              </section>

              {/* Time */}
              {selectedReport.postedAt && (
                <section className="flex gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-(--color-ocean)" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">Date &amp; Time Posted</p>
                    <p className="text-sm text-(--color-dark-teal)">{formatDate(selectedReport.postedAt)}</p>
                  </div>
                </section>
              )}

              {/* ML Verification Info */}
              <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-800">Teammate ML Classifier Results</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-indigo-600 font-semibold mb-0.5">Classification Category</p>
                    <p className="text-sm font-bold text-indigo-950 uppercase">{selectedReport.category?.replace(/_/g, " ") || "WATER_HAZARD"}</p>
                  </div>
                  {selectedReport.mlConfidence !== undefined && (
                    <div>
                      <p className="text-indigo-600 font-semibold mb-0.5">ML Confidence Score</p>
                      <p className="text-sm font-bold text-indigo-950">{(selectedReport.mlConfidence * 100).toFixed(1)}%</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Current Status */}
              <section>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)">Current Verification Status</p>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(selectedReport.status)}>
                    {getStatusLabel(selectedReport.status)}
                  </Badge>
                  {selectedReport.rejectionReason && (
                    <span className="text-xs text-red-600 font-medium">Reason: {selectedReport.rejectionReason}</span>
                  )}
                </div>
              </section>

              {/* Rejection Form inside drawer */}
              {showRejectConfirm && (
                <section className="rounded-2xl border border-red-100 bg-red-50/50 p-4 space-y-3 animate-scaleUp">
                  <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs uppercase">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Confirm Rejection
                  </div>
                  <p className="text-xs text-red-700">
                    Please provide a rejection reason (e.g. false report, duplicate, or irrelevant post) to reject this candidate report:
                  </p>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full rounded-xl border border-red-200 bg-white p-2.5 text-xs text-red-950 placeholder:text-red-300"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => {
                        setShowRejectConfirm(false);
                        setRejectionReason("");
                      }}
                      className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => handleReject(selectedReport.id)}
                      className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                    >
                      Confirm Reject
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* Actions Footer */}
            {selectedReport.status === "pending_verification" && !showRejectConfirm && (
              <footer className="sticky bottom-0 flex gap-3 border-t border-[rgba(53,98,103,0.14)] bg-white px-4 py-4 sm:px-6">
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => setShowRejectConfirm(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50 hover:bg-red-100 transition"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Report
                </button>
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleApprove(selectedReport.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-(--color-ocean) py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-(--color-deep-ocean) transition"
                >
                  <CheckCircle className="h-4 w-4" />
                  Verify &amp; Approve
                </button>
              </footer>
            )}
          </aside>
        </>
      )}
    </main>
  );
}
