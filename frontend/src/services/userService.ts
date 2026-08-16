import type { CitizenUserProfile, GovernmentUserProfile } from "../types/user";

const MOCK_CITIZEN_PROFILE: CitizenUserProfile = {
  id: "USR-CITIZEN-01",
  name: "Sajid Ally",
  email: "sajid@jaldrishti.org",
  phone: "+91 98765 12345",
  location: "Puri Coastal District, Odisha",
  photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80",
  role: "citizen",
};

const MOCK_GOVT_PROFILE: GovernmentUserProfile = {
  id: "USR-GOVT-01",
  name: "Dr. Rajesh Sharma",
  governmentId: "GOV-OD-8842",
  department: "Coastal Disaster Response Authority (CDRA)",
  designation: "Senior Incident Commander",
  email: "r.sharma@cdra.gov.in",
  phone: "+91 94321 00998",
  location: "Bhubaneswar Control Headquarters",
  photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80",
  role: "government",
};

export async function getCitizenProfile(): Promise<CitizenUserProfile> {
  const saved = localStorage.getItem("coastaleye_citizen_profile");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return MOCK_CITIZEN_PROFILE;
}

export async function updateCitizenProfile(
  profile: Partial<CitizenUserProfile>
): Promise<CitizenUserProfile> {
  const current = await getCitizenProfile();
  const updated = { ...current, ...profile };
  localStorage.setItem("coastaleye_citizen_profile", JSON.stringify(updated));
  return updated;
}

export async function getGovernmentProfile(): Promise<GovernmentUserProfile> {
  const saved = localStorage.getItem("coastaleye_govt_profile");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return MOCK_GOVT_PROFILE;
}

export async function updateGovernmentProfile(
  profile: Partial<GovernmentUserProfile>
): Promise<GovernmentUserProfile> {
  const current = await getGovernmentProfile();
  const updated = { ...current, ...profile };
  localStorage.setItem("coastaleye_govt_profile", JSON.stringify(updated));
  return updated;
}
