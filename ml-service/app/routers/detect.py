from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel

router = APIRouter()

class DetectionResult(BaseModel):
    hazard_type: str
    severity: int
    confidence: float
    description: str

@router.post("/detect", response_model=DetectionResult)
async def detect_hazard(file: UploadFile = File(...)):
    # TODO: replace with real model call
    return DetectionResult(
        hazard_type="flooding",
        severity=3,
        confidence=0.87,
        description="Placeholder result — model not connected yet"
    )