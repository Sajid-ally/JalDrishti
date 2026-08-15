import os
import httpx

ML_SERVICE_URL = "http://localhost:8001"

async def getOwnModelPrediction(imagePath: str) -> dict:
    if not os.path.exists(imagePath):
        return {
            "hazard_type": "normal",
            "confidence": 0.0,
            "severity": 0,
        }

    with open(imagePath, "rb") as f:
        image_bytes = f.read()

    async with httpx.AsyncClient(timeout=20.0) as client:
        files = {
            "file": (
                os.path.basename(imagePath),
                image_bytes,
                "image/jpeg",
            )
        }

        response = await client.post(
            f"{ML_SERVICE_URL}/api/detect",
            files=files,
        )

        response.raise_for_status()
        return response.json()


async def sendCorrectionToML(imagePath: str, correctedHazard: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{ML_SERVICE_URL}/api/corrections",
            json={
                "imagePath": imagePath,
                "correctedHazard": correctedHazard,
            },
        )

        response.raise_for_status()
        return response.json()

