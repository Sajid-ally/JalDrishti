from enum import Enum
from pydantic import BaseModel
from typing import Optional

from app.reports.schemas import ReportLocation, ReportCategory


class SocialReportStatus(str, Enum):
    pending_verification = "pending_verification"
    approved = "approved"
    rejected = "rejected"


class SocialReportCreate(BaseModel):
    platform: str
    sourcePostId: str

    username: Optional[str] = None

    title: str
    description: str

    imageUrl: Optional[str] = None

    location: ReportLocation

    category: Optional[ReportCategory] = None
    mlConfidence: Optional[float] = None

    postedAt: Optional[str] = None


class SocialReportReview(BaseModel):
    status: SocialReportStatus

    reviewedBy: str

    rejectionReason: Optional[str] = None