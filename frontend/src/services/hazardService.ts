// services/hazardService.ts
//
// Mock data service for hazard reports and map locations.
// TODO: Replace all mock data and functions with real API calls once
// the backend contract is defined.
//
// Expected backend endpoints (to be confirmed):
//   GET  /api/reports            → HazardReport[]
//   GET  /api/reports/:id        → HazardReport
//   POST /api/reports/:id/verify → { status: "verified" | "rejected" }
//   POST /api/reports/:id/publish → { status: "published" }
//   GET  /api/map/hazards        → HazardLocation[]

import type { HazardReport, HazardType, Severity, ReportStatus } from "../types/hazard";

export type MapIssueType = HazardType | "waterlogging" | "sewage" | "water_quality" | "pond" | "lake";

// ─────────────────────────────────────────────────────────────────────────────
// Map location type (used by LiveMap component)
// ─────────────────────────────────────────────────────────────────────────────

export interface HazardLocation {
  id: string;
  latitude: number;
  longitude: number;
  hazardType: MapIssueType;
  severity: Severity;
  status: ReportStatus;
  placeName?: string;
  state: string;
  district: string;
  locality: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// News / advisory feed item (used by Citizen Dashboard)
// ─────────────────────────────────────────────────────────────────────────────

export interface NewsFeedItem {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  issuedAt: string; // ISO timestamp
  source: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock news feed
// TODO: fetch from GET /api/advisories
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_NEWS_FEED: NewsFeedItem[] = [
  {
    id: "ADV-001",
    title: "Coastal Flood Warning — Puri District",
    body: "Heavy rain forecast over the next 48 hours. Sea levels are expected to rise 0.8–1.2 m above normal at Puri beach. Residents near the coastline should move to higher ground.",
    severity: "high",
    issuedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    source: "INCOIS",
  },
  {
    id: "ADV-002",
    title: "High Wave Advisory — Bay of Bengal",
    body: "Significant wave heights of 3–4 m are likely along the Odisha coast. Fishermen are advised not to venture into the sea for the next 24 hours.",
    severity: "moderate",
    issuedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    source: "IMD Bhubaneswar",
  },
  {
    id: "ADV-003",
    title: "Heavy Rainfall Warning",
    body: "Isolated heavy to very heavy rainfall expected over coastal Odisha. Low-lying areas may experience water-logging. Keep emergency kits ready.",
    severity: "high",
    issuedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    source: "Odisha SDMA",
  },
  {
    id: "ADV-004",
    title: "Flood Advisory — Mahanadi Catchment",
    body: "Water level at Mundali barrage is at warning level. Downstream areas including parts of Cuttack and Puri districts may face flooding in the next 12 hours.",
    severity: "critical",
    issuedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    source: "OSDMA",
  },
  {
    id: "ADV-005",
    title: "Government Emergency Announcement",
    body: "NDRF teams have been pre-positioned in Puri and Balasore districts. Emergency helpline: 1800-345-6789. Evacuation centres are operational at all municipal schools.",
    severity: "high",
    issuedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    source: "Govt. of Odisha",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock hazard reports (used by Government VerifyReports page)
// TODO: fetch from GET /api/reports
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_HAZARD_REPORTS: HazardReport[] = [
  {
    id: "RPT-001",
    type: "flood",
    severity: "high",
    status: "pending",
    location: { lat: 19.8135, lng: 85.8312 },
    placeName: "Puri Beach, Main Road",
    description: "Water is entering houses near the beach. Roads are submerged up to 1 ft. Several families need evacuation.",
    reportedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    reportedBy: "citizen_423",
    aiConfidence: 0.81,
  },
  {
    id: "RPT-002",
    type: "high_waves",
    severity: "moderate",
    status: "pending",
    location: { lat: 19.7996, lng: 85.8221 },
    placeName: "Swargadwar Beach, Puri",
    description: "Unusually high waves observed at the Swargadwar ghat area. Pilgrims are ignoring warnings.",
    reportedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reportedBy: "citizen_117",
    aiConfidence: 0.74,
  },
  {
    id: "RPT-003",
    type: "coastal_erosion",
    severity: "moderate",
    status: "pending",
    location: { lat: 19.8250, lng: 85.8450 },
    placeName: "Pentakota, Puri",
    description: "Significant shoreline erosion noticed after last night's storm. Sand dunes have collapsed.",
    reportedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    reportedBy: "citizen_089",
    aiConfidence: 0.68,
  },
  {
    id: "RPT-004",
    type: "storm_surge",
    severity: "critical",
    status: "verified",
    location: { lat: 19.7900, lng: 85.8150 },
    placeName: "Balighai, Puri",
    description: "Storm surge of approximately 1.5m above normal tide recorded. Coastal homes flooded.",
    reportedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    reportedBy: "citizen_302",
    aiConfidence: 0.91,
    verifiedBy: "officer_gov01",
  },
  {
    id: "RPT-005",
    type: "flood",
    severity: "low",
    status: "rejected",
    location: { lat: 19.8200, lng: 85.8300 },
    placeName: "Puri Town, Market Area",
    description: "Minor waterlogging at the main market. Normal monsoon accumulation.",
    reportedAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
    reportedBy: "citizen_511",
    aiConfidence: 0.42,
    verifiedBy: "officer_gov01",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock map hazard locations (used by LiveMap component)
// TODO: fetch from GET /api/map/hazards
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_HAZARD_LOCATIONS: HazardLocation[] = [
  {
    id: "LOC-001",
    latitude: 19.8135,
    longitude: 85.8312,
    hazardType: "flood",
    severity: "high",
    status: "verified",
    placeName: "Puri Beach",
    state: "Odisha", district: "Puri", locality: "Puri Beach",
  },
  {
    id: "LOC-002",
    latitude: 19.7996,
    longitude: 85.8221,
    hazardType: "high_waves",
    severity: "moderate",
    status: "pending",
    placeName: "Swargadwar",
    state: "Odisha", district: "Puri", locality: "Swargadwar",
  },
  {
    id: "LOC-003",
    latitude: 19.8250,
    longitude: 85.8450,
    hazardType: "coastal_erosion",
    severity: "moderate",
    status: "pending",
    placeName: "Pentakota",
    state: "Odisha", district: "Puri", locality: "Pentakota",
  },
  {
    id: "LOC-004",
    latitude: 19.7900,
    longitude: 85.8150,
    hazardType: "storm_surge",
    severity: "critical",
    status: "verified",
    placeName: "Balighai",
    state: "Odisha", district: "Puri", locality: "Balighai",
  },
  {
    id: "LOC-005",
    latitude: 19.8400,
    longitude: 85.8200,
    hazardType: "flood",
    severity: "moderate",
    status: "pending",
    placeName: "Brahmagiri",
    state: "Odisha", district: "Puri", locality: "Brahmagiri",
  },
  {
    id: "LOC-006",
    latitude: 19.8050,
    longitude: 85.8380,
    hazardType: "coastal_damage",
    severity: "low",
    status: "pending",
    placeName: "Chakratirtha Road",
    state: "Odisha", district: "Puri", locality: "Chakratirtha Road",
  },
  { id: "LOC-007", latitude: 19.8072, longitude: 85.8278, hazardType: "waterlogging", severity: "high", status: "verified", placeName: "Grand Road", state: "Odisha", district: "Puri", locality: "Grand Road" },
  { id: "LOC-008", latitude: 19.8158, longitude: 85.8389, hazardType: "sewage", severity: "moderate", status: "pending", placeName: "Baliapanda Drain", state: "Odisha", district: "Puri", locality: "Baliapanda" },
  { id: "LOC-009", latitude: 19.8305, longitude: 85.8492, hazardType: "water_quality", severity: "high", status: "verified", placeName: "Narendra Tank", state: "Odisha", district: "Puri", locality: "Narendra Tank" },
  { id: "LOC-010", latitude: 20.2961, longitude: 85.8245, hazardType: "pond", severity: "low", status: "verified", placeName: "Bindu Sagar", state: "Odisha", district: "Khordha", locality: "Old Town" },
  { id: "LOC-011", latitude: 20.2701, longitude: 85.8398, hazardType: "lake", severity: "moderate", status: "pending", placeName: "Kanjia Lake", state: "Odisha", district: "Khordha", locality: "Nandankanan" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Rescue teams (used by Government RescueRequests page)
// TODO: fetch from GET /api/rescue-teams
// ─────────────────────────────────────────────────────────────────────────────

export const RESCUE_TEAMS = [
  "NDRF",
  "SDRF",
  "Coast Guard",
  "Local Emergency Response",
  "Medical Response",
  "Fire & Rescue",
] as const;

export type RescueTeam = typeof RESCUE_TEAMS[number];
