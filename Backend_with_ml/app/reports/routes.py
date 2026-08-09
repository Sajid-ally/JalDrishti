from datetime import datetime
from app.reports.validation import checkDuplicateImage, checkNearbyReports
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.models.report_ranker import rank_reports
from app.gemini.service import analyzeImage
from app.ml_client import getOwnModelPrediction
from app.reports.service import (
    createReport,
    getReports,
    getHotspots,
    getMapReports,
    getNearbyReports,
    getReportById,
    updateReportStatus,
    updateReportVerification,
    getReportsForRanking,
)
from app.models.report_ranker import rank_reports
from app.utils.fileHandler import saveImage


router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

# File size limit for uploaded images
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB


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
    # VALIDATE FILE SIZE
    # -----------------------------------------------------

    imageBytes = await image.read()

    if len(imageBytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 8MB")

    await image.seek(0)  # reset pointer so saveImage() can read the file again

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
    # CHECK DUPLICATE IMAGE
    # -----------------------------------------------------

    print("STEP 2.5: Checking for duplicate image")

    duplicateCheck = await checkDuplicateImage(imagePath)

    if duplicateCheck["isDuplicate"]:
        raise HTTPException(
            status_code=400,
            detail="This image appears to be a duplicate of an existing report."
        )

    imageHash = duplicateCheck["hash"]

    # -----------------------------------------------------
    # GEMINI
    # Gemini generates title, description, relevance check,
    # and a backup hazard-type opinion for low-confidence cases
    # -----------------------------------------------------

    print("STEP 3: Sending image to Gemini")

    aiResult = await analyzeImage(imagePath)

    print("STEP 4: Gemini response")
    print(aiResult)

    # If Gemini flags the image as irrelevant (meme/selfie/unrelated), reject it
    if aiResult.get("is_relevant") is False:
        raise HTTPException(
            status_code=400,
            detail="Image does not appear related to a disaster report."
        )

    aiTitle = aiResult.get("title")
    aiDescription = aiResult.get("description")

    # -----------------------------------------------------
    # ML CLASSIFICATION
    # Calls our own trained model via ml-service.
    # Falls back to Gemini's opinion when our model is unsure.
    # -----------------------------------------------------

    print("STEP 5: Sending image to ML service")

    mlResult = await getOwnModelPrediction(imagePath)

    print("STEP 6: ML response")
    print(mlResult)

    CONFIDENCE_THRESHOLD = 0.70

    category = mlResult.get("hazard_type")
    severity = mlResult.get("severity")
    confidence = mlResult.get("confidence")
    source = "own_model"

    # Our model is unsure -> check Gemini's independent opinion
    if confidence is not None and confidence < CONFIDENCE_THRESHOLD:

        geminiGuess = aiResult.get("gemini_hazard_guess")
        geminiConfidence = aiResult.get("gemini_confidence")

        print(f"STEP 6.5: Own model confidence low ({confidence}). Checking Gemini's opinion: {geminiGuess} ({geminiConfidence})")

        if geminiGuess and geminiConfidence and geminiConfidence > confidence:
            category = geminiGuess
            confidence = geminiConfidence
            source = "gemini_fallback"

    severityMap = {"flood": 5, "landslide": 5, "no_flood": 0}
    severity = severityMap.get(category, 1)

    priority = None

    # -----------------------------------------------------
    # CHECK NEARBY REPORTS (corroboration)
    # -----------------------------------------------------

    print("STEP 6.6: Checking nearby reports")

    nearbyCount = await checkNearbyReports(latitude, longitude, category)

    print(f"Nearby similar reports found: {nearbyCount}")

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
        "imageHash": imageHash,

        "aiAnalysis": {
            "title": aiTitle,
            "description": aiDescription
        },

        "mlAnalysis": {
            "category": category,
            "severity": severity,
            "confidence": confidence,
            "priority": priority,
            "source": source
        },

        "verification": {
            "status": "Pending",
            "verifiedBy": None
        },

        "validation": {
            "status": "Pending",
            "reliabilityScore": 0,
            "governmentAlert": {"found": False},
            "socialMediaEvidence": {"reportCount": 0},
            "nearbyReportEvidence": {"similarReportCount": nearbyCount},
            "imageSimilarity": {"score": duplicateCheck["maxSimilarity"]}
        },

        "reportStatus": "Submitted",

        "createdAt": datetime.utcnow(),

        "updatedAt": datetime.utcnow()
    }

    # -----------------------------------------------------
    # SAVE TO MONGODB
    # -----------------------------------------------------

    print("STEP 7: Saving report to MongoDB")

    insertedId = await createReport(reportData)

    print("STEP 8: Report saved")

    return {
        "message": "Report submitted successfully",
        "reportId": str(insertedId),
        "aiAnalysis": reportData["aiAnalysis"],
        "mlAnalysis": reportData["mlAnalysis"],
        "validation": reportData["validation"]
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
@router.get("/ranked")
async def getRankedReports():
    print("FETCHING AND RANKING REPORTS")
    reports = await getReportsForRanking()

    if not reports:
        return {"count": 0, "reports": []}

    ranked = rank_reports(reports)
    return {"count": len(ranked), "reports": ranked}

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