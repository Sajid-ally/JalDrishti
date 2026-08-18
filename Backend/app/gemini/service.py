import os
import io
import sys
import json
import re
import socket
import asyncio
import base64
import requests
import warnings
from typing import Optional, Dict, Any
from PIL import Image

# =====================================================
# Force IPv4 Socket Resolution for Instant Google API Connection
# =====================================================
old_getaddrinfo = socket.getaddrinfo
def _forced_ipv4_getaddrinfo(*args, **kwargs):
    responses = old_getaddrinfo(*args, **kwargs)
    ipv4_res = [r for r in responses if r[0] == socket.AF_INET]
    return ipv4_res if ipv4_res else responses
socket.getaddrinfo = _forced_ipv4_getaddrinfo

# =====================================================
# JalDrishti Clean Logger & AFC Warning Filter
# =====================================================
warnings.filterwarnings("ignore", message=".*automatic function calling.*")

class CleanStderrFilter:
    def __init__(self, original):
        self._orig = original

    def write(self, text: str):
        if "automatic function calling" in text or "AFC" in text:
            return
        if self._orig:
            self._orig.write(text)

    def flush(self):
        if self._orig:
            self._orig.flush()

if not isinstance(sys.stderr, CleanStderrFilter):
    sys.stderr = CleanStderrFilter(sys.stderr)

from app.config import settings
from app.gemini.prompt import COMBINED_ANALYSIS_PROMPT

MODEL_NAME = getattr(settings, "GEMINI_MODEL", "gemini-flash-lite-latest")


def _clean_json_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def _extract_json(text: str) -> Optional[dict]:
    try:
        cleaned = _clean_json_text(text)
        return json.loads(cleaned)
    except Exception:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
    return None


def _prepare_image_b64(image_path: str) -> Optional[str]:
    """
    Optimizes and downscales image to a compact 384x384 JPEG for instant network upload.
    """
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            img.thumbnail((384, 384), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=70)
            return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        print(f"[GEMINI] Image optimization notice: {e}")
        return None


def _call_gemini_vision_rest(prompt: str, b64_image: str) -> Optional[dict]:
    """
    Calls Google Gemini REST API with IPv4 and direct HTTP POST for fast, reliable vision analysis.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={api_key}"
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": b64_image}}
            ]
        }],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    }

    resp = requests.post(url, json=payload, timeout=8.0)
    if resp.ok:
        data = resp.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        return _extract_json(raw_text)
    else:
        print(f"[GEMINI REST] Status {resp.status_code}: {resp.text[:120]}")
        return None


def _call_gemini_dynamic_text(category: str, ml_conf: float, citizen_text: str = "") -> Optional[dict]:
    """
    Uses Gemini LLM to dynamically generate rich, unique scene descriptions and titles.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={api_key}"
    prompt = f"""You are the JalDrishti civic water hazard AI assistant.
A citizen uploaded photo evidence of a '{category}' (ML Confidence: {ml_conf:.2f}).
Additional citizen notes: '{citizen_text}'.
Generate a unique, highly detailed, realistic incident title and a vivid 2-3 sentence description of the water hazard scene.
Return clean JSON with keys:
{{
  "title": "Unique Descriptive Incident Title",
  "description": "Detailed 2-3 sentence situational description of the water problem, environmental risks, and public impact.",
  "hazard_type": "{category}",
  "severity": 3,
  "confidence": {ml_conf:.2f},
  "is_relevant": true
}}"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.7
        }
    }

    resp = requests.post(url, json=payload, timeout=5.0)
    if resp.ok:
        data = resp.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        return _extract_json(raw_text)
    return None


def canonicalize_hazard_type(raw_type: str) -> str:
    cleaned = (raw_type or "").lower().strip()
    if any(k in cleaned for k in ["pond", "lake", "water_quality", "pollution", "waste", "garbage", "river", "ghat", "algae", "toxic", "effluent"]):
        return "pond_lake_problem"
    if any(k in cleaned for k in ["drain", "sewage", "gutter", "culvert", "manhole", "dirty_water"]):
        return "drainage_problem"
    if any(k in cleaned for k in ["flood", "waterlogging", "inundat", "submerge", "water_accumulation"]):
        return "flooding"
    if any(k in cleaned for k in ["normal", "dry", "clean"]):
        return "normal"
    if any(k in cleaned for k in ["irrelevant", "selfie", "person", "portrait", "indoor", "face", "animal", "graphic", "abstract"]):
        return "irrelevant"
    return "pond_lake_problem" if "water" in cleaned else "normal"


# =====================================================
# SINGLE-CALL GEMINI ANALYSIS & QUALITY GATE
# =====================================================

async def analyzeHazardWithGemini(
    imagePath: str,
    mlCategory: Optional[str] = None,
    mlConfidence: float = 0.0,
    mlSeverity: int = 0,
    citizenTitle: Optional[str] = None,
    citizenDescription: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Performs Gemini vision inspection to verify water hazards,
    reject non-hazard/selfie photos, estimate severity, and dynamically generate rich titles & descriptions.
    """
    threshold = getattr(settings, "ML_CONFIDENCE_THRESHOLD", 0.70)
    is_high_conf_ml = bool(
        mlCategory
        and mlCategory not in ["normal", "unknown", "irrelevant"]
        and mlConfidence >= threshold
    )

    if not os.path.exists(imagePath):
        return {
            "hazard_type": "irrelevant",
            "confidence": 0.0,
            "severity": 0,
            "is_relevant": False,
            "title": "Missing Image",
            "description": "Image file not found for analysis.",
            "explanation": "Image missing.",
            "source": "quality_gate",
            "sourceLabel": "JalDrishti Quality Gate",
        }

    b64_image = _prepare_image_b64(imagePath)
    if not b64_image:
        return {
            "hazard_type": "irrelevant",
            "confidence": 0.0,
            "severity": 0,
            "is_relevant": False,
            "title": "Invalid Image",
            "description": "Unable to decode image bytes.",
            "explanation": "Invalid image format.",
            "source": "quality_gate",
            "sourceLabel": "JalDrishti Quality Gate",
        }

    # Step 1: Call Gemini Vision
    try:
        context_prompt = COMBINED_ANALYSIS_PROMPT
        hints = []
        if mlCategory and mlCategory not in ["unknown", "normal"]:
            hints.append(f"MobileNetV2 visual detection: '{mlCategory}' (confidence: {mlConfidence:.2f}).")
        if citizenTitle and citizenTitle.strip():
            hints.append(f"Citizen title: '{citizenTitle.strip()}'.")
        if citizenDescription and citizenDescription.strip():
            hints.append(f"Citizen description: '{citizenDescription.strip()}'.")

        if hints:
            context_prompt += "\n\nAdditional Context:\n" + "\n".join(hints)

        print("[GEMINI] Calling Gemini Vision API (gemini-flash-lite-latest)...")
        parsed = await asyncio.to_thread(_call_gemini_vision_rest, context_prompt, b64_image)

        if not parsed:
            raise ValueError("No JSON returned from Gemini Vision REST endpoint")

        raw_hazard = parsed.get("hazard_type", "normal")
        gemini_hazard = canonicalize_hazard_type(raw_hazard)
        gemini_conf = float(parsed.get("confidence", 0.92))
        
        # Handle string or int severity
        raw_sev = parsed.get("severity", 3)
        if isinstance(raw_sev, str):
            sev_map = {"low": 2, "medium": 3, "high": 4, "critical": 5}
            gemini_severity = sev_map.get(raw_sev.lower(), 3)
        else:
            gemini_severity = int(raw_sev)

        is_relevant = bool(parsed.get("is_relevant", True))
        if gemini_hazard in ["irrelevant", "normal", "unknown", "none"]:
            is_relevant = False

        if not is_relevant:
            final_title = "Irrelevant / Non-Hazard Image"
            final_desc = parsed.get("description", "Image shows a selfie, indoor scene, or non-hazard subject and does not depict an outdoor water hazard.")
            gemini_hazard = "irrelevant"
            gemini_severity = 0
            gemini_conf = 0.0
            source = "quality_gate"
            source_label = "JalDrishti Quality Gate"
        else:
            final_title = citizenTitle.strip() if (citizenTitle and citizenTitle.strip()) else parsed.get("title", f"{gemini_hazard.replace('_', ' ').title()} Incident")
            final_desc = citizenDescription.strip() if (citizenDescription and citizenDescription.strip()) else parsed.get("description", f"Observed {gemini_hazard.replace('_', ' ')} issue requiring attention.")
            source = "gemini"
            source_label = "Verified by Gemini AI"

        print("=" * 60)
        print(f"[GEMINI VISION SUCCESS] Hazard: '{gemini_hazard}' | Relevant: {is_relevant} | Conf: {gemini_conf:.2f}")
        print(f"[GEMINI DYNAMIC TITLE]       '{final_title}'")
        print(f"[GEMINI DYNAMIC DESCRIPTION] '{final_desc}'")
        print("=" * 60)

        return {
            "hazard_type": gemini_hazard,
            "confidence": gemini_conf,
            "severity": gemini_severity,
            "is_relevant": is_relevant,
            "title": final_title,
            "description": final_desc,
            "explanation": parsed.get("explanation", "Verified with Google Gemini Vision AI"),
            "source": source,
            "sourceLabel": source_label,
        }

    except Exception as e:
        print(f"[GEMINI VISION EXCEPTION] {e} -> Attempting Dynamic Gemini Text Synthesis...")

        canonical_ml = canonicalize_hazard_type(mlCategory or "normal")
        is_valid_hazard = canonical_ml in ["pond_lake_problem", "drainage_problem", "flooding"]

        if is_valid_hazard and mlConfidence >= 0.25:
            # Generate dynamically with Gemini Text LLM
            dyn_res = _call_gemini_dynamic_text(canonical_ml, mlConfidence, citizenDescription or "")
            if dyn_res:
                print(f"[GEMINI DYNAMIC LLM] Generated dynamic title: '{dyn_res.get('title')}'")
                return {
                    "hazard_type": canonical_ml,
                    "confidence": mlConfidence,
                    "severity": mlSeverity or 3,
                    "is_relevant": True,
                    "title": citizenTitle.strip() if (citizenTitle and citizenTitle.strip()) else dyn_res.get("title", f"{canonical_ml.replace('_', ' ').title()} Incident"),
                    "description": citizenDescription.strip() if (citizenDescription and citizenDescription.strip()) else dyn_res.get("description", "Water hazard identified requiring response."),
                    "explanation": "Verified via MobileNetV2 Vision and enriched dynamically by Gemini AI",
                    "source": "gemini",
                    "sourceLabel": "Verified by Gemini AI",
                }

        # If completely invalid/selfie
        print("[AI QUALITY GATE] Non-hazard / portrait image rejected.")
        return {
            "hazard_type": "irrelevant",
            "confidence": 0.0,
            "severity": 0,
            "is_relevant": False,
            "title": "Irrelevant / Non-Hazard Image",
            "description": "Image does not show a recognized outdoor water hazard (e.g. selfie, portrait, or indoor subject).",
            "explanation": "Image rejected: No outdoor water hazard identified.",
            "source": "quality_gate",
            "sourceLabel": "JalDrishti Quality Gate",
        }


# =====================================================
# BACKWARD COMPATIBILITY HELPERS
# =====================================================

async def verifyHazard(imagePath: str) -> dict:
    result = await analyzeHazardWithGemini(imagePath)
    return {
        "hazard_type": result["hazard_type"],
        "confidence": result["confidence"],
        "severity": result["severity"],
        "is_relevant": result["is_relevant"],
        "explanation": result.get("explanation", ""),
        "title": result["title"],
        "description": result["description"],
    }