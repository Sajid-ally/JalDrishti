from datetime import datetime

from app.location.service import reverseGeocode

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
    updateReportVerification,
    getReportTracking,
    getAdministrativeReports,
    getAdministrativeHotspots,
    getHotspotDetails,
    assignReport,
    getGovernmentDashboard
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
    username: str = Form("anonymous"),
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
    #
    # Gemini ONLY generates title and description.
    # It does NOT determine the water category.
    # -----------------------------------------------------

    print("STEP 3: Sending image to Gemini")

    aiResult = await analyzeImage(
        imagePath
    )

    print("STEP 4: Gemini response")
    print(aiResult)

    aiTitle = aiResult.get("title")

    aiDescription = aiResult.get(
        "description"
    )

    # -----------------------------------------------------
    # ML
    #
    # ML integration will be added later.
    # -----------------------------------------------------

    isWaterRelated = None

    category = None

    confidence = None

    # -----------------------------------------------------
    # REVERSE GEOCODING
    #
    # LATITUDE + LONGITUDE
    #        ↓
    # STATE
    # DISTRICT
    # CITY
    # LOCALITY
    # -----------------------------------------------------

    print(
        "STEP 5: Finding administrative location"
    )

    locationData = await reverseGeocode(
        latitude,
        longitude
    )

    print(
        "STEP 6: Administrative location"
    )

    print(locationData)

    # -----------------------------------------------------
    # TIMESTAMP
    # -----------------------------------------------------

    now = datetime.utcnow()

    # -----------------------------------------------------
    # CREATE REPORT DATA
    # -----------------------------------------------------

    reportData = {

        # -------------------------------------------------
        # BASIC REPORT INFORMATION
        # -------------------------------------------------

        "username": username,

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

        "imageUrl": imagePath,

        # -------------------------------------------------
        # LOCATION
        # -------------------------------------------------

        "location": {

            "latitude": latitude,

            "longitude": longitude,

            "state": locationData.get(
                "state"
            ),

            "district": locationData.get(
                "district"
            ),

            "city": locationData.get(
                "city"
            ),

            "locality": locationData.get(
                "locality"
            )
        },

        # -------------------------------------------------
        # ML ANALYSIS
        # -------------------------------------------------

        "mlAnalysis": {

            "isWaterRelated": isWaterRelated,

            "category": category,

            "confidence": confidence
        },

        # -------------------------------------------------
        # GEMINI ANALYSIS
        # -------------------------------------------------

        "aiAnalysis": {

            "title": aiTitle,

            "description": aiDescription
        },

        # -------------------------------------------------
        # REPORT MANAGEMENT
        # -------------------------------------------------

        "status": "submitted",

        "priority": "medium",

        # -------------------------------------------------
        # REPORT TIMELINE
        # -------------------------------------------------

        "timeline": [

            {

                "status": "submitted",

                "timestamp": now
            }

        ],

        # -------------------------------------------------
        # GOVERNMENT VERIFICATION
        # -------------------------------------------------

        "verification": {

            "status": "Pending",

            "verifiedBy": None,

            "verifiedAt": None
        },

        # -------------------------------------------------
        # -------------------------------------------------
        # TIMESTAMPS
        # -------------------------------------------------

        "createdAt": now,

        "updatedAt": now
    }

    # -----------------------------------------------------
    # SAVE TO MONGODB
    # -----------------------------------------------------

    print(
        "STEP 7: Saving report to MongoDB"
    )

    insertedId = await createReport(
        reportData
    )

    print(
        "STEP 8: Report saved"
    )

    return {

        "message": "Report submitted successfully",

        "reportId": str(
            insertedId
        ),

        "status": reportData[
            "status"
        ],

        "location": reportData[
            "location"
        ],

        "aiAnalysis": reportData[
            "aiAnalysis"
        ],

        "mlAnalysis": reportData[
            "mlAnalysis"
        ]
    }


# =========================================================
# GET ALL REPORTS
# =========================================================

@router.get("/")
async def fetchReports():

    print(
        "FETCHING REPORTS"
    )

    reports = await getReports()

    return {

        "count": len(
            reports
        ),

        "reports": reports
    }


# =========================================================
# GET HOTSPOTS
# =========================================================

@router.get("/hotspots")
async def fetchHotspots(
    category: str = None
):

    print(
        "FETCHING HOTSPOTS"
    )

    hotspots = await getHotspots(
        category
    )

    return {

        "count": len(
            hotspots
        ),

        "hotspots": hotspots
    }


# =========================================================
# GET MAP REPORTS
# =========================================================

@router.get("/map")
async def fetchMapReports(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None,
    status: str = None
):

    print(
        "FETCHING MAP DATA"
    )

    print("STATE:", state)
    print("DISTRICT:", district)
    print("CITY:", city)
    print("LOCALITY:", locality)
    print("CATEGORY:", category)
    print("STATUS:", status)

    # -----------------------------------------------------
    # REPORTS
    # -----------------------------------------------------

    reports = await getMapReports(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category,
        status=status
    )

    # -----------------------------------------------------
    # HOTSPOTS
    # -----------------------------------------------------
    #
    # Hotspots use the same geographic/category filters.
    # Status is not applied to hotspot clustering because
    # hotspot intensity should represent the reports in the
    # selected area/category.
    # -----------------------------------------------------

    hotspots = await getAdministrativeHotspots(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category
    )

    return {
        "count": len(reports),

        "filters": {
            "state": state,
            "district": district,
            "city": city,
            "locality": locality,
            "category": category,
            "status": status
        },

        "reportCount": len(reports),

        "hotspotCount": len(hotspots),

        "reports": reports,

        "hotspots": hotspots
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

    print(
        "FETCHING NEARBY REPORTS"
    )

    reports = await getNearbyReports(
        latitude,
        longitude,
        radiusKm
    )

    return {

        "count": len(
            reports
        ),

        "radiusKm": radiusKm,

        "reports": reports
    }

# =========================================================
# GET REPORTS BY ADMINISTRATIVE LOCATION
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

    print(
        "FETCHING ADMINISTRATIVE REPORTS"
    )

    reports = await getAdministrativeReports(

        state=state,

        district=district,

        city=city,

        locality=locality,

        category=category,

        status=status,

        priority=priority,
        
        department=department
    )

    return {

        "count": len(
            reports
        ),

        "filters": {

            "state": state,

            "district": district,

            "city": city,

            "locality": locality,

            "category": category,

            "status": status
        },

        "reports": reports
    }


# =========================================================
# GET ADMINISTRATIVE HOTSPOTS
# =========================================================

@router.get("/admin/hotspots")
async def fetchAdministrativeHotspots(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None
):

    print(
        "FETCHING ADMINISTRATIVE HOTSPOTS"
    )

    hotspots = await getAdministrativeHotspots(

        state=state,

        district=district,

        city=city,

        locality=locality,

        category=category
    )

    return {

        "count": len(
            hotspots
        ),

        "filters": {

            "state": state,

            "district": district,

            "city": city,

            "locality": locality,

            "category": category
        },

        "hotspots": hotspots
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
    category: str = None
):

    print(
        "FETCHING GOVERNMENT DASHBOARD"
    )

    dashboard = await getGovernmentDashboard(

        state=state,

        district=district,

        city=city,

        locality=locality,

        category=category
    )

    return dashboard


# =========================================================
# GET HOTSPOT DETAILS
# =========================================================

@router.get("/hotspots/{hotspotId}")
async def fetchHotspotDetails(
    hotspotId: str,
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None
):

    print(
        "FETCHING HOTSPOT DETAILS:",
        hotspotId
    )

    hotspot = await getHotspotDetails(

        hotspotId=hotspotId,

        state=state,

        district=district,

        city=city,

        locality=locality,

        category=category
    )

    if hotspot is None:

        return {
            "success": False,
            "message": "Hotspot not found"
        }

    return {
        "success": True,
        "hotspot": hotspot
    }

    
# =========================================================
# UPDATE REPORT VERIFICATION
# =========================================================

@router.put("/{reportId}/verification")
async def changeReportVerification(
    reportId: str,
    status: str,
    verifiedBy: str = None
):

    print("CHANGING REPORT VERIFICATION")

    updated = await updateReportVerification(
        reportId=reportId,
        status=status,
        verifiedBy=verifiedBy
    )

    if not updated:
        return {
            "success": False,
            "message": "Report not found"
        }

    if updated.get("success") is False:
        return updated

    return {
        "success": True,
        "message": "Report verification updated successfully",
        "reportId": reportId,
        "status": status,
        "verifiedBy": verifiedBy
    }


# =========================================================
# UPDATE REPORT STATUS
# =========================================================

@router.put("/{reportId}/status")
async def changeReportStatus(
    reportId: str,
    status: str
):

    print(
        "CHANGING REPORT STATUS"
    )

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

            "message":
                "Report not found"
        }

    return {

        "message":
            "Report status updated successfully",

        "reportId":
            reportId,

        "status":
            status
    }


# =========================================================
# TRACK MY REPORT
# =========================================================

@router.get("/{reportId}/track")
async def trackReport(
    reportId: str
):

    print(
        "TRACKING REPORT:",
        reportId
    )

    report = await getReportTracking(
        reportId
    )

    if report is None:

        return {

            "success": False,

            "message":
                "Report not found"
        }

    return {

        "success": True,

        "report": report
    }

# =========================================================
# ASSIGN REPORT TO DEPARTMENT
# =========================================================

@router.put("/{reportId}/assign")
async def assignReportToDepartment(
    reportId: str,
    department: str,
    assignedTo: str,
    assignedBy: str = "admin"
):

    print(
        "ASSIGN REPORT REQUEST"
    )

    print(
        "REPORT ID:",
        reportId
    )

    print(
        "DEPARTMENT:",
        department
    )

    print(
        "ASSIGNED TO:",
        assignedTo
    )

    result = await assignReport(

        reportId=reportId,

        department=department,

        assignedTo=assignedTo,

        assignedBy=assignedBy
    )

    if result.get("success") is False:

        return result

    return {

        "success": True,

        "message":
            "Report assigned successfully",

        "reportId":
            reportId,

        "assignment":
            result["assignment"]
    }

# =========================================================
# GET SINGLE REPORT
# =========================================================

@router.get("/{reportId}")
async def fetchReport(
    reportId: str
):

    print(
        "FETCHING SINGLE REPORT"
    )

    report = await getReportById(
        reportId
    )

    if report is None:

        return {

            "message":
                "Report not found"
        }

    return report