import json
from PIL import Image
from google import genai
from app.config import settings
from app.gemini.prompt import ANALYSIS_PROMPT

print("SERVICE.PY LOADED")
print(
    "Gemini key loaded:",
    settings.GEMINI_API_KEY[:8] + "..." if settings.GEMINI_API_KEY else None,
)

client = genai.Client(api_key=settings.GEMINI_API_KEY)


async def analyzeImage(imagePath: str):
    print("Opening image...")

    image = Image.open(imagePath)

    print("Sending request to Gemini...")

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=[ANALYSIS_PROMPT, image],
        )

        print("Gemini responded.")

        responseText = response.text.strip()

        print("Gemini raw response:")
        print(responseText)

        responseText = (
            responseText.replace("```json", "")
            .replace("```", "")
            .strip()
        )

        return json.loads(responseText)

    except Exception as e:
        print("========================================")
        print("GEMINI ERROR:")
        print(repr(e))
        print("========================================")

        return {
            "title": None,
            "description": None,
        }