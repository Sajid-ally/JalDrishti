from fastapi import APIRouter, Query

from app.location.service import (
    searchLocation,
    reverseGeocode,
    getLocationAnalysis,
    getNearbyHotspots
)


router = APIRouter(
    prefix="/location",
    tags=["Location"]
)


# =========================================================
# SEARCH LOCATION
# =========================================================

@router.get("/search")
async def search(
    query: str = Query(
        ...,
        min_length=2,
        description="Location name, city, district, state or locality"
    )
):

    print(
        "LOCATION SEARCH REQUEST:",
        query
    )

    results = await searchLocation(
        query
    )

    if not results:

        return {
            "count": 0,
            "message": (
                "Location not found. "
                "Try adding the city, district, "
                "or state."
            ),
            "results": []
        }

    return {
        "count": len(results),
        "results": results
    }


# =========================================================
# REVERSE GEOCODING
#
# LATITUDE + LONGITUDE
#        ↓
# STATE / DISTRICT / CITY / LOCALITY
# =========================================================

@router.get("/reverse")
async def reverseLocation(
    latitude: float = Query(...),
    longitude: float = Query(...)
):

    print(
        "REVERSE LOCATION REQUEST:",
        latitude,
        longitude
    )

    location = await reverseGeocode(
        latitude,
        longitude
    )

    return {
        "success": True,
        "location": location
    }


# =========================================================
# LOCATION ANALYSIS
#
# SEARCH LOCATION
#        ↓
# GET COORDINATES
#        ↓
# FIND NEARBY REPORTS
#        ↓
# FIND NEARBY HOTSPOTS
# =========================================================

@router.get("/analyze")
async def analyzeLocation(
    query: str = Query(
        ...,
        min_length=2,
        description="Location to analyze"
    ),

    radiusKm: float = Query(
        5,
        gt=0,
        le=100,
        description="Search radius in kilometres"
    ),

    category: str = Query(
        None,
        description="Optional water-related problem category"
    )
):

    print(
        "LOCATION ANALYSIS REQUEST:",
        query
    )

    # -----------------------------------------------------
    # SEARCH LOCATION
    # -----------------------------------------------------

    locations = await searchLocation(
        query
    )

    if not locations:

        return {
            "count": 0,
            "message": "Location not found",
            "results": []
        }

    # -----------------------------------------------------
    # USE BEST MATCH
    # -----------------------------------------------------

    location = locations[0]

    latitude = location[
        "latitude"
    ]

    longitude = location[
        "longitude"
    ]

    # -----------------------------------------------------
    # FIND NEARBY REPORTS
    # -----------------------------------------------------

    nearbyReports = await getLocationAnalysis(
        latitude,
        longitude,
        radiusKm,
        category
    )

    # -----------------------------------------------------
    # FIND NEARBY HOTSPOTS
    #
    # IMPORTANT:
    # Pass category here as well.
    # -----------------------------------------------------

    nearbyHotspots = await getNearbyHotspots(
        latitude,
        longitude,
        radiusKm,
        category
    )

    # -----------------------------------------------------
    # FINAL RESPONSE
    # -----------------------------------------------------

    return {

        "location": location,

        "radiusKm": radiusKm,

        "category": category,

        "reportCount": len(
            nearbyReports
        ),

        "hotspotCount": len(
            nearbyHotspots
        ),

        "reports": nearbyReports,

        "hotspots": nearbyHotspots
    }