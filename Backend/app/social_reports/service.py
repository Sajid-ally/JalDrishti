from datetime import datetime
from bson import ObjectId
from app.database import database
from app.notifications.service import createNotification
from app.social_reports.social_media_service import (
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
    # 1. Fetch normalized classified posts from the external social database
    external_posts = await fetchClassifiedWaterRelatedPosts()
    
    # 2. Query all local verification logs from database.social_reports
    local_verifications = {}
    cursor = database.social_reports.find({})
    async for verify in cursor:
        local_verifications[verify["externalSocialMediaPostId"]] = verify

    # 3. Merge them and filter
    reports = []
    for post in external_posts:
        ext_id = post["sourcePostId"]
        verify = local_verifications.get(ext_id)
        
        current_status = "pending_verification"
        reviewed_by = None
        reviewed_at = None
        rejection_reason = None
        converted_report_id = None
        created_at = post["postedAt"]
        
        if verify:
            current_status = verify.get("status", "pending_verification")
            reviewed_by = verify.get("reviewedBy")
            reviewed_at = verify.get("reviewedAt")
            rejection_reason = verify.get("rejectionReason")
            converted_report_id = verify.get("convertedReportId")
            if verify.get("createdAt"):
                created_at = verify["createdAt"].isoformat()

        # Apply filters
        if status and current_status != status:
            continue
        if platform and post["platform"] != platform:
            continue

        reports.append({
            "socialReportId": ext_id,
            "platform": post["platform"],
            "sourcePostId": ext_id,
            "username": post["username"],
            "title": post["title"],
            "description": post["description"],
            "imageUrl": post["imageUrl"],
            "location": post["location"],
            "category": post["category"],
            "mlConfidence": post["mlConfidence"],
            "postedAt": post["postedAt"],
            "status": current_status,
            "reviewedBy": reviewed_by,
            "reviewedAt": reviewed_at.isoformat() if isinstance(reviewed_at, datetime) else reviewed_at,
            "rejectionReason": rejection_reason,
            "convertedReportId": converted_report_id,
            "createdAt": created_at
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
    post = await getSocialMediaPost(socialReportId)
    if not post:
        return {
            "success": False,
            "error": "social_report_not_found"
        }
        
    verify = await database.social_reports.find_one({
        "externalSocialMediaPostId": socialReportId
    })
    
    current_status = "pending_verification"
    reviewed_by = None
    reviewed_at = None
    rejection_reason = None
    converted_report_id = None
    
    if verify:
        current_status = verify.get("status", "pending_verification")
        reviewed_by = verify.get("reviewedBy")
        reviewed_at = verify.get("reviewedAt")
        rejection_reason = verify.get("rejectionReason")
        converted_report_id = verify.get("convertedReportId")
        
    report = {
        "socialReportId": socialReportId,
        "platform": post["platform"],
        "sourcePostId": socialReportId,
        "username": post["username"],
        "title": post["title"],
        "description": post["description"],
        "imageUrl": post["imageUrl"],
        "location": post["location"],
        "category": post["category"],
        "mlConfidence": post["mlConfidence"],
        "postedAt": post["postedAt"],
        "status": current_status,
        "reviewedBy": reviewed_by,
        "reviewedAt": reviewed_at.isoformat() if isinstance(reviewed_at, datetime) else reviewed_at,
        "rejectionReason": rejection_reason,
        "convertedReportId": converted_report_id,
        "createdAt": verify.get("createdAt").isoformat() if verify and verify.get("createdAt") else post["postedAt"]
    }
    
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
    # Validate post exists in external DB
    post = await getSocialMediaPost(socialReportId)
    if not post:
        return {
            "success": False,
            "error": "social_report_not_found"
        }

    # Validate status
    if status not in ["approved", "rejected"]:
        return {
            "success": False,
            "error": "invalid_review_status"
        }

    if status == "rejected" and not rejectionReason:
        return {
            "success": False,
            "error": "rejection_reason_required"
        }

    now = datetime.utcnow()
    
    # Check if a verification record already exists
    existing = await database.social_reports.find_one({
        "externalSocialMediaPostId": socialReportId
    })
    
    if existing and existing.get("status") != "pending_verification":
        return {
            "success": False,
            "error": "social_report_already_reviewed",
            "currentStatus": existing.get("status")
        }

    updateData = {
        "status": status,
        "reviewedBy": reviewedBy,
        "reviewedAt": now,
        "rejectionReason": rejectionReason,
        "updatedAt": now
    }

    if existing:
        await database.social_reports.update_one(
            {"externalSocialMediaPostId": socialReportId},
            {"$set": updateData}
        )
    else:
        updateData["externalSocialMediaPostId"] = socialReportId
        updateData["createdAt"] = now
        updateData["convertedReportId"] = None
        await database.social_reports.insert_one(updateData)

    # Trigger callback to external source conceptually
    try:
        await updateVerificationStatus(socialReportId, status)
    except Exception as e:
        print(f"Error calling verification callback: {e}")

    # Create notifications
    await createNotification(
        notificationType="social_report_approved" if status == "approved" else "social_report_rejected",
        message=f"Social media report has been {'approved' if status == 'approved' else 'rejected'}.",
        reportId=socialReportId,
        username=post.get("username")
    )

    return {
        "success": True,
        "message": f"Social media report {status} successfully.",
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
    # Fetch external post details
    post = await getSocialMediaPost(socialReportId)
    if not post:
        return {
            "success": False,
            "error": "social_report_not_found"
        }

    # Fetch local verification state
    verify = await database.social_reports.find_one({
        "externalSocialMediaPostId": socialReportId
    })
    
    if not verify:
        return {
            "success": False,
            "error": "social_report_must_be_approved",
            "currentStatus": "pending_verification"
        }
        
    if verify.get("status") != "approved":
        return {
            "success": False,
            "error": "social_report_must_be_approved",
            "currentStatus": verify.get("status")
        }

    if verify.get("convertedReportId"):
        return {
            "success": False,
            "error": "social_report_already_converted",
            "reportId": verify.get("convertedReportId")
        }

    # Create normal report in database.reports
    report = {
        "username": post.get("username") or "social_media",
        "title": post.get("title"),
        "description": post.get("description"),
        "imageUrl": post.get("imageUrl"),
        "category": post.get("category"),
        "priority": "medium",
        "status": "submitted",
        "location": post.get("location"),
        "aiAnalysis": None,
        "mlAnalysis": {
            "isWaterRelated": True,
            "category": post.get("category"),
            "confidence": post.get("mlConfidence")
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
            "verifiedBy": verify.get("reviewedBy"),
            "verifiedAt": verify.get("reviewedAt")
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    result = await database.reports.insert_one(report)
    reportId = str(result.inserted_id)

    # Link local verification record to converted report ID
    await database.social_reports.update_one(
        {"externalSocialMediaPostId": socialReportId},
        {"$set": {
            "convertedReportId": reportId,
            "updatedAt": datetime.utcnow()
        }}
    )

    # Notify
    await createNotification(
        notificationType="social_report_converted",
        message="Verified social-media report has been added to JalDrishti.",
        reportId=reportId,
        username=post.get("username")
    )

    return {
        "success": True,
        "message": "Social media report converted to JalDrishti report.",
        "socialReportId": socialReportId,
        "reportId": reportId,
        "status": "submitted"
    }