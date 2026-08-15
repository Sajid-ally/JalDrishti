from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.models.image_model import classify_image

router = APIRouter(prefix="/api", tags=["ML Detection"])

ALLOWED_IMAGE_TYPES = {
"image/jpeg",
"image/png",
"image/webp"
}

class DetectionResult(BaseModel):
  hazard_type: str
  severity: int
  confidence: float
  second_prediction: str
  second_confidence: float
  description: str

@router.post("/detect", response_model=DetectionResult)
async def detect_hazard(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
     raise HTTPException(
status_code=400,
detail="Only JPG, PNG and WEBP images are allowed"
)


    image_bytes = await file.read()

    if len(image_bytes) == 0:
     raise HTTPException(
        status_code=400,
        detail="Empty image file"
    )

    result = classify_image(image_bytes)

    return DetectionResult(
    hazard_type=result["hazard_type"],
    severity=result["severity"],
    confidence=result["confidence"],
    second_prediction=result["second_prediction"],
    second_confidence=result["second_confidence"],
    description=f"Detected {result['hazard_type']} with {result['confidence'] * 100:.0f}% confidence"
)

