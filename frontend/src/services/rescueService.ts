import api, { toApiError } from "./api";

/* =========================================================
   TYPES
   ========================================================= */

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

  location: string | ReliefLocation;

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

  assignedTeam?: string | AssignedTeam;

  governmentNote?: string;
  estimatedResponse?: string;
}

interface BackendReliefRequest {
  id?: string;
  _id?: string;

  title?: string;
  disasterType?: string;
  description?: string;

  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    placeName?: string;
    landmark?: string;
  };

  locationName?: string;

  peopleAffected?: number;
  assistanceRequired?: string[];
  urgency?: string;
  username?: string;

  status?: string;

  createdAt?: string;
  updatedAt?: string;
  assignedAt?: string;

  assignedTeam?: {
    organization?: string;
    teamName?: string;
    resources?: string[];
  };

  governmentNote?: string;
}

interface ReliefListResponse {
  success?: boolean;
  count: number;
  requests: BackendReliefRequest[];
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
  request: BackendReliefRequest;
}

interface ReliefStatusResponse {
  success?: boolean;
  message: string;
  request: BackendReliefRequest;
}

/* =========================================================
   BACKEND → FRONTEND MAPPER
   ========================================================= */

function mapBackendRelief(
  req: BackendReliefRequest | null | undefined
): ReliefRequest {
  if (!req) {
    throw new Error("Invalid relief request received from backend.");
  }

  const now = new Date().toISOString();

  const createdAt = req.createdAt ?? now;
  const updatedAt = req.updatedAt ?? createdAt;

  const locationObject: ReliefLocation = {
    latitude: req.location?.latitude ?? 19.8135,
    longitude: req.location?.longitude ?? 85.8312,
    address:
      req.location?.address ??
      req.locationName ??
      req.location?.placeName,
    landmark: req.location?.landmark,
  };

  const locationDisplay =
    req.locationName ??
    req.location?.address ??
    req.location?.placeName ??
    "GPS Location";

  const assignedTeam: AssignedTeam | undefined = req.assignedTeam
    ? {
        organization: req.assignedTeam.organization ?? "",
        teamName: req.assignedTeam.teamName ?? "",
        resources: req.assignedTeam.resources ?? [],
      }
    : undefined;

  return {
    id: req.id ?? req._id ?? "",

    type: req.disasterType ?? req.title ?? "Rescue Request",

    title:
      req.title ??
      req.disasterType ??
      "Rescue Request",

    description: req.description ?? "",

    location: locationDisplay,

    peopleCount: req.peopleAffected ?? 1,

    peopleAffected: req.peopleAffected ?? 1,

    assistanceRequired:
      req.assistanceRequired ?? [],

    urgency: req.urgency ?? "High",

    username:
      req.username ?? "anonymous",

    status:
      req.status ?? "Pending",

    submittedAt:
      new Date(createdAt).toLocaleString(),

    lastUpdate:
      new Date(updatedAt).toLocaleString(),

    createdAt,

    updatedAt,

    assignedAt:
      req.assignedAt,

    assignedTeam,

    governmentNote:
      req.governmentNote,

    estimatedResponse:
      req.governmentNote,

    // Keep object available internally if needed.
    // UI can still receive the string above.
    ...(locationObject && {}),
  };
}

/* =========================================================
   CREATE RELIEF REQUEST
   Backend expects multipart/form-data
   ========================================================= */

export async function createReliefRequest(
  data: ReliefRequestCreate
): Promise<ReliefRequest> {
  try {
    const formData = new FormData();

    formData.append(
      "disasterType",
      data.title
    );

    formData.append(
      "description",
      data.description
    );

    formData.append(
      "latitude",
      String(data.location.latitude)
    );

    formData.append(
      "longitude",
      String(data.location.longitude)
    );

    if (data.location.address) {
      formData.append(
        "locationName",
        data.location.address
      );
    }

    formData.append(
      "peopleAffected",
      String(data.peopleAffected)
    );

    /*
     * FastAPI list[str] = Form(...)
     *
     * Append each item separately.
     */
    for (const assistance of data.assistanceRequired) {
      formData.append(
        "assistanceRequired",
        assistance
      );
    }

    formData.append(
      "urgency",
      data.urgency
    );

    const response =
      await api.post<ReliefCreateResponse>(
        "/relief/",
        formData
      );

    const created =
      await getReliefRequestById(
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

export async function getReliefRequests(): Promise<
  ReliefRequest[]
> {
  try {
    const response =
      await api.get<ReliefListResponse>(
        "/relief/"
      );

    return (
      response.data.requests ?? []
    ).map(mapBackendRelief);
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
    const response =
      await api.get<{
        success: boolean;
        request: BackendReliefRequest;
      }>(
        `/relief/${requestId}`
      );

    if (!response.data.request) {
      return null;
    }

    return mapBackendRelief(
      response.data.request
    );
  } catch {
    return null;
  }
}

/* =========================================================
   ASSIGN RESCUE TEAM
   Backend expects Form(...)
   ========================================================= */

export async function assignReliefRequest(
  requestId: string,
  organization: string,
  teamName: string,
  resources: string[],
  governmentNote?: string
): Promise<ReliefRequest> {
  try {
    const formData = new FormData();

    formData.append(
      "organization",
      organization
    );

    formData.append(
      "teamName",
      teamName
    );

    for (const resource of resources) {
      formData.append(
        "resources",
        resource
      );
    }

    if (governmentNote) {
      formData.append(
        "governmentNote",
        governmentNote
      );
    }

    const response =
      await api.patch<ReliefAssignResponse>(
        `/relief/${requestId}/assign`,
        formData
      );

    return mapBackendRelief(
      response.data.request
    );
  } catch (error) {
    throw toApiError(error);
  }
}

/* =========================================================
   UPDATE STATUS
   ========================================================= */

export async function updateReliefStatus(
  requestId: string,
  status: string,
  governmentNote?: string
): Promise<ReliefRequest> {
  try {
    const formData = new FormData();

    formData.append(
      "status",
      status
    );

    if (governmentNote) {
      formData.append(
        "governmentNote",
        governmentNote
      );
    }

    const response =
      await api.patch<ReliefStatusResponse>(
        `/relief/${requestId}/status`,
        formData
      );

    return mapBackendRelief(
      response.data.request
    );
  } catch (error) {
    throw toApiError(error);
  }
}

/* =========================================================
   DELETE RELIEF REQUEST
   ========================================================= */

export async function deleteReliefRequest(
  requestId: string
): Promise<boolean> {
  try {
    await api.delete(`/relief/${requestId}`);
    return true;
  } catch (error) {
    throw toApiError(error);
  }
}

/* =========================================================
   LEGACY API
   ========================================================= */

export async function getRescueRequests(): Promise<
  ReliefRequest[]
> {
  return getReliefRequests();
}

/* =========================================================
   LEGACY SUBMIT RESCUE REQUEST
   ========================================================= */

export async function submitRescueRequest(
  data: {
    type?: string;
    description: string;
    location?: string;
    peopleCount?: number;
    urgency?: string;
  }
): Promise<ReliefRequest> {
  const reliefData: ReliefRequestCreate = {
    title:
      data.type ??
      "Rescue Request",

    description:
      data.description,

    location: {
      latitude: 19.8135,
      longitude: 85.8312,
      address:
        data.location ??
        "Puri",
    },

    peopleAffected:
      data.peopleCount ??
      1,

    assistanceRequired: [
      data.type ??
        "Evacuation",
    ],

    urgency:
      data.urgency ??
      "High",

    username:
      "anonymous",
  };

  return createReliefRequest(
    reliefData
  );
}