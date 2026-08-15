"""
Detection API Route
---------------------
This file exposes your trained model as an HTTP endpoint.
It does NOT contain any ML logic itself — it just:
1. Receives an uploaded image from an HTTP request
2. Passes it to your already-trained model (image_model.py)
3. Adds severity on top of the raw prediction
4. Returns a structured JSON response
"""

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from app.models.image_model import classify_image
from app.models.severity_predictor import predict_severity

router = APIRouter()

# Defines the exact shape of what this endpoint returns.
# FastAPI uses this to validate the response and auto-generate docs.
class DetectionResult(BaseModel):
    hazard_type: str
    severity: int
    confidence: float
    description: str


@router.post("/detect", response_model=DetectionResult)
async def detect_hazard(file: UploadFile = File(...)):
    # Read the uploaded file's raw bytes
    image_bytes = await file.read()

    # Run YOUR trained model (already tested standalone) on this image
    result = classify_image(image_bytes)

    # Add severity using the rule-based mapping
    severity = predict_severity(result["hazard_type"], result["confidence"])

    return DetectionResult(
        hazard_type=result["hazard_type"],
        severity=severity,
        confidence=result["confidence"],
        description=f"Detected {result['hazard_type']} with {result['confidence']*100:.0f}% confidence",
    )