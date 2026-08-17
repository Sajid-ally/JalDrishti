import api, { toApiError } from "./api";

export interface SocialReport {
  id: string;
  platform: string;
  sourcePostId: string;
  username?: string;
  title: string;
  description: string;
  imageUrl?: string;
  location: {
    latitude: number;
    longitude: number;
    state?: string;
    district?: string;
    city?: string;
    locality?: string;
  };
  category?: string;
  mlConfidence?: number;
  postedAt?: string;
  status: "pending_verification" | "approved" | "rejected";
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export async function getSocialReports(status?: string, platform?: string): Promise<SocialReport[]> {
  try {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (platform) params.platform = platform;

    const response = await api.get<any>("/social-reports/", { params });
    const rawList = Array.isArray(response.data) ? response.data : (response.data?.reports || []);
    
    return rawList.map((r: any) => ({
      id: r.socialReportId || r.id || r._id,
      platform: r.platform,
      sourcePostId: r.sourcePostId,
      username: r.username,
      title: r.title,
      description: r.description,
      imageUrl: r.imageUrl,
      location: r.location,
      category: r.category,
      mlConfidence: r.mlConfidence,
      postedAt: r.postedAt,
      status: r.status,
      reviewedBy: r.reviewedBy,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    throw toApiError(error);
  }
}

export async function reviewSocialReport(
  socialReportId: string,
  status: "approved" | "rejected",
  reviewedBy: string,
  rejectionReason?: string
): Promise<any> {
  try {
    const response = await api.put(`/social-reports/${encodeURIComponent(socialReportId)}/review`, {
      status,
      reviewedBy,
      rejectionReason,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function convertSocialReport(socialReportId: string): Promise<any> {
  try {
    const response = await api.post(`/social-reports/${encodeURIComponent(socialReportId)}/convert`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}
