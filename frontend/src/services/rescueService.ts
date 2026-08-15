import { API_BASE } from "./api";
import type { RescueRequestItem } from "../types/rescue";

// =========================================================
// GET ALL RESCUE REQUESTS
// =========================================================

export async function getRescueRequests(): Promise<RescueRequestItem[]> {
const res = await fetch(`${API_BASE}/relief/`);

if (!res.ok) {
throw new Error("Failed to fetch rescue requests");
}

const data = await res.json();
return data.requests ?? [];
}

// =========================================================
// SUBMIT RESCUE REQUEST
// =========================================================

export async function submitRescueRequest(data: {
disasterType: string;
description: string;
latitude: number;
longitude: number;
locationName?: string;
peopleAffected: number;
assistanceRequired: string[];
urgency: string;
}) {
const formData = new FormData();

formData.append("disasterType", data.disasterType);
formData.append("description", data.description);
formData.append("latitude", String(data.latitude));
formData.append("longitude", String(data.longitude));

if (data.locationName) {
formData.append("locationName", data.locationName);
}

formData.append("peopleAffected", String(data.peopleAffected));

data.assistanceRequired.forEach((item) => {
formData.append("assistanceRequired", item);
});

formData.append("urgency", data.urgency);

const res = await fetch(`${API_BASE}/relief/`, {
method: "POST",
body: formData,
});

if (!res.ok) {
throw new Error("Failed to submit rescue request");
}

return res.json();
}

// =========================================================
// UPDATE RELIEF STATUS (Government)
// =========================================================

export async function updateReliefStatus(
requestId: string,
status: "Pending" | "Assigned" | "Completed" | "Rejected",
governmentNote?: string
) {
const formData = new FormData();

formData.append("status", status);

if (governmentNote) {
formData.append("governmentNote", governmentNote);
}

const res = await fetch(`${API_BASE}/relief/${requestId}/status`, {
method: "PATCH",
body: formData,
});

if (!res.ok) {
throw new Error("Failed to update relief status");
}

return res.json();
}

// =========================================================
// ASSIGN RESCUE TEAM (Government)
// =========================================================

export async function assignRescueTeam(data: {
requestId: string;
organization: string;
teamName: string;
resources: string[];
governmentNote?: string;
}) {
const formData = new FormData();

formData.append("organization", data.organization);
formData.append("teamName", data.teamName);

data.resources.forEach((resource) => {
formData.append("resources", resource);
});

if (data.governmentNote) {
formData.append("governmentNote", data.governmentNote);
}

const res = await fetch(`${API_BASE}/relief/${data.requestId}/assign`, {
method: "PATCH",
body: formData,
});

if (!res.ok) {
throw new Error("Failed to assign rescue team");
}

return res.json();
}
