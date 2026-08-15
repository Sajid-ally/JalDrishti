from datetime import datetime


from app.utils.geocode import reverseGeocode
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.gemini.service import verifyHazard, generateReportText
from app.ml_client import getOwnModelPrediction
from app.reports.validation import checkDuplicateImage, checkNearbyReports
import asyncio
from app.database import database
from app.models.report_ranker import rank_reports
from app.reports.service import (
    createReport,
    getReports,
    getHotspots,
    getMapReports,
    getNearbyReports,
    getReportById,
    
    updateReportStatus,
    getReportsForRanking
)

from app.utils.fileHandler import saveImage
from app.ml_client import sendCorrectionToML


router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB
CONFIDENCE_THRESHOLD = 0.70
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}

SEVERITY_MAP = {
    "flooding": 5,
    "drainage_problem": 3,
    "pond_lake_problem": 3,
    "normal": 0,
}


HAZARD_CATEGORIES = {"flooding", "drainage_problem", "pond_lake_problem"}  # this set = real hazard, goes to gov review
# =========================================================
# ANALYZE IMAGE (ML first, Gemini fallback)
# =========================================================

@router.post("/analyze")
async def analyzeReport(image: UploadFile = File(...)):
    imagePath = saveImage(image, "uploads/temp")
    print("ANALYZE ENDPOINT: calling ML model first")

    mlResult = await getOwnModelPrediction(imagePath)

    category = mlResult.get("hazard_type", "normal")
    severity = mlResult.get("severity", 0)
    confidence = mlResult.get("confidence", 0)
    source = "ml"

    print("ML RESULT:", mlResult)

    if confidence < CONFIDENCE_THRESHOLD:
        print("ML confidence low - verifying with Gemini")

        verify = await verifyHazard(imagePath)

        if not verify.get("is_relevant", False):
            raise HTTPException(
                status_code=400,
                detail="NOT_RELEVANT_IMAGE"
            )

        geminiGuess = verify.get("hazard_type")
        geminiConfidence = verify.get("confidence")

        if (
            geminiGuess
            and geminiConfidence is not None
            and geminiConfidence > confidence
        ):
            category = geminiGuess
            confidence = geminiConfidence
            severity = SEVERITY_MAP.get(category, severity)
            source = "gemini"

    text = await generateReportText(imagePath)

    return {
        "hazard_type": category,
        "severity": severity,
        "confidence": confidence,
        "source": source,
        "title": text.get("title"),
        "description": text.get("description"),
        "is_relevant": True
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

    # file size check
    if len(imageBytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 8MB")

    # file type check
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed"
        )

    await image.seek(0)

    # -----------------------------------------------------
    # SAVE IMAGE
    # -----------------------------------------------------
    imagePath = saveImage(image, "uploads/reports")
    print("STEP 2: Image saved:", imagePath)

    # -----------------------------------------------------
    # STEP 3: ML FIRST
    # -----------------------------------------------------
    print("STEP 3: Sending image to ML service")

    mlResult = await getOwnModelPrediction(imagePath)

    category = mlResult.get("hazard_type", "normal")
    severity = mlResult.get("severity", 0)
    confidence = mlResult.get("confidence", 0)
    source = "ml"

    print(f"[ML] {category} @ {confidence}")

    # -----------------------------------------------------
    # STEP 4: GEMINI FALLBACK
    # -----------------------------------------------------
    if confidence < CONFIDENCE_THRESHOLD:
        print("[FALLBACK] ML confidence low, verifying with Gemini")

        verify = await verifyHazard(imagePath)

        geminiGuess = verify.get("hazard_type")
        geminiConfidence = verify.get("confidence")

        if (
            geminiGuess
            and geminiConfidence is not None
            and geminiConfidence > confidence
        ):
            category = geminiGuess
            confidence = geminiConfidence
            severity = SEVERITY_MAP.get(category, severity)
            source = "gemini_fallback"

    verifiedHazard = category

    print(
        f"[FINAL DECISION] category={verifiedHazard}, severity={severity}, confidence={confidence}, source={source}"
    )

    # -----------------------------------------------------
    # REJECT NON-HAZARD
    # -----------------------------------------------------
    if verifiedHazard == "normal" :
        verify = await verifyHazard(imagePath)

        if not verify.get("is_relevant", False):
          raise HTTPException(
            status_code=400,
            detail="NOT_RELEVANT_IMAGE"
        )

        verifiedHazard = str(verify.get("hazard_type", "normal"))
        confidence = float(verify.get("confidence", confidence))
        severity = int(SEVERITY_MAP.get(verifiedHazard, 0))
        source = "gemini_fallback"
    # -----------------------------------------------------
    # STEP 5: PARALLEL TASKS
    # -----------------------------------------------------
    if title.strip() and description.strip():
        textTask = asyncio.sleep(
            0,
            result={
                "title": title,
                "description": description
            }
        )
    else:
        textTask = generateReportText(imagePath)

    duplicateTask = checkDuplicateImage(imagePath)
    nearbyTask = checkNearbyReports(latitude, longitude, verifiedHazard)

    textResult, duplicateCheck, nearbyCount = await asyncio.gather(
        textTask,
        duplicateTask,
        nearbyTask
    )

    if duplicateCheck["isDuplicate"]:
        raise HTTPException(status_code=400, detail="DUPLICATE_IMAGE")

    imageHash = duplicateCheck["hash"]

    aiTitle = textResult.get("title")
    aiDescription = textResult.get("description")

    print(f"Nearby similar reports found: {nearbyCount}")

    # -----------------------------------------------------
    # STEP 6: CLAIM VERIFICATION
    # -----------------------------------------------------
    claimVerified = claimedHazard.lower() == verifiedHazard.lower()

    if not claimVerified:
        print(
            f"[CLAIM CORRECTION] User claimed '{claimedHazard}', AI verified '{verifiedHazard}'"
        )

    # -----------------------------------------------------
    # STEP 7: LOCATION
    # -----------------------------------------------------
    locationInfo = await reverseGeocode(latitude, longitude)

# -----------------------------------------------------
# STEP 8: SAVE TO MONGODB
# -----------------------------------------------------

# Convert ML values to native Python types
    verifiedHazard = str(verifiedHazard)
    confidence = float(confidence)
    severity = int(severity)
    source = str(source)

    claimVerified = bool(claimedHazard.lower() == verifiedHazard.lower())

    duplicateImage = bool(duplicateCheck["isDuplicate"])
    imageSimilarity = float(duplicateCheck["maxSimilarity"])
    nearbyCount = int(nearbyCount)

    reportData = {
    "title": aiTitle if aiTitle else title,
    "description": aiDescription if aiDescription else description,

    "hazardTypeClaimed": claimedHazard,
    "hazardTypeVerified": verifiedHazard,
    "claimVerified": claimVerified,

    "severity": severity,
    "priority": severity,

    "city": locationInfo.get("city"),
    "state": locationInfo.get("state"),

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
        "category": verifiedHazard,
        "severity": severity,
        "confidence": confidence,
        "source": source
    },

    "validation": {
        "duplicateImage": duplicateImage,
        "imageSimilarity": imageSimilarity,
        "nearbySimilarReports": nearbyCount,
        "confidence": confidence,
        "isRelevant": bool(verifiedHazard != "normal")
    },

    "reportStatus": "Open",

    "createdAt": datetime.utcnow(),
    "updatedAt": datetime.utcnow()
}
    insertedId = await createReport(reportData)

    print("STEP 9: Report saved successfully")

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
    reports = await getReports()
    return {"count": len(reports), "reports": reports}





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
async def getRankedReports():
    docs = await database.reports.find({}).to_list(length=500)

    print("TOTAL DOCS FROM MONGODB:", len(docs))

    reports = []

    for doc in docs:
        print("DOC:", doc.get("_id"))
        loc = doc.get("location", {})
        ml = doc.get("mlAnalysis", {})

        reports.append({
            "report_id": str(doc["_id"]),
            "severity": ml.get("severity", doc.get("severity", 0)),
            "affected_people": doc.get("affectedPeople", 0),
            "hazard_type": doc.get("hazardTypeVerified") or ml.get("category"),
            "confidence": ml.get("confidence", 0),
            "time": doc.get("createdAt"),
            "location": loc,
            "latitude": loc.get("latitude"),
            "longitude": loc.get("longitude"),
            "description": doc.get("description", ""),
            "validation": doc.get("validation", {}),
        })

    print("REPORTS BEFORE RANKING:", len(reports))

    ranked = rank_reports(reports)

    print("RANKED REPORTS:", len(ranked))

    return {
        "count": len(ranked),
        "reports": ranked
    }

    ranked = rank_reports(reports)

    return {
        "count": len(ranked),
        "reports": ranked
    }



# =========================================================
# UPDATE REPORT STATUS
# =========================================================

from fastapi import BackgroundTasks

RETRAIN_THRESHOLD = 30

@router.put("/{reportId}/status")
async def changeReportStatus(
    reportId: str,
    status: str,
    background_tasks: BackgroundTasks,
    correctedHazard: str = None
):
    ALLOWED_STATUS = {"Open", "Accepted", "Rejected", "Resolved"}

    if status not in ALLOWED_STATUS:
      raise HTTPException(status_code=400, detail="Invalid status")
    report = await getReportById(reportId)

    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    # Officer accepted and corrected ML prediction
    if (
        status.lower() == "accepted"
        and correctedHazard
        and report.get("imageUrl")
    ):
        background_tasks.add_task(
            sendCorrectionToML,
            report["imageUrl"],
            correctedHazard
        )

    updated = await updateReportStatus(reportId, status)

    if not updated:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "message": "Report status updated successfully",
        "reportId": reportId,
        "status": status
    }


# =========================================================
# GET SINGLE REPORT
# =========================================================

@router.get("/{reportId}")
async def fetchReport(reportId: str):
    report = await getReportById(reportId)

    if report is None:
        return {"message": "Report not found"}

    return report

