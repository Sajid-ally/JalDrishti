import { useState } from "react";

interface Coordinates {
lat: number;
lng: number;
}

export function useGeolocation() {
const [coords, setCoords] = useState<Coordinates | null>(null);
const [loading, setLoading] = useState(false);

const request = () =>
new Promise<Coordinates>((resolve, reject) => {
if (!navigator.geolocation) {
reject(new Error("Geolocation is not supported"));
return;
}


  setLoading(true);

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setCoords(location);
      setLoading(false);
      resolve(location);
    },
    (error) => {
      console.error("Geolocation error:", error);
      setLoading(false);
      reject(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
});


return {
coords,
loading,
request,
};
}
