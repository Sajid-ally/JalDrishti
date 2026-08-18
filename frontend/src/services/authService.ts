import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../config/firebase";
import api, { toApiError } from "./api";
import { STORAGE_KEYS } from "../utils/constants";
import type { UserRole } from "../context/AuthContext";

export interface AuthUser {
  id: string;
  firebaseUid?: string;
  name: string;
  email: string;
  role: UserRole;
}

interface BackendAuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
}

export async function loginUser(
  email: string,
  password: string,
  role: UserRole = "citizen"
): Promise<{ user: AuthUser; token: string }> {
  let firebaseToken: string | undefined = undefined;

  if (isFirebaseConfigured) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      firebaseToken = await userCredential.user.getIdToken();
    } catch (fbErr) {
      console.warn("[AUTH] Firebase client sign-in note:", fbErr);
    }
  }

  try {
    const response = await api.post<BackendAuthResponse>("/auth/login", {
      email,
      password,
      role,
      firebaseToken,
    });

    const { user, token } = response.data;

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

    return { user, token };
  } catch (error: any) {
    if (error?.code === "ERR_NETWORK" || error?.message?.includes("Network Error")) {
      throw new Error("Backend server is not running on port 8000. Please start the backend with `uvicorn app.main:app --port 8000`.");
    }
    throw toApiError(error);
  }
}

export async function signupUser(
  name: string,
  email: string,
  password: string,
  role: UserRole = "citizen"
): Promise<{ user: AuthUser; token: string }> {
  let firebaseToken: string | undefined = undefined;

  if (isFirebaseConfigured) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      firebaseToken = await userCredential.user.getIdToken();
    } catch (fbErr) {
      console.warn("[AUTH] Firebase client sign-up note:", fbErr);
    }
  }

  try {
    const response = await api.post<BackendAuthResponse>("/auth/signup", {
      name,
      email,
      password,
      role,
      firebaseToken,
    });

    const { user, token } = response.data;

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

    return { user, token };
  } catch (error: any) {
    if (error?.code === "ERR_NETWORK" || error?.message?.includes("Network Error")) {
      throw new Error("Backend server is not running on port 8000. Please start the backend with `uvicorn app.main:app --port 8000`.");
    }
    throw toApiError(error);
  }
}

export async function loginWithGoogle(
  role: UserRole = "citizen"
): Promise<{ user: AuthUser; token: string }> {
  try {
    let firebaseUid = `google-${Date.now()}`;
    let email = "";
    let name = "Google User";
    let firebaseToken: string | undefined = undefined;

    if (isFirebaseConfigured) {
      try {
        const userCredential = await signInWithPopup(auth, googleProvider);
        firebaseToken = await userCredential.user.getIdToken();
        const fbUser = userCredential.user;
        firebaseUid = fbUser.uid;
        email = fbUser.email || "";
        name = fbUser.displayName || fbUser.email?.split("@")[0] || "Google User";
      } catch (popupErr: any) {
        console.warn("[AUTH] Firebase popup note:", popupErr);
        if (popupErr?.code === "auth/popup-closed-by-user") {
          throw new Error("Google Sign-In was cancelled.");
        }
      }
    }

    if (!email) {
      // Fallback for prompt or dev testing if popup didn't supply email
      email = prompt("Enter your Google Account Email to connect with MongoDB Atlas:", "user@gmail.com") || "";
      if (!email) throw new Error("Google Sign-In cancelled.");
      name = email.split("@")[0];
    }

    const response = await api.post<BackendAuthResponse>("/auth/sync", {
      firebaseUid,
      email,
      name,
      role,
      firebaseToken,
    });

    const { user, token } = response.data;

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

    return { user, token };
  } catch (error: any) {
    if (error?.code === "ERR_NETWORK" || error?.message?.includes("Network Error")) {
      throw new Error("Backend server is not running on port 8000. Please start the backend with `uvicorn app.main:app --port 8000`.");
    }
    throw toApiError(error);
  }
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await api.post<{ success: boolean; message: string }>("/auth/forgot-password", { email });
    return res.data;
  } catch (error: any) {
    if (error?.code === "ERR_NETWORK" || error?.message?.includes("Network Error")) {
      throw new Error("Backend server is not running on port 8000. Please start the backend with `uvicorn app.main:app --port 8000`.");
    }
    throw toApiError(error);
  }
}

export async function resetUserPassword(
  email: string,
  newPassword: string
): Promise<{ user: AuthUser; token: string }> {
  try {
    const res = await api.post<BackendAuthResponse>("/auth/reset-password", {
      email,
      newPassword,
    });
    const { user, token } = res.data;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    return { user, token };
  } catch (error: any) {
    if (error?.code === "ERR_NETWORK" || error?.message?.includes("Network Error")) {
      throw new Error("Backend server is not running on port 8000. Please start the backend with `uvicorn app.main:app --port 8000`.");
    }
    throw toApiError(error);
  }
}

export async function updateUserProfile(profileData: {
  name?: string;
  phone?: string;
  department?: string;
  designation?: string;
  governmentId?: string;
  location?: string;
  photoUrl?: string;
}): Promise<{ user: AuthUser; token?: string }> {
  try {
    const res = await api.patch<{ success: boolean; user: AuthUser; token?: string }>("/auth/profile", profileData);
    if (res.data.user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data.user));
      if (res.data.token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.data.token);
      }
      return { user: res.data.user, token: res.data.token };
    }
  } catch (err) {
    console.warn("[AUTH] Profile remote sync note:", err);
  }

  // Fallback to local storage
  const stored = localStorage.getItem(STORAGE_KEYS.USER);
  const current: AuthUser = stored ? JSON.parse(stored) : { id: "1", name: "", email: "", role: "citizen" };
  const updated = { ...current, ...profileData };
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
  return { user: updated };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (!token) return null;

  try {
    const response = await api.get<{ success: boolean; user: AuthUser }>("/auth/me");
    if (response.data.success && response.data.user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
      return response.data.user;
    }
  } catch (error) {
    console.warn("[AUTH] Session check note:", error);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
  return null;
}

export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("[AUTH] Firebase signout note:", e);
    }
  }
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
}
