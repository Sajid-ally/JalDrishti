from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form

from app.gemini.service import analyzeImage

from app.reports.service import (
    createReport,
    getReports,
    getHotspots,
    getMapReports,
    getNearbyReports,
    getReportById,
    updateReportStatus,
    updateReportVerification
)

from app.utils.fileHandler import saveImage


router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


# =========================================================
# CREATE REPORT
# =========================================================

@router.post("/")
async def addReport(
    title: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    image: UploadFile = File(...)
):

    print("STEP 1: Report request received")

    # -----------------------------------------------------
    # SAVE IMAGE
    # -----------------------------------------------------

    imagePath = saveImage(
        image,
        "uploads/reports"
    )

    print("STEP 2: Image saved")
    print(imagePath)

    # -----------------------------------------------------
    # GEMINI
    # Gemini ONLY generates title and description
    # -----------------------------------------------------

    print("STEP 3: Sending image to Gemini")

    aiResult = await analyzeImage(imagePath)

    print("STEP 4: Gemini response")
    print(aiResult)

    aiTitle = aiResult.get("title")
    aiDescription = aiResult.get("description")

    # -----------------------------------------------------
    # ML CLASSIFICATION
    # TEMPORARILY DISABLED
    #
    # Your ML model will be connected here later.
    # -----------------------------------------------------

    category = None
    severity = None
    confidence = None
    priority = None

    # -----------------------------------------------------
    # CREATE REPORT DATA
    # -----------------------------------------------------

    reportData = {

        "title": (
            aiTitle
            if aiTitle
            else title
        ),

        "description": (
            aiDescription
            if aiDescription
            else description
        ),

        "location": {
            "latitude": latitude,
            "longitude": longitude
        },

        "imageUrl": imagePath,

        "aiAnalysis": {
            "title": aiTitle,
            "description": aiDescription
        },

        "mlAnalysis": {
            "category": category,
            "severity": severity,
            "confidence": confidence,
            "priority": priority
        },

        # -------------------------------------------------
        # GOVERNMENT / MANUAL VERIFICATION
        # -------------------------------------------------

        "verification": {
            "status": "Pending",
            "verifiedBy": None
        },

        # -------------------------------------------------
        # AUTOMATIC VALIDATION
        # -------------------------------------------------

        "validation": {

            "status": "Pending",

            "reliabilityScore": 0,

            "governmentAlert": {
                "found": False
            },

            "socialMediaEvidence": {
                "reportCount": 0
            },

            "nearbyReportEvidence": {
                "similarReportCount": 0
            },

            "imageSimilarity": {
                "score": None
            }
        },

        "reportStatus": "Submitted",

        "createdAt": datetime.utcnow(),

        "updatedAt": datetime.utcnow()
    }

    # -----------------------------------------------------
    # SAVE TO MONGODB
    # -----------------------------------------------------

    print("STEP 5: Saving report to MongoDB")

    insertedId = await createReport(reportData)

    print("STEP 6: Report saved")

    return {
        "message": "Report submitted successfully",
        "reportId": str(insertedId),
        "aiAnalysis": reportData["aiAnalysis"],
        "mlAnalysis": reportData["mlAnalysis"]
    }


# =========================================================
# GET ALL REPORTS
# =========================================================

@router.get("/")
async def fetchReports():

    print("FETCHING REPORTS")

    reports = await getReports()

    return {
        "count": len(reports),
        "reports": reports
    }


# =========================================================
# GET HOTSPOTS
# =========================================================

@router.get("/hotspots")
async def fetchHotspots(
    category: str = None
):

    print("FETCHING HOTSPOTS")

    hotspots = await getHotspots(category)

    return {
        "count": len(hotspots),
        "hotspots": hotspots
    }


# =========================================================
# GET MAP REPORTS
# =========================================================

@router.get("/map")
async def fetchMapReports(
    category: str = None
):

    print("FETCHING MAP REPORTS")

    reports = await getMapReports(category)

    return {
        "count": len(reports),
        "reports": reports
    }


# =========================================================
# SEARCH NEARBY REPORTS
# =========================================================

@router.get("/nearby")
async def fetchNearbyReports(
    latitude: float,
    longitude: float,
    radiusKm: float = 5
):

    print("FETCHING NEARBY REPORTS")

    reports = await getNearbyReports(
        latitude,
        longitude,
        radiusKm
    )

    return {
        "count": len(reports),
        "radiusKm": radiusKm,
        "reports": reports
    }


# =========================================================
# UPDATE REPORT VERIFICATION
# =========================================================

@router.put("/{reportId}/verification")
async def changeReportVerification(
    reportId: str,
    status: str,
    verifiedBy: str = None,
    reliabilityScore: float = 0,
    validationSources: list[str] = None
):

    print("CHANGING REPORT VERIFICATION")

    if validationSources is None:
        validationSources = []

    updated = await updateReportVerification(
        reportId=reportId,
        status=status,
        verifiedBy=verifiedBy,
        reliabilityScore=reliabilityScore,
        validationSources=validationSources
    )

    if not updated:

        return {
            "message": "Report not found"
        }

    return {
        "message": "Report verification updated successfully",
        "reportId": reportId,
        "status": status,
        "reliabilityScore": reliabilityScore,
        "validationSources": validationSources
    }


# =========================================================
# UPDATE REPORT STATUS
# =========================================================

@router.put("/{reportId}/status")
async def changeReportStatus(
    reportId: str,
    status: str
):

    print("CHANGING REPORT STATUS")

    print(
        "REPORT ID:",
        reportId
    )

    print(
        "NEW STATUS:",
        status
    )

    updated = await updateReportStatus(
        reportId,
        status
    )

    if not updated:

        return {
            "message": "Report not found"
        }

    return {
        "message": "Report status updated successfully",
        "reportId": reportId,
        "status": status
    }


# =========================================================
# GET SINGLE REPORT
# =========================================================

@router.get("/{reportId}")
async def fetchReport(
    reportId: str
):

    print("FETCHING SINGLE REPORT")

    report = await getReportById(reportId)

    if report is None:

        return {
            "message": "Report not found"
        }

    return report