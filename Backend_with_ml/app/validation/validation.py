"""
Validation checks run on every new report before it's saved:
1. Duplicate image detection
2. Nearby report correlation (corroboration)
"""

from datetime import datetime, timedelta
from app.utils.imageUtils import get_image_hash, hash_similarity
from app.utils.geoUtils import haversine_distance_km
from app.database import database

reportsCollection = database["reports"]

NEARBY_RADIUS_KM = 0.5
NEARBY_TIME_WINDOW_HOURS = 6
DUPLICATE_IMAGE_THRESHOLD = 0.90  # similarity above this = likely duplicate


async def checkDuplicateImage(imagePath: str) -> dict:
    """
    Compares the new image against recent reports' stored image hashes.
    Returns the highest similarity score found, and whether it crosses
    the duplicate threshold.
    """
    newHash = get_image_hash(imagePath)

    recentReports = await reportsCollection.find(
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


async def checkNearbyReports(latitude: float, longitude: float, category: str) -> int:
    """
    Counts existing reports of the SAME hazard type, within
    NEARBY_RADIUS_KM, submitted in the last NEARBY_TIME_WINDOW_HOURS.
    A high count means multiple citizens are reporting the same real
    event — corroboration, not duplication.
    """
    cutoffTime = datetime.utcnow() - timedelta(hours=NEARBY_TIME_WINDOW_HOURS)

    recentReports = await reportsCollection.find({
        "mlAnalysis.category": category,
        "createdAt": {"$gte": cutoffTime}
    }).to_list(length=100)

    nearbyCount = 0

    for report in recentReports:
        loc = report.get("location", {})
        if "latitude" not in loc or "longitude" not in loc:
            continue

        distance = haversine_distance_km(
            latitude, longitude,
            loc["latitude"], loc["longitude"]
        )

        if distance <= NEARBY_RADIUS_KM:
            nearbyCount += 1

    return nearbyCount