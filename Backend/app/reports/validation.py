"""
Validation checks run on every new report before it's saved:
1. Duplicate image detection
2. Nearby report correlation (corroboration)
"""

from datetime import datetime, timedelta
from app.utils.imageUtils import get_image_hash, hash_similarity
from app.utils.geoUtils import haversine_distance_km
from app.database import database

NEARBY_RADIUS_KM = 0.5
NEARBY_TIME_WINDOW_HOURS = 6
DUPLICATE_IMAGE_THRESHOLD = 0.90


async def checkDuplicateImage(imagePath: str) -> dict:
    newHash = get_image_hash(imagePath)

    recentReports = await database.reports.find(
        {"imageHash": {"$exists": True}}
    ).to_list(length=200)

    maxSimilarity = 0.0

    for report in recentReports:
        existingHash = report.get("imageHash")
        if existingHash:
            similarity = hash_similarity(newHash, existingHash)
            if similarity > maxSimilarity:
                maxSimilarity = similarity

    return {
        "hash": newHash,
        "maxSimilarity": maxSimilarity,
        "isDuplicate": maxSimilarity >= DUPLICATE_IMAGE_THRESHOLD
    }


async def checkNearbyReports(
    latitude: float,
    longitude: float,
    category: str,
    verifiedHazard: str | None = None,
) -> int:
    cutoffTime = datetime.utcnow() - timedelta(hours=NEARBY_TIME_WINDOW_HOURS)

    query = {
        "mlAnalysis.category": category,
        "createdAt": {"$gte": cutoffTime},
    }

    recentReports = await database.reports.find(query).to_list(length=100)

    nearbyCount = 0

    for report in recentReports:
        loc = report.get("location", {})
        if "latitude" not in loc or "longitude" not in loc:
            continue

        distance = haversine_distance_km(
            latitude,
            longitude,
            loc["latitude"],
            loc["longitude"],
        )

        if distance <= NEARBY_RADIUS_KM:
            nearbyCount += 1

    return nearbyCount