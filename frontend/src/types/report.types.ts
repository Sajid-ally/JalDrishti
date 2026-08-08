export type ReportStatus =
    | "pending"
    | "under_review"
    | "in_progress"
    | "resolved"
    | "rejected";

export type ReportPriority =
    | "low"
    | "medium"
    | "high"
    | "critical";

export interface ReportTimelineItem {
    id: string;
    status: ReportStatus;
    title: string;
    description: string;
    timestamp: string;
}

export interface Report {
    id: string;

    title: string;
    description: string;

    category: string;

    status: ReportStatus;
    priority: ReportPriority;

    location: string;

    latitude?: number;
    longitude?: number;

    imageUrl?: string;

    createdAt: string;
    updatedAt: string;

    timeline: ReportTimelineItem[];
}