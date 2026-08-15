from datetime import datetime
from bson import ObjectId

from app.database import database


# =========================================================
# CREATE SOCIAL MEDIA POST
# =========================================================

async def createSocialMediaPost(postData: dict):

    print("CREATING SOCIAL MEDIA POST")

    result = await database.socialMediaPosts.insert_one(
        postData
    )

    print(
        "SOCIAL MEDIA POST CREATED:",
        result.inserted_id
    )

    return result.inserted_id


# =========================================================
# GET ALL SOCIAL MEDIA POSTS
# =========================================================

async def getSocialMediaPosts():

    print("FETCHING SOCIAL MEDIA POSTS")

    cursor = database.socialMediaPosts.find(
        {}
    ).sort(
        "createdAt",
        -1
    )

    posts = []

    async for post in cursor:

        post["id"] = str(
            post["_id"]
        )

        del post["_id"]

        posts.append(post)

    print(
        "SOCIAL MEDIA POSTS FOUND:",
        len(posts)
    )

    return posts


# =========================================================
# GET SOCIAL MEDIA POST BY ID
# =========================================================

async def getSocialMediaPostById(
    postId: str
):

    print(
        "FETCHING SOCIAL MEDIA POST:",
        postId
    )

    try:

        post = await database.socialMediaPosts.find_one(
            {
                "_id": ObjectId(postId)
            }
        )

    except Exception:

        return None

    if post is None:

        return None

    post["id"] = str(
        post["_id"]
    )

    del post["_id"]

    return post


# =========================================================
# FIND SOCIAL MEDIA EVIDENCE
# =========================================================

async def findSocialMediaEvidence(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5
):

    print(
        "SEARCHING DUMMY SOCIAL MEDIA EVIDENCE"
    )

    print(
        "LATITUDE:",
        latitude
    )

    print(
        "LONGITUDE:",
        longitude
    )

    print(
        "CATEGORY:",
        category
    )

    print(
        "RADIUS:",
        radiusKm
    )

    # -----------------------------------------------------
    # Get all posts
    # -----------------------------------------------------

    cursor = database.socialMediaPosts.find(
        {
            "category": {
                "$regex": f"^{category}$",
                "$options": "i"
            }
        }
    )

    matchingPosts = []

    # -----------------------------------------------------
    # Check location
    # -----------------------------------------------------

    import math

    async for post in cursor:

        postLocation = post.get(
            "location",
            {}
        )

        postLatitude = postLocation.get(
            "latitude"
        )

        postLongitude = postLocation.get(
            "longitude"
        )

        if (
            postLatitude is None
            or postLongitude is None
        ):
            continue

        latitudeDifference = (
            float(postLatitude)
            - latitude
        )

        longitudeDifference = (
            float(postLongitude)
            - longitude
        )

        distanceKm = math.sqrt(
            (latitudeDifference * 111) ** 2
            +
            (
                longitudeDifference
                * 111
                * math.cos(
                    math.radians(latitude)
                )
            ) ** 2
        )

        if distanceKm <= radiusKm:

            post["id"] = str(
                post["_id"]
            )

            del post["_id"]

            post["distanceKm"] = round(
                distanceKm,
                2
            )

            matchingPosts.append(
                post
            )

    print(
        "MATCHING SOCIAL MEDIA POSTS:",
        len(matchingPosts)
    )

    return matchingPosts

# =========================================================
# VALIDATE SOCIAL MEDIA EVIDENCE
# =========================================================

async def validateSocialMediaEvidence(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5
):

    print("====================================")
    print("VALIDATING SOCIAL MEDIA EVIDENCE")
    print("====================================")

    matchingPosts = await findSocialMediaEvidence(
        latitude=latitude,
        longitude=longitude,
        category=category,
        radiusKm=radiusKm
    )

    # -----------------------------------------------------
    # NO SOCIAL MEDIA EVIDENCE
    # -----------------------------------------------------

    if not matchingPosts:

        return {
            "socialMediaEvidence": False,
            "matchingPosts": 0,
            "confidenceContribution": 0,
            "posts": []
        }

    # -----------------------------------------------------
    # FIND NEAREST POST
    # -----------------------------------------------------

    nearestDistanceKm = min(
        post["distanceKm"]
        for post in matchingPosts
    )

    # -----------------------------------------------------
    # CALCULATE CONFIDENCE CONTRIBUTION
    # -----------------------------------------------------

    if nearestDistanceKm <= 1:

        confidenceContribution = 20

    elif nearestDistanceKm <= 3:

        confidenceContribution = 15

    else:

        confidenceContribution = 10

    # -----------------------------------------------------
    # RETURN VALIDATION RESULT
    # -----------------------------------------------------

    result = {

        "socialMediaEvidence": True,

        "matchingPosts":
            len(matchingPosts),

        "nearestDistanceKm":
            nearestDistanceKm,

        "confidenceContribution":
            confidenceContribution,

        "posts":
            matchingPosts
    }

    print(
        "SOCIAL MEDIA VALIDATION RESULT:"
    )

    print(result)

    return result