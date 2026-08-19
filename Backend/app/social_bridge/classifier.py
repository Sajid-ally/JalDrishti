import os
import io
import hashlib
from typing import Optional, Dict, Any, Tuple
from PIL import Image
from app.config import settings
from app.database import database

# Supported water disaster categories
WATER_HAZARD_CATEGORIES = [
    "urban_flooding",
    "waterlogging",
    "drainage_overflow",
    "water_quality",
    "storm_surge",
    "coastal_erosion"
]

def compute_perceptual_hash(image_bytes: bytes) -> str:
    """Computes perceptual difference hash (dhash) using Pillow."""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        img = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
        pixels = list(img.getdata())
        diff = []
        for row in range(8):
            for col in range(8):
                diff.append(pixels[row * 9 + col] > pixels[row * 9 + col + 1])
        decimal_val = 0
        hex_str = []
        for idx, val in enumerate(diff):
            if val:
                decimal_val += 2 ** (idx % 4)
            if (idx % 4) == 3:
                hex_str.append(hex(decimal_val)[2:])
                decimal_val = 0
        return "".join(hex_str)
    except Exception:
        return hashlib.md5(image_bytes).hexdigest()

def is_duplicate_hash(hash1: str, hash2: str, threshold: int = 6) -> bool:
    """Checks if two image hashes are duplicates within Hamming distance threshold."""
    if not hash1 or not hash2:
        return False
    if hash1 == hash2:
        return True
    try:
        h1_bin = bin(int(hash1, 16))[2:].zfill(len(hash1) * 4)
        h2_bin = bin(int(hash2, 16))[2:].zfill(len(hash2) * 4)
        diff_bits = sum(b1 != b2 for b1, b2 in zip(h1_bin, h2_bin))
        return diff_bits <= threshold
    except Exception:
        return hash1 == hash2

async def classify_social_content(
    image_bytes: Optional[bytes],
    text_content: str,
    user_category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Multimodal AI Analyzer for Social Media Posts:
    1. Distinguishes true water hazards from non-hazard content (selfies, memes, food, news).
    2. Auto-corrects misleading/vague descriptions and generates an accurate title and summary.
    3. Computes perceptual image hash for duplicate detection.
    """
    image_hash = compute_perceptual_hash(image_bytes) if image_bytes else None

    # Step 1: Try Gemini Multimodal Vision if API Key is available
    if settings.GEMINI_API_KEY and image_bytes:
        try:
            from google import genai
            from google.genai import types
            import json

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
            prompt = f"""
You are an expert municipal disaster management AI for water hazards in India.
Analyze this social media image and text content: "{text_content}".

Determine whether this image shows an authentic on-ground WATER HAZARD or DISASTER (such as urban flooding, submerged streets, heavy waterlogging, open drainage/sewer overflow, drinking water contamination, coastal storm surge, or sea erosion).

IMPORTANT CONTENT FILTERING:
- If the image is a selfie, meme, food photo, ordinary portrait, political news infographic, dry landscape, general vehicle, or unrelated scenery, classify it as "non_water_hazard".
- Only classify as a water hazard if there is real, visible water hazard/flooding/drainage crisis.

If it IS a water hazard, generate:
1. An accurate, professional title (e.g. "Severe Waterlogging on Main Road").
2. A clear factual description of the hazard and estimated water depth, even if the user's original caption was vague or wrong.
3. Category from: ["urban_flooding", "waterlogging", "drainage_overflow", "water_quality", "storm_surge", "coastal_erosion"].
4. Severity from: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].

Respond ONLY with a valid JSON object matching this schema:
{{
  "is_water_hazard": true or false,
  "category": "category_name or non_water_hazard",
  "confidence": 0.0 to 1.0,
  "ai_title": "Clean descriptive title",
  "ai_description": "Clean factual hazard summary",
  "severity": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL",
  "reason": "Brief rationale"
}}
"""
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )

            if response and response.text:
                result = json.loads(response.text)
                return {
                    "is_water_hazard": bool(result.get("is_water_hazard", False)),
                    "category": result.get("category", "non_water_hazard"),
                    "confidence": float(result.get("confidence", 0.90)),
                    "ai_title": result.get("ai_title", text_content[:50] or "Reported Water Issue"),
                    "ai_description": result.get("ai_description", text_content or "Water hazard reported via social media."),
                    "severity": result.get("severity", "MEDIUM"),
                    "reason": result.get("reason", "Analyzed via Gemini Vision"),
                    "image_hash": image_hash
                }
        except Exception as e:
            print(f"[SOCIAL_BRIDGE] Gemini classification failed or skipped: {e}")

    # Step 2: Intelligent Heuristic Fallback (Keyword & Category analysis)
    text_lower = (text_content or "").lower()
    water_keywords = [
        "flood", "waterlogging", "waterlog", "drainage", "overflow", "submerged",
        "paani", "naala", "sewage", "gutter", "waterlogged", "deluge", "inundation",
        "tsunami", "high tide", "water level", "clogged drain", "pond", "storm surge"
    ]
    non_water_keywords = [
        "selfie", "meme", "joke", "funny", "news", "cricket", "food", "party",
        "birthday", "movie", "trailer", "politician", "quote"
    ]

    has_water_kw = any(kw in text_lower for kw in water_keywords)
    has_non_water_kw = any(kw in text_lower for kw in non_water_keywords)
    is_water_cat = bool(user_category and any(cat in user_category.lower() for cat in ["flood", "water", "drain", "surge"]))

    if (has_water_kw or is_water_cat) and not (has_non_water_kw and not has_water_kw):
        cat = "urban_flooding" if "flood" in text_lower else ("drainage_overflow" if "drain" in text_lower or "sewage" in text_lower else "waterlogging")
        return {
            "is_water_hazard": True,
            "category": cat,
            "confidence": 0.85,
            "ai_title": f"Reported {cat.replace('_', ' ').title()}",
            "ai_description": text_content if len(text_content) > 10 else f"Water hazard reported via social media: {text_content}",
            "severity": "HIGH" if "flood" in text_lower else "MEDIUM",
            "reason": "Keyword & Category classification match",
            "image_hash": image_hash
        }

    # Default to non-water hazard (safe for memes/selfies/news)
    return {
        "is_water_hazard": False,
        "category": "non_water_hazard",
        "confidence": 0.95,
        "ai_title": text_content[:40] if text_content else "Social Post",
        "ai_description": text_content,
        "severity": "LOW",
        "reason": "Classified as general non-hazard social content",
        "image_hash": image_hash
    }
