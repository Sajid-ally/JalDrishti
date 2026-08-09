export type AlertType =
  | "New hazard report"
  | "New missing-person report"
  | "Rescue request"
  | "High-priority incident"
  | "Verification required"
  | "System/field update";

export type AlertPriority = "Low" | "Medium" | "High" | "Critical";

export interface GovernmentAlert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  location?: string;
  timeAgo: string;
  timestamp: string;
  priority: AlertPriority;
  status: "Pending Review" | "Reviewed" | "Action Taken";
  actionLabel?: string;
  targetRoute?: string;
}
