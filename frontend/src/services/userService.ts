import type {
  CitizenUserProfile,
  GovernmentUserProfile,
} from "../types/user";
import { STORAGE_KEYS } from "../utils/constants";
import { updateUserProfile } from "./authService";

function getActiveUserFromStorage(): { id?: string; name?: string; email?: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export async function getCitizenProfile(): Promise<CitizenUserProfile> {
  const activeUser = getActiveUserFromStorage();
  const saved = localStorage.getItem("jaldrishti_citizen_profile");

  let base: CitizenUserProfile = {
    id: activeUser?.id || "USR-CITIZEN-01",
    name: activeUser?.name || "Citizen User",
    email: activeUser?.email || "citizen@jaldrishti.in",
    phone: "+91 98765 12345",
    location: "Monitored Area",
    photoUrl:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80",
    role: "citizen",
  };

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      base = { ...base, ...parsed };
      // Always prioritize active logged-in user name/email if saved hasn't customized it
      if (activeUser?.name) base.name = parsed.name || activeUser.name;
      if (activeUser?.email) base.email = parsed.email || activeUser.email;
    } catch {
      // fallback
    }
  }

  return base;
}

export async function updateCitizenProfile(
  profile: Partial<CitizenUserProfile>
): Promise<CitizenUserProfile> {
  const current = await getCitizenProfile();
  const updated = { ...current, ...profile };

  try {
    localStorage.setItem(
      "jaldrishti_citizen_profile",
      JSON.stringify(updated)
    );
  } catch (err) {
    console.warn("[USER SERVICE] Storage quota notice:", err);
  }

  // Sync with auth user and backend
  try {
    await updateUserProfile({
      name: updated.name,
      phone: updated.phone,
      location: updated.location,
      photoUrl: updated.photoUrl,
    });
  } catch (syncErr) {
    console.warn("[USER SERVICE] Remote sync notice:", syncErr);
  }

  return updated;
}

export async function getGovernmentProfile(): Promise<GovernmentUserProfile> {
  const activeUser = getActiveUserFromStorage();
  const saved = localStorage.getItem("jaldrishti_govt_profile");

  let base: GovernmentUserProfile = {
    id: activeUser?.id || "USR-GOVT-01",
    name: activeUser?.name || "Government Disaster Officer",
    governmentId: "GOV-IN-8842",
    department: "Coastal Disaster Response Authority (CDRA)",
    designation: "Senior Incident Commander",
    email: activeUser?.email || "official@jaldrishti.gov.in",
    phone: "+91 94321 00998",
    location: "Command Center Headquarters",
    photoUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80",
    role: "government",
  };

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      base = { ...base, ...parsed };
      if (activeUser?.name) base.name = parsed.name || activeUser.name;
      if (activeUser?.email) base.email = parsed.email || activeUser.email;
    } catch {
      // fallback
    }
  }

  return base;
}

export async function updateGovernmentProfile(
  profile: Partial<GovernmentUserProfile>
): Promise<GovernmentUserProfile> {
  const current = await getGovernmentProfile();
  const updated = { ...current, ...profile };

  try {
    localStorage.setItem(
      "jaldrishti_govt_profile",
      JSON.stringify(updated)
    );
  } catch (err) {
    console.warn("[USER SERVICE] Storage quota notice:", err);
  }

  // Sync with auth user and backend
  try {
    await updateUserProfile({
      name: updated.name,
      phone: updated.phone,
      department: updated.department,
      designation: updated.designation,
      governmentId: updated.governmentId,
      location: updated.location,
      photoUrl: updated.photoUrl,
    });
  } catch (syncErr) {
    console.warn("[USER SERVICE] Remote sync notice:", syncErr);
  }

  return updated;
}