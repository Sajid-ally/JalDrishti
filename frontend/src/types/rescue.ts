export type RescueRequestStatus =
  | "Submitted"
  | "Under Review"
  | "Government Assigned"
  | "Rescue Team Dispatched"
  | "Help Arriving"
  | "Resolved";

export interface RescueRequestItem {
  id: string;
  type: string;
  location: string;
  description: string;
  peopleCount: number;
  urgency: "Low" | "Medium" | "High" | "Critical";
  photoUrl?: string;
  status: RescueRequestStatus;
  assignedTeam?: string;
  submittedAt: string;
  lastUpdate: string;
  estimatedResponse?: string;
}
