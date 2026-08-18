from typing import Optional
from fastapi import Header, HTTPException, status, Depends
from app.auth.service import decode_access_token, verify_firebase_id_token, get_user_by_firebase_uid, get_user_by_email, get_user_by_id


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please login first.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.replace("Bearer ", "").strip()

    # 1. Try local JWT token
    payload = decode_access_token(token)
    if payload:
        user_id = payload.get("sub") or payload.get("userId")
        user = await get_user_by_id(user_id) if user_id else None
        if user:
            return user
        # Return synthetic user dict if user was encoded directly
        return {
            "id": user_id or "usr_jwt",
            "userId": user_id or "usr_jwt",
            "firebaseUid": payload.get("firebaseUid") or user_id,
            "email": payload.get("email", ""),
            "name": payload.get("name", "User"),
            "role": payload.get("role", "citizen"),
        }

    # 2. Try Firebase ID Token
    fb_user = verify_firebase_id_token(token)
    if fb_user:
        user = await get_user_by_firebase_uid(fb_user["uid"])
        if user:
            return user
        # Also check by email
        if fb_user.get("email"):
            user = await get_user_by_email(fb_user["email"])
            if user:
                return user
        return {
            "id": fb_user["uid"],
            "userId": fb_user["uid"],
            "firebaseUid": fb_user["uid"],
            "email": fb_user.get("email", ""),
            "name": fb_user.get("name", "Citizen"),
            "role": "citizen",
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization)
    except Exception:
        return None


async def require_government_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "government":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to government officials.",
        )
    return user


async def require_citizen_user(user: dict = Depends(get_current_user)) -> dict:
    return user
