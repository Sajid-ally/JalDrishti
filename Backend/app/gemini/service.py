import json
from PIL import Image
from google import genai

from app.config import settings
from app.gemini.prompt import TEXT_PROMPT, VERIFY_PROMPT

# =====================================================
# CoastalEye Gemini Client
# =====================================================

client = genai.Client(api_key=settings.GEMINI_API_KEY)

print(
    "CoastalEye Gemini key loaded:",
    settings.GEMINI_API_KEY[:8] if settings.GEMINI_API_KEY else "None",
)

MODEL_NAME = "gemini-3.5-flash"

# =====================================================
# Gemini: verify hazard only (fallback when ML confidence is low)
# =====================================================

async def verifyHazard(imagePath: str):
    image = Image.open(imagePath)

    response = await client.aio.models.generate_content(
        model=MODEL_NAME,
        contents=[VERIFY_PROMPT, image],
    )

    text = (
        response.text.replace("```json", "")
        .replace("```", "")
        .strip()
    )

    return json.loads(text)

# =====================================================
# Gemini: generate title + description only
# =====================================================

async def generateReportText(imagePath: str):
    image = Image.open(imagePath)

    response = await client.aio.models.generate_content(
        model=MODEL_NAME,
        contents=[TEXT_PROMPT, image],
    )

    text = (
        response.text.replace("```json", "")
        .replace("```", "")
        .strip()
    )

    return json.loads(text)