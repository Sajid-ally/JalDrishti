import os
from datetime import datetime
from bson import ObjectId
import httpx

# External CoastalSocial Service Configuration
COASTAL_SOCIAL_API_URL = os.getenv(
    "COASTAL_SOCIAL_BACKEND_URL",
    "https://coastalsocial-oeff.onrender.com"
).rstrip("/")

INTEGRATION_MODE = "live"

WATER_HAZARD_KEYWORDS = [
    "flood", "water", "drain", "drainage", "overflow", "rain", 
    "waterlog", "waterlogged", "waterlogging", "landslide", 
    "cyclone", "sea", "tsunami", "inundat", "dam", "leak", "river"
]

def is_water_related_content(category: str, text: str) -> bool:
    """Classifies whether a social media post describes a water hazard."""
    cat_lower = (category or "").lower().strip()
    text_lower = (text or "").lower().strip()

    if cat_lower in ["flood", "floods", "drainage", "water-related", "water_hazard", "landslide", "cyclone"]:
        return True

    for kw in WATER_HAZARD_KEYWORDS:
        if kw in cat_lower or kw in text_lower:
            return True

    return False

def normalize_social_post(post: dict) -> dict:
    """Normalizes a live CoastalSocial post to JalDrishti format."""
    post_id = str(post.get("id") or post.get("_id", ""))
    
    raw_img = post.get("imageUrl")
    image_url = None
    if raw_img:
        if raw_img.startswith("http://") or raw_img.startswith("https://"):
            image_url = raw_img
        else:
            image_url = f"{COASTAL_SOCIAL_API_URL}/{raw_img.lstrip('/')}"

    # If no image uploaded, mark category as General / Non-hazard
    if not image_url or image_url.strip() == "":
        category = "General"
        is_water = False
    else:
        category = post.get("category", "Water-related")
        content = post.get("content") or post.get("description") or post.get("caption") or ""
        is_water = is_water_related_content(category, content)

    # Extract or infer location
    raw_loc = post.get("location")
    if isinstance(raw_loc, dict):
        latitude = float(raw_loc.get("latitude") or 26.4499)
        longitude = float(raw_loc.get("longitude") or 80.3319)
        city = raw_loc.get("city") or "Kanpur"
        state = raw_loc.get("state") or "Uttar Pradesh"
        locality = raw_loc.get("locality") or "Urban Sector"
    else:
        latitude = 26.4499
        longitude = 80.3319
        city = "Kanpur"
        state = "Uttar Pradesh"
        locality = "Urban Sector"

    posted_at = post.get("createdAt") or post.get("postedAt")
    if isinstance(posted_at, datetime):
        posted_at = posted_at.isoformat()

    content_str = post.get("content") or post.get("description") or post.get("caption") or ""

    return {
        "platform": "coastal_social",
        "sourcePostId": post_id,
        "socialReportId": post_id,
        "username": post.get("username", "citizen"),
        "title": f"Reported {category.replace('_', ' ').title()}",
        "description": content_str,
        "originalPostText": content_str,
        "imageUrl": image_url,
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "city": city,
            "district": city,
            "state": state,
            "locality": locality
        },
        "category": category.lower().replace("-", "_").replace(" ", "_"),
        "mlConfidence": 0.92 if is_water else 0.40,
        "postedAt": posted_at,
        "isWaterHazard": is_water,
        "status": "pending_verification"
    }

async def fetchClassifiedWaterRelatedPosts() -> list:
    """Fetches real classified water-related posts from the live CoastalSocial backend."""
    urls_to_try = [
        f"{COASTAL_SOCIAL_API_URL}/api/posts/",
        "http://127.0.0.1:8000/api/posts/",
        "http://127.0.0.1:8001/api/posts/"
    ]

    for url in urls_to_try:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_posts = data.get("posts", []) if isinstance(data, dict) else data
                    
                    water_posts = []
                    for post in raw_posts:
                        normalized = normalize_social_post(post)
                        if normalized["isWaterHazard"]:
                            water_posts.append(normalized)
                    
                    print(f"[SocialMediaService] Synced {len(water_posts)} live water hazard posts with images from {url}")
                    return water_posts
        except Exception as e:
            continue

    return []

async def getSocialMediaPost(externalPostId: str) -> dict:
    """Fetches a specific social media post from the live CoastalSocial backend."""
    url = f"{COASTAL_SOCIAL_API_URL}/api/posts/{externalPostId}"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return normalize_social_post(resp.json())
    except Exception:
        pass

    # Fallback to fetching all and filtering by ID
    all_posts = await fetchClassifiedWaterRelatedPosts()
    for p in all_posts:
        if p["sourcePostId"] == externalPostId or p["socialReportId"] == externalPostId:
            return p

    return None

async def updateVerificationStatus(externalPostId: str, status: str, comment: str = None):
    """Posts official municipal comment back to CoastalSocial when reviewed."""
    print(f"[SocialMediaService] Updating CoastalSocial post {externalPostId} with status: {status}")
    if not comment:
        return

    try:
        comment_url = f"{COASTAL_SOCIAL_API_URL}/api/posts/{externalPostId}/comments"
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(comment_url, params={
                "username": "🏛️ JalDrishti Disaster Desk",
                "text": comment
            })
            print(f"[SocialMediaService] Automated comment response code: {resp.status_code}")
    except Exception as e:
        print(f"[SocialMediaService] Could not post comment to CoastalSocial: {e}")
