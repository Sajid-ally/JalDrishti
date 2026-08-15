import httpx

async def reverseGeocode(lat: float, lon: float) -> dict:
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
    headers = {"User-Agent": "CoastalEye/1.0"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        data = resp.json()
        address = data.get("address", {})
        return {
            "city": address.get("city") or address.get("town") or address.get("village"),
            "state": address.get("state")
        }