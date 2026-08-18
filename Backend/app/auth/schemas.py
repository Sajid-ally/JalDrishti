from typing import Optional
from pydantic import BaseModel


class SignupRequest(BaseModel):
    name: str
    email: str
    password: Optional[str] = None
    role: str = "citizen"
    firebaseToken: Optional[str] = None


class LoginRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = "citizen"
    firebaseToken: Optional[str] = None


class SyncUserRequest(BaseModel):
    firebaseUid: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = "citizen"
    firebaseToken: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    newPassword: str


class UserProfile(BaseModel):
    id: str
    firebaseUid: Optional[str] = None
    name: str
    email: str
    role: str
    createdAt: Optional[str] = None


class AuthResponse(BaseModel):
    success: bool = True
    message: str = "Authentication successful"
    token: str
    user: UserProfile
