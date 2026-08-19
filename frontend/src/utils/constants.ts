export const APP_NAME = "JalDrishti";

export const APP_TAGLINE =
  "See it. Report it. Improve it. — Real-time water hazard reporting and disaster response.";

export const STORAGE_KEYS = {
  USER: "jaldrishti_user",
  AUTH_TOKEN: "jaldrishti_token",
} as const;

const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL =
  isHttps && envBaseUrl && envBaseUrl.startsWith("http://")
    ? ""
    : (envBaseUrl ?? (typeof window !== "undefined" && isHttps ? "" : "http://localhost:8000"));


export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024;