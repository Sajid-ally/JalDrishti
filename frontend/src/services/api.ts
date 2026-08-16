import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "../utils/constants";
import { ApiError, type ApiErrorBody } from "../types/api";

const api = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  headers: {
    Accept: "application/json",
  },
});

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    const payload = axiosError.response?.data;
    const message = payload?.detail || payload?.error || payload?.message || axiosError.message;
    return new ApiError(message, axiosError.response?.status, payload?.error);
  }

  return new ApiError(error instanceof Error ? error.message : "An unexpected API error occurred.");
}

export default api;
