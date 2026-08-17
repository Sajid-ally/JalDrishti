import api, { toApiError } from "./api";
import type { BackendMapResponse } from "../types/api";

export interface CitizenMapFilters {
  state?: string;
  district?: string;
  locality?: string;
}

export async function fetchCitizenMapData(
  filters: CitizenMapFilters = {}
): Promise<BackendMapResponse> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => Boolean(value))
  );

  try {
    const response = await api.get<BackendMapResponse>("/reports/map", { params });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}
