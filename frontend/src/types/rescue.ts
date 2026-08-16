// frontend/src/types/rescue.ts

/* ============================================================
   RESCUE REQUEST STATUS
   ============================================================ */

export type RescueRequestStatus =
  | "Submitted"
  | "Under Review"
  | "Government Assigned"
  | "Rescue Team Dispatched"
  | "Help Arriving"
  | "Resolved"
  | "Rejected";


/* ============================================================
   RESCUE URGENCY
   ============================================================ */

export type RescueUrgency =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";


/* ============================================================
   LOCATION
   ============================================================ */

export interface RescueLocation {
  latitude: number;
  longitude: number;
}


/* ============================================================
   ASSIGNED RESCUE TEAM
   ============================================================ */

export interface AssignedRescueTeam {
  organization: string;
  teamName: string;
  resources: string[];
}


/* ============================================================
   RESCUE REQUEST
   ============================================================ */

export interface RescueRequestItem {
  id: string;

  /**
   * Display title.
   */
  title: string;

  /**
   * Disaster / emergency type.
   */
  type: string;

  /**
   * Human-readable location.
   */
  locationName: string;

  /**
   * GPS coordinates.
   */
  location: RescueLocation;

  /**
   * Citizen's emergency description.
   */
  description: string;

  /**
   * Number of affected people.
   */
  peopleCount: number;

  /**
   * Assistance requested.
   */
  assistanceRequired: string[];

  /**
   * Citizen selected urgency.
   */
  urgency: RescueUrgency;

  /**
   * Optional uploaded evidence.
   */
  photoUrl?: string;

  /**
   * Current rescue workflow status.
   */
  status: RescueRequestStatus;

  /**
   * Creation time.
   */
  createdAt: string;

  /**
   * Existing UI compatibility.
   */
  submittedAt?: string;

  /**
   * Last status/update time.
   */
  lastUpdate: string;

  /**
   * Assigned government/rescue team.
   */
  assignedTeam?: AssignedRescueTeam;

  /**
   * Government/officer update.
   */
  governmentNote?: string;

  /**
   * Estimated response time.
   */
  estimatedResponse?: string;
}


/* ============================================================
   SUBMIT RESCUE REQUEST
   ============================================================ */

/**
 * This intentionally supports both names currently used
 * by the existing frontend:
 *
 * RescueRequest.tsx
 *     -> disasterType
 *
 * RescueRelief.tsx
 *     -> type
 *
 * The service will normalize them before sending to backend.
 */
export interface SubmitRescueRequestData {
  type?: string;

  disasterType?: string;

  title?: string;

  description: string;

  latitude: number;

  longitude: number;

  locationName?: string;

  location?: RescueLocation;

  peopleAffected: number;

  assistanceRequired: string[];

  urgency: RescueUrgency;

  photo?: File;
}


/* ============================================================
   BACKEND CREATE PAYLOAD
   ============================================================ */

export interface CreateRescueRequestPayload {
  title?: string;

  type: string;

  description: string;

  location: RescueLocation;

  locationName: string;

  peopleCount: number;

  assistanceRequired: string[];

  urgency: RescueUrgency;

  photo?: File;
}


/* ============================================================
   STATUS LABELS
   ============================================================ */

export const RESCUE_STATUS_LABELS: Record<
  RescueRequestStatus,
  string
> = {
  Submitted: "Submitted",

  "Under Review":
    "Under Review",

  "Government Assigned":
    "Government Assigned",

  "Rescue Team Dispatched":
    "Rescue Team Dispatched",

  "Help Arriving":
    "Help Arriving",

  Resolved: "Resolved",

  Rejected: "Rejected",
};


/* ============================================================
   URGENCY LABELS
   ============================================================ */

export const RESCUE_URGENCY_LABELS: Record<
  RescueUrgency,
  string
> = {
  Low: "Low",

  Medium: "Medium",

  High: "High",

  Critical: "Critical",
};


/* ============================================================
   ASSISTANCE OPTIONS
   ============================================================ */

export const ASSISTANCE_OPTIONS = [
  "Evacuation",
  "Medical",
  "Food",
  "Water",
  "Shelter",
  "Rescue Boat",
] as const;


/* ============================================================
   DISASTER TYPES
   ============================================================ */

export const RESCUE_DISASTER_TYPES = [
  "Flood",
  "Tsunami",
  "Cyclone",
  "Storm Surge",
  "Landslide",
  "Coastal Erosion",
] as const;