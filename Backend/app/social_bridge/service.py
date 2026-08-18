from datetime import datetime
from typing import Optional, Dict, Any
from bson import ObjectId
from app.database import database
from app.social_bridge.classifier import classify_social_content
from app.social_bridge.detector import check_duplicate_or_prior_report
from app.utils.geocode import reverseGeocode as reverse_geocode

async def process_social_post_verification(
    username: str,
    content: str,
    image_bytes: Optional[bytes] = None,
    image_filename: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    user_category: Optional[str] = None,
    social_post_id: Optional[str] = None,
    platform: str = "coastal_social"
) -> Dict[str, Any]:
    """
    Main Verification Pipeline:
    1. Classifies content (Water Hazard vs Non-Water Meme/Selfie/News).
    2. Auto-corrects vague text using Gemini AI.
    3. Checks for duplicates & prior status in JalDrishti.
    4. If it is a water hazard -> automatically ingests into JalDrishti MongoDB for government review.
    5. Returns enriched metadata, disaster tags, and system comments for CoastalSocial.
    """
    # 1. Content Classification & Gemini Auto-Correction
    classification = await classify_social_content(
        image_bytes=image_bytes,
        text_content=content,
        user_category=user_category
    )

    is_water_hazard = classification["is_water_hazard"]
    image_hash = classification.get("image_hash")

    # If NOT a water hazard (meme, selfie, news, etc.)
    if not is_water_hazard:
        return {
            "success": True,
            "isWaterHazard": False,
            "category": "social_post",
            "disasterTag": None,
            "aiTitle": None,
            "aiDescription": content,
            "isDuplicate": False,
            "jalDrishtiReportId": None,
            "status": "normal_post",
            "systemComment": None,
            "message": "Post verified as general social media content (not a water disaster)."
        }

    # 2. Duplicate & Prior Report Check
    duplicate_info = await check_duplicate_or_prior_report(
        image_hash=image_hash,
        latitude=latitude,
        longitude=longitude,
        category=classification["category"]
    )

    is_duplicate = duplicate_info.get("is_duplicate", False)
    system_comment = duplicate_info.get("system_comment")

    # 3. Location Resolution (Reverse Geocode if coordinates present)
    city = "Kanpur"
    locality = "Urban Zone"
    state = "Uttar Pradesh"

    if latitude is not None and longitude is not None:
        try:
            geo_info = await reverse_geocode(latitude, longitude)
            city = geo_info.get("city") or city
            locality = geo_info.get("locality") or locality
            state = geo_info.get("state") or state
        except Exception:
            pass

    # 4. Generate unique JalDrishti Report ID and save image to disk
    now = datetime.utcnow()

    saved_image_url = None
    if image_bytes:
        try:
            import os
            social_uploads_dir = os.path.join(os.getcwd(), "uploads", "social")
            os.makedirs(social_uploads_dir, exist_ok=True)
            filename = image_filename or f"social_{int(now.timestamp())}.jpg"
            file_path = os.path.join(social_uploads_dir, filename)
            with open(file_path, "wb") as f:
                f.write(image_bytes)
            saved_image_url = f"uploads/social/{filename}"
        except Exception as img_err:
            print(f"[SOCIAL_BRIDGE] Error saving image to disk: {img_err}")

    # 5. Save candidate in database.social_reports queue for Officer Verification
    social_candidate = {
        "socialReportId": social_post_id,
        "externalSocialMediaPostId": social_post_id,
        "sourcePostId": social_post_id,
        "platform": platform,
        "username": username,
        "title": classification["ai_title"],
        "description": classification["ai_description"],
        "originalPostText": content,
        "imageUrl": saved_image_url or (f"uploads/social/{image_filename}" if image_filename else None),
        "location": {
            "latitude": latitude if latitude is not None else 26.4499,
            "longitude": longitude if longitude is not None else 80.3319,
            "locality": locality,
            "city": city,
            "district": city,
            "state": state
        },
        "category": classification["category"],
        "disasterTag": f"🌊 {classification['category'].replace('_', ' ').title()}",
        "severity": classification["severity"],
        "mlConfidence": classification["confidence"],
        "status": "pending_verification",
        "isWaterHazard": True,
        "isDuplicate": is_duplicate,
        "imageHash": image_hash,
        "convertedReportId": None,
        "postedAt": now.isoformat(),
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat()
    }

    await database.social_reports.update_one(
        {
            "$or": [
                {"socialReportId": social_post_id},
                {"externalSocialMediaPostId": social_post_id},
                {"sourcePostId": social_post_id}
            ]
        },
        {"$set": social_candidate},
        upsert=True
    )

    return {
        "success": True,
        "isWaterHazard": True,
        "category": classification["category"],
        "disasterTag": f"🌊 {classification['category'].replace('_', ' ').title()}",
        "severity": classification["severity"],
        "aiTitle": classification["ai_title"],
        "aiDescription": classification["ai_description"],
        "isDuplicate": is_duplicate,
        "socialReportId": social_post_id,
        "status": "pending_verification",
        "systemComment": system_comment,
        "location": {
            "city": city,
            "locality": locality,
            "state": state
        },
        "message": "Water hazard verified by AI and queued in JalDrishti Social Media Verification desk."
    }

async def get_social_post_status(social_post_id: str) -> Dict[str, Any]:
    """Queries live JalDrishti status and official comments for a CoastalSocial post."""
    report = await database.reports.find_one(
        {
            "$or": [
                {"socialPostId": social_post_id},
                {"reportId": social_post_id},
                {"publicReportId": social_post_id}
            ]
        },
        sort=[("createdAt", -1)]
    )

    if not report:
        return {
            "found": False,
            "message": "No associated disaster report found for this post ID."
        }

    status = report.get("status", "submitted")
    dept = report.get("assignedDepartment") or (report.get("assignment") or {}).get("department") or (report.get("verification") or {}).get("assignedDepartment")
    officer_notes = (report.get("verification") or {}).get("officerNotes")

    official_comment = None
    if status == "rejected":
        official_comment = f"🏛️ Official Municipal Notice: This hazard report was reviewed and rejected by JalDrishti disaster authorities. Reason: {officer_notes or 'Out of jurisdiction / Unverified image'}."
    elif status in ["assigned", "in_progress", "action_in_progress"]:
        official_comment = f"🏛️ Official Municipal Notice: Incident assigned to {dept or 'Field Response Team'}. Squad dispatched for on-ground dewatering."
    elif status == "resolved":
        official_comment = "🏛️ Official Municipal Notice: Hazard cleared and site verified restored by JalDrishti field team."

    return {
        "found": True,
        "jalDrishtiReportId": report.get("reportId"),
        "status": status,
        "assignedDepartment": dept,
        "officerNotes": officer_notes,
        "officialComment": official_comment,
        "concludedAt": report.get("concludedAt"),
        "expiresAt": report.get("expiresAt")
    }
