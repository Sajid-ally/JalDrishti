from fastapi import APIRouter

from app.validation.service import (
    createGovernmentAlert,
    getGovernmentAlerts,
    findGovernmentAlert,
    findNearbyReportEvidence,
    findSocialMediaEvidence,
    validateReport,
    getIncidentConfidence,
    saveIncidentConfidence,
    getReportHeatmapData,
    getIncidentHeatmapData
)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/government-alerts",
    tags=["Government Alerts"]
)


# =========================================================
# CREATE GOVERNMENT ALERT
# =========================================================

@router.post("/")
async def addGovernmentAlert(
    alertData: dict
):

    print("CREATING GOVERNMENT ALERT")

    insertedId = await createGovernmentAlert(
        alertData
    )

    return {
        "message": "Government alert created successfully",
        "alertId": str(insertedId)
    }


# =========================================================
# GET GOVERNMENT ALERTS
# =========================================================

@router.get("/")
async def fetchGovernmentAlerts():

    print("FETCHING GOVERNMENT ALERTS")

    alerts = await getGovernmentAlerts()

    return {
        "count": len(alerts),
        "alerts": alerts
    }


# =========================================================
# CHECK GOVERNMENT ALERT
# =========================================================

@router.get("/check")
async def checkGovernmentAlert(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 10
):

    print("CHECKING GOVERNMENT ALERT FROM API")

    alert = await findGovernmentAlert(
        latitude=latitude,
        longitude=longitude,
        category=category,
        radiusKm=radiusKm
    )

    if alert is None:

        return {
            "found": False,
            "message": "No matching government alert found"
        }

    return {
        "found": True,
        "alert": alert
    }


# =========================================================
# CHECK NEARBY REPORT EVIDENCE
# =========================================================

@router.get("/nearby-reports")
async def checkNearbyReportEvidence(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5
):

    print(
        "CHECKING NEARBY REPORTS FROM API"
    )

    evidence = await findNearbyReportEvidence(
        latitude=latitude,
        longitude=longitude,
        category=category,
        radiusKm=radiusKm
    )

    return {
        "latitude": latitude,
        "longitude": longitude,
        "category": category,
        "radiusKm": radiusKm,
        "similarReportCount": evidence[
            "similarReportCount"
        ],
        "reports": evidence["reports"]
    }


# =========================================================
# CHECK SOCIAL MEDIA EVIDENCE
# =========================================================

@router.get("/social-media")
async def checkSocialMediaEvidence(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5
):

    print(
        "CHECKING SOCIAL MEDIA EVIDENCE FROM API"
    )

    evidence = await findSocialMediaEvidence(
        latitude=latitude,
        longitude=longitude,
        category=category,
        radiusKm=radiusKm
    )

    return {
        "latitude": latitude,
        "longitude": longitude,
        "category": category,
        "radiusKm": radiusKm,
        "matchingPostCount": evidence[
            "matchingPostCount"
        ],
        "posts": evidence["posts"]
    }


# =========================================================
# CENTRAL REPORT VALIDATION
# =========================================================

@router.get("/validate/{reportId}")
async def validateReportFromApi(
    reportId: str,
    governmentRadiusKm: float = 10,
    socialMediaRadiusKm: float = 5,
    nearbyReportRadiusKm: float = 5
):

    print("")
    print("==========================================")
    print("VALIDATING REPORT FROM API")
    print("REPORT ID:", reportId)
    print("==========================================")

    result = await validateReport(

        reportId=reportId,

        governmentRadiusKm=governmentRadiusKm,

        socialMediaRadiusKm=socialMediaRadiusKm,

        nearbyReportRadiusKm=nearbyReportRadiusKm
    )

    return result
# =========================================================
# INCIDENT CONFIDENCE
# =========================================================

@router.get("/incident-confidence")
async def getIncidentConfidenceFromApi(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5
):

    print("")
    print("==========================================")
    print("CHECKING INCIDENT CONFIDENCE FROM API")
    print("==========================================")

    result = await getIncidentConfidence(
        latitude=latitude,
        longitude=longitude,
        category=category,
        radiusKm=radiusKm
    )

    return result

# =========================================================
# SAVE INCIDENT CONFIDENCE
# =========================================================

@router.post("/incident-confidence")
async def saveIncidentConfidenceFromApi(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5
):

    print("")
    print("==========================================")
    print("CREATING INCIDENT FROM API")
    print("==========================================")

    result = await saveIncidentConfidence(
        latitude=latitude,
        longitude=longitude,
        category=category,
        radiusKm=radiusKm
    )

    return result

# =========================================================
# GET REPORT HEATMAP DATA
# =========================================================

@router.get("/heatmap")
async def getReportHeatmap(
    latitude: float,
    longitude: float,
    radiusKm: float = 5,
    category: str = None
):

    print("")
    print("==========================================")
    print("GETTING REPORT HEATMAP FROM API")
    print("==========================================")

    result = await getReportHeatmapData(

        latitude=latitude,

        longitude=longitude,

        radiusKm=radiusKm,

        category=category
    )

    return result

# =========================================================
# GET INCIDENT HEATMAP DATA
# =========================================================

@router.get("/incident-heatmap")
async def getIncidentHeatmap(
    latitude: float,
    longitude: float,
    radiusKm: float = 5,
    category: str = None
):

    print("")
    print("==========================================")
    print("GETTING INCIDENT HEATMAP FROM API")
    print("==========================================")

    result = await getIncidentHeatmapData(

        latitude=latitude,

        longitude=longitude,

        radiusKm=radiusKm,

        category=category
    )

    return result