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

    await image.seek(0)
    # -----------------------------------------------------
    # SAVE IMAGE
    # -----------------------------------------------------

    imagePath = saveImage(
        image,
        "uploads/reports"
    )

    print("STEP 2: Image saved")
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
    # GEMINI — relevance check + title/description + hazard opinion
    # -----------------------------------------------------

    print("STEP 4: Sending image to Gemini")

    aiResult = await analyzeImage(imagePath)

    print("STEP 5: Gemini response:", aiResult)

    if aiResult.get("is_relevant") is False:
        raise HTTPException(
            status_code=400,
            detail="Image does not appear related to a disaster report."
        )

    aiTitle = aiResult.get("title")
    aiDescription = aiResult.get("description")

 # -----------------------------------------------------
    # ML CLASSIFICATION — our trained model, Gemini as fallback
    # Fallback triggers on low confidence REGARDLESS of which
    # category our model guessed (flood, landslide, or no_flood) —
    # a missed real hazard is just as dangerous as a false alarm.
    # -----------------------------------------------------

   

    print("STEP 7: ML response:", mlResult)

    category = mlResult.get("hazard_type")
    confidence = mlResult.get("confidence")
    source = "own_model"

    print(f"[SOURCE CHECK] Own model predicted '{category}' with confidence {confidence}")

    if confidence is not None and confidence < CONFIDENCE_THRESHOLD:

        print(f"[FALLBACK TRIGGERED] Confidence {confidence} is below threshold {CONFIDENCE_THRESHOLD}. Consulting Gemini for a second opinion...")

        geminiGuess = aiResult.get("gemini_hazard_guess")
        geminiConfidence = aiResult.get("gemini_confidence")

        print(f"[GEMINI OPINION] Gemini predicted '{geminiGuess}' with confidence {geminiConfidence}")

        if geminiGuess and geminiConfidence and geminiConfidence > confidence:

            if geminiGuess != category:
                print(f"[DISAGREEMENT] Own model said '{category}', Gemini said '{geminiGuess}' — Gemini is more confident, OVERRIDING.")
            else:
                print(f"[AGREEMENT] Both models agree on '{category}', using Gemini's higher confidence score.")

            category = geminiGuess
            confidence = geminiConfidence
            source = "gemini_fallback"

        else:
            print(f"[FALLBACK SKIPPED] Gemini's confidence ({geminiConfidence}) was not higher than our model's ({confidence}). Keeping own_model result.")

    else:
        print(f"[HIGH CONFIDENCE] {confidence} >= {CONFIDENCE_THRESHOLD} — trusting own model, no fallback needed.")

    print(f"[FINAL DECISION] category='{category}', confidence={confidence}, source='{source}'")

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

    nearbyCount = await checkNearbyReports(latitude, longitude, category)

    print(f"Nearby similar reports found: {nearbyCount}")

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

```
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