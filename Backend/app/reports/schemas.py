from enum import Enum

from pydantic import BaseModel


class ReportCategory(str, Enum):
    flooding = "flooding"
    urban_flooding = "urban_flooding"
    water_quality = "water_quality"
    pond_lake_problem = "pond_lake_problem"
    drainage_problem = "drainage_problem"
    other_water_problem = "other_water_problem"


class ReportStatus(str, Enum):
    submitted = "submitted"
    under_review = "under_review"
    verified = "verified"
    action_in_progress = "action_in_progress"
    resolved = "resolved"
    rejected = "rejected"


class ReportPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ReportLocation(BaseModel):
    latitude: float
    longitude: float
    state: str | None = None
    district: str | None = None
    city: str | None = None
    locality: str | None = None


class MLAnalysis(BaseModel):
    isWaterRelated: bool | None = None
    category: ReportCategory | None = None
    confidence: float | None = None


class AIAnalysis(BaseModel):
    title: str | None = None
    description: str | None = None


class ReportVerification(BaseModel):
    status: str = "Pending"
    verifiedBy: str | None = None
    verifiedAt: str | None = None


class ReportBase(BaseModel):
    username: str = "anonymous"
    title: str
    description: str
    imageUrl: str | None = None
    category: ReportCategory | None = None
    priority: ReportPriority = ReportPriority.medium
    status: ReportStatus = ReportStatus.submitted
    location: ReportLocation
    aiAnalysis: AIAnalysis | None = None
    mlAnalysis: MLAnalysis | None = None

# =========================================================
# REPORT ASSIGNMENT
# =========================================================

class ReportAssignment(BaseModel):

    department: str

    assignedTo: str

    assignedBy: str = "admin"
