from datetime import datetime
from bson import ObjectId

from app.database import database

from app.notifications.service import createNotification


# =========================================================
# CREATE SOCIAL MEDIA CANDIDATE
# =========================================================

async def createSocialReport(data):

    # -----------------------------------------------------
    # Prevent duplicate social-media posts
    # -----------------------------------------------------

    existing = await database.social_reports.find_one({
        "platform": data.platform,
        "sourcePostId": data.sourcePostId
    })

    if existing:

        return {
            "success": False,
            "error": "social_report_already_exists",
            "socialReportId": str(existing["_id"])
        }

    # -----------------------------------------------------
    # Create candidate
    # -----------------------------------------------------

    socialReport = {

        "platform": data.platform,

        "sourcePostId": data.sourcePostId,

        "username": data.username,

        "title": data.title,

        "description": data.description,

        "imageUrl": data.imageUrl,

        "location": data.location.model_dump(),

        "category": (
            data.category.value
            if data.category
            else None
        ),

        "mlConfidence": data.mlConfidence,

        "postedAt": data.postedAt,

        "status": "pending_verification",

        "reviewedBy": None,

        "reviewedAt": None,

        "rejectionReason": None,

        "convertedReportId": None,

        "createdAt": datetime.utcnow(),

        "updatedAt": datetime.utcnow()
    }

    result = await database.social_reports.insert_one(
        socialReport
    )

    socialReportId = str(
        result.inserted_id
    )

    # -----------------------------------------------------
    # Notify admin
    # -----------------------------------------------------

    await createNotification(

        notificationType="social_report_pending",

        message=(
            "A new social-media water report "
            "is waiting for verification."
        ),

        reportId=socialReportId,

        username=data.username
    )

    return {

        "success": True,

        "message": (
            "Social media report submitted "
            "for verification."
        ),

        "socialReportId": socialReportId,

        "status": "pending_verification"
    }


# =========================================================
# GET SOCIAL MEDIA REPORTS
# =========================================================

async def getSocialReports(
    status: str = None,
    platform: str = None
):

    query = {}

    if status:
        query["status"] = status

    if platform:
        query["platform"] = platform

    cursor = database.social_reports.find(
        query
    ).sort(
        "createdAt",
        -1
    )

    reports = []

    async for report in cursor:

        reports.append({

            "socialReportId": str(
                report["_id"]
            ),

            "platform": report.get(
                "platform"
            ),

            "sourcePostId": report.get(
                "sourcePostId"
            ),

            "username": report.get(
                "username"
            ),

            "title": report.get(
                "title"
            ),

            "description": report.get(
                "description"
            ),

            "imageUrl": report.get(
                "imageUrl"
            ),

            "location": report.get(
                "location"
            ),

            "category": report.get(
                "category"
            ),

            "mlConfidence": report.get(
                "mlConfidence"
            ),

            "postedAt": report.get(
                "postedAt"
            ),

            "status": report.get(
                "status"
            ),

            "reviewedBy": report.get(
                "reviewedBy"
            ),

            "reviewedAt": (
                report["reviewedAt"].isoformat()
                if report.get("reviewedAt")
                else None
            ),

            "rejectionReason": report.get(
                "rejectionReason"
            ),

            "convertedReportId": report.get(
                "convertedReportId"
            ),

            "createdAt": (
                report["createdAt"].isoformat()
                if report.get("createdAt")
                else None
            )
        })

    return {

        "success": True,

        "count": len(reports),

        "reports": reports
    }


# =========================================================
# GET SINGLE SOCIAL REPORT
# =========================================================

async def getSocialReport(
    socialReportId: str
):

    try:

        objectId = ObjectId(
            socialReportId
        )

    except Exception:

        return {

            "success": False,

            "error": "invalid_social_report_id"
        }

    report = await database.social_reports.find_one({
        "_id": objectId
    })

    if not report:

        return {

            "success": False,

            "error": "social_report_not_found"
        }

    report["socialReportId"] = str(
        report.pop("_id")
    )

    if report.get("createdAt"):

        report["createdAt"] = (
            report["createdAt"].isoformat()
        )

    if report.get("updatedAt"):

        report["updatedAt"] = (
            report["updatedAt"].isoformat()
        )

    if report.get("reviewedAt"):

        report["reviewedAt"] = (
            report["reviewedAt"].isoformat()
        )

    return {

        "success": True,

        "report": report
    }


# =========================================================
# REVIEW SOCIAL REPORT
# =========================================================

async def reviewSocialReport(
    socialReportId: str,
    status: str,
    reviewedBy: str,
    rejectionReason: str = None
):

    # -----------------------------------------------------
    # Validate ID
    # -----------------------------------------------------

    try:

        objectId = ObjectId(
            socialReportId
        )

    except Exception:

        return {

            "success": False,

            "error": "invalid_social_report_id"
        }

    # -----------------------------------------------------
    # Find report
    # -----------------------------------------------------

    report = await database.social_reports.find_one({
        "_id": objectId
    })

    if not report:

        return {

            "success": False,

            "error": "social_report_not_found"
        }

    # -----------------------------------------------------
    # Only pending reports can be reviewed
    # -----------------------------------------------------

    if report.get("status") != "pending_verification":

        return {

            "success": False,

            "error": "social_report_already_reviewed",

            "currentStatus": report.get(
                "status"
            )
        }

    # -----------------------------------------------------
    # Validate status
    # -----------------------------------------------------

    if status not in [
        "approved",
        "rejected"
    ]:

        return {

            "success": False,

            "error": "invalid_review_status"
        }

    # -----------------------------------------------------
    # Rejection reason required
    # -----------------------------------------------------

    if status == "rejected" and not rejectionReason:

        return {

            "success": False,

            "error": "rejection_reason_required"
        }

    now = datetime.utcnow()

    updateData = {

        "status": status,

        "reviewedBy": reviewedBy,

        "reviewedAt": now,

        "rejectionReason": rejectionReason,

        "updatedAt": now
    }

    await database.social_reports.update_one(

        {
            "_id": objectId
        },

        {
            "$set": updateData
        }
    )

    # -----------------------------------------------------
    # Notification
    # -----------------------------------------------------

    await createNotification(

        notificationType=(
            "social_report_approved"
            if status == "approved"
            else "social_report_rejected"
        ),

        message=(
            "Social media report has been "
            + (
                "approved."
                if status == "approved"
                else "rejected."
            )
        ),

        reportId=socialReportId,

        username=report.get(
            "username"
        )
    )

    return {

        "success": True,

        "message": (
            "Social media report "
            + (
                "approved successfully."
                if status == "approved"
                else "rejected successfully."
            )
        ),

        "socialReportId": socialReportId,

        "status": status,

        "reviewedBy": reviewedBy
    }


# =========================================================
# CONVERT APPROVED SOCIAL REPORT → NORMAL REPORT
# =========================================================

async def convertSocialReport(
    socialReportId: str
):

    # -----------------------------------------------------
    # Validate ID
    # -----------------------------------------------------

    try:

        objectId = ObjectId(
            socialReportId
        )

    except Exception:

        return {

            "success": False,

            "error": "invalid_social_report_id"
        }

    # -----------------------------------------------------
    # Find candidate
    # -----------------------------------------------------

    socialReport = await database.social_reports.find_one({

        "_id": objectId

    })

    if not socialReport:

        return {

            "success": False,

            "error": "social_report_not_found"
        }

    # -----------------------------------------------------
    # Must be approved
    # -----------------------------------------------------

    if socialReport.get("status") != "approved":

        return {

            "success": False,

            "error": "social_report_must_be_approved",

            "currentStatus": socialReport.get(
                "status"
            )
        }

    # -----------------------------------------------------
    # Prevent duplicate conversion
    # -----------------------------------------------------

    if socialReport.get("convertedReportId"):

        return {

            "success": False,

            "error": "social_report_already_converted",

            "reportId": socialReport.get(
                "convertedReportId"
            )
        }

    # -----------------------------------------------------
    # Create normal report
    # -----------------------------------------------------

    report = {

        "username": (
            socialReport.get(
                "username"
            )
            or "social_media"
        ),

        "title": socialReport.get(
            "title"
        ),

        "description": socialReport.get(
            "description"
        ),

        "imageUrl": socialReport.get(
            "imageUrl"
        ),

        "category": socialReport.get(
            "category"
        ),

        "priority": "medium",

        "status": "submitted",

        "location": socialReport.get(
            "location"
        ),

        "aiAnalysis": None,

        "mlAnalysis": {

            "isWaterRelated": True,

            "category": socialReport.get(
                "category"
            ),

            "confidence": socialReport.get(
                "mlConfidence"
            )
        },

        "source": "social_media",

        "sourceSocialReportId": socialReportId,

        "timeline": [

            {

                "status": "submitted",

                "timestamp": datetime.utcnow()
            }

        ],

        "verification": {

            "status": "Verified",

            "verifiedBy": socialReport.get(
                "reviewedBy"
            ),

            "verifiedAt": (
                socialReport.get(
                    "reviewedAt"
                )
            )
        },

        "createdAt": datetime.utcnow(),

        "updatedAt": datetime.utcnow()
    }

    result = await database.reports.insert_one(
        report
    )

    reportId = str(
        result.inserted_id
    )

    # -----------------------------------------------------
    # Link social candidate to report
    # -----------------------------------------------------

    await database.social_reports.update_one(

        {
            "_id": objectId
        },

        {

            "$set": {

                "convertedReportId": reportId,

                "updatedAt": datetime.utcnow()

            }

        }
    )

    # -----------------------------------------------------
    # Notify
    # -----------------------------------------------------

    await createNotification(

        notificationType="social_report_converted",

        message=(
            "Verified social-media report "
            "has been added to Coastal Eye."
        ),

        reportId=reportId,

        username=socialReport.get(
            "username"
        )
    )

    return {

        "success": True,

        "message": (
            "Social media report converted "
            "to Coastal Eye report."
        ),

        "socialReportId": socialReportId,

        "reportId": reportId,

        "status": "submitted"
    }