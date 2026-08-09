from fastapi import APIRouter, Query

from app.location.service import (
    searchLocation,
    getLocationAnalysis,
    getNearbyHotspots
)

router = APIRouter(
    prefix="/location",
    tags=["Location"]
)


@router.get("/search")
async def search(
    query: str = Query(...)
):

    print("LOCATION SEARCH REQUEST:", query)

    results = await searchLocation(query)

    if not results:
        return {
            "count": 0,
            "message": "Location not found. Try adding the city, district, or state.",
            "results": []
        }

    return {
        "count": len(results),
        "results": results
    }
@router.get("/analyze")
async def analyzeLocation(
    query: str = Query(...),
    radiusKm: float = Query(5),
    category: str = Query(None)
):

    print("LOCATION ANALYSIS REQUEST:", query)

    # -----------------------------------------
    # SEARCH LOCATION
    # -----------------------------------------

    locations = await searchLocation(query)

    if not locations:

        return {
            "count": 0,
            "message": "Location not found",
            "results": []
        }

    location = locations[0]

    latitude = location["latitude"]
    longitude = location["longitude"]

    # -----------------------------------------
    # FIND NEARBY REPORTS
    # -----------------------------------------

    nearbyReports = await getLocationAnalysis(
    latitude,
    longitude,
    radiusKm,
    category
)

    # -----------------------------------------
    # FIND NEARBY HOTSPOTS
    # -----------------------------------------

    nearbyHotspots = await getNearbyHotspots(
        latitude,
        longitude,
        radiusKm
    )

    # -----------------------------------------
    # FINAL RESPONSE
    # -----------------------------------------

    return {
        "location": location,

        "radiusKm": radiusKm,

        "reportCount": len(nearbyReports),

        "hotspotCount": len(nearbyHotspots),

        "reports": nearbyReports,

        "hotspots": nearbyHotspots
    }