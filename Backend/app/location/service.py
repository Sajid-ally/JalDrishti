import httpx
import math

from app.database import database


# =========================================================
# HELPER — NORMALIZE LOCATION ADDRESS
# =========================================================

def normalizeLocationAddress(address):
    """
    Convert Nominatim address fields into the standard
    CoastalEye location structure.
    """

    state = address.get("state")

    district = (
        address.get("state_district")
        or address.get("district")
        or address.get("county")
        or address.get("city_district")
    )

    city = (
        address.get("city")
        or address.get("town")
        or address.get("municipality")
        or address.get("village")
    )

    locality = (
        address.get("suburb")
        or address.get("neighbourhood")
        or address.get("quarter")
        or address.get("hamlet")
    )

    return {
        "state": state,
        "district": district,
        "city": city,
        "locality": locality
    }


# =========================================================
# HELPER — CLEAN REPORT FOR MAP
# =========================================================

def prepareMapReport(report, distanceKm=None):
    """
    Return only the information required by the new
    CoastalEye map architecture.

    Old validation architecture is intentionally removed.
    """

    reportId = str(
        report.get("_id")
        or report.get("id")
        or ""
    )

    location = report.get("location", {})

    cleanedReport = {
        "id": reportId,

        "username": report.get("username"),

        "title": report.get("title"),

        "description": report.get("description"),

        "imageUrl": report.get("imageUrl"),

        "category": (
            report.get("category")
            or report.get("mlAnalysis", {}).get("category")
        ),

        "priority": report.get(
            "priority",
            "medium"
        ),

        "status": (
            report.get("status")
            or report.get("reportStatus")
            or "submitted"
        ),

        "location": {
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
            "state": location.get("state"),
            "district": location.get("district"),
            "city": location.get("city"),
            "locality": location.get("locality")
        },

        "aiAnalysis": report.get(
            "aiAnalysis",
            {}
        ),

        "mlAnalysis": report.get(
            "mlAnalysis",
            {}
        ),

        "verification": report.get(
            "verification",
            {}
        ),

        "timeline": report.get(
            "timeline",
            []
        ),

        "createdAt": report.get(
            "createdAt"
        ),

        "updatedAt": report.get(
            "updatedAt"
        )
    }

    if distanceKm is not None:
        cleanedReport["distanceKm"] = round(
            distanceKm,
            2
        )

    return cleanedReport


# =========================================================
# SEARCH LOCATION
#
# TEXT
#   ↓
# STATE / DISTRICT / CITY / LOCALITY
#   ↓
# LATITUDE / LONGITUDE
# =========================================================

async def searchLocation(query: str):

    print("SEARCHING LOCATION:", query)

    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 5,
        "accept-language": "en"
    }

    headers = {
        "User-Agent": "CoastalEye/1.0"
    }

    async with httpx.AsyncClient(
        timeout=10.0
    ) as client:

        response = await client.get(
            url,
            params=params,
            headers=headers
        )

    response.raise_for_status()

    data = response.json()

    results = []

    for location in data:

        address = location.get(
            "address",
            {}
        )

        normalizedAddress = normalizeLocationAddress(
            address
        )

        results.append({

            "name": location.get(
                "display_name"
            ),

            "latitude": float(
                location["lat"]
            ),

            "longitude": float(
                location["lon"]
            ),

            "state": normalizedAddress[
                "state"
            ],

            "district": normalizedAddress[
                "district"
            ],

            "city": normalizedAddress[
                "city"
            ],

            "locality": normalizedAddress[
                "locality"
            ]
        })

    print(
        "LOCATIONS FOUND:",
        len(results)
    )

    return results


# =========================================================
# REVERSE GEOCODING
#
# LATITUDE + LONGITUDE
#        ↓
# STATE / DISTRICT / CITY / LOCALITY
# =========================================================

async def reverseGeocode(
    latitude: float,
    longitude: float
):

    print("REVERSE GEOCODING")
    print("LATITUDE:", latitude)
    print("LONGITUDE:", longitude)

    url = "https://nominatim.openstreetmap.org/reverse"

    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "jsonv2",
        "addressdetails": 1,
        "zoom": 18,
        "accept-language": "en"
    }

    headers = {
        "User-Agent": "CoastalEye/1.0"
    }

    async with httpx.AsyncClient(
        timeout=10.0
    ) as client:

        response = await client.get(
            url,
            params=params,
            headers=headers
        )

    response.raise_for_status()

    data = response.json()

    address = data.get(
        "address",
        {}
    )

    normalizedAddress = normalizeLocationAddress(
        address
    )

    result = {

        "latitude": latitude,

        "longitude": longitude,

        "state": normalizedAddress[
            "state"
        ],

        "district": normalizedAddress[
            "district"
        ],

        "city": normalizedAddress[
            "city"
        ],

        "locality": normalizedAddress[
            "locality"
        ],

        "displayName": data.get(
            "display_name"
        )
    }

    print(
        "REVERSE GEOCODING RESULT:",
        result
    )

    return result


# =========================================================
# LOCATION ANALYSIS
#
# LOCATION
#   ↓
# NEARBY REPORTS
#   ↓
# NEARBY HOTSPOTS
# =========================================================

async def getLocationAnalysis(
    latitude: float,
    longitude: float,
    radiusKm: float = 5,
    category: str = None
):

    print("ANALYZING LOCATION")

    print(
        "LATITUDE:",
        latitude
    )

    print(
        "LONGITUDE:",
        longitude
    )

    print(
        "RADIUS:",
        radiusKm
    )

    print(
        "CATEGORY:",
        category
    )

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

    print(
        "LOCATION QUERY:",
        query
    )

    cursor = database.reports.find(
        query
    )

    nearbyReports = []

    async for report in cursor:

        # -------------------------------------------------
        # GET REPORT LOCATION
        # -------------------------------------------------

        location = report.get(
            "location",
            {}
        )

        reportLatitude = location.get(
            "latitude"
        )

        reportLongitude = location.get(
            "longitude"
        )

        # -------------------------------------------------
        # FALLBACK FOR OLD REPORTS
        # -------------------------------------------------

        if reportLatitude is None:
            reportLatitude = report.get(
                "latitude"
            )

        if reportLongitude is None:
            reportLongitude = report.get(
                "longitude"
            )

        # -------------------------------------------------
        # IGNORE REPORTS WITHOUT COORDINATES
        # -------------------------------------------------

        if (
            reportLatitude is None
            or reportLongitude is None
        ):
            continue

        reportLatitude = float(
            reportLatitude
        )

        reportLongitude = float(
            reportLongitude
        )

        # -------------------------------------------------
        # HAVERSINE-LIKE DISTANCE CALCULATION
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
        # KEEP REPORT IF INSIDE RADIUS
        # -------------------------------------------------

        if distanceKm <= radiusKm:

            cleanedReport = prepareMapReport(
                report,
                distanceKm
            )

            nearbyReports.append(
                cleanedReport
            )

    # -----------------------------------------------------
    # SORT BY DISTANCE
    # -----------------------------------------------------

    nearbyReports.sort(
        key=lambda report:
        report.get(
            "distanceKm",
            999999
        )
    )

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

    print(
        "SEARCHING NEARBY HOTSPOTS"
    )

    print(
        "HOTSPOT CATEGORY:",
        category
    )

    # -----------------------------------------------------
    # Import here to avoid circular import
    # -----------------------------------------------------

    from app.reports.service import getHotspots

    # -----------------------------------------------------
    # IMPORTANT:
    # Pass category to hotspot calculation
    # -----------------------------------------------------

    allHotspots = await getHotspots(
        category
    )

    nearbyHotspots = []

    # -----------------------------------------------------
    # CHECK EVERY HOTSPOT
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
        # DISTANCE
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
        # KEEP HOTSPOT IF INSIDE RADIUS
        # -------------------------------------------------

        if distanceKm <= radiusKm:

            hotspot["distanceKm"] = round(
                distanceKm,
                2
            )

            nearbyHotspots.append(
                hotspot
            )

    # -----------------------------------------------------
    # SORT BY DISTANCE
    # -----------------------------------------------------

    nearbyHotspots.sort(
        key=lambda hotspot:
        hotspot.get(
            "distanceKm",
            999999
        )
    )

    print(
        "NEARBY HOTSPOTS FOUND:",
        len(nearbyHotspots)
    )

    return nearbyHotspots