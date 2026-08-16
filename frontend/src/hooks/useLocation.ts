// src/hooks/useGeolocation.ts
import { useCallback, useState } from "react";
import type { GeoPoint } from "../types/hazard";

interface GeolocationState {
  coords: GeoPoint | null;
  loading: boolean;
  error: string | null;
}

/** Wraps the browser Geolocation API with loading/error state and a manual
 * `request()` trigger, since we don't want to prompt for location permission
 * until the citizen actually starts filling out a report. */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    loading: false,
    error: null,
  });

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ coords: null, loading: false, error: "Location isn't supported on this device." });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState({
          coords: null,
          loading: false,
          error:
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied. You can enter it manually."
              : "Couldn't get your location. Try again or enter it manually.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const setManualCoords = useCallback((coords: GeoPoint) => {
    setState({ coords, loading: false, error: null });
  }, []);

  return { ...state, request, setManualCoords };
}