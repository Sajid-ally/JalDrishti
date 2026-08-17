from datetime import datetime

from fastapi import APIRouter

from app.socialMedia.service import (
    createSocialMediaPost,
    getSocialMediaPosts,
    getSocialMediaPostById,
    findSocialMediaEvidence,
    validateSocialMediaEvidence
)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/social-media",
    tags=["Dummy Social Media"]
)


# =========================================================
# CREATE POST
# =========================================================

@router.post("/")
async def addSocialMediaPost(
    postData: dict
):

    print(
        "CREATING DUMMY SOCIAL MEDIA POST"
    )

    # -----------------------------------------------------
    # Add timestamp automatically
    # -----------------------------------------------------

    postData["createdAt"] = datetime.utcnow()

    insertedId = await createSocialMediaPost(
        postData
    )

    return {
        "message":
            "Social media post created successfully",

        "postId":
            str(insertedId)
    }


# =========================================================
# GET ALL POSTS
# =========================================================

@router.get("/")
async def fetchSocialMediaPosts():

    print(
        "FETCHING DUMMY SOCIAL MEDIA POSTS"
    )

    posts = await getSocialMediaPosts()

    return {
        "count":
            len(posts),

        "posts":
            posts
    }


# =========================================================
# SEARCH SOCIAL MEDIA EVIDENCE
# =========================================================

@router.get("/evidence/check")
async def checkSocialMediaEvidence(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5
):

    print(
        "CHECKING SOCIAL MEDIA EVIDENCE"
    )

    posts = await findSocialMediaEvidence(
        latitude=latitude,
        longitude=longitude,
        category=category,
        radiusKm=radiusKm
    )

    return {
        "latitude":
            latitude,

        "longitude":
            longitude,

        "category":
            category,

        "radiusKm":
            radiusKm,

        "matchingPostCount":
            len(posts),

        "posts":
            posts
    }


# =========================================================
# VALIDATE SOCIAL MEDIA EVIDENCE
# =========================================================

@router.get("/evidence/validate")
async def validateSocialMedia(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5
):

    print(
        "VALIDATING SOCIAL MEDIA EVIDENCE"
    )

    result = await validateSocialMediaEvidence(
        latitude=latitude,
        longitude=longitude,
        category=category,
        radiusKm=radiusKm
    )

    return result


# =========================================================
# GET SINGLE POST
# =========================================================

@router.get("/{postId}")
async def fetchSocialMediaPost(
    postId: str
):

    print(
        "FETCHING SOCIAL MEDIA POST"
    )

    post = await getSocialMediaPostById(
        postId
    )

    if post is None:

        return {
            "message":
                "Social media post not found"
        }

    return post