import httpx
import math

from app.database import database


# =========================================================
# SEARCH LOCATION
# =========================================================

async def searchLocation(query: str):

    print("SEARCHING LOCATION:", query)

    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": query,
        "format": "json",
        "limit": 5
    }

    headers = {
        "User-Agent": "OceanShield/1.0"
    }

    async with httpx.AsyncClient() as client:

        response = await client.get(
            url,
            params=params,
            headers=headers
        )

    response.raise_for_status()

    data = response.json()

    results = []

    for location in data:

        results.append({
            "name": location.get("display_name"),
            "latitude": float(location["lat"]),
            "longitude": float(location["lon"])
        })

    print("LOCATIONS FOUND:", len(results))

    return results


# =========================================================
# LOCATION ANALYSIS
# =========================================================

async def getLocationAnalysis(
    latitude: float,
    longitude: float,
    radiusKm: float = 5,
    category: str = None
):

    print("ANALYZING LOCATION")

    print("LATITUDE:", latitude)
    print("LONGITUDE:", longitude)
    print("RADIUS:", radiusKm)
    print("CATEGORY:", category)

    query = {}

    # -----------------------------------------------------
    # CATEGORY FILTER
    # -----------------------------------------------------

    if category:

        query = {
            "$or": [
                {
                    "mlAnalysis.category": {
                        "$regex": f"^{category}$",
                        "$options": "i"
                    }
                },
                {
                    "category": {
                        "$regex": f"^{category}$",
                        "$options": "i"
                    }
                }
            ]
        }

    print("LOCATION QUERY:", query)

    cursor = database.reports.find(query)

    nearbyReports = []

    async for report in cursor:

        # -------------------------------------------------
        # GET LOCATION
        # -------------------------------------------------

        if "location" in report:

            reportLatitude = report["location"].get(
                "latitude"
            )

            reportLongitude = report["location"].get(
                "longitude"
            )

        else:

            reportLatitude = report.get("latitude")
            reportLongitude = report.get("longitude")

        # -------------------------------------------------
        # IGNORE REPORTS WITHOUT LOCATION
        # -------------------------------------------------

        if (
            reportLatitude is None
            or reportLongitude is None
        ):
            continue

        reportLatitude = float(reportLatitude)
        reportLongitude = float(reportLongitude)

        # -------------------------------------------------
        # CALCULATE DISTANCE
        # -------------------------------------------------

        latitudeDifference = (
            reportLatitude - latitude
        )

        longitudeDifference = (
            reportLongitude - longitude
        )

        distanceKm = math.sqrt(
            (latitudeDifference * 111) ** 2
            +
            (
                longitudeDifference
                * 111
                * math.cos(
                    math.radians(latitude)
                )
            ) ** 2
        )

        # -------------------------------------------------
        # ADD REPORT IF WITHIN RADIUS
        # -------------------------------------------------

        if distanceKm <= radiusKm:

            report["id"] = str(
                report["_id"]
            )

            del report["_id"]

            report["distanceKm"] = round(
                distanceKm,
                2
            )

            nearbyReports.append(report)

    print(
        "NEARBY REPORTS FOUND:",
        len(nearbyReports)
    )

    return nearbyReports


# =========================================================
# NEARBY HOTSPOTS
# =========================================================

async def getNearbyHotspots(
    latitude: float,
    longitude: float,
    radiusKm: float = 5,
    category: str = None
):

    print("SEARCHING NEARBY HOTSPOTS")

    print("HOTSPOT CATEGORY:", category)

    # -----------------------------------------------------
    # Import here to avoid circular import
    # -----------------------------------------------------

    from app.reports.service import getHotspots

    # -----------------------------------------------------
    # Get hotspots
    # Category is passed to hotspot calculation
    # -----------------------------------------------------

    allHotspots = await getHotspots(category)

    nearbyHotspots = []

    # -----------------------------------------------------
    # Check every hotspot
    # -----------------------------------------------------

    for hotspot in allHotspots:

        hotspotLatitude = float(
            hotspot["latitude"]
        )

        hotspotLongitude = float(
            hotspot["longitude"]
        )

        latitudeDifference = (
            hotspotLatitude - latitude
        )

        longitudeDifference = (
            hotspotLongitude - longitude
        )

        # -------------------------------------------------
        # Calculate distance
        # -------------------------------------------------

        distanceKm = math.sqrt(
            (latitudeDifference * 111) ** 2
            +
            (
                longitudeDifference
                * 111
                * math.cos(
                    math.radians(latitude)
                )
            ) ** 2
        )

        # -------------------------------------------------
        # Keep hotspot if inside radius
        # -------------------------------------------------

        if distanceKm <= radiusKm:

            hotspot["distanceKm"] = round(
                distanceKm,
                2
            )

            nearbyHotspots.append(hotspot)

    print(
        "NEARBY HOTSPOTS FOUND:",
        len(nearbyHotspots)
    )

    return nearbyHotspots