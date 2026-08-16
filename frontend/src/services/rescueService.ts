// frontend/src/services/rescueService.ts

import type {
  RescueRequestItem,
  RescueRequestStatus,
  RescueUrgency,
  SubmitRescueRequestData,
  AssignedRescueTeam,
} from "../types/rescue";

/*
 * CoastalEye backend base URL.
 *
 * If your .env already contains VITE_API_BASE_URL,
 * it will be used.
 *
 * Otherwise:
 * http://localhost:8000
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";


/* ============================================================
   BACKEND RESPONSE TYPES
   ============================================================ */

interface BackendLocation {
  latitude?: number;
  longitude?: number;

  lat?: number;
  lng?: number;

  address?: string;
  placeName?: string;
}


interface BackendAssignedTeam {
  organization?: string;
  teamName?: string;
  resources?: string[];
}


interface BackendRescueRequest {
  id?: string;
  _id?: string;

  title?: string;

  type?: string;
  disasterType?: string;

  description?: string;

  latitude?: number;
  longitude?: number;

  location?: BackendLocation;

  locationName?: string;
  address?: string;

  peopleCount?: number;
  peopleAffected?: number;

  assistanceRequired?: string[];

  urgency?: string;

  status?: string;

  photoUrl?: string;
  photo_url?: string;
  imageUrl?: string;

  createdAt?: string;
  submittedAt?: string;

  updatedAt?: string;
  lastUpdate?: string;

  estimatedResponse?: string;

  governmentNote?: string;

  assignedTeam?:
    | BackendAssignedTeam
    | string;
}


/* ============================================================
   GENERIC BACKEND RESPONSE
   ============================================================ */

interface BackendListResponse {
  requests?: BackendRescueRequest[];

  data?: BackendRescueRequest[];

  results?: BackendRescueRequest[];
}


interface BackendSingleResponse {
  request?: BackendRescueRequest;

  data?: BackendRescueRequest;
}


/* ============================================================
   URGENCY NORMALIZATION
   ============================================================ */

function normalizeUrgency(
  value?: string
): RescueUrgency {
  switch (
    value
      ?.trim()
      .toLowerCase()
  ) {
    case "low":
      return "Low";

    case "medium":
      return "Medium";

    case "high":
      return "High";

    case "critical":
      return "Critical";

    default:
      return "Medium";
  }
}


/* ============================================================
   STATUS NORMALIZATION
   ============================================================ */

function normalizeStatus(
  value?: string
): RescueRequestStatus {
  const normalized =
    value
      ?.trim()
      .toLowerCase()
      .replace(/-/g, "_");

  switch (normalized) {
    /*
     * Initial request
     */
    case "submitted":
    case "pending":
    case "pending_verification":
      return "Submitted";


    /*
     * Government review
     */
    case "under_review":
    case "under review":
      return "Under Review";


    /*
     * Department/team assignment
     */
    case "government_assigned":
    case "government assigned":
    case "assigned":
      return "Government Assigned";


    /*
     * Rescue team dispatched
     */
    case "rescue_team_dispatched":
    case "rescue team dispatched":
    case "dispatched":
      return "Rescue Team Dispatched";


    /*
     * Team is approaching
     */
    case "help_arriving":
    case "help arriving":
      return "Help Arriving";


    /*
     * Completed
     */
    case "resolved":
    case "completed":
      return "Resolved";


    /*
     * Rejected
     */
    case "rejected":
      return "Rejected";


    /*
     * Safe default
     */
    default:
      return "Submitted";
  }
}


/* ============================================================
   LOCATION NORMALIZATION
   ============================================================ */

function normalizeLocation(
  request: BackendRescueRequest
) {
  const latitude =
    request.location?.latitude ??
    request.location?.lat ??
    request.latitude ??
    0;

  const longitude =
    request.location?.longitude ??
    request.location?.lng ??
    request.longitude ??
    0;

  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
  };
}


/* ============================================================
   LOCATION NAME NORMALIZATION
   ============================================================ */

function normalizeLocationName(
  request: BackendRescueRequest,
  latitude: number,
  longitude: number
): string {
  return (
    request.locationName ||
    request.location?.address ||
    request.location?.placeName ||
    request.address ||
    `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
  );
}


/* ============================================================
   ASSIGNED TEAM NORMALIZATION
   ============================================================ */

function normalizeAssignedTeam(
  team:
    | BackendRescueRequest["assignedTeam"]
    | undefined
): AssignedRescueTeam | undefined {
  if (!team) {
    return undefined;
  }


  /*
   * Backend may currently return:
   *
   * assignedTeam: "NDRF Unit 7"
   *
   * Convert that into the frontend structure.
   */
  if (typeof team === "string") {
    return {
      organization:
        "Emergency Response",

      teamName: team,

      resources: [],
    };
  }


  return {
    organization:
      team.organization ||
      "Emergency Response",

    teamName:
      team.teamName ||
      "Assigned Rescue Team",

    resources:
      Array.isArray(
        team.resources
      )
        ? team.resources
        : [],
  };
}


/* ============================================================
   BACKEND → FRONTEND NORMALIZATION
   ============================================================ */

function normalizeRescueRequest(
  request: BackendRescueRequest
): RescueRequestItem {
  const id =
    request.id ||
    request._id ||
    `REQ-${Date.now()}`;


  const location =
    normalizeLocation(request);


  const locationName =
    normalizeLocationName(
      request,
      location.latitude,
      location.longitude
    );


  const type =
    request.type ||
    request.disasterType ||
    "Emergency Rescue";


  const title =
    request.title ||
    `${type} Rescue Request`;


  const description =
    request.description ||
    "Emergency rescue assistance requested.";


  const peopleCount =
    Number(
      request.peopleCount ??
      request.peopleAffected ??
      1
    );


  const assistanceRequired =
    Array.isArray(
      request.assistanceRequired
    )
      ? request.assistanceRequired
      : [];


  const createdAt =
    request.createdAt ||
    request.submittedAt ||
    new Date().toISOString();


  const lastUpdate =
    request.updatedAt ||
    request.lastUpdate ||
    createdAt;


  const photoUrl =
    request.photoUrl ||
    request.photo_url ||
    request.imageUrl;


  return {
    id,

    title,

    type,

    locationName,

    location,

    description,

    peopleCount,

    assistanceRequired,

    urgency:
      normalizeUrgency(
        request.urgency
      ),

    photoUrl,

    status:
      normalizeStatus(
        request.status
      ),

    createdAt,

    submittedAt:
      request.submittedAt ||
      createdAt,

    lastUpdate,

    assignedTeam:
      normalizeAssignedTeam(
        request.assignedTeam
      ),

    governmentNote:
      request.governmentNote,

    estimatedResponse:
      request.estimatedResponse,
  };
}


/* ============================================================
   EXTRACT LIST FROM BACKEND
   ============================================================ */

function extractRequestList(
  data:
    | BackendRescueRequest[]
    | BackendListResponse
): BackendRescueRequest[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(
      data.requests
    )
  ) {
    return data.requests;
  }

  if (
    Array.isArray(
      data.data
    )
  ) {
    return data.data;
  }

  if (
    Array.isArray(
      data.results
    )
  ) {
    return data.results;
  }

  return [];
}


/* ============================================================
   EXTRACT SINGLE REQUEST
   ============================================================ */

function extractSingleRequest(
  data:
    | BackendRescueRequest
    | BackendSingleResponse
): BackendRescueRequest {
  if (
    "request" in data &&
    data.request
  ) {
    return data.request;
  }

  if (
    "data" in data &&
    data.data
  ) {
    return data.data;
  }

  return data as BackendRescueRequest;
}


/* ============================================================
   GET ALL RESCUE REQUESTS
   ============================================================ */

export async function getRescueRequests(): Promise<
  RescueRequestItem[]
> {
  const response =
    await fetch(
      `${API_BASE_URL}/rescue`
    );


  if (!response.ok) {
    throw new Error(
      `Failed to fetch rescue requests (${response.status})`
    );
  }


  const data =
    (await response.json()) as
      | BackendRescueRequest[]
      | BackendListResponse;


  const requests =
    extractRequestList(data);


  return requests.map(
    normalizeRescueRequest
  );
}


/* ============================================================
   GET SINGLE RESCUE REQUEST
   ============================================================ */

export async function getRescueRequestById(
  id: string
): Promise<RescueRequestItem | null> {
  const response =
    await fetch(
      `${API_BASE_URL}/rescue/${encodeURIComponent(id)}`
    );


  if (response.status === 404) {
    return null;
  }


  if (!response.ok) {
    throw new Error(
      `Failed to fetch rescue request (${response.status})`
    );
  }


  const data =
    (await response.json()) as
      | BackendRescueRequest
      | BackendSingleResponse;


  return normalizeRescueRequest(
    extractSingleRequest(data)
  );
}


/* ============================================================
   SUBMIT RESCUE REQUEST
   ============================================================ */

export async function submitRescueRequest(
  request: SubmitRescueRequestData
): Promise<RescueRequestItem> {
  /*
   * Support both existing frontend names:
   *
   * type
   * disasterType
   */
  const type =
    request.type ||
    request.disasterType ||
    "Emergency Rescue";


  if (!request.description.trim()) {
    throw new Error(
      "Emergency description is required."
    );
  }


  if (
    request.peopleAffected < 1
  ) {
    throw new Error(
      "At least one affected person is required."
    );
  }


  if (
    request.assistanceRequired.length ===
    0
  ) {
    throw new Error(
      "Please select at least one assistance type."
    );
  }


  /*
   * Resolve location from either:
   *
   * request.location
   *
   * or
   *
   * latitude / longitude
   */
  const latitude =
    request.location?.latitude ??
    request.latitude;


  const longitude =
    request.location?.longitude ??
    request.longitude;


  const locationName =
    request.locationName ||
    `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;


  /*
   * FormData is used because the request
   * may contain an image.
   */
  const formData =
    new FormData();


  formData.append(
    "type",
    type
  );


  /*
   * Keep disasterType too for compatibility
   * with the existing backend if it expects it.
   */
  formData.append(
    "disasterType",
    type
  );


  if (request.title) {
    formData.append(
      "title",
      request.title
    );
  }


  formData.append(
    "description",
    request.description.trim()
  );


  formData.append(
    "latitude",
    String(latitude)
  );


  formData.append(
    "longitude",
    String(longitude)
  );


  formData.append(
    "locationName",
    locationName
  );


  formData.append(
    "peopleAffected",
    String(
      request.peopleAffected
    )
  );


  formData.append(
    "peopleCount",
    String(
      request.peopleAffected
    )
  );


  formData.append(
    "urgency",
    request.urgency
  );


  /*
   * Backend can parse this JSON string
   * into the assistance array.
   */
  formData.append(
    "assistanceRequired",
    JSON.stringify(
      request.assistanceRequired
    )
  );


  if (request.photo) {
    formData.append(
      "photo",
      request.photo
    );
  }


  const response =
    await fetch(
      `${API_BASE_URL}/rescue`,
      {
        method: "POST",
        body: formData,
      }
    );


  let data:
    | BackendRescueRequest
    | BackendSingleResponse
    | {
        message?: string;
        detail?: string;
      };


  try {
    data =
      await response.json();
  } catch {
    throw new Error(
      "Backend returned an invalid response."
    );
  }


  if (!response.ok) {
    const errorData =
      data as {
        message?: string;
        detail?: string;
      };


    throw new Error(
      errorData.detail ||
      errorData.message ||
      `Rescue request failed (${response.status})`
    );
  }


  const backendRequest =
    extractSingleRequest(
      data as
        | BackendRescueRequest
        | BackendSingleResponse
    );


  return normalizeRescueRequest(
    backendRequest
  );
}


/* ============================================================
   UPDATE RESCUE STATUS
   ============================================================ */

export async function updateRequestStatus(
  id: string,
  status: RescueRequestStatus,
  assignedTeam?: string,
  estimatedResponse?: string
): Promise<boolean> {
  const body: {
    status: RescueRequestStatus;
    assignedTeam?: string;
    estimatedResponse?: string;
  } = {
    status,
  };


  if (assignedTeam) {
    body.assignedTeam =
      assignedTeam;
  }


  if (estimatedResponse) {
    body.estimatedResponse =
      estimatedResponse;
  }


  const response =
    await fetch(
      `${API_BASE_URL}/rescue/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          body
        ),
      }
    );


  if (!response.ok) {
    throw new Error(
      `Failed to update rescue status (${response.status})`
    );
  }


  return true;
}