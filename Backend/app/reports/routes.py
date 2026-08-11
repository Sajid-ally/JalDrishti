from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.gemini.service import analyzeImage
from app.ml_client import getOwnModelPrediction
from app.reports.validation import checkDuplicateImage, checkNearbyReports

from app.reports.service import (
    createReport,
    getReports,
    getHotspots,
    getMapReports,
    getNearbyReports,
    getReportById,
    updateReportStatus,
    updateReportVerification,
    getReportsForRanking
)

from app.utils.fileHandler import saveImage


router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB
CONFIDENCE_THRESHOLD = 0.70

SEVERITY_MAP = {
    "flood": 5,
    "landslide": 5,
    "no_flood": 0
}

HAZARD_CATEGORIES = {"flood", "landslide"}  # anything in this set = real hazard, goes to gov review
# =========================================================
# ANALYZE IMAGE (ML first, Gemini fallback)
# =========================================================

@router.post("/analyze")
async def analyzeReport(image: UploadFile = File(...)):
    imagePath = saveImage(image, "uploads/temp")
    print("ANALYZE ENDPOINT: calling ML model first")
    # ML first
    mlResult = await getOwnModelPrediction(imagePath)
    print("ML RESULT:", mlResult)
    category = mlResult["hazard_type"]
    severity = mlResult["severity"]
    confidence = mlResult["confidence"]

    # Gemini only if ML confidence is low
    aiResult = await analyzeImage(imagePath)

    if confidence < CONFIDENCE_THRESHOLD:
        geminiGuess = aiResult.get("hazard_type")
        geminiConfidence = aiResult.get("confidence")

        if geminiGuess and geminiConfidence and geminiConfidence > confidence:
            category = geminiGuess
            confidence = geminiConfidence
            severity = SEVERITY_MAP.get(category, severity)

    return {
        "hazard_type": category,
        "severity": severity,
        "confidence": confidence,
        "title": aiResult.get("title"),
        "description": aiResult.get("description"),
        "is_relevant": aiResult.get("is_relevant", True),
    }

# =========================================================
# CREATE REPORT
# =========================================================

@router.post("/")
async def addReport(
    title: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    claimedHazard: str = Form(...),
    image: UploadFile = File(...)
):

    print("STEP 1: Report request received")

    # -----------------------------------------------------
    # VALIDATE FILE SIZE
    # -----------------------------------------------------

    imageBytes = await image.read()

    if len(imageBytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 8MB")

    await image.seek(0)

    # -----------------------------------------------------
    # SAVE IMAGE
    # -----------------------------------------------------

    imagePath = saveImage(image, "uploads/reports")

    print("STEP 2: Image saved:", imagePath)

    # -----------------------------------------------------
    # CHECK DUPLICATE IMAGE
    # -----------------------------------------------------

    print("STEP 3: Checking for duplicate image")

    duplicateCheck = await checkDuplicateImage(imagePath)

    if duplicateCheck["isDuplicate"]:
        raise HTTPException(
            status_code=400,
            detail="This image appears to be a duplicate of an existing report."
        )

        imageHash = duplicateCheck["hash"]

    # -----------------------------------------------------
    # ML FIRST
    # -----------------------------------------------------
    print("STEP 4: Sending image to ML service")

    mlResult = await getOwnModelPrediction(imagePath)

    category = mlResult.get("hazard_type", "other")
    severity = mlResult.get("severity", 0)
    confidence = mlResult.get("confidence", 0)
    source = "own_model"

    # -----------------------------------------------------
    # GEMINI (title/description always, hazard fallback only if ML is low)
    # -----------------------------------------------------
    aiResult = await analyzeImage(imagePath)

    if aiResult.get("is_relevant") is False:
        raise HTTPException(
            status_code=400,
            detail="NOT_RELEVANT_IMAGE"
        )

    if confidence < CONFIDENCE_THRESHOLD:
        geminiGuess = aiResult.get("hazard_type")
        geminiConfidence = aiResult.get("confidence")

        if (
            geminiGuess
            and geminiConfidence is not None
            and geminiConfidence > confidence
        ):
            category = geminiGuess
            confidence = geminiConfidence
            severity = SEVERITY_MAP.get(category, severity)
            source = "gemini_fallback"

    aiTitle = aiResult.get("title")
    aiDescription = aiResult.get("description")

    print(
        f"[FINAL DECISION] category={category}, severity={severity}, confidence={confidence}, source={source}"
    )

    # -----------------------------------------------------
    # CLAIM VERIFICATION
    # -----------------------------------------------------

    verifiedHazard = category
    claimVerified = claimedHazard.lower() == verifiedHazard.lower()

    if verifiedHazard == "no_flood":
        raise HTTPException(
            status_code=400,
            detail="Image is not related to a disaster or hazard report."
        )

    if not claimVerified:
        print(
            f"[CLAIM CORRECTION] User claimed '{claimedHazard}', AI verified '{verifiedHazard}'"
        )
    severity = SEVERITY_MAP.get(category, 1)

    # -----------------------------------------------------
    # NOT A REAL HAZARD (no_flood) — stop early.
    # Skip nearby-report correlation and government review queue.
    # -----------------------------------------------------

    if category not in HAZARD_CATEGORIES:

        print(f"STEP 8: Classified as '{category}' (not a hazard) — skipping government review pipeline")

        reportData = {
            "title": aiTitle if aiTitle else title,
            "description": aiDescription if aiDescription else description,
            "location": {"latitude": latitude, "longitude": longitude},
            "imageUrl": imagePath,
            "imageHash": imageHash,
            "aiAnalysis": {"title": aiTitle, "description": aiDescription},
            "mlAnalysis": {
                "category": category,
                "severity": severity,
                "confidence": confidence,
                "priority": None,
                "source": source
            },
            "verification": {
                "status": "NotRequired",
                "verifiedBy": None
            },
            "validation": {
                "status": "Closed",
                "reliabilityScore": 0,
                "governmentAlert": {"found": False},
                "socialMediaEvidence": {"reportCount": 0},
                "nearbyReportEvidence": {"similarReportCount": 0},
                "imageSimilarity": {"score": duplicateCheck["maxSimilarity"]}
            },
            "reportStatus": "Closed",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }

        insertedId = await createReport(reportData)

        return {
            "message": "No hazard detected — report logged but not sent for review",
            "reportId": str(insertedId),
            "aiAnalysis": reportData["aiAnalysis"],
            "mlAnalysis": reportData["mlAnalysis"]
        }

    # -----------------------------------------------------
    # REAL HAZARD (flood or landslide) — full pipeline:
    # nearby correlation + government verification queue
    # -----------------------------------------------------

    print(f"STEP 8: Real hazard '{category}' detected — running full validation pipeline")

    nearbyCount = await checkNearbyReports(latitude, longitude, category,verifiedHazard)

    print(f"Nearby similar reports found: {nearbyCount}")

    reportData = {
        "title": aiTitle if aiTitle else title,
        "description": aiDescription if aiDescription else description,
         # User claim vs AI verification
        "hazardTypeClaimed": claimedHazard,
        "hazardTypeVerified": verifiedHazard,
        "claimVerified": claimVerified,
        
        "location": {"latitude": latitude, "longitude": longitude},
        "imageUrl": imagePath,
        "imageHash": imageHash,
        "aiAnalysis": {"title": aiTitle, "description": aiDescription},
        "mlAnalysis": {
            "category": category,
            "severity": severity,
            "confidence": confidence,
            "priority": None,
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

    insertedId = await createReport(reportData)

    print("STEP 9: Report saved, sent to government review")

    return {
        "message": "Report submitted successfully and sent for government verification",
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
    reports = await getReports()
    return {"count": len(reports), "reports": reports}


# =========================================================
# GET REPORTS PENDING GOVERNMENT VERIFICATION ("gov tab")
# =========================================================

@router.get("/pending-verification")
async def fetchPendingVerification():
    reports = await getReports()
    pending = [r for r in reports if r.get("verification", {}).get("status") == "Pending"]
    return {"count": len(pending), "reports": pending}


# =========================================================
# GET HOTSPOTS
# =========================================================

@router.get("/hotspots")
async def fetchHotspots(category: str = None):
    hotspots = await getHotspots(category)
    return {"count": len(hotspots), "hotspots": hotspots}


# =========================================================
# GET MAP REPORTS
# =========================================================

@router.get("/map")
async def fetchMapReports(category: str = None):
    reports = await getMapReports(category)
    return {"count": len(reports), "reports": reports}


# =========================================================
# SEARCH NEARBY REPORTS
# =========================================================

@router.get("/nearby")
async def fetchNearbyReports(latitude: float, longitude: float, radiusKm: float = 5):
    reports = await getNearbyReports(latitude, longitude, radiusKm)
    return {"count": len(reports), "radiusKm": radiusKm, "reports": reports}


# =========================================================
# GET RANKED REPORTS
# =========================================================

@router.get("/ranked")
async def fetchRankedReports():
    reports = await getReportsForRanking()
    return {
        "count": len(reports),
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
        return {"message": "Report not found"}

    return {
        "message": "Report verification updated successfully",
        "reportId": reportId,
        "status": status
    }


# =========================================================
# UPDATE REPORT STATUS
# =========================================================

@router.put("/{reportId}/status")
async def changeReportStatus(reportId: str, status: str):
    updated = await updateReportStatus(reportId, status)

    if not updated:
        return {"message": "Report not found"}

    return {"message": "Report status updated successfully", "reportId": reportId, "status": status}


# =========================================================
# GET SINGLE REPORT
# =========================================================

@router.get("/{reportId}")
async def fetchReport(reportId: str):
    report = await getReportById(reportId)

    if report is None:
        return {"message": "Report not found"}

    return report