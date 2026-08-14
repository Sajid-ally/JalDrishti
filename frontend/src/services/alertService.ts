import type { GovernmentAlert } from "../types/alert";

const INITIAL_GOVERNMENT_ALERTS: GovernmentAlert[] = [
  {
    id: "ALT-201",
    type: "New hazard report",
    title: "Coastal flooding reported",
    description: "Severe sea water inundation affecting beachside roads and residential houses.",
    location: "Puri Beach",
    priority: "High",
    timeAgo: "2 minutes ago",
    timestamp: "2026-08-09T14:30:00Z",
    status: "Pending Review",
    actionLabel: "Review Report",
    targetRoute: "/government/verify",
  },
  {
    id: "ALT-203",
    type: "Rescue request",
    title: "Flood evacuation request #REQ1024",
    description: "4 individuals stranded on second floor due to rising water level.",
    location: "Puri Beach Road, Sector 4",
    priority: "Critical",
    timeAgo: "15 minutes ago",
    timestamp: "2026-08-09T14:15:00Z",
    status: "Action Taken",
    actionLabel: "View Assignment",
    targetRoute: "/government/rescue",
  },
  {
    id: "ALT-204",
    type: "High-priority incident",
    title: "Storm surge warning issued for North Coast",
    description: "Meteorological bulletin predicts 2.5m waves over next 3 hours.",
    location: "North Coast District",
    priority: "High",
    timeAgo: "35 minutes ago",
    timestamp: "2026-08-09T13:55:00Z",
    status: "Reviewed",
    actionLabel: "View Details",
  },
  {
    id: "ALT-205",
    type: "System/field update",
    title: "NDRF Team Alpha deployed to East Sector",
    description: "Field team checked in with station control. Equipment deployment complete.",
    location: "East Sector Shelter",
    priority: "Low",
    timeAgo: "1 hour ago",
    timestamp: "2026-08-09T13:30:00Z",
    status: "Reviewed",
  },
];

let alertsStore: GovernmentAlert[] = [...INITIAL_GOVERNMENT_ALERTS];

export async function getGovernmentAlerts(): Promise<GovernmentAlert[]> {
  return [...alertsStore];
}

export async function markAlertStatus(
  id: string,
  status: GovernmentAlert["status"]
): Promise<boolean> {
  alertsStore = alertsStore.map((alt) => (alt.id === id ? { ...alt, status } : alt));
  return true;
}
