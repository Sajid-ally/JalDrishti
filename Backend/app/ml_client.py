"""
Calls our own trained hazard classifier, hosted separately in ml-service.
ml-service runs on port 8001, independent from this backend (port 8000).
"""

import httpx

ML_SERVICE_URL = "http://localhost:8001"


async def getOwnModelPrediction(imagePath: str) -> dict:
    """
    Reads the already-saved image from disk and sends it to ml-service
    for hazard classification (flood / landslide / no_flood, etc.)
    """
    with open(imagePath, "rb") as f:
        image_bytes = f.read()

    async with httpx.AsyncClient() as client:
        files = {"file": ("image.jpg", image_bytes, "image/jpeg")}
        response = await client.post(
            f"{ML_SERVICE_URL}/api/detect",
            files=files,
            timeout=15.0
        )
        response.raise_for_status()
        return response.json()