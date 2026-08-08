import type { ReportPriority, ReportStatus } from "../types/report.types";

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "Pending",
  under_review: "Under review",
  in_progress: "In progress",
  resolved: "Resolved",
  rejected: "Rejected",
};

const PRIORITY_LABELS: Record<ReportPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function getStatusLabel(status: ReportStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getPriorityLabel(priority: ReportPriority): string {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function isValidFileType(file: File, allowed = ALLOWED_FILE_TYPES): boolean {
  return allowed.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number]);
}

export function isValidFileSize(file: File, maxSize = MAX_FILE_SIZE): boolean {
  return file.size <= maxSize;
}
