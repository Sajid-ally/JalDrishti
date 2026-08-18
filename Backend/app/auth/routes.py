from fastapi import APIRouter, HTTPException, Depends, status
from app.auth.schemas import (
    SignupRequest,
    LoginRequest,
    SyncUserRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AuthResponse,
    UserProfile,
)
from app.auth.service import (
    create_or_update_user,
    get_user_by_email,
    get_user_by_firebase_uid,
    verify_password,
    create_access_token,
    verify_firebase_id_token,
    reset_user_password,
)
from app.database import database
from app.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/signup", response_model=AuthResponse)
async def signup(data: SignupRequest):
    email = data.email.lower().strip()

    # Check if user already exists
    existing = await get_user_by_email(email)
    if existing and existing.get("passwordHash"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please login.",
        )

    firebase_uid = None
    if data.firebaseToken:
        fb_info = verify_firebase_id_token(data.firebaseToken)
        if fb_info:
            firebase_uid = fb_info.get("uid")

    user = await create_or_update_user(
        email=email,
        name=data.name,
        role=data.role,
        firebase_uid=firebase_uid,
        password=data.password,
    )

    token = create_access_token({
        "sub": user["id"],
        "userId": user["id"],
        "firebaseUid": user.get("firebaseUid"),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
    })

    return AuthResponse(
        success=True,
        message="User registered successfully",
        token=token,
        user=UserProfile(
            id=user["id"],
            firebaseUid=user.get("firebaseUid"),
            name=user["name"],
            email=user["email"],
            role=user["role"],
            createdAt=str(user.get("createdAt")),
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest):
    # 1. Firebase Token Login
    if data.firebaseToken:
        fb_info = verify_firebase_id_token(data.firebaseToken)
        if not fb_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Firebase authentication token.",
            )

        user = await get_user_by_firebase_uid(fb_info["uid"])
        if not user and fb_info.get("email"):
            user = await get_user_by_email(fb_info["email"])

        if not user:
            # Create user on first Firebase login
            user = await create_or_update_user(
                email=fb_info.get("email", ""),
                name=fb_info.get("name", "Citizen"),
                role=data.role or "citizen",
                firebase_uid=fb_info["uid"],
            )
        elif data.role and data.role in ["citizen", "government"] and user.get("role") != data.role:
            # Sync user role seamlessly for prototype demo
            await database.users.update_one({"_id": user["_id"]}, {"$set": {"role": data.role}})
            user["role"] = data.role

        token = create_access_token({
            "sub": user["id"],
            "userId": user["id"],
            "firebaseUid": user.get("firebaseUid"),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        })

        return AuthResponse(
            success=True,
            message="Firebase login successful",
            token=token,
            user=UserProfile(
                id=user["id"],
                firebaseUid=user.get("firebaseUid"),
                name=user["name"],
                email=user["email"],
                role=user["role"],
            ),
        )

    # 2. Email + Password Login
    if not data.email or not data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required.",
        )

    user = await get_user_by_email(data.email)
    if not user or not user.get("passwordHash") or not user.get("salt"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(data.password, user["passwordHash"], user["salt"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Update role seamlessly based on login selection for prototype access
    target_role = data.role if data.role in ["citizen", "government"] else user.get("role", "citizen")
    if user.get("role") != target_role:
        await database.users.update_one({"_id": user["_id"]}, {"$set": {"role": target_role}})
        user["role"] = target_role

    token = create_access_token({
        "sub": user["id"],
        "userId": user["id"],
        "firebaseUid": user.get("firebaseUid"),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
    })

    return AuthResponse(
        success=True,
        message="Login successful",
        token=token,
        user=UserProfile(
            id=user["id"],
            firebaseUid=user.get("firebaseUid"),
            name=user["name"],
            email=user["email"],
            role=user["role"],
        ),
    )


@router.post("/sync", response_model=AuthResponse)
async def sync_firebase_user(data: SyncUserRequest):
    """
    Syncs a Firebase-authenticated user to MongoDB Atlas and returns a backend JWT session token.
    """
    firebase_uid = data.firebaseUid
    email = data.email or ""
    name = data.name or ""

    if data.firebaseToken:
        fb_info = verify_firebase_id_token(data.firebaseToken)
        if fb_info:
            firebase_uid = fb_info.get("uid", firebase_uid)
            email = fb_info.get("email", email)
            name = fb_info.get("name", name)

    if not firebase_uid and not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase UID or email is required to sync user.",
        )

    user = await create_or_update_user(
        email=email,
        name=name,
        role=data.role or "citizen",
        firebase_uid=firebase_uid,
    )

    token = create_access_token({
        "sub": user["id"],
        "userId": user["id"],
        "firebaseUid": user.get("firebaseUid"),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
    })

    return AuthResponse(
        success=True,
        message="User synchronized successfully",
        token=token,
        user=UserProfile(
            id=user["id"],
            firebaseUid=user.get("firebaseUid"),
            name=user["name"],
            email=user["email"],
            role=user["role"],
        ),
    )


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    email = data.email.lower().strip()
    user = await get_user_by_email(email)
    if not user:
        # Avoid user enumeration for security, but indicate request accepted
        return {
            "success": True,
            "message": "If an account exists with this email address, password reset instructions have been initialized.",
        }

    return {
        "success": True,
        "message": f"Account verified for {email}. You may now reset your password.",
        "userFound": True,
    }


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    email = data.email.lower().strip()
    if not data.newPassword or len(data.newPassword) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters.",
        )

    updated_user = await reset_user_password(email, data.newPassword)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found matching this email address.",
        )

    token = create_access_token({
        "sub": updated_user["id"],
        "userId": updated_user["id"],
        "firebaseUid": updated_user.get("firebaseUid"),
        "email": updated_user["email"],
        "name": updated_user["name"],
        "role": updated_user["role"],
    })

    return {
        "success": True,
        "message": "Password has been successfully reset. You are now logged in.",
        "token": token,
        "user": {
            "id": updated_user["id"],
            "name": updated_user["name"],
            "email": updated_user["email"],
            "role": updated_user["role"],
        },
    }


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "user": {
            "id": user["id"],
            "firebaseUid": user.get("firebaseUid"),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "citizen"),
            "phone": user.get("phone", ""),
            "department": user.get("department", ""),
            "designation": user.get("designation", ""),
            "governmentId": user.get("governmentId", ""),
            "location": user.get("location", ""),
            "photoUrl": user.get("photoUrl", ""),
        },
    }


from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    governmentId: Optional[str] = None
    location: Optional[str] = None
    photoUrl: Optional[str] = None

@router.patch("/profile")
async def update_profile(data: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    update_dict = {}
    if data.name is not None:
        update_dict["name"] = data.name.strip()
    if data.phone is not None:
        update_dict["phone"] = data.phone.strip()
    if data.department is not None:
        update_dict["department"] = data.department.strip()
    if data.designation is not None:
        update_dict["designation"] = data.designation.strip()
    if data.governmentId is not None:
        update_dict["governmentId"] = data.governmentId.strip()
    if data.location is not None:
        update_dict["location"] = data.location.strip()
    if data.photoUrl is not None:
        update_dict["photoUrl"] = data.photoUrl

    update_dict["updatedAt"] = datetime.utcnow()

    if ObjectId.is_valid(user_id):
        q = {"_id": ObjectId(user_id)}
    else:
        q = {"email": user.get("email")}

    await database.users.update_one(q, {"$set": update_dict})
    updated_user = await database.users.find_one(q)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")

    new_name = updated_user.get("name", user.get("name"))
    token = create_access_token({
        "sub": str(updated_user["_id"]),
        "userId": str(updated_user["_id"]),
        "email": updated_user.get("email"),
        "name": new_name,
        "role": updated_user.get("role"),
    })

    return {
        "success": True,
        "message": "Profile updated successfully",
        "token": token,
        "user": {
            "id": str(updated_user["_id"]),
            "name": new_name,
            "email": updated_user.get("email"),
            "role": updated_user.get("role"),
            "phone": updated_user.get("phone", ""),
            "department": updated_user.get("department", ""),
            "designation": updated_user.get("designation", ""),
            "governmentId": updated_user.get("governmentId", ""),
            "location": updated_user.get("location", ""),
            "photoUrl": updated_user.get("photoUrl", ""),
        },
    }
