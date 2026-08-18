import httpx
from typing import Dict, Any


async def reverseGeocode(lat: float, lon: float) -> Dict[str, Any]:
    """
    Reverse geocodes latitude & longitude into structured administrative location data,
    extracting precise road, neighborhood, suburb, city, district, and state.
    """
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&zoom=18&addressdetails=1&format=json"
        headers = {"User-Agent": "JalDrishti/1.0 (water-safety-app@jaldrishti.in)"}

        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                address = data.get("address", {})
                display_name = data.get("display_name", "")

                state = address.get("state") or ""
                district = (
                    address.get("state_district")
                    or address.get("district")
                    or address.get("county")
                    or address.get("city_district")
                    or ""
                )
                city = (
                    address.get("city")
                    or address.get("town")
                    or address.get("municipality")
                    or address.get("city_district")
                    or address.get("village")
                    or ""
                )

                # Granular area and road identification
                road = address.get("road") or address.get("street") or address.get("pedestrian") or address.get("highway") or ""
                suburb = address.get("suburb") or address.get("quarter") or address.get("residential") or address.get("commercial") or ""
                neighbourhood = address.get("neighbourhood") or address.get("subdistrict") or address.get("hamlet") or address.get("village") or ""

                # Build locality from finest elements
                locality_parts = [p for p in [road, neighbourhood, suburb] if p]
                if locality_parts:
                    locality = ", ".join(locality_parts[:2])
                else:
                    locality = suburb or neighbourhood or road or ""

                # Avoid setting locality equal to city name
                if locality.strip().lower() == city.strip().lower():
                    locality = road or suburb or neighbourhood or ""

                parts = [p for p in [locality, city, district, state] if p]
                formatted = display_name if display_name else (", ".join(parts) if parts else f"Location ({lat:.4f}, {lon:.4f})")

                return {
                    "state": state,
                    "district": district,
                    "city": city,
                    "locality": locality,
                    "road": road,
                    "suburb": suburb,
                    "neighbourhood": neighbourhood,
                    "formattedAddress": formatted,
                    "displayName": display_name,
                }
    except Exception as e:
        print(f"[GEOCODE] Reverse geocode error for ({lat}, {lon}): {e}")

    return {
        "state": "",
        "district": "",
        "city": "",
        "locality": "",
        "road": "",
        "suburb": "",
        "neighbourhood": "",
        "formattedAddress": f"Coordinates: {lat:.4f}, {lon:.4f}",
        "displayName": f"Lat: {lat:.4f}, Lng: {lon:.4f}",
    }