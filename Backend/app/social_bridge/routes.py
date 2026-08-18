from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from typing import Optional
from app.social_bridge.service import (
    process_social_post_verification,
    get_social_post_status
)

router = APIRouter(
    prefix="/api/social-bridge",
    tags=["Social Verification Bridge"]
)

@router.post("/verify-post")
async def verify_social_post(
    username: str = Form("Citizen"),
    content: str = Form(""),
    category: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    social_post_id: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None)
):
    """
    Public Endpoint called by CoastalSocial (or any connected app):
    1. Filters non-water content (selfies/memes/news) vs water hazards.
    2. Auto-corrects misleading/vague captions using Gemini AI.
    3. Detects duplicates & prior reports with perceptual image hashes.
    4. Auto-logs water hazards into JalDrishti for Government Action.
    """
    image_bytes = None
    image_filename = None

    if image:
        image_bytes = await image.read()
        image_filename = image.filename

    result = await process_social_post_verification(
        username=username,
        content=content,
        image_bytes=image_bytes,
        image_filename=image_filename,
        latitude=latitude,
        longitude=longitude,
        user_category=category,
        social_post_id=social_post_id
    )

    return result

@router.get("/post-status/{post_id}")
async def get_status_for_post(post_id: str):
    """
    Called by CoastalSocial to get real-time JalDrishti status, 
    assigned department, and official municipal explanation comments.
    """
    result = await get_social_post_status(post_id)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail="Social post disaster reference not found")
    return result
