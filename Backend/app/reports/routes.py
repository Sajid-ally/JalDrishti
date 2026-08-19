from datetime import datetime
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Depends, status

from app.config import settings
from app.utils.fileHandler import saveImage
from app.utils.geocode import reverseGeocode
from app.ml_client import getOwnModelPrediction
from app.gemini.service import analyzeHazardWithGemini
from app.reports.validation import validateDuplicateReport, checkNearbyReports
from app.models.report_ranker import calculate_priority_score, get_priority_level
from app.auth.dependencies import get_optional_user, get_current_user, require_government_user

from app.reports.service import (
    createReport,
    getReports,
    getCitizenReports,
    getNearbyReports,
    getAdministrativeReports,
    getReportById,
    getReportTracking,
    updateReportStatus,
    updateReportVerification,
    assignReport,
    getHotspots,
    getMapReports,
    getGovernmentDashboard,
    deleteReport,
)

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

SEVERITY_MAP = {
    "flooding": 5,
    "urban_flooding": 5,
    "drainage_problem": 3,
    "pond_lake_problem": 3,
    "water_quality": 3,
    "normal": 0,
}


# =========================================================
# 1. ANALYZE IMAGE (ML FIRST -> MAXIMUM ONE GEMINI CALL)
# =========================================================

@router.post("/analyze")
async def analyzeReportMedia(
    image: UploadFile = File(...),
    claimedHazard: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
):
    imageBytes = await image.read()
    if len(imageBytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image file exceeds maximum limit of 10MB.",
        )

    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are supported.",
        )

    await image.seek(0)
    imagePath = saveImage(image, "uploads/temp")

    # STEP 1: MobileNetV2 ML Prediction
    mlResult = await getOwnModelPrediction(imagePath)
    mlCategory = mlResult.get("hazard_type", "unknown")
    mlConfidence = float(mlResult.get("confidence", 0.0))
    mlSeverity = int(mlResult.get("severity", 0))

    threshold = getattr(settings, "ML_CONFIDENCE_THRESHOLD", 0.70)
    print(f"[ANALYZE] ML Model output: category='{mlCategory}', conf={mlConfidence:.2f}, threshold={threshold}")

    # STEP 2: Conditional Gemini call if ML confidence < threshold or title/desc missing
    needs_gemini = (
        mlConfidence < threshold
        or not mlResult.get("available")
        or mlCategory in ["normal", "unknown", "irrelevant"]
        or not (title and title.strip())
        or not (description and description.strip())
    )

    if needs_gemini:
        print("[ANALYZE] Triggering SINGLE Gemini verification & enrichment...")
        geminiResult = await analyzeHazardWithGemini(
            imagePath=imagePath,
            mlCategory=mlCategory,
            mlConfidence=mlConfidence,
            mlSeverity=mlSeverity,
            citizenTitle=title,
            citizenDescription=description,
        )

        is_relevant = bool(geminiResult.get("is_relevant", False))
        gem_cat = geminiResult.get("hazard_type", "normal").lower()

        if not is_relevant or gem_cat in ["irrelevant", "normal", "unknown", "none"]:
            final_category = "irrelevant"
            final_confidence = float(geminiResult.get("confidence", 0.0))
            final_severity = 0
            is_relevant = False
            source = "quality_gate"
            source_label = geminiResult.get("sourceLabel", "JalDrishti Quality Gate")
            ai_title = "Irrelevant / Non-Hazard Image"
            ai_desc = geminiResult.get("description", "Image does not depict an outdoor water hazard (e.g. selfie/portrait/indoor photo).")
        else:
            final_category = gem_cat
            final_confidence = float(geminiResult.get("confidence", 0.90))
            final_severity = int(geminiResult.get("severity", 3))
            is_relevant = True
            source = geminiResult.get("source", "gemini")
            source_label = geminiResult.get("sourceLabel", "Verified by Gemini AI" if source == "gemini" else "Detected by MobileNetV2 ML Service")
            ai_title = title.strip() if (title and title.strip()) else geminiResult.get("title", f"{final_category.replace('_', ' ').title()} Incident")
            ai_desc = description.strip() if (description and description.strip()) else geminiResult.get("description", f"Observed {final_category.replace('_', ' ')} water problem on site.")
    else:
        # High confidence ML detection (>= 0.70)
        final_category = mlCategory
        final_confidence = mlConfidence
        final_severity = mlSeverity
        is_relevant = mlCategory not in ["normal", "unknown", "irrelevant"]
        source = "ml"
        source_label = "Detected by MobileNetV2 ML Service"
        ai_title = title.strip() if (title and title.strip()) else f"{final_category.replace('_', ' ').title()} Incident"
        ai_desc = description.strip() if (description and description.strip()) else f"Observed {final_category.replace('_', ' ')} water hazard on site."

    print(f"[ANALYZE RESULT] Category: '{final_category}' | Relevant: {is_relevant} | Title: '{ai_title}' | Source: '{source_label}'")

    return {
        "success": True,
        "hazard_type": final_category,
        "category": final_category,
        "severity": final_severity,
        "confidence": final_confidence,
        "source": source,
        "sourceLabel": source_label,
        "title": ai_title,
        "description": ai_desc,
        "is_relevant": is_relevant,
        "mlResult": mlResult,
    }


# =========================================================
# 2. CREATE REPORT (COMPLETE PIPELINE)
# =========================================================

@router.post("")
@router.post("/")
async def addReport(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    claimedHazard: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    locality: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    district: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    placeName: Optional[str] = Form(None),
    username: Optional[str] = Form(None),
    userId: Optional[str] = Form(None),
    source: Optional[str] = Form("CITIZEN"),
    user: Optional[dict] = Depends(get_optional_user),
):
    print(f"[REPORT] Received new report submission at ({latitude}, {longitude})")

    # Determine authenticated user
    effective_user_id = (user and (user.get("firebaseUid") or user.get("id") or user.get("userId"))) or userId or "anonymous"
    effective_username = (user and (user.get("name") or user.get("email"))) or username or "Citizen"

    # Step 1: Validate & Save Image
    imageBytes = await image.read()
    if len(imageBytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 10MB.")

    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG and WEBP images are allowed.")

    await image.seek(0)
    imagePath = saveImage(image, "uploads/reports")

    # Step 2: Duplicate Check
    claimed = category or claimedHazard or "flooding"
    duplicate_check = await validateDuplicateReport(
        imagePath=imagePath,
        latitude=latitude,
        longitude=longitude,
        hazardType=claimed,
        userId=effective_user_id,
    )

    if duplicate_check["isDuplicate"] and duplicate_check["duplicateType"] == "exact":
        print(f"[REPORT] Exact duplicate detected: {duplicate_check}")
        return {
            "success": False,
            "duplicate": True,
            "duplicateType": "exact",
            "existingReportId": duplicate_check["existingReportId"],
            "message": duplicate_check["message"],
        }

    # Step 3: ML Detection First
    mlResult = await getOwnModelPrediction(imagePath)
    ml_category = mlResult.get("hazard_type", "unknown")
    ml_confidence = float(mlResult.get("confidence", 0.0))
    ml_severity = int(mlResult.get("severity", 3))

    threshold = getattr(settings, "ML_CONFIDENCE_THRESHOLD", 0.70)
    final_category = ml_category if ml_category not in ["unknown", "normal"] else claimed
    final_confidence = ml_confidence
    final_severity = ml_severity if ml_severity > 0 else SEVERITY_MAP.get(final_category, 3)
    detection_source = "ml"

    final_title = title.strip() if title and title.strip() else ""
    final_desc = description.strip() if description and description.strip() else ""
    gemini_data = {}

    # Step 4: Conditional Gemini Verification & Enrichment
    has_text = bool(final_title and final_desc)
    has_category = final_category not in ["unknown", "normal"]

    needs_gemini = (
        not has_text
        or
        not has_category
        and (
            ml_confidence < threshold
            or not mlResult.get("available")
            or ml_category in ["unknown", "normal"]
        )
    )

    if needs_gemini:
        print("[REPORT] Calling single Gemini verification & text generator...")
        geminiResult = await analyzeHazardWithGemini(
            imagePath=imagePath,
            mlCategory=ml_category,
            mlConfidence=ml_confidence,
            mlSeverity=ml_severity,
            citizenTitle=title,
            citizenDescription=description,
        )
        gemini_data = geminiResult

        if (
            geminiResult.get("confidence", 0.0) > ml_confidence
            or ml_category in ["unknown", "normal"]
            or not mlResult.get("available")
        ):
            final_category = geminiResult.get("hazard_type", final_category)
            final_confidence = float(geminiResult.get("confidence", final_confidence))
            final_severity = int(geminiResult.get("severity", final_severity))
            detection_source = "gemini"

        if not final_title:
            final_title = geminiResult.get("title", f"{final_category.replace('_', ' ').title()} Incident")
        if not final_desc:
            final_desc = geminiResult.get("description", "Water hazard reported on site.")

    if not final_title:
        final_title = f"{final_category.replace('_', ' ').title()} Incident"
    if not final_desc:
        final_desc = f"Reported {final_category.replace('_', ' ')} condition."

    # Step 5: Reverse Geocoding
    locationInfo = await reverseGeocode(latitude, longitude)
    if locality and locality.strip():
        locationInfo["locality"] = locality.strip()
    if city and city.strip():
        locationInfo["city"] = city.strip()
    if district and district.strip():
        locationInfo["district"] = district.strip()
    if state and state.strip():
        locationInfo["state"] = state.strip()
    if placeName and placeName.strip():
        locationInfo["formattedAddress"] = placeName.strip()

    # Safeguard: if citizen typed Kanpur / Green Park / Bhauti / PSIT, enforce accurate UP jurisdiction
    p_text = f"{placeName or ''} {locality or ''} {city or ''}".lower()
    if any(k in p_text for k in ["kanpur", "green park", "vip road", "hazelnut", "bhauti", "psit", "civil lines", "bakarmandi", "sisamau", "kidwai"]):
        locationInfo["city"] = "Kanpur"
        locationInfo["district"] = "Kanpur Nagar"
        locationInfo["state"] = "Uttar Pradesh"
        if "green park" in p_text or "vip road" in p_text or "hazelnut" in p_text:
            locationInfo["locality"] = "VIP Road / Green Park"
        elif "bhauti" in p_text or "psit" in p_text:
            locationInfo["locality"] = "Bhauti / PSIT"

    # Step 6: Nearby Corroboration Count
    nearbyCount = await checkNearbyReports(
        latitude=latitude,
        longitude=longitude,
        category=final_category,
        radius_km=1.0,
    )

    # Step 7: Priority Calculation
    priority_score = calculate_priority_score(
        severity=final_severity,
        affected_people=15,
        hazard_type=final_category,
        confidence=final_confidence,
        report_time=datetime.utcnow(),
        area_report_count=nearbyCount + 1,
        validation={"governmentAlert": {"found": False}},
    )
    priority_level = get_priority_level(priority_score)

    # Step 8: Save to MongoDB Atlas
    report_payload = {
        "userId": str(effective_user_id),
        "username": str(effective_username),
        "title": final_title,
        "description": final_desc,
        "category": final_category,
        "hazardTypeClaimed": claimed,
        "hazardTypeVerified": final_category,
        "claimVerified": claimed.lower() == final_category.lower(),
        "severity": final_severity,
        "priority": priority_level,
        "priorityScore": priority_score,
        "governmentPriority": priority_level.lower(),
        "city": locationInfo.get("city", ""),
        "district": locationInfo.get("district", ""),
        "state": locationInfo.get("state", ""),
        "locality": locationInfo.get("locality", ""),
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "state": locationInfo.get("state", ""),
            "district": locationInfo.get("district", ""),
            "city": locationInfo.get("city", ""),
            "locality": locationInfo.get("locality", ""),
            "formattedAddress": locationInfo.get("formattedAddress", f"{latitude:.4f}, {longitude:.4f}"),
        },
        "imageUrl": imagePath,
        "imageHash": duplicate_check.get("imageHash"),
        "source": source.upper() if source else "CITIZEN",
        "mlAnalysis": {
            "category": final_category,
            "confidence": final_confidence,
            "severity": final_severity,
            "source": detection_source,
            "raw": mlResult,
        },
        "geminiAnalysis": gemini_data,
        "aiAnalysis": {
            "title": final_title,
            "description": final_desc,
            "detectedIssue": final_category,
            "source": detection_source,
            "sourceLabel": "Detected by MobileNetV2 ML Service" if detection_source == "ml" else "Verified by Gemini AI",
            "explanation": gemini_data.get("explanation", ""),
        },
        "validation": {
            "duplicate": duplicate_check["duplicateType"] == "potential",
            "duplicateType": duplicate_check["duplicateType"],
            "imageSimilarity": float(duplicate_check.get("imageSimilarity", 0.0)),
            "nearbyReportsCount": nearbyCount,
        },
        "status": "submitted",
        "reportStatus": "Open",
    }

    created = await createReport(report_payload)

    return {
        "success": True,
        "message": "Report submitted successfully",
        "reportId": created["publicReportId"],
        "id": created["insertedId"],
        "publicReportId": created["publicReportId"],
        "category": final_category,
        "confidence": final_confidence,
        "severity": final_severity,
        "priority": priority_level,
        "status": "submitted",
        "location": report_payload["location"],
        "aiAnalysis": report_payload["aiAnalysis"],
        "duplicate": duplicate_check["duplicateType"] == "potential",
        "duplicateMessage": duplicate_check.get("message") if duplicate_check["duplicateType"] == "potential" else None,
        "report": created["report"],
    }


# =========================================================
# 3. GET CITIZEN'S OWN REPORTS
# =========================================================

@router.get("/my")
async def getMyReports(user: dict = Depends(get_current_user)):
    user_id = user.get("firebaseUid") or user.get("id") or user.get("userId")
    email = user.get("email")
    reports = await getCitizenReports(user_id=str(user_id), email=email)
    return {
        "success": True,
        "count": len(reports),
        "reports": reports,
    }


# =========================================================
# 4. GET NEARBY REPORTS (Dynamic Geolocation)
# =========================================================

@router.get("/nearby")
async def fetchNearbyReports(
    latitude: float = Query(..., description="Citizen's current latitude"),
    longitude: float = Query(..., description="Citizen's current longitude"),
    radiusKm: float = Query(5.0, gt=0, le=100, description="Search radius in km"),
    category: Optional[str] = Query(None, description="Optional hazard category filter"),
):
    nearby = await getNearbyReports(
        latitude=latitude,
        longitude=longitude,
        radiusKm=radiusKm,
        category=category,
    )
    return {
        "success": True,
        "count": len(nearby),
        "radiusKm": radiusKm,
        "reports": nearby,
    }


# =========================================================
# 5. GET ADMINISTRATIVE REPORTS (Government Large Area View)
# =========================================================

@router.get("/admin")
async def fetchAdminReports(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    locality: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    user: dict = Depends(require_government_user),
):
    reports = await getAdministrativeReports(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category,
        status=status,
        priority=priority,
        source=source,
        department=department,
    )
    return {
        "success": True,
        "count": len(reports),
        "reports": reports,
    }


@router.get("/admin/dashboard")
async def fetchGovernmentDashboard(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    locality: Optional[str] = Query(None),
    user: dict = Depends(require_government_user),
):
    dashboard_data = await getGovernmentDashboard(
        state=state,
        district=district,
        city=city,
        locality=locality,
    )
    return {
        "success": True,
        "data": dashboard_data,
    }


# =========================================================
# 6. GET MAP REPORTS & HOTSPOTS
# =========================================================

@router.get("/map")
async def fetchMapReports(
    state: Optional[str] = None,
    district: Optional[str] = None,
    city: Optional[str] = None,
    locality: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
):
    map_data = await getMapReports(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category,
        status=status,
    )
    return {
        "success": True,
        "count": map_data["reportCount"],
        "reportCount": map_data["reportCount"],
        "hotspotCount": map_data["hotspotCount"],
        "reports": map_data["reports"],
        "hotspots": map_data["hotspots"],
    }


@router.get("/hotspots")
async def fetchHotspots(category: Optional[str] = None):
    hotspots = await getHotspots(category=category)
    return {
        "success": True,
        "count": len(hotspots),
        "hotspots": hotspots,
    }


# =========================================================
# 7. GET SINGLE REPORT & TRACKING
# =========================================================

@router.get("/{reportId}/track")
async def trackReport(reportId: str):
    report = await getReportTracking(reportId)
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report with ID '{reportId}' not found.",
        )
    return {
        "success": True,
        "report": report,
    }


@router.get("/{reportId}")
async def fetchReportById(reportId: str):
    report = await getReportById(reportId)
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report with ID '{reportId}' not found.",
        )
    return report


# =========================================================
# 8. GOVERNMENT VERIFICATION & STATUS UPDATES
# =========================================================

@router.put("/{reportId}/verification")
async def updateVerification(
    reportId: str,
    status: str = Form(...),
    officerNotes: Optional[str] = Form(None),
    assignedDepartment: Optional[str] = Form(None),
    user: dict = Depends(require_government_user),
):
    success = await updateReportVerification(
        reportId=reportId,
        status=status,
        verifiedBy=user.get("name", "Government Official"),
        officerNotes=officerNotes,
        assignedDepartment=assignedDepartment,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Report not found or update failed.")

    return {
        "success": True,
        "message": f"Report marked as {status}",
    }


@router.put("/{reportId}/status")
async def changeReportStatus(
    reportId: str,
    status: str = Form(...),
    officerNotes: Optional[str] = Form(None),
    user: dict = Depends(require_government_user),
):
    success = await updateReportStatus(
        reportId=reportId,
        status=status,
        officerNotes=officerNotes,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Report not found or status update failed.")

    return {
        "success": True,
        "message": f"Status updated to {status}",
    }


@router.put("/{reportId}/assign")
async def assignReportDepartment(
    reportId: str,
    department: str = Form(...),
    assignedTo: Optional[str] = Form(None),
    user: dict = Depends(require_government_user),
):
    success = await assignReport(
        reportId=reportId,
        department=department,
        assignedTo=assignedTo,
        assignedBy=user.get("name", "Command Center"),
    )
    if not success:
        raise HTTPException(status_code=404, detail="Report not found or assignment failed.")

    return {
        "success": True,
        "message": f"Report assigned to {department}",
    }


@router.delete("/{reportId}")
async def removeReport(
    reportId: str,
    user: dict = Depends(require_government_user),
):
    success = await deleteReport(reportId)
    if not success:
        raise HTTPException(status_code=404, detail="Report not found or delete failed.")
    return {
        "success": True,
        "message": "Report deleted successfully.",
    }


@router.get("/")
async def fetchAllReports():
    reports = await getReports()
    return {
        "count": len(reports),
        "reports": reports,
    }