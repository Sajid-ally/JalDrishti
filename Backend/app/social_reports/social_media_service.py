import os
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# Load integration configuration
INTEGRATION_MODE = os.getenv("SOCIAL_MEDIA_INTEGRATION_MODE", "mock").lower()
DB_URI = os.getenv("SOCIAL_MEDIA_DB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("SOCIAL_MEDIA_DB_NAME", "oceanshield")
DB_COLLECTION = os.getenv("SOCIAL_MEDIA_DB_COLLECTION", "socialMediaPosts")

MOCK_SOCIAL_POSTS = [
    {
        "_id": "tweet-109283749",
        "platform": "twitter",
        "sourcePostId": "tweet-109283749",
        "username": "floodwatcher_orissa",
        "title": "Severe road waterlogging near sector 3",
        "description": "Unbelievable water logging on Puri-Bhubaneswar highway near Sector 3. Traffic completely halted, water level is rising up to car tires.",
        "imageUrl": "uploads/reports/test_flooding.png",
        "location": {
            "latitude": 20.296,
            "longitude": 85.818,
            "locality": "Sector 3 Highway",
            "city": "Bhubaneswar",
            "district": "Khordha",
            "state": "Odisha"
        },
        "category": "urban_flooding",
        "mlConfidence": 0.94,
        "postedAt": datetime.utcnow().isoformat(),
        "classification": {
            "isWaterRelated": True,
            "category": "urban_flooding",
            "confidence": 0.94
        }
    },
    {
        "_id": "insta-882736192",
        "platform": "instagram",
        "sourcePostId": "insta-882736192",
        "username": "puri_beach_life",
        "title": "High waves crashing over embankment",
        "description": "High tide waves and storm surge crashing over the concrete embankment at Puri golden beach. Locals are advised to avoid beachside roads.",
        "imageUrl": "uploads/reports/test_wave.png",
        "location": {
            "latitude": 19.798,
            "longitude": 85.825,
            "locality": "Golden Beach",
            "city": "Puri",
            "district": "Puri",
            "state": "Odisha"
        },
        "category": "storm_surge",
        "mlConfidence": 0.89,
        "postedAt": datetime.utcnow().isoformat(),
        "classification": {
            "isWaterRelated": True,
            "category": "storm_surge",
            "confidence": 0.89
        }
    },
    {
        "_id": "fb-post-773829102",
        "platform": "facebook",
        "sourcePostId": "fb-post-773829102",
        "username": "bhadrak_news",
        "title": "Baitarani river crossing danger mark",
        "description": "Baitarani river levels crossing danger mark in Bhandaripokhari. Low lying agricultural fields completely inundated.",
        "imageUrl": None,
        "location": {
            "latitude": 20.912,
            "longitude": 86.415,
            "locality": "Bhandaripokhari",
            "city": "Bhadrak",
            "district": "Bhadrak",
            "state": "Odisha"
        },
        "category": "river_flooding",
        "mlConfidence": 0.78,
        "postedAt": datetime.utcnow().isoformat(),
        "classification": {
            "isWaterRelated": True,
            "category": "river_flooding",
            "confidence": 0.78
        }
    }
]

def normalize_social_post(post: dict) -> dict:
    """Normalizes an external social media post to JalDrishti format."""
    post_id = str(post.get("_id", post.get("id", "")))
    
    classification = post.get("classification", {})
    is_water_related = classification.get(
        "isWaterRelated", 
        post.get("isWaterRelated", post.get("category") is not None)
    )
    category = classification.get("category", post.get("category", "water_hazard"))
    confidence = classification.get("confidence", post.get("mlConfidence", 0.85))
    
    location = post.get("location", {})
    normalized_location = {
        "latitude": float(location.get("latitude", 0.0)),
        "longitude": float(location.get("longitude", 0.0)),
        "state": location.get("state"),
        "district": location.get("district"),
        "city": location.get("city"),
        "locality": location.get("locality"),
        "address": location.get("address")
    }

    posted_at = post.get("postedAt") or post.get("createdAt")
    if isinstance(posted_at, datetime):
        posted_at = posted_at.isoformat()

    return {
        "platform": post.get("platform", "twitter"),
        "sourcePostId": post.get("sourcePostId", post_id),
        "username": post.get("username", "anonymous"),
        "title": post.get("title", "Water Incident Report"),
        "description": post.get("description", post.get("caption", post.get("content", ""))),
        "imageUrl": post.get("imageUrl"),
        "location": normalized_location,
        "category": category,
        "mlConfidence": confidence,
        "postedAt": posted_at,
        "classification": {
            "isWaterRelated": is_water_related,
            "category": category,
            "confidence": confidence
        }
    }

async def fetchClassifiedWaterRelatedPosts() -> list:
    """Fetches classified water-related posts from the separate database."""
    if INTEGRATION_MODE == "mock":
        print("[SocialMediaService] Integration mode: MOCK. Loading sample posts.")
        return [normalize_social_post(post) for post in MOCK_SOCIAL_POSTS]
        
    print(f"[SocialMediaService] Integration mode: REAL. Querying separate database: {DB_NAME}")
    try:
        client = AsyncIOMotorClient(DB_URI)
        db = client[DB_NAME]
        collection = db[DB_COLLECTION]
        
        cursor = collection.find({
            "$or": [
                {"classification.isWaterRelated": True},
                {"isWaterRelated": True}
            ]
        })
        
        posts = []
        async for post in cursor:
            posts.append(normalize_social_post(post))
        return posts
    except Exception as e:
        print(f"[SocialMediaService] Error fetching from separate database: {e}")
        return []

async def getSocialMediaPost(externalPostId: str) -> dict:
    """Fetches a specific social media post from the external database."""
    if INTEGRATION_MODE == "mock":
        for post in MOCK_SOCIAL_POSTS:
            if post["sourcePostId"] == externalPostId:
                return normalize_social_post(post)
        return None
        
    print(f"[SocialMediaService] Querying separate database for post: {externalPostId}")
    try:
        client = AsyncIOMotorClient(DB_URI)
        db = client[DB_NAME]
        collection = db[DB_COLLECTION]
        
        # Try string query first, then ObjectId query if valid
        query = {"sourcePostId": externalPostId}
        post = await collection.find_one(query)
        
        if not post and ObjectId.is_valid(externalPostId):
            post = await collection.find_one({"_id": ObjectId(externalPostId)})
            
        if post:
            return normalize_social_post(post)
        return None
    except Exception as e:
        print(f"[SocialMediaService] Error querying post from separate database: {e}")
        return None

async def updateVerificationStatus(externalPostId: str, status: str):
    """Callback hook conceptually updating source system of verification status."""
    print(f"[SocialMediaService] Callback: updating external status for post {externalPostId} to {status}.")
