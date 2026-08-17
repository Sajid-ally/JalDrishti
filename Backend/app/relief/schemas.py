from typing import List, Optional
from pydantic import BaseModel, Field


# =========================================================
# LOCATION
# =========================================================

class ReliefLocation(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    landmark: Optional[str] = None


# =========================================================
# CREATE RELIEF REQUEST
# =========================================================

class ReliefRequestCreate(BaseModel):

    title: str

    description: str

    location: ReliefLocation

    peopleAffected: int = Field(
        ge=1,
        description="Number of people affected by the emergency"
    )

    assistanceRequired: List[str]

    urgency: str

    username: Optional[str] = None


# =========================================================
# ASSIGNED RESCUE TEAM
# =========================================================

class AssignedTeam(BaseModel):

    organization: str

    teamName: str

    resources: List[str] = []


# =========================================================
# ASSIGN RESCUE TEAM
# =========================================================

class ReliefAssignment(BaseModel):

    organization: str

    teamName: str

    resources: List[str] = []

    governmentNote: Optional[str] = None


# =========================================================
# STATUS UPDATE
# =========================================================

class ReliefStatusUpdate(BaseModel):

    status: str

    governmentNote: Optional[str] = None