export interface ApiErrorBody {
  detail?: string;
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export interface BackendReportLocation {
  latitude: number;
  longitude: number;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  locality?: string | null;
}

export interface BackendReport {
  id: string;
  publicReportId?: string | null;
  username?: string | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  location?: BackendReportLocation;
  aiAnalysis?: Record<string, unknown> | null;
  mlAnalysis?: Record<string, unknown> | null;
  verification?: Record<string, unknown> | null;
  timeline?: Array<Record<string, unknown>>;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface BackendReportsResponse {
  count: number;
  reports: BackendReport[];
}

export interface BackendMapResponse {
  count: number;
  reportCount: number;
  hotspotCount: number;
  reports: BackendReport[];
  hotspots: Array<Record<string, unknown>>;
}

export interface BackendReportCreateResponse {
  message: string;
  reportId: string;
  legacyReportId: string;
  status: string;
  location: BackendReportLocation;
  aiAnalysis: Record<string, unknown>;
  mlAnalysis: Record<string, unknown>;
}

export type BackendReportStatus =
  | "submitted"
  | "under_review"
  | "verified"
  | "action_in_progress"
  | "resolved"
  | "rejected";

export interface BackendTrackingReport {
  reportId: string;
  legacyReportId: string;
  username?: string | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  aiAnalysis?: {
    title?: string | null;
    description?: string | null;
  } | null;
  mlAnalysis?: Record<string, unknown> | null;
  category?: string | null;
  priority?: string | null;
  currentStatus?: BackendReportStatus | string | null;
  location?: BackendReportLocation;
  verification?: Record<string, unknown> | null;
  assignment?: Record<string, unknown> | null;
  assignmentHistory?: Array<Record<string, unknown>>;
  timeline?: Array<Record<string, unknown>>;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface BackendTrackingResponse {
  success: boolean;
  message?: string;
  report?: BackendTrackingReport;
}
