export const APP_NAME = "JalDrishti";
export const APP_TAGLINE =
  "See it. Report it. Improve it. — Real-time coastal disaster reporting and response.";

export const STORAGE_KEYS = {
  USER: "coastaleye_user",
  AUTH_TOKEN: "coastaleye_token",
} as const;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
