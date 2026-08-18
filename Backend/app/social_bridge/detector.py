import math
from typing import Optional, Dict, Any
from app.database import database
from app.social_bridge.classifier import is_duplicate_hash

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two points in meters."""
    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def check_duplicate_or_prior_report(
    image_hash: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Checks if an uploaded hazard post is a duplicate of an existing active JalDrishti report:
    1. Compares perceptual image hashes.
    2. Compares spatial distance (< 500 meters) for active reports in the same category.
    """
    if not image_hash and (latitude is None or longitude is None):
        return {"is_duplicate": False}

    # Query active reports (excluding deleted / expired ones)
    cursor = database.reports.find({
        "status": {"$in": ["submitted", "under_review", "assigned", "action_in_progress", "in_progress", "verified", "resolved"]}
    })
    
    reports = await cursor.to_list(length=100)

    for report in reports:
        report_id = report.get("reportId", str(report.get("_id", "")))
        report_status = report.get("status", "submitted")
        dept = report.get("assignedDepartment") or "Municipal Response Team"
        
        # 1. Perceptual Image Hash Match
        existing_hash = report.get("imageHash")
        if image_hash and existing_hash and is_duplicate_hash(image_hash, existing_hash):
            status_text = "In Progress (Teams Deployed)" if report_status in ["assigned", "in_progress", "action_in_progress"] else ("Resolved" if report_status == "resolved" else "Under Review")
            return {
                "is_duplicate": True,
                "match_type": "image_match",
                "existing_report_id": report_id,
                "existing_status": report_status,
                "existing_department": dept,
                "system_comment": f"📢 Notice: This exact image was previously logged in JalDrishti (ID: {report_id}, Status: {status_text}). Dispatched: {dept}."
            }

        # 2. Spatial Coordinate Match (within 500m)
        loc = report.get("location", {})
        rep_lat = loc.get("latitude")
        rep_lon = loc.get("longitude")

        if (
            latitude is not None and longitude is not None and
            rep_lat is not None and rep_lon is not None
        ):
            distance = haversine_distance_meters(latitude, longitude, float(rep_lat), float(rep_lon))
            if distance <= 500:
                # If within 500 meters and active
                status_text = "In Progress" if report_status in ["assigned", "in_progress", "action_in_progress"] else ("Resolved" if report_status == "resolved" else "Under Review")
                return {
                    "is_duplicate": True,
                    "match_type": "nearby_hazard",
                    "existing_report_id": report_id,
                    "existing_status": report_status,
                    "existing_department": dept,
                    "distance_meters": round(distance, 1),
                    "system_comment": f"📢 Notice: Active water hazard already reported nearby ({round(distance)}m away, ID: {report_id}, Status: {status_text}). Assigned: {dept}."
                }

    return {"is_duplicate": False}
