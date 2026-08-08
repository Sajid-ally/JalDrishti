from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class HazardCategory(str, Enum):
    flood = "Flood"
    tsunami = "Tsunami"
    highWave = "High Wave"
    stormSurge = "Storm Surge"
    coastalErosion = "Coastal Erosion"
    abnormalSeaBehaviour = "Abnormal Sea Behaviour"
    other = "Other"


class ReportCreate(BaseModel):

    title: str = Field(..., min_length=5, max_length=100)

    description: str = Field(..., min_length=10, max_length=1000)

    category: HazardCategory

    latitude: float

    longitude: float