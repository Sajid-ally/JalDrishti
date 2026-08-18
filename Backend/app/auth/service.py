import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from bson import ObjectId
import jwt
import firebase_admin
from firebase_admin import credentials, auth as fb_auth

from app.config import settings
from app.database import database

# =========================================================
# INITIALIZE FIREBASE ADMIN (IF CONFIGURED)
# =========================================================

firebase_initialized = False

try:
    if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        firebase_initialized = True
        print("[AUTH] Firebase Admin initialized with service account certificate.")
    elif settings.FIREBASE_PROJECT_ID:
        firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})
        firebase_initialized = True
        print(f"[AUTH] Firebase Admin initialized for project: {settings.FIREBASE_PROJECT_ID}")
    else:
        # Initialize default app if available
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
            firebase_initialized = True
            print("[AUTH] Firebase Admin initialized with default application credentials.")
except Exception as e:
    print(f"[AUTH] Firebase Admin initialization skipped/failed: {e}")


# =========================================================
# PASSWORD HASHING (PBKDF2-SHA256)
# =========================================================

def hash_password(password: str) -> tuple[str, str]:
    """Returns (password_hash, salt_hex)"""
    salt = secrets.token_hex(16)
    hash_bytes = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000,
    )
    return hash_bytes.hex(), salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    hash_bytes = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000,
    )
    return secrets.compare_digest(hash_bytes.hex(), password_hash)


# =========================================================
# JWT TOKENS
# =========================================================

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=JWT_EXPIRATION_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None


# =========================================================
# FIREBASE TOKEN VERIFICATION
# =========================================================

def verify_firebase_id_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies Firebase ID token using firebase_admin if configured,
    or falls back to unverified payload decoding for local dev.
    """
    if firebase_initialized:
        try:
            decoded = fb_auth.verify_id_token(id_token)
            return {
                "uid": decoded.get("uid"),
                "email": decoded.get("email"),
                "name": decoded.get("name") or (decoded.get("email", "").split("@")[0] if decoded.get("email") else "Citizen"),
            }
        except Exception:
            pass

    # Fallback to standard JWT decoding
    try:
        payload = jwt.decode(id_token, options={"verify_signature": False})
        uid = payload.get("user_id") or payload.get("sub") or payload.get("uid")
        email = payload.get("email")
        name = payload.get("name") or (email.split("@")[0] if email else "Citizen")
        if uid:
            return {
                "uid": str(uid),
                "email": email,
                "name": name,
            }
    except Exception as e:
        print(f"[AUTH] Fallback token parse note: {e}")

    return None


# =========================================================
# USER DATABASE OPERATIONS (MongoDB Atlas)
# =========================================================

async def get_user_by_email(email: str) -> Optional[dict]:
    if not email:
        return None
    user = await database.users.find_one({"email": email.lower().strip()})
    if user:
        user["id"] = str(user["_id"])
    return user


async def get_user_by_firebase_uid(firebase_uid: str) -> Optional[dict]:
    if not firebase_uid:
        return None
    user = await database.users.find_one({"firebaseUid": firebase_uid})
    if user:
        user["id"] = str(user["_id"])
    return user


async def get_user_by_id(user_id: str) -> Optional[dict]:
    try:
        user = await database.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["id"] = str(user["_id"])
            return user
    except Exception:
        pass
    return await get_user_by_firebase_uid(user_id)


async def create_or_update_user(
    email: str,
    name: str,
    role: str = "citizen",
    firebase_uid: Optional[str] = None,
    password: Optional[str] = None,
) -> dict:
    email_clean = email.lower().strip() if email else ""
    now = datetime.utcnow()

    query = {}
    if firebase_uid:
        query = {"firebaseUid": firebase_uid}
    elif email_clean:
        query = {"email": email_clean}

    existing = await database.users.find_one(query) if query else None

    update_fields = {
        "name": name or (email_clean.split("@")[0] if email_clean else "Citizen"),
        "role": role if role in ["citizen", "government"] else "citizen",
        "updatedAt": now,
    }
    if email_clean:
        update_fields["email"] = email_clean
    if firebase_uid:
        update_fields["firebaseUid"] = firebase_uid

    if password:
        p_hash, salt = hash_password(password)
        update_fields["passwordHash"] = p_hash
        update_fields["salt"] = salt

    if existing:
        await database.users.update_one({"_id": existing["_id"]}, {"$set": update_fields})
        existing.update(update_fields)
        existing["id"] = str(existing["_id"])
        return existing
    else:
        update_fields["createdAt"] = now
        res = await database.users.insert_one(update_fields)
        update_fields["id"] = str(res.inserted_id)
        return update_fields


async def reset_user_password(email: str, new_password: str) -> Optional[dict]:
    email_clean = email.lower().strip()
    user = await database.users.find_one({"email": email_clean})
    if not user:
        return None

    p_hash, salt = hash_password(new_password)
    now = datetime.utcnow()
    await database.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"passwordHash": p_hash, "salt": salt, "updatedAt": now}}
    )
    user["passwordHash"] = p_hash
    user["salt"] = salt
    user["id"] = str(user["_id"])
    return user


async def ensure_demo_users():
    """Seeds default demo accounts for effortless prototype access and testing."""
    try:
        gov_user = await get_user_by_email("official@jaldrishti.gov.in")
        if not gov_user:
            await create_or_update_user(
                email="official@jaldrishti.gov.in",
                name="Disaster Officer",
                role="government",
                password="password123",
            )
            print("[AUTH] Seeded default Government Officer account: official@jaldrishti.gov.in / password123")

        citizen_user = await get_user_by_email("citizen@jaldrishti.in")
        if not citizen_user:
            await create_or_update_user(
                email="citizen@jaldrishti.in",
                name="Aarav Sharma",
                role="citizen",
                password="password123",
            )
            print("[AUTH] Seeded default Citizen account: citizen@jaldrishti.in / password123")
    except Exception as e:
        print(f"[AUTH] Demo seed note: {e}")

