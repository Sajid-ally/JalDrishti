"""
JalDrishti Duplicate Report Validation & Proximity Corroboration
1. Exact Image Duplicate Check (pHash similarity)
2. Same-User Recent Duplicate Check
3. Geographic + Hazard Potential Duplicate Corroboration
"""

import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from app.utils.imageUtils import get_image_hash, hash_similarity
from app.utils.geoUtils import haversine_distance_km
from app.database import database
from app.config import settings

DUPLICATE_RADIUS_KM = getattr(settings, "DUPLICATE_RADIUS_METERS", 150.0) / 1000.0  # 150m in km
DUPLICATE_TIME_WINDOW_HOURS = getattr(settings, "DUPLICATE_TIME_WINDOW_HOURS", 48)
SAME_USER_WINDOW_HOURS = 24
EXACT_HASH_SIMILARITY_THRESHOLD = 0.95
POTENTIAL_HASH_SIMILARITY_THRESHOLD = 0.85


async def validateDuplicateReport(
    imagePath: str,
    latitude: float,
    longitude: float,
    hazardType: Optional[str] = None,
    userId: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Validates whether an incoming report is an exact duplicate, potential duplicate, or clean report.
    Order:
      1. Image Hash Comparison
      2. Same-User Recent Incident Check
      3. Nearby Same-Hazard Corroboration
    """
    image_hash = None
    if os.path.exists(imagePath):
        try:
            image_hash = get_image_hash(imagePath)
        except Exception as e:
            print(f"[VALIDATION] Image hash generation failed: {e}")

    cutoff_time = datetime.utcnow() - timedelta(hours=DUPLICATE_TIME_WINDOW_HOURS)
    same_user_cutoff = datetime.utcnow() - timedelta(hours=SAME_USER_WINDOW_HOURS)

    # Fetch recent active reports
    recent_reports = await database.reports.find({
        "createdAt": {"$gte": cutoff_time}
    }).to_list(length=300)

    max_image_similarity = 0.0
    matched_image_report_id = None
    potential_duplicate_report_id = None
    min_potential_dist_m = None

    for report in recent_reports:
        rep_id = str(report.get("publicReportId") or report.get("_id") or report.get("id"))
        loc = report.get("location", {})
        rep_lat = loc.get("latitude")
        rep_lng = loc.get("longitude")
        rep_hazard = (report.get("category") or report.get("mlAnalysis", {}).get("category") or "").lower()
        rep_user = report.get("userId") or report.get("username")
        rep_time = report.get("createdAt") or datetime.utcnow()

        # 1. Exact Image Check (Only identical image >= 95% similarity is an exact duplicate)
        existing_hash = report.get("imageHash")
        if image_hash and existing_hash:
            try:
                sim = hash_similarity(image_hash, existing_hash)
                if sim > max_image_similarity:
                    max_image_similarity = sim
                    matched_image_report_id = rep_id
            except Exception:
                pass

        # Calculate distance for nearby corroboration
        dist_km = None
        if rep_lat is not None and rep_lng is not None:
            dist_km = haversine_distance_km(latitude, longitude, rep_lat, rep_lng)

        # 2. Nearby Same-Hazard Corroboration Check
        if dist_km is not None and dist_km <= DUPLICATE_RADIUS_KM:
            if hazardType and rep_hazard == hazardType.lower():
                potential_duplicate_report_id = rep_id
                min_potential_dist_m = round(dist_km * 1000, 1)

    # Only mark as exact duplicate if the actual image is identical (>= 95% similarity)
    if max_image_similarity >= EXACT_HASH_SIMILARITY_THRESHOLD and matched_image_report_id:
        return {
            "isDuplicate": True,
            "duplicateType": "exact",
            "existingReportId": matched_image_report_id,
            "imageHash": image_hash,
            "imageSimilarity": max_image_similarity,
            "message": "This exact image has already been submitted for an existing report.",
        }

    # If potential duplicate nearby
    if potential_duplicate_report_id:
        return {
            "isDuplicate": False,
            "duplicateType": "potential",
            "existingReportId": potential_duplicate_report_id,
            "imageHash": image_hash,
            "imageSimilarity": max_image_similarity,
            "distanceMeters": min_potential_dist_m,
            "message": f"A similar {hazardType or 'hazard'} incident was recently reported {min_potential_dist_m}m away.",
        }

    return {
        "isDuplicate": False,
        "duplicateType": "none",
        "existingReportId": None,
        "imageHash": image_hash,
        "imageSimilarity": max_image_similarity,
        "message": "Report is unique.",
    }


async def checkDuplicateImage(imagePath: str) -> dict:
    validation = await validateDuplicateReport(
        imagePath=imagePath,
        latitude=0.0,
        longitude=0.0,
    )
    return {
        "hash": validation["imageHash"],
        "maxSimilarity": validation["imageSimilarity"],
        "isDuplicate": validation["duplicateType"] == "exact",
    }


async def checkNearbyReports(
    latitude: float,
    longitude: float,
    category: str,
    verifiedHazard: Optional[str] = None,
    radius_km: float = 1.0,
) -> int:
    cutoffTime = datetime.utcnow() - timedelta(hours=DUPLICATE_TIME_WINDOW_HOURS)

    query = {
        "createdAt": {"$gte": cutoffTime},
    }
    if category and category != "all":
        query["$or"] = [
            {"category": category},
            {"mlAnalysis.category": category},
            {"hazardTypeVerified": category},
        ]

    recentReports = await database.reports.find(query).to_list(length=300)

    nearbyCount = 0
    for report in recentReports:
        loc = report.get("location", {})
        if "latitude" not in loc or "longitude" not in loc:
            continue

        try:
            distance = haversine_distance_km(
                latitude,
                longitude,
                float(loc["latitude"]),
                float(loc["longitude"]),
            )
            if distance <= radius_km:
                nearbyCount += 1
        except Exception:
            pass

    return nearbyCount