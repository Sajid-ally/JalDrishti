import os
import httpx
from app.config import settings


async def getOwnModelPrediction(imagePath: str) -> dict:
    if not os.path.exists(imagePath):
        return {
            "hazard_type": "normal",
            "confidence": 0.0,
            "severity": 0,
            "available": False,
            "description": "Image file not found",
        }

    try:
        with open(imagePath, "rb") as f:
            image_bytes = f.read()

        ml_url = getattr(settings, "ML_SERVICE_URL", "http://localhost:8001")

        async with httpx.AsyncClient(timeout=15.0) as client:
            files = {
                "file": (
                    os.path.basename(imagePath),
                    image_bytes,
                    "image/jpeg",
                )
            }

            response = await client.post(
                f"{ml_url}/api/detect",
                files=files,
            )

            if response.status_code == 200:
                data = response.json()
                data["available"] = True
                return data
            else:
                print(f"[ML CLIENT] ML service returned status {response.status_code}: {response.text}")
                return {
                    "hazard_type": "unknown",
                    "confidence": 0.0,
                    "severity": 0,
                    "available": False,
                    "description": f"ML error: {response.status_code}",
                }
    except Exception as e:
        print(f"[ML CLIENT] Could not connect to ML service: {e}")
        return {
            "hazard_type": "unknown",
            "confidence": 0.0,
            "severity": 0,
            "available": False,
            "description": "ML service unavailable",
        }


async def sendCorrectionToML(imagePath: str, correctedHazard: str) -> dict:
    try:
        ml_url = getattr(settings, "ML_SERVICE_URL", "http://localhost:8001")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{ml_url}/api/corrections",
                json={
                    "imagePath": imagePath,
                    "correctedHazard": correctedHazard,
                },
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"[ML CLIENT] Correction submission skipped: {e}")
    return {"status": "skipped"}
