# Backend/app/reports/routes.py

from datetime import datetime
import asyncio

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    BackgroundTasks,
)

from app.database import database

from app.gemini.service import (
    verifyHazard,
    generateReportText,
)

from app.ml_client import (
    getOwnModelPrediction,
    sendCorrectionToML,
)

from app.reports.validation import (
    checkDuplicateImage,
    checkNearbyReports,
)

from app.reports.service import (
    createReport,
    getReports,
    getHotspots,
    getMapReports,
    getNearbyReports,
    getReportById,
    updateReportStatus,
)

from app.utils.fileHandler import saveImage
from app.utils.geocode import reverseGeocode

from app.models.report_ranker import rank_reports


router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


# =========================================================
# CONFIGURATION
# =========================================================

MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB

CONFIDENCE_THRESHOLD = 0.70

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


# =========================================================
# HAZARD / SEVERITY CONFIGURATION
# =========================================================

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
# COMMON HELPERS
# =========================================================

async def validate_image(image: UploadFile):
    """
    Validate image type and size before saving it.
    """

    if not image:
        raise HTTPException(
            status_code=400,
            detail="Image is required",
        )

    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed",
        )

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty",
        )

    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image must be under 8MB",
        )

    await image.seek(0)

    return image_bytes


def clean_text(value) -> str:
    """
    Safely convert optional values into clean strings.
    """

    if value is None:
        return ""

    return str(value).strip()


def normalize_confidence(value) -> float:
    """
    Keep confidence safely between 0 and 1.
    """

    try:
        value = float(value)
    except (TypeError, ValueError):
        return 0.0

    return max(0.0, min(1.0, value))


def normalize_severity(value, category: str) -> int:
    """
    Convert severity into integer 0-5.

    If ML does not provide a valid severity,
    use the category mapping.
    """

    try:
        severity = int(value)
    except (TypeError, ValueError):
        severity = SEVERITY_MAP.get(category, 0)

    if severity < 0:
        severity = 0

    if severity > 5:
        severity = 5

    return severity


# =========================================================
# ANALYZE IMAGE
# ML FIRST -> GEMINI FALLBACK -> AI TEXT
# =========================================================

@router.post("/analyze")
async def analyzeReport(
    image: UploadFile = File(...)
):
    """
    Analyze an image before final report submission.

    Flow:

    1. Validate image
    2. Save temporary image
    3. ML prediction
    4. Gemini fallback if confidence is low
    5. Gemini relevance verification if necessary
    6. Generate title/description
    7. Return analysis to frontend
    """

    print("ANALYZE: request received")

    # -----------------------------------------------------
    # STEP 1: VALIDATE IMAGE
    # -----------------------------------------------------

    await validate_image(image)

    # -----------------------------------------------------
    # STEP 2: SAVE TEMP IMAGE
    # -----------------------------------------------------

    image_path = saveImage(
        image,
        "uploads/temp",
    )

    print("ANALYZE: image saved:", image_path)

    # -----------------------------------------------------
    # STEP 3: ML FIRST
    # -----------------------------------------------------

    print("ANALYZE: calling ML model")

    ml_result = await getOwnModelPrediction(
        image_path
    )

    category = clean_text(
        ml_result.get("hazard_type")
    ) or "normal"

    confidence = normalize_confidence(
        ml_result.get("confidence")
    )

    severity = normalize_severity(
        ml_result.get("severity"),
        category,
    )

    source = "ml"

    print(
        f"[ANALYZE ML] "
        f"{category} @ {confidence:.4f}"
    )

    # -----------------------------------------------------
    # STEP 4: GEMINI FALLBACK
    # -----------------------------------------------------

    if confidence < CONFIDENCE_THRESHOLD:

        print(
            "[ANALYZE FALLBACK] "
            "ML confidence below threshold"
        )

        verify = await verifyHazard(
            image_path
        )

        if not verify.get("is_relevant", False):

            raise HTTPException(
                status_code=400,
                detail="NOT_RELEVANT_IMAGE",
            )

        gemini_category = clean_text(
            verify.get("hazard_type")
        )

        gemini_confidence = normalize_confidence(
            verify.get("confidence")
        )

        if (
            gemini_category
            and gemini_confidence > confidence
        ):
            category = gemini_category
            confidence = gemini_confidence

            severity = normalize_severity(
                verify.get("severity"),
                category,
            )

            source = "gemini_fallback"

    # -----------------------------------------------------
    # STEP 5: NORMAL / NON-HAZARD CHECK
    # -----------------------------------------------------

    if category == "normal":

        print(
            "[ANALYZE] ML classified image as normal"
        )

        verify = await verifyHazard(
            image_path
        )

        if not verify.get("is_relevant", False):

            raise HTTPException(
                status_code=400,
                detail="NOT_RELEVANT_IMAGE",
            )

        gemini_category = clean_text(
            verify.get("hazard_type")
        ) or "normal"

        category = gemini_category

        confidence = normalize_confidence(
            verify.get("confidence")
        )

        severity = normalize_severity(
            verify.get("severity"),
            category,
        )

        source = "gemini_fallback"

    # -----------------------------------------------------
    # STEP 6: GENERATE REPORT TEXT
    # -----------------------------------------------------

    print(
        "[ANALYZE] generating title and description"
    )

    text_result = await generateReportText(
        image_path
    )

    generated_title = clean_text(
        text_result.get("title")
    )

    generated_description = clean_text(
        text_result.get("description")
    )

    # -----------------------------------------------------
    # FINAL RESPONSE
    # -----------------------------------------------------

    return {
        "success": True,
        "hazard_type": category,
        "severity": severity,
        "confidence": confidence,
        "source": source,
        "title": generated_title,
        "description": generated_description,
        "is_relevant": category != "normal",
    }


# =========================================================
# CREATE REPORT
# =========================================================

@router.post("/")
async def addReport(
    title: str = Form(""),
    description: str = Form(""),
    latitude: float = Form(...),
    longitude: float = Form(...),
    claimedHazard: str = Form(""),
    image: UploadFile = File(...),
):
    """
    Final report submission pipeline.

    Flow:

    Upload
      ↓
    Validate
      ↓
    Save image
      ↓
    ML
      ↓
    Gemini fallback
      ↓
    Relevance validation
      ↓
    Generate missing text
      ↓
    Duplicate image check
      ↓
    Nearby report check
      ↓
    Claim correction
      ↓
    Reverse geocoding
      ↓
    Save MongoDB
    """

    print("")
    print("==========================================")
    print("STEP 1: Report request received")
    print("==========================================")

    # =====================================================
    # CLEAN USER INPUT
    # =====================================================

    title = clean_text(title)
    description = clean_text(description)
    claimedHazard = clean_text(claimedHazard)

    # =====================================================
    # VALIDATE LOCATION
    # =====================================================

    if not (-90 <= latitude <= 90):
        raise HTTPException(
            status_code=400,
            detail="Invalid latitude",
        )

    if not (-180 <= longitude <= 180):
        raise HTTPException(
            status_code=400,
            detail="Invalid longitude",
        )

    # =====================================================
    # STEP 2: VALIDATE IMAGE
    # =====================================================

    print("STEP 2: Validating uploaded image")

    await validate_image(image)

    # =====================================================
    # STEP 3: SAVE IMAGE
    # =====================================================

    imagePath = saveImage(
        image,
        "uploads/reports",
    )

    print(
        "STEP 3: Image saved:",
        imagePath,
    )

    # =====================================================
    # STEP 4: ML FIRST
    # =====================================================

    print(
        "STEP 4: Sending image to ML service"
    )

    mlResult = await getOwnModelPrediction(
        imagePath
    )

    category = clean_text(
        mlResult.get("hazard_type")
    ) or "normal"

    confidence = normalize_confidence(
        mlResult.get("confidence")
    )

    severity = normalize_severity(
        mlResult.get("severity"),
        category,
    )

    source = "ml"

    print(
        f"[ML] {category} @ {confidence:.4f}"
    )

    # =====================================================
    # STEP 5: GEMINI FALLBACK
    # =====================================================

    if confidence < CONFIDENCE_THRESHOLD:

        print(
            "[FALLBACK] "
            "ML confidence below 70%, "
            "verifying with Gemini"
        )

        verify = await verifyHazard(
            imagePath
        )

        if not verify.get("is_relevant", False):

            raise HTTPException(
                status_code=400,
                detail="NOT_RELEVANT_IMAGE",
            )

        geminiCategory = clean_text(
            verify.get("hazard_type")
        )

        geminiConfidence = normalize_confidence(
            verify.get("confidence")
        )

        if (
            geminiCategory
            and geminiConfidence > confidence
        ):
            category = geminiCategory

            confidence = geminiConfidence

            severity = normalize_severity(
                verify.get("severity"),
                category,
            )

            source = "gemini_fallback"

    # =====================================================
    # STEP 6: NON-HAZARD VALIDATION
    # =====================================================

    if category == "normal":

        print(
            "[VALIDATION] "
            "ML result is normal. "
            "Checking with Gemini."
        )

        verify = await verifyHazard(
            imagePath
        )

        if not verify.get("is_relevant", False):

            raise HTTPException(
                status_code=400,
                detail="NOT_RELEVANT_IMAGE",
            )

        category = (
            clean_text(
                verify.get("hazard_type")
            )
            or "normal"
        )

        confidence = normalize_confidence(
            verify.get("confidence")
        )

        severity = normalize_severity(
            verify.get("severity"),
            category,
        )

        source = "gemini_fallback"

    # Still normal after Gemini = reject
    if category == "normal":

        raise HTTPException(
            status_code=400,
            detail="NOT_RELEVANT_IMAGE",
        )

    verifiedHazard = category

    print(
        "[FINAL DECISION]",
        f"category={verifiedHazard},",
        f"severity={severity},",
        f"confidence={confidence:.4f},",
        f"source={source}",
    )

    # =====================================================
    # STEP 7: TITLE / DESCRIPTION
    # =====================================================

    print(
        "[TEXT] Checking title and description"
    )

    # We generate text only when something is missing.
    needsGeneratedText = (
        not title
        or not description
    )

    if needsGeneratedText:

        print(
            "[TEXT] Missing title/description."
            " Generating with Gemini."
        )

        textResult = await generateReportText(
            imagePath
        )

    else:

        print(
            "[TEXT] User provided title "
            "and description. Keeping them."
        )

        textResult = {
            "title": "",
            "description": "",
        }

    generatedTitle = clean_text(
        textResult.get("title")
    )

    generatedDescription = clean_text(
        textResult.get("description")
    )

    # IMPORTANT:
    # User input wins.
    finalTitle = (
        title
        if title
        else generatedTitle
    )

    finalDescription = (
        description
        if description
        else generatedDescription
    )

    # Safety fallback
    if not finalTitle:

        finalTitle = (
            f"{verifiedHazard.replace('_', ' ').title()} "
            "Reported"
        )

    if not finalDescription:

        finalDescription = (
            f"Water-related hazard detected: "
            f"{verifiedHazard.replace('_', ' ')}."
        )

    print(
        "[TEXT FINAL]",
        f"title={finalTitle}",
    )

    # =====================================================
    # STEP 8: PARALLEL VALIDATION
    # =====================================================

    print(
        "[VALIDATION] "
        "Checking duplicate image and nearby reports"
    )

    duplicateTask = checkDuplicateImage(
        imagePath
    )

    nearbyTask = checkNearbyReports(
        latitude,
        longitude,
        verifiedHazard,
    )

    duplicateCheck, nearbyCount = await asyncio.gather(
        duplicateTask,
        nearbyTask,
    )

    # =====================================================
    # DUPLICATE VALIDATION
    # =====================================================

    if duplicateCheck.get("isDuplicate", False):

        print(
            "[VALIDATION] Duplicate image detected"
        )

        raise HTTPException(
            status_code=400,
            detail="DUPLICATE_IMAGE",
        )

    imageHash = duplicateCheck.get(
        "hash",
        "",
    )

    imageSimilarity = float(
        duplicateCheck.get(
            "maxSimilarity",
            0,
        )
    )

    nearbyCount = int(
        nearbyCount or 0
    )

    print(
        "[VALIDATION]",
        f"nearbyReports={nearbyCount}",
        f"imageSimilarity={imageSimilarity}",
    )

    # =====================================================
    # STEP 9: CLAIM VERIFICATION
    # =====================================================

    claimVerified = (
        claimedHazard.lower()
        == verifiedHazard.lower()
    )

    if not claimVerified:

        print(
            "[CLAIM CORRECTION]",
            f"User claimed '{claimedHazard}',",
            f"AI verified '{verifiedHazard}'",
        )

    # =====================================================
    # STEP 10: REVERSE GEOCODING
    # =====================================================

    print(
        "[LOCATION] Reverse geocoding"
    )
    print(
    "[LOCATION INPUT]",
    f"latitude={latitude}",
    f"longitude={longitude}",
)
    locationInfo = await reverseGeocode(
        latitude,
        longitude,
    )

    # =====================================================
    # STEP 11: NORMALIZE VALUES
    # =====================================================

    verifiedHazard = str(
        verifiedHazard
    )

    confidence = float(
        confidence
    )

    severity = int(
        severity
    )

    source = str(
        source
    )

    claimVerified = bool(
        claimVerified
    )

    # =====================================================
    # STEP 12: REPORT DATA
    # =====================================================

    now = datetime.utcnow()

    reportData = {

        # -----------------------------------------------
        # Citizen / generated content
        # -----------------------------------------------

        "title": finalTitle,

        "description": finalDescription,

        # -----------------------------------------------
        # Hazard classification
        # -----------------------------------------------

        "hazardTypeClaimed": claimedHazard,

        "hazardTypeVerified": verifiedHazard,

        "claimVerified": claimVerified,

        # -----------------------------------------------
        # Priority
        # -----------------------------------------------

        "severity": severity,

        "priority": severity,

        # -----------------------------------------------
        # Location
        # -----------------------------------------------

        "city": locationInfo.get(
            "city"
        ),

        "state": locationInfo.get(
            "state"
        ),

        "location": {
            "latitude": latitude,
            "longitude": longitude,
        },

        # -----------------------------------------------
        # Media
        # -----------------------------------------------

        "imageUrl": imagePath,

        "imageHash": imageHash,

        # -----------------------------------------------
        # AI text
        # -----------------------------------------------

        "aiAnalysis": {

            "title": generatedTitle,

            "description": generatedDescription,
        },

        # -----------------------------------------------
        # ML analysis
        # -----------------------------------------------

        "mlAnalysis": {

            "category": verifiedHazard,

            "severity": severity,

            "confidence": confidence,

            "source": source,
        },

        # -----------------------------------------------
        # Validation
        # -----------------------------------------------

        "validation": {

            "duplicateImage": False,

            "imageSimilarity": imageSimilarity,

            "nearbySimilarReports": nearbyCount,

            "confidence": confidence,

            "isRelevant": True,

            "claimVerified": claimVerified,
        },

        # -----------------------------------------------
        # Status
        # -----------------------------------------------

        "reportStatus": "Open",

        # -----------------------------------------------
        # Timestamps
        # -----------------------------------------------

        "createdAt": now,

        "updatedAt": now,
    }

    # =====================================================
    # STEP 13: SAVE
    # =====================================================

    print(
        "STEP 13: Saving report to MongoDB"
    )

    insertedId = await createReport(
        reportData
    )

    print(
        "STEP 14: Report saved successfully"
    )

    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return {

        "success": True,

        "message": "Report submitted successfully",

        "reportId": str(
            insertedId
        ),

        # Frontend can use this to update
        # its processing screen.

        "processing": {
            "imageUploaded": True,
            "mlAnalyzed": True,
            "geminiFallbackUsed": (
                source == "gemini_fallback"
            ),
            "textGenerated": (
                bool(generatedTitle)
                or bool(generatedDescription)
            ),
            "duplicateChecked": True,
            "nearbyReportsChecked": True,
            "locationVerified": True,
        },

        "report": {

            "title": finalTitle,

            "description": finalDescription,

            "hazardType": verifiedHazard,

            "severity": severity,

            "confidence": confidence,

            "source": source,

            "priority": severity,

            "nearbySimilarReports": nearbyCount,

            "claimVerified": claimVerified,
        },

        "aiAnalysis": reportData[
            "aiAnalysis"
        ],

        "mlAnalysis": reportData[
            "mlAnalysis"
        ],

        "validation": reportData[
            "validation"
        ],
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
async def fetchHotspots(
    category: str | None = None,
):

    hotspots = await getHotspots(
        category
    )

    return {
        "count": len(hotspots),
        "hotspots": hotspots,
    }


# =========================================================
# GET MAP REPORTS
# =========================================================

@router.get("/map")
async def fetchMapReports(
    category: str | None = None,
):

    reports = await getMapReports(
        category
    )

    return {
        "count": len(reports),
        "reports": reports,
    }


# =========================================================
# GET NEARBY REPORTS
# =========================================================

@router.get("/nearby")
async def fetchNearbyReports(
    latitude: float,
    longitude: float,
    radiusKm: float = 5,
):

    if radiusKm <= 0:
        raise HTTPException(
            status_code=400,
            detail="radiusKm must be greater than 0",
        )

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
# GET RANKED REPORTS
# =========================================================

@router.get("/ranked")
async def getRankedReports():

    docs = await database.reports.find(
        {}
    ).to_list(
        length=500
    )

    print(
        "TOTAL DOCS FROM MONGODB:",
        len(docs),
    )

    reports = []

    for doc in docs:

        loc = doc.get(
            "location",
            {},
        )

        ml = doc.get(
            "mlAnalysis",
            {},
        )

        reports.append({

            "report_id": str(
                doc["_id"]
            ),

            "severity": ml.get(
                "severity",
                doc.get(
                    "severity",
                    0,
                ),
            ),

            "affected_people": doc.get(
                "affectedPeople",
                0,
            ),

            "hazard_type": (
                doc.get(
                    "hazardTypeVerified"
                )
                or ml.get(
                    "category"
                )
            ),

            "confidence": ml.get(
                "confidence",
                0,
            ),

            "time": doc.get(
                "createdAt"
            ),

            "location": loc,

            "latitude": loc.get(
                "latitude"
            ),

            "longitude": loc.get(
                "longitude"
            ),

            "description": doc.get(
                "description",
                "",
            ),

            "validation": doc.get(
                "validation",
                {},
            ),
        })

    print(
        "REPORTS BEFORE RANKING:",
        len(reports),
    )

    ranked = rank_reports(
        reports
    )

    print(
        "RANKED REPORTS:",
        len(ranked),
    )

    return {
        "count": len(ranked),
        "reports": ranked,
    }


# =========================================================
# UPDATE REPORT STATUS
# =========================================================

RETRAIN_THRESHOLD = 30


@router.put("/{reportId}/status")
async def changeReportStatus(
    reportId: str,
    status: str,
    background_tasks: BackgroundTasks,
    correctedHazard: str | None = None,
):

    ALLOWED_STATUS = {
        "Open",
        "Accepted",
        "Rejected",
        "Resolved",
    }

    if status not in ALLOWED_STATUS:

        raise HTTPException(
            status_code=400,
            detail="Invalid status",
        )

    report = await getReportById(
        reportId
    )

    if report is None:

        raise HTTPException(
            status_code=404,
            detail="Report not found",
        )

    # -----------------------------------------------------
    # OFFICER CORRECTED ML RESULT
    # -----------------------------------------------------

    if (
        status.lower() == "accepted"
        and correctedHazard
        and report.get("imageUrl")
    ):

        background_tasks.add_task(
            sendCorrectionToML,
            report["imageUrl"],
            correctedHazard,
        )

    updated = await updateReportStatus(
        reportId,
        status,
    )

    if not updated:

        raise HTTPException(
            status_code=404,
            detail="Report not found",
        )

    return {

        "success": True,

        "message": (
            "Report status updated successfully"
        ),

        "reportId": reportId,

        "status": status,
    }


# =========================================================
# GET SINGLE REPORT
# =========================================================

@router.get("/{reportId}")
async def fetchReport(
    reportId: str,
):

    report = await getReportById(
        reportId
    )

    if report is None:

        raise HTTPException(
            status_code=404,
            detail="Report not found",
        )

    return report