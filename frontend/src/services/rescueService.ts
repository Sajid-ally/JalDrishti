import type { RescueRequestItem, RescueRequestStatus } from "../types/rescue";

const MOCK_RESCUE_REQUESTS: RescueRequestItem[] = [
  {
    id: "REQ1024",
    type: "Flood Evacuation",
    location: "Puri Beach Road, Sector 4",
    description: "Water level rising rapidly near residential complex. Family trapped on second floor.",
    peopleCount: 4,
    urgency: "Critical",
    status: "Rescue Team Dispatched",
    assignedTeam: "NDRF Unit 7",
    submittedAt: "2026-08-09 12:45",
    lastUpdate: "2026-08-09 13:10",
    estimatedResponse: "15-20 minutes",
  },
  {
    id: "REQ1018",
    type: "Medical Emergency",
    location: "East Point Shelter Zone",
    description: "Elderly person requiring immediate oxygen and medical evacuation.",
    peopleCount: 1,
    urgency: "High",
    status: "Government Assigned",
    assignedTeam: "Coastal Rescue Response Alpha",
    submittedAt: "2026-08-09 11:20",
    lastUpdate: "2026-08-09 12:00",
    estimatedResponse: "30 minutes",
  },
];

let rescueRequestsStore: RescueRequestItem[] = [...MOCK_RESCUE_REQUESTS];

export async function getRescueRequests(): Promise<RescueRequestItem[]> {
  return [...rescueRequestsStore];
}

export async function submitRescueRequest(
  request: Omit<
    RescueRequestItem,
    "id" | "status" | "submittedAt" | "lastUpdate" | "assignedTeam" | "estimatedResponse"
  >
): Promise<RescueRequestItem> {
  const newReq: RescueRequestItem = {
    ...request,
    id: `REQ${Math.floor(1000 + Math.random() * 9000)}`,
    status: "Submitted",
    submittedAt: new Date().toLocaleString([], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    lastUpdate: "Just now",
    estimatedResponse: "Under initial assessment by dispatch center",
  };
  rescueRequestsStore = [newReq, ...rescueRequestsStore];
  return newReq;
}

export async function updateRequestStatus(
  id: string,
  status: RescueRequestStatus,
  assignedTeam?: string,
  estimatedResponse?: string
): Promise<boolean> {
  rescueRequestsStore = rescueRequestsStore.map((req) =>
    req.id === id
      ? {
          ...req,
          status,
          assignedTeam: assignedTeam ?? req.assignedTeam,
          estimatedResponse: estimatedResponse ?? req.estimatedResponse,
          lastUpdate: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      : req
  );
  return true;
}
