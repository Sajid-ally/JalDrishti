export type RescueRequestStatus =
| "Pending"
| "Assigned"
| "Completed"
| "Rejected";

export interface AssignedTeam {
organization: string;
teamName: string;
resources: string[];
}

export interface RescueRequestItem {
id: string;

// Disaster type selected by the citizen
disasterType: string;

// Auto-generated title from backend
title: string;

description: string;

location: {
latitude: number;
longitude: number;
};

// Human-readable address
locationName?: string;

peopleAffected: number;

assistanceRequired: string[];

urgency: string;

status: RescueRequestStatus;

assignedTeam?: AssignedTeam | null;

governmentNote?: string | null;

createdAt: string;

updatedAt: string;

assignedAt?: string;
}
