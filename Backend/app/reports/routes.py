from datetime import datetime
import asyncio

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks

from app.utils.geocode import reverseGeocode
from app.gemini.service import verifyHazard, generateReportText
from app.ml_client import getOwnModelPrediction, sendCorrectionToML
from app.reports.validation import checkDuplicateImage, checkNearbyReports
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
    updateReportVerification,
    getReportTracking,
    getAdministrativeReports,
    getAdministrativeHotspots,
    getHotspotDetails,
    assignReport,
    getGovernmentDashboard,
    deleteReport,
)

from app.utils.fileHandler import saveImage


router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


# =========================================================
# CONSTANTS
# =========================================================

MAX_FILE_SIZE = 8 * 1024 * 1024
CONFIDENCE_THRESHOLD = 0.70

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

SEVERITY_MAP = {
    "flooding": 5,
    "drainage_problem": 3,
    "pond_lake_problem": 3,
    "normal": 0,
}

HAZARD_CATEGORIES = {
    "flooding",
    "drainage_problem",
    "pond_lake_problem",
}


# =========================================================
# HELPERS
# =========================================================

def _status_update_succeeded(result):
    """Handle both old boolean and new {success: bool} service responses."""
    if result is None:
        return False

    if isinstance(result, bool):
        return result

    if isinstance(result, dict):
        return result.get("success", True) is not False

    return bool(result)


def _result_error(result, default="Operation failed"):
    if isinstance(result, dict):
        return result.get("error") or result.get("message") or default
    return default


# =========================================================
# ANALYZE IMAGE
# ML FIRST -> GEMINI FALLBACK -> AI TEXT
# =========================================================

@router.post("/analyze")
async def analyzeReport(image: UploadFile = File(...)):
    imageBytes = await image.read()

    if len(imageBytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image must be under 8MB",
        )

    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed",
        )

    await image.seek(0)

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
                detail="NOT_RELEVANT_IMAGE",
            )

        geminiGuess = verify.get("hazard_type")
        geminiConfidence = verify.get("confidence")

        if (
            geminiGuess
            and geminiConfidence is not None
            and geminiConfidence > confidence
        ):
            category = str(geminiGuess)
            confidence = float(geminiConfidence)
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
        "is_relevant": category != "normal",
    }


# =========================================================
# CREATE REPORT
# ML -> GEMINI -> VALIDATION -> LOCATION -> MONGODB
# =========================================================

@router.post("/")
async def addReport(
    title: str = Form(...),
    description: str = Form(...),
    username: str = Form("anonymous"),
    latitude: float = Form(...),
    longitude: float = Form(...),
    claimedHazard: str = Form(...),
    image: UploadFile = File(...),
):
    print("STEP 1: Report request received")

    # -----------------------------------------------------
    # STEP 1: VALIDATE IMAGE
    # -----------------------------------------------------
    imageBytes = await image.read()

    if len(imageBytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image must be under 8MB",
        )

    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed",
        )

    await image.seek(0)

    # -----------------------------------------------------
    # STEP 2: SAVE IMAGE
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
            category = str(geminiGuess)
            confidence = float(geminiConfidence)
            severity = SEVERITY_MAP.get(category, severity)
            source = "gemini_fallback"

    verifiedHazard = str(category)

    print(
        f"[FINAL DECISION] category={verifiedHazard}, "
        f"severity={severity}, confidence={confidence}, source={source}"
    )

    # -----------------------------------------------------
    # STEP 4B: NORMAL / NON-RELEVANT IMAGE
    # -----------------------------------------------------
    if verifiedHazard == "normal":
        verify = await verifyHazard(imagePath)

        if not verify.get("is_relevant", False):
            raise HTTPException(
                status_code=400,
                detail="NOT_RELEVANT_IMAGE",
            )

        verifiedHazard = str(
            verify.get("hazard_type", "normal")
        )
        confidence = float(
            verify.get("confidence", confidence)
        )
        severity = int(
            SEVERITY_MAP.get(verifiedHazard, 0)
        )
        source = "gemini_fallback"

    # -----------------------------------------------------
    # STEP 5: PARALLEL TASKS
    # -----------------------------------------------------
    if title.strip() and description.strip():
        textTask = asyncio.sleep(
            0,
            result={
                "title": title,
                "description": description,
            },
        )
    else:
        textTask = generateReportText(imagePath)

    duplicateTask = checkDuplicateImage(imagePath)
    nearbyTask = checkNearbyReports(
        latitude,
        longitude,
        verifiedHazard,
    )

    textResult, duplicateCheck, nearbyCount = await asyncio.gather(
        textTask,
        duplicateTask,
        nearbyTask,
    )

    if duplicateCheck.get("isDuplicate", False):
        raise HTTPException(
            status_code=400,
            detail="DUPLICATE_IMAGE",
        )

    imageHash = duplicateCheck.get("hash")
    imageSimilarity = float(
        duplicateCheck.get("maxSimilarity", 0)
    )

    aiTitle = textResult.get("title")
    aiDescription = textResult.get("description")

    print(f"Nearby similar reports found: {nearbyCount}")

    # -----------------------------------------------------
    # STEP 6: CLAIM VERIFICATION
    # -----------------------------------------------------
    claimVerified = (
        claimedHazard.strip().lower()
        == verifiedHazard.strip().lower()
    )

    if not claimVerified:
        print(
            f"[CLAIM CORRECTION] User claimed '{claimedHazard}', "
            f"AI verified '{verifiedHazard}'"
        )

    # -----------------------------------------------------
    # STEP 7: REVERSE GEOCODING
    # -----------------------------------------------------
    print("STEP 7: Finding administrative location")

    locationInfo = await reverseGeocode(
        latitude,
        longitude,
    )

    if locationInfo is None:
        locationInfo = {}

    print("Administrative location:", locationInfo)

    # -----------------------------------------------------
    # STEP 8: NORMALIZE TYPES
    # -----------------------------------------------------
    verifiedHazard = str(verifiedHazard)
    confidence = float(confidence)
    severity = int(severity)
    source = str(source)
    nearbyCount = int(nearbyCount)
    duplicateImage = bool(
        duplicateCheck.get("isDuplicate", False)
    )

    now = datetime.utcnow()

    # -----------------------------------------------------
    # STEP 9: REPORT DOCUMENT
    # -----------------------------------------------------
    reportData = {
        "username": username,

        "title": aiTitle if aiTitle else title,
        "description": (
            aiDescription
            if aiDescription
            else description
        ),

        "hazardTypeClaimed": claimedHazard,
        "hazardTypeVerified": verifiedHazard,
        "claimVerified": claimVerified,

        "severity": severity,

        # Keep numeric priority for the ML ranker.
        "priority": severity,

        "governmentPriority": (
            "high"
            if severity >= 5
            else "medium"
            if severity >= 3
            else "low"
        ),

        "city": locationInfo.get("city"),
        "state": locationInfo.get("state"),

        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "state": locationInfo.get("state"),
            "district": locationInfo.get("district"),
            "city": locationInfo.get("city"),
            "locality": locationInfo.get("locality"),
        },

        "imageUrl": imagePath,
        "imageHash": imageHash,

        "aiAnalysis": {
            "title": aiTitle,
            "description": aiDescription,
        },

        "mlAnalysis": {
            "category": verifiedHazard,
            "severity": severity,
            "confidence": confidence,
            "source": source,
        },

        "validation": {
            "duplicateImage": duplicateImage,
            "imageSimilarity": imageSimilarity,
            "nearbySimilarReports": nearbyCount,
            "confidence": confidence,
            "isRelevant": verifiedHazard != "normal",
        },

        # Main status used by current ML workflow.
        "reportStatus": "Open",

        # Compatibility with government/admin workflow.
        "status": "submitted",

        "timeline": [
            {
                "status": "submitted",
                "timestamp": now,
            }
        ],

        "verification": {
            "status": "Pending",
            "verifiedBy": None,
            "verifiedAt": None,
        },

        "assignment": {
            "department": None,
            "assignedTo": None,
            "assignedBy": None,
            "assignedAt": None,
        },

        "createdAt": now,
        "updatedAt": now,
    }

    # -----------------------------------------------------
    # STEP 10: SAVE
    # -----------------------------------------------------
    print("STEP 10: Saving report to MongoDB")

    insertedId = await createReport(reportData)

    print("STEP 11: Report saved successfully")

    return {
        "message": "Report submitted successfully",
        "reportId": str(insertedId),
        "status": reportData["reportStatus"],
        "location": reportData["location"],
        "aiAnalysis": reportData["aiAnalysis"],
        "mlAnalysis": reportData["mlAnalysis"],
        "validation": reportData["validation"],
        "verification": reportData["verification"],
    }


# =========================================================
# GET ALL REPORTS
# =========================================================

@router.get("/")
async def fetchReports():
    reports = await getReports()
    return {
        "count": len(reports),
        "reports": reports,
    }


# =========================================================
# GET HOTSPOTS
# =========================================================

@router.get("/hotspots")
async def fetchHotspots(category: str = None):
    hotspots = await getHotspots(category)
    return {
        "count": len(hotspots),
        "hotspots": hotspots,
    }


# =========================================================
# GET MAP REPORTS + HOTSPOTS
# =========================================================

@router.get("/map")
async def fetchMapReports(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None,
    status: str = None,
):
    print("FETCHING MAP DATA")

    reports = await getMapReports(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category,
        status=status,
    )

    hotspots = await getAdministrativeHotspots(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category,
    )

    return {
        "count": len(reports),
        "filters": {
            "state": state,
            "district": district,
            "city": city,
            "locality": locality,
            "category": category,
            "status": status,
        },
        "reportCount": len(reports),
        "hotspotCount": len(hotspots),
        "reports": reports,
        "hotspots": hotspots,
    }


# =========================================================
# NEARBY REPORTS
# =========================================================

@router.get("/nearby")
async def fetchNearbyReports(
    latitude: float,
    longitude: float,
    radiusKm: float = 5,
):
    reports = await getNearbyReports(
        latitude,
        longitude,
        radiusKm,
    )

    return {
        "count": len(reports),
        "radiusKm": radiusKm,
        "reports": reports,
    }


# =========================================================
# RANKED REPORTS
# =========================================================

@router.get("/ranked")
async def getRankedReports():
    docs = await database.reports.find({}).to_list(
        length=500
    )

    print("TOTAL DOCS FROM MONGODB:", len(docs))

    reports = []

    for doc in docs:
        loc = doc.get("location", {}) or {}
        ml = doc.get("mlAnalysis", {}) or {}

        reports.append({
            "report_id": str(doc["_id"]),
            "severity": ml.get(
                "severity",
                doc.get("severity", 0),
            ),
            "affected_people": doc.get(
                "affectedPeople",
                0,
            ),
            "hazard_type": doc.get(
                "hazardTypeVerified"
            ) or ml.get("category"),
            "confidence": ml.get(
                "confidence",
                0,
            ),
            "time": doc.get("createdAt"),
            "location": loc,
            "latitude": loc.get("latitude"),
            "longitude": loc.get("longitude"),
            "description": doc.get(
                "description",
                "",
            ),
            "validation": doc.get(
                "validation",
                {},
            ),
        })

    print("REPORTS BEFORE RANKING:", len(reports))

    ranked = rank_reports(reports)

    print("RANKED REPORTS:", len(ranked))

    return {
        "count": len(ranked),
        "reports": ranked,
    }


# =========================================================
# ADMINISTRATIVE REPORTS
# =========================================================

@router.get("/admin")
async def fetchAdministrativeReports(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None,
    status: str = None,
    priority: str = None,
    department: str = None,
):
    reports = await getAdministrativeReports(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category,
        status=status,
        priority=priority,
        department=department,
    )

    return {
        "count": len(reports),
        "filters": {
            "state": state,
            "district": district,
            "city": city,
            "locality": locality,
            "category": category,
            "status": status,
            "priority": priority,
            "department": department,
        },
        "reports": reports,
    }


# =========================================================
# ADMINISTRATIVE HOTSPOTS
# =========================================================

@router.get("/admin/hotspots")
async def fetchAdministrativeHotspots(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None,
):
    hotspots = await getAdministrativeHotspots(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category,
    )

    return {
        "count": len(hotspots),
        "filters": {
            "state": state,
            "district": district,
            "city": city,
            "locality": locality,
            "category": category,
        },
        "hotspots": hotspots,
    }


# =========================================================
# GOVERNMENT DASHBOARD
# =========================================================

@router.get("/admin/dashboard")
async def fetchGovernmentDashboard(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None,
):
    dashboard = await getGovernmentDashboard(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category,
    )

    return dashboard


# =========================================================
# HOTSPOT DETAILS
# =========================================================

@router.get("/hotspots/{hotspotId}")
async def fetchHotspotDetails(
    hotspotId: str,
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None,
):
    hotspot = await getHotspotDetails(
        hotspotId=hotspotId,
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category,
    )

    if hotspot is None:
        return {
            "success": False,
            "message": "Hotspot not found",
        }

    return {
        "success": True,
        "hotspot": hotspot,
    }


# =========================================================
# UPDATE VERIFICATION
# =========================================================

@router.put("/{reportId}/verification")
async def changeReportVerification(
    reportId: str,
    status: str,
    verifiedBy: str = None,
):
    updated = await updateReportVerification(
        reportId=reportId,
        status=status,
        verifiedBy=verifiedBy,
    )

    if not updated:
        return {
            "success": False,
            "message": "Report not found",
        }

    if isinstance(updated, dict) and updated.get("success") is False:
        return updated

    return {
        "success": True,
        "message": "Report verification updated successfully",
        "reportId": reportId,
        "status": status,
        "verifiedBy": verifiedBy,
    }


# =========================================================
# UPDATE STATUS + OPTIONAL ML CORRECTION
# =========================================================

@router.put("/{reportId}/status")
async def changeReportStatus(
    reportId: str,
    status: str,
    background_tasks: BackgroundTasks,
    correctedHazard: str = None,
):
    allowedStatus = {
        "Open",
        "Accepted",
        "Rejected",
        "Resolved",
    }

    if status not in allowedStatus:
        raise HTTPException(
            status_code=400,
            detail="Invalid status",
        )

    report = await getReportById(reportId)

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found",
        )

    # -----------------------------------------------------
    # OFFICER CORRECTION -> ML TRAINING DATA
    # -----------------------------------------------------
    if (
        status.lower() == "accepted"
        and correctedHazard
        and report.get("imageUrl")
    ):
        print(
            "[ML CORRECTION]",
            correctedHazard,
        )

        background_tasks.add_task(
            sendCorrectionToML,
            report["imageUrl"],
            correctedHazard,
        )

    updated = await updateReportStatus(
        reportId,
        status,
    )

    if not _status_update_succeeded(updated):
        raise HTTPException(
            status_code=404,
            detail=_result_error(
                updated,
                "Status update failed",
            ),
        )

    return {
        "success": True,
        "message": "Report status updated successfully",
        "reportId": reportId,
        "status": status,
    }


# =========================================================
# TRACK REPORT
# =========================================================

@router.get("/{reportId}/track")
async def trackReport(reportId: str):
    report = await getReportTracking(reportId)

    if report is None:
        return {
            "success": False,
            "message": "Report not found",
        }

    return {
        "success": True,
        "report": report,
    }


# =========================================================
# ASSIGN REPORT
# =========================================================

@router.put("/{reportId}/assign")
async def assignReportToDepartment(
    reportId: str,
    department: str,
    assignedTo: str,
    assignedBy: str = "admin",
):
    result = await assignReport(
        reportId=reportId,
        department=department,
        assignedTo=assignedTo,
        assignedBy=assignedBy,
    )

    if isinstance(result, dict) and result.get("success") is False:
        return result

    return {
        "success": True,
        "message": "Report assigned successfully",
        "reportId": reportId,
        "assignment": result.get("assignment") if isinstance(result, dict) else result,
    }


# =========================================================
# GET SINGLE REPORT
# =========================================================

@router.get("/{reportId}")
async def fetchReport(reportId: str):
    report = await getReportById(reportId)

    if report is None:
        return {
            "message": "Report not found",
        }

    return report


# =========================================================
# DELETE REPORT
# =========================================================

@router.delete("/{reportId}")
async def removeReport(reportId: str):
    result = await deleteReport(
        reportId=reportId,
    )

    if not result.get("success", False):
        raise HTTPException(
            status_code=404,
            detail=result.get(
                "error",
                "Report not found",
            ),
        )

    return {
        "success": True,
        "message": "Report deleted successfully",
        "reportId": reportId,
    }