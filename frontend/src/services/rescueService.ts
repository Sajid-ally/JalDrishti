import api, { toApiError } from "./api";

export interface ReliefLocation {
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
}

export interface ReliefRequestCreate {
  title: string;
  description: string;
  location: ReliefLocation;
  peopleAffected: number;
  assistanceRequired: string[];
  urgency: string;
  username?: string;
}

export interface AssignedTeam {
  organization: string;
  teamName: string;
  resources: string[];
}

export interface ReliefRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  location: any; // string (for UI) or ReliefLocation (for backend)
  peopleCount: number;
  peopleAffected: number;
  assistanceRequired: string[];
  urgency: string;
  username?: string;
  status: string;
  submittedAt: string;
  lastUpdate: string;
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
  assignedTeam?: any;
  governmentNote?: string;
  estimatedResponse?: string;
}

interface ReliefListResponse {
  count: number;
  requests: any[];
}

interface ReliefCreateResponse {
  success?: boolean;
  message: string;
  requestId: string;
  status: string;
}

interface ReliefAssignResponse {
  success?: boolean;
  message: string;
  request: any;
}

function mapBackendRelief(req: any): ReliefRequest {
  if (!req) return req;
  return {
    ...req,
    id: req.id || req._id,
    type: req.title || "Rescue Request",
    title: req.title || "Rescue Request",
    description: req.description || "",
    location: req.location?.address || req.location?.placeName || "GPS Location",
    peopleCount: req.peopleAffected || 1,
    peopleAffected: req.peopleAffected || 1,
    assistanceRequired: req.assistanceRequired || [],
    urgency: req.urgency || "High",
    username: req.username || "anonymous",
    status: req.status || "Pending",
    submittedAt: req.createdAt ? new Date(req.createdAt).toLocaleString() : new Date().toLocaleString(),
    lastUpdate: req.updatedAt ? new Date(req.updatedAt).toLocaleString() : new Date().toLocaleString(),
    createdAt: req.createdAt || new Date().toISOString(),
    updatedAt: req.updatedAt || new Date().toISOString(),
    assignedTeam: req.assignedTeam?.teamName || undefined,
    estimatedResponse: req.governmentNote || undefined,
  };
}

/* =========================================================
   CREATE RELIEF REQUEST
   ========================================================= */

export async function createReliefRequest(
  data: ReliefRequestCreate
): Promise<ReliefRequest> {
  try {
    const response = await api.post<ReliefCreateResponse>(
      "/relief/",
      data
    );

    const created = await getReliefRequestById(
      response.data.requestId
    );

    if (!created) {
      throw new Error(
        "Relief request was created but could not be retrieved."
      );
    }

    return created;
  } catch (error) {
    throw toApiError(error);
  }
}

/* =========================================================
   GET ALL RELIEF REQUESTS
   ========================================================= */

export async function getReliefRequests(): Promise<ReliefRequest[]> {
  try {
    const response = await api.get<ReliefListResponse>(
      "/relief/"
    );

    return (response.data.requests || []).map(mapBackendRelief);
  } catch (error) {
    throw toApiError(error);
  }
}

/* =========================================================
   GET SINGLE RELIEF REQUEST
   ========================================================= */

export async function getReliefRequestById(
  requestId: string
): Promise<ReliefRequest | null> {
  try {
    const response = await api.get<{ success: boolean; request: any }>(
      `/relief/${requestId}`
    );

    return mapBackendRelief(response.data.request);
  } catch {
    return null;
  }
}

/* =========================================================
   ASSIGN RESCUE TEAM
   ========================================================= */

export async function assignReliefRequest(
  requestId: string,
  organization: string,
  teamName: string,
  resources: string[],
  governmentNote?: string
): Promise<ReliefRequest> {
  try {
    const response = await api.patch<ReliefAssignResponse>(
      `/relief/${requestId}/assign`,
      {
        organization,
        teamName,
        resources,
        governmentNote
      }
    );

    return mapBackendRelief(response.data.request);
  } catch (error) {
    throw toApiError(error);
  }
}

export const getRescueRequests = getReliefRequests as () => Promise<any[]>;

export async function submitRescueRequest(data: any): Promise<any> {
  const reliefData: ReliefRequestCreate = {
    title: data.type || "Rescue Request",
    description: data.description,
    location: {
      latitude: 19.8135,
      longitude: 85.8312,
      address: data.location || "Puri",
    },
    peopleAffected: data.peopleCount || 1,
    assistanceRequired: [data.type || "Evacuation"],
    urgency: data.urgency || "High",
    username: "anonymous",
  };
  return createReliefRequest(reliefData);
}