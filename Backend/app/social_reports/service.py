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
    # 1. Fetch real live water hazard posts from deployed CoastalSocial backend
    live_posts = await fetchClassifiedWaterRelatedPosts()

    # 2. Query all local verification overrides from database.social_reports
    local_verifications = {}
    cursor = database.social_reports.find({})
    async for verify in cursor:
        k = verify.get("externalSocialMediaPostId") or verify.get("socialReportId") or verify.get("sourcePostId") or str(verify.get("_id"))
        local_verifications[k] = verify

    # 3. Merge live posts with verification states
    reports = []
    processed_ids = set()

    for post in live_posts:
        ext_id = post["sourcePostId"]
        processed_ids.add(ext_id)
        verify = local_verifications.get(ext_id)

        current_status = "pending_verification"
        reviewed_by = None
        reviewed_at = None
        rejection_reason = None
        converted_report_id = None
        created_at = post.get("postedAt")

        if verify:
            current_status = verify.get("status", "pending_verification")
            reviewed_by = verify.get("reviewedBy")
            reviewed_at = verify.get("reviewedAt")
            if isinstance(reviewed_at, datetime):
                reviewed_at = reviewed_at.isoformat()
            rejection_reason = verify.get("rejectionReason")
            converted_report_id = verify.get("convertedReportId") or verify.get("jalDrishtiReportId")
            if verify.get("createdAt"):
                v_created = verify["createdAt"]
                created_at = v_created.isoformat() if isinstance(v_created, datetime) else v_created

        # Apply filters
        if status and current_status != status:
            continue
        if platform and post.get("platform") != platform:
            continue

        reports.append({
            "id": ext_id,
            "socialReportId": ext_id,
            "platform": post.get("platform", "coastal_social"),
            "sourcePostId": ext_id,
            "username": post.get("username", "citizen"),
            "title": post.get("title", "Reported Water Hazard"),
            "description": post.get("description", post.get("originalPostText", "")),
            "originalPostText": post.get("originalPostText", post.get("description", "")),
            "imageUrl": post.get("imageUrl"),
            "location": post.get("location") or {
                "latitude": 26.4499,
                "longitude": 80.3319,
                "city": "Kanpur",
                "state": "Uttar Pradesh"
            },
            "category": post.get("category", "urban_flooding"),
            "mlConfidence": post.get("mlConfidence", 0.90),
            "postedAt": post.get("postedAt") or created_at,
            "status": current_status,
            "reviewedBy": reviewed_by,
            "reviewedAt": reviewed_at,
            "rejectionReason": rejection_reason,
            "convertedReportId": converted_report_id,
            "createdAt": created_at
        })

    # Also include any directly submitted bridge candidates not in live API
    for ext_id, verify in local_verifications.items():
        if ext_id in processed_ids:
            continue
        current_status = verify.get("status", "pending_verification")
        if status and current_status != status:
            continue
        if platform and verify.get("platform") != platform:
            continue

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
            "originalPostText": verify.get("originalPostText", verify.get("description", "")),
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
            "status": current_status,
            "reviewedBy": verify.get("reviewedBy"),
            "reviewedAt": reviewed_at,
            "rejectionReason": verify.get("rejectionReason"),
            "convertedReportId": verify.get("convertedReportId") or verify.get("jalDrishtiReportId"),
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
    if not existing:
        post = await getSocialMediaPost(socialReportId)
        if post:
            existing = {
                "socialReportId": socialReportId,
                "externalSocialMediaPostId": socialReportId,
                "sourcePostId": socialReportId,
                "platform": "coastal_social",
                "username": post.get("username", "citizen"),
                "title": post.get("title"),
                "description": post.get("description"),
                "imageUrl": post.get("imageUrl"),
                "location": post.get("location"),
                "category": post.get("category"),
                "status": "pending_verification",
                "createdAt": now
            }

    updateData = {
        "status": status,
        "reviewedBy": reviewedBy,
        "reviewedAt": now,
        "rejectionReason": rejectionReason if status == "rejected" else None,
        "updatedAt": now
    }

    if existing and "_id" in existing:
        await database.social_reports.update_one(query, {"$set": updateData})
    else:
        updateData["externalSocialMediaPostId"] = socialReportId
        updateData["socialReportId"] = socialReportId
        updateData["sourcePostId"] = socialReportId
        updateData["platform"] = "coastal_social"
        updateData["username"] = existing.get("username", "citizen") if existing else "citizen"
        updateData["title"] = existing.get("title", "Reported Water Hazard") if existing else "Reported Water Hazard"
        updateData["description"] = existing.get("description", "") if existing else ""
        updateData["imageUrl"] = existing.get("imageUrl") if existing else None
        updateData["location"] = existing.get("location") if existing else None
        updateData["createdAt"] = now
        await database.social_reports.insert_one(updateData)

    # If rejected, ensure any active report in database.reports is removed and post comment to CoastalSocial
    if status == "rejected":
        await database.reports.delete_many({
            "$or": [
                {"socialPostId": socialReportId},
                {"sourceSocialReportId": socialReportId}
            ]
        })
        rejection_comment = f"🏛️ JalDrishti Official Notice: This hazard report was reviewed and REJECTED by disaster authorities. Reason: {rejectionReason}."
        try:
            await updateVerificationStatus(socialReportId, "rejected", rejection_comment)
        except Exception as e:
            print(f"[SOCIAL_REPORTS] Error posting rejection comment to CoastalSocial: {e}")

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
        verify = await getSocialMediaPost(socialReportId)
        if not verify:
            return {"success": False, "error": "social_report_not_found"}

    # Check if already converted to prevent duplicates
    if verify.get("convertedReportId"):
        existing_report = await database.reports.find_one({"reportId": verify.get("convertedReportId")})
        if existing_report:
            return {
                "success": True,
                "message": f"Report already accepted under ID: {verify.get('convertedReportId')}",
                "reportId": verify.get("convertedReportId"),
                "publicReportId": verify.get("convertedReportId"),
                "status": "already_converted"
            }

    # Generate official JalDrishti report ID
    now = datetime.utcnow()
    report_count = await database.reports.count_documents({})
    report_id = f"JAL-{now.strftime('%Y')}-SOC{str(report_count + 1).zfill(4)}"

    # Create official JalDrishti report in database.reports
    location_data = verify.get("location") or {}
    city = location_data.get("city") or "Kanpur"
    state = location_data.get("state") or "Uttar Pradesh"
    district = location_data.get("district") or city
    locality = location_data.get("locality") or "Civil Lines"
    lat = float(location_data.get("latitude") or 26.4712)
    lng = float(location_data.get("longitude") or 80.3491)

    clean_location = {
        "latitude": lat,
        "longitude": lng,
        "city": city,
        "district": district,
        "state": state,
        "locality": locality,
        "formattedAddress": f"{locality}, {city}, {state}"
    }

    report = {
        "reportId": report_id,
        "publicReportId": report_id,
        "title": verify.get("title") or f"Reported {verify.get('category', 'Water Hazard').replace('_', ' ').title()}",
        "description": verify.get("description") or verify.get("originalPostText") or "Water hazard incident reported on CoastalSocial.",
        "imageUrl": verify.get("imageUrl"),
        "category": verify.get("category", "urban_flooding"),
        "severity": verify.get("severity", "medium"),
        "priority": "medium",
        "governmentPriority": "medium",
        "status": "submitted",
        "reportStatus": "Open",
        "govStatus": "under_review",
        "city": city,
        "district": district,
        "state": state,
        "locality": locality,
        "location": clean_location,
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
            "verifiedAt": now,
            "aiConfidence": verify.get("mlConfidence", 0.90),
            "officerNotes": None,
            "assignedDepartment": None
        },
        "assignment": {
            "department": None,
            "assignedTo": None,
            "assignedBy": None,
            "assignedAt": None
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
        "createdAt": now,
        "updatedAt": now
    }

    await database.reports.insert_one(report)

    # Link local verification record to converted report ID
    await database.social_reports.update_one(
        query,
        {"$set": {
            "status": "approved",
            "convertedReportId": report_id,
            "jalDrishtiReportId": report_id,
            "updatedAt": now
        }},
        upsert=True
    )

    # Post official acceptance notice to CoastalSocial thread with Report Ticket ID
    approval_comment = f"🏛️ JalDrishti Official Notice: Hazard report VERIFIED & ACCEPTED by disaster authorities! Official Ticket ID: {report_id}. Assigned for municipal response squad dispatch. Track live response: http://localhost:5173/citizen/track-report"
    try:
        await updateVerificationStatus(socialReportId, "approved", approval_comment)
    except Exception as e:
        print(f"[SOCIAL_REPORTS] Error posting approval comment to CoastalSocial: {e}")

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