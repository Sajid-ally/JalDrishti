from datetime import datetime
from bson import ObjectId
from app.database import database
from app.notifications.service import createNotification
from app.social_reports.social_media_service import (
    INTEGRATION_MODE,
    fetchClassifiedWaterRelatedPosts,
    getSocialMediaPost,
    updateVerificationStatus
)

# =========================================================
# CREATE SOCIAL MEDIA CANDIDATE (Ingestion Trigger)
# =========================================================

async def createSocialReport(data):
    # Prevent duplicate social-media verification logs
    existing = await database.social_reports.find_one({
        "externalSocialMediaPostId": data.sourcePostId
    })

    if existing:
        return {
            "success": False,
            "error": "social_report_already_exists",
            "socialReportId": str(existing["_id"])
        }

    # Write verification log metadata only (no duplicate post details)
    socialReport = {
        "externalSocialMediaPostId": data.sourcePostId,
        "status": "pending_verification",
        "reviewedBy": None,
        "reviewedAt": None,
        "rejectionReason": None,
        "convertedReportId": None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    await database.social_reports.insert_one(socialReport)

    # Notify admin
    await createNotification(
        notificationType="social_report_pending",
        message="A new social-media water report is waiting for verification.",
        reportId=data.sourcePostId,
        username=data.username
    )

    return {
        "success": True,
        "message": "Social media report submitted for verification.",
        "socialReportId": data.sourcePostId,
        "status": "pending_verification"
    }


# =========================================================
# GET SOCIAL MEDIA REPORTS (Verification Queue)
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

    reports = []
    cursor = database.social_reports.find(query).sort("createdAt", -1)
    async for verify in cursor:
        ext_id = verify.get("socialReportId") or verify.get("externalSocialMediaPostId") or verify.get("sourcePostId") or str(verify.get("_id"))
        created_at = verify.get("createdAt")
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        
        reviewed_at = verify.get("reviewedAt")
        if isinstance(reviewed_at, datetime):
            reviewed_at = reviewed_at.isoformat()

        reports.append({
            "id": ext_id,
            "socialReportId": ext_id,
            "platform": verify.get("platform", "coastal_social"),
            "sourcePostId": ext_id,
            "username": verify.get("username", "citizen"),
            "title": verify.get("title", "Reported Water Hazard"),
            "description": verify.get("description", verify.get("originalPostText", "")),
            "imageUrl": verify.get("imageUrl"),
            "location": verify.get("location") or {
                "latitude": 26.4499,
                "longitude": 80.3319,
                "city": "Kanpur",
                "state": "Uttar Pradesh"
            },
            "category": verify.get("category", "urban_flooding"),
            "mlConfidence": verify.get("mlConfidence", 0.90),
            "postedAt": verify.get("postedAt") or created_at,
            "status": verify.get("status", "pending_verification"),
            "reviewedBy": verify.get("reviewedBy"),
            "reviewedAt": reviewed_at,
            "rejectionReason": verify.get("rejectionReason"),
            "convertedReportId": verify.get("convertedReportId") or verify.get("jalDrishtiReportId"),
            "createdAt": created_at
        })

    # If empty and in mock mode, load mock posts
    if len(reports) == 0 and INTEGRATION_MODE == "mock":
        external_posts = await fetchClassifiedWaterRelatedPosts()
        for post in external_posts:
            reports.append(post)

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
    query = {
        "$or": [
            {"socialReportId": socialReportId},
            {"externalSocialMediaPostId": socialReportId},
            {"sourcePostId": socialReportId}
        ]
    }
    if ObjectId.is_valid(socialReportId):
        query["$or"].append({"_id": ObjectId(socialReportId)})

    verify = await database.social_reports.find_one(query)
    if not verify:
        post = await getSocialMediaPost(socialReportId)
        if not post:
            return {"success": False, "error": "social_report_not_found"}
        return {"success": True, "report": post}

    ext_id = verify.get("socialReportId") or verify.get("externalSocialMediaPostId") or socialReportId
    created_at = verify.get("createdAt")
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()

    reviewed_at = verify.get("reviewedAt")
    if isinstance(reviewed_at, datetime):
        reviewed_at = reviewed_at.isoformat()

    report = {
        "id": ext_id,
        "socialReportId": ext_id,
        "platform": verify.get("platform", "coastal_social"),
        "sourcePostId": ext_id,
        "username": verify.get("username", "citizen"),
        "title": verify.get("title", "Reported Water Hazard"),
        "description": verify.get("description", verify.get("originalPostText", "")),
        "imageUrl": verify.get("imageUrl"),
        "location": verify.get("location") or {
            "latitude": 26.4499,
            "longitude": 80.3319,
            "city": "Kanpur",
            "state": "Uttar Pradesh"
        },
        "category": verify.get("category", "urban_flooding"),
        "mlConfidence": verify.get("mlConfidence", 0.90),
        "postedAt": verify.get("postedAt") or created_at,
        "status": verify.get("status", "pending_verification"),
        "reviewedBy": verify.get("reviewedBy"),
        "reviewedAt": reviewed_at,
        "rejectionReason": verify.get("rejectionReason"),
        "convertedReportId": verify.get("convertedReportId") or verify.get("jalDrishtiReportId"),
        "createdAt": created_at
    }

    return {"success": True, "report": report}


# =========================================================
# REVIEW SOCIAL REPORT
# =========================================================

async def reviewSocialReport(
    socialReportId: str,
    status: str,
    reviewedBy: str,
    rejectionReason: str = None
):
    if status not in ["approved", "rejected"]:
        return {"success": False, "error": "invalid_review_status"}

    if status == "rejected" and not rejectionReason:
        return {"success": False, "error": "rejection_reason_required"}

    now = datetime.utcnow()
    query = {
        "$or": [
            {"socialReportId": socialReportId},
            {"externalSocialMediaPostId": socialReportId},
            {"sourcePostId": socialReportId}
        ]
    }
    if ObjectId.is_valid(socialReportId):
        query["$or"].append({"_id": ObjectId(socialReportId)})

    existing = await database.social_reports.find_one(query)

    updateData = {
        "status": status,
        "reviewedBy": reviewedBy,
        "reviewedAt": now,
        "rejectionReason": rejectionReason if status == "rejected" else None,
        "updatedAt": now
    }

    if existing:
        await database.social_reports.update_one(query, {"$set": updateData})
    else:
        updateData["externalSocialMediaPostId"] = socialReportId
        updateData["socialReportId"] = socialReportId
        updateData["createdAt"] = now
        await database.social_reports.insert_one(updateData)

    # If rejected, ensure any active report in database.reports is removed
    if status == "rejected":
        await database.reports.delete_many({
            "$or": [
                {"socialPostId": socialReportId},
                {"sourceSocialReportId": socialReportId}
            ]
        })

    # Create notifications
    await createNotification(
        notificationType="social_report_approved" if status == "approved" else "social_report_rejected",
        message=f"Social media report has been {'approved' if status == 'approved' else 'rejected'}.",
        reportId=socialReportId,
        username=existing.get("username", "citizen") if existing else "citizen"
    )

    return {
        "success": True,
        "message": f"Social media report {status} successfully.",
        "socialReportId": socialReportId,
        "status": status,
        "reviewedBy": reviewedBy
    }


# =========================================================
# CONVERT APPROVED SOCIAL REPORT → JALDRISHTI REPORT
# =========================================================

async def convertSocialReport(
    socialReportId: str
):
    query = {
        "$or": [
            {"socialReportId": socialReportId},
            {"externalSocialMediaPostId": socialReportId},
            {"sourcePostId": socialReportId}
        ]
    }
    if ObjectId.is_valid(socialReportId):
        query["$or"].append({"_id": ObjectId(socialReportId)})

    verify = await database.social_reports.find_one(query)
    if not verify:
        return {"success": False, "error": "social_report_not_found"}

    # Generate official JalDrishti report ID
    now = datetime.utcnow()
    report_count = await database.reports.count_documents({})
    report_id = f"JAL-{now.strftime('%Y')}-SOC{str(report_count + 1).zfill(4)}"

    # Create official JalDrishti report in database.reports
    location_data = verify.get("location") or {
        "latitude": 26.4499,
        "longitude": 80.3319,
        "locality": "Urban Sector",
        "city": "Kanpur",
        "district": "Kanpur",
        "state": "Uttar Pradesh"
    }

    report = {
        "reportId": report_id,
        "publicReportId": report_id,
        "title": verify.get("title") or "Reported Water Hazard",
        "description": verify.get("description") or verify.get("originalPostText") or "",
        "imageUrl": verify.get("imageUrl"),
        "category": verify.get("category", "urban_flooding"),
        "severity": verify.get("severity", "medium"),
        "priority": "medium",
        "status": "submitted",
        "govStatus": "under_review",
        "location": location_data,
        "source": "SOCIAL_MEDIA",
        "socialUsername": verify.get("username", "citizen"),
        "socialPostId": socialReportId,
        "originalPostText": verify.get("originalPostText") or verify.get("description", ""),
        "mlAnalysis": {
            "isWaterRelated": True,
            "category": verify.get("category", "urban_flooding"),
            "confidence": verify.get("mlConfidence", 0.90)
        },
        "verification": {
            "status": "Verified",
            "verifiedBy": verify.get("reviewedBy") or "Officer Desk",
            "verifiedAt": verify.get("reviewedAt") or now.isoformat(),
            "aiConfidence": verify.get("mlConfidence", 0.90)
        },
        "timeline": [
            {
                "step": 1,
                "status": "submitted",
                "title": "Ingested from Social Media",
                "timestamp": now.isoformat(),
                "description": f"Verified by disaster authorities from CoastalSocial post by @{verify.get('username', 'citizen')}."
            }
        ],
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat()
    }

    await database.reports.insert_one(report)

    # Link local verification record to converted report ID
    await database.social_reports.update_one(
        query,
        {"$set": {
            "status": "approved",
            "convertedReportId": report_id,
            "jalDrishtiReportId": report_id,
            "updatedAt": now.isoformat()
        }}
    )

    # Create notification
    await createNotification(
        notificationType="social_report_converted",
        message=f"Verified social media hazard converted to JalDrishti report: {report_id}",
        reportId=report_id,
        username=verify.get("username", "citizen")
    )

    return {
        "success": True,
        "message": "Social media report converted to JalDrishti report.",
        "socialReportId": socialReportId,
        "reportId": report_id,
        "publicReportId": report_id,
        "status": "submitted"
    }