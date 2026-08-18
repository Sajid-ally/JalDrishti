import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.models.hotspot_clustering import detect_hotspots

# =======================================================
# Priority ranking configuration
# =======================================================

SEVERITY_SCORE = {
    "low": 25,
    "medium": 50,
    "high": 75,
    "critical": 100,
}

SEVERITY_NUMBER_TO_LABEL = {
    0: "low",
    1: "low",
    2: "medium",
    3: "medium",
    4: "high",
    5: "critical",
}

HAZARD_SCORE = {
    "flooding": 100,
    "urban_flooding": 100,
    "drainage_problem": 70,
    "pond_lake_problem": 60,
    "water_quality": 50,
    "waterlogging": 65,
    "normal": 0,
}


def normalize_severity(severity):
    if isinstance(severity, str):
        s = severity.lower().strip()
        if s in SEVERITY_SCORE:
            return s
        if s == "moderate":
            return "medium"
        return "low"

    if isinstance(severity, (int, float)):
        return SEVERITY_NUMBER_TO_LABEL.get(round(severity), "low")

    return "low"


def get_severity_score(severity):
    sev = normalize_severity(severity)
    return SEVERITY_SCORE.get(sev, 25)


def get_affected_people_score(affected_people):
    try:
        affected_people = int(affected_people)
    except (TypeError, ValueError):
        affected_people = 10

    if affected_people <= 0:
        return 10
    elif affected_people <= 10:
        return 20
    elif affected_people <= 50:
        return 40
    elif affected_people <= 100:
        return 60
    elif affected_people <= 500:
        return 80
    else:
        return 100


def get_hazard_score(hazard_type):
    if not isinstance(hazard_type, str):
        return 50
    return HAZARD_SCORE.get(hazard_type.lower().strip(), 50)


def get_confidence_score(confidence):
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        return 70.0

    confidence = max(0.0, min(1.0, confidence))
    return confidence * 100


def get_recency_score(report_time):
    if isinstance(report_time, datetime):
        report_datetime = report_time
    else:
        try:
            report_datetime = datetime.fromisoformat(
                str(report_time).replace("Z", "+00:00")
            )
        except (TypeError, ValueError):
            return 80

    if report_datetime.tzinfo is None:
        report_datetime = report_datetime.replace(tzinfo=timezone.utc)

    current_time = datetime.now(timezone.utc)
    age = current_time - report_datetime.astimezone(timezone.utc)
    hours = max(0.0, age.total_seconds() / 3600)

    if hours <= 1:
        return 100
    elif hours <= 6:
        return 80
    elif hours <= 24:
        return 60
    elif hours <= 72:
        return 40
    else:
        return 20


def get_area_report_score(report_count):
    try:
        report_count = int(report_count)
    except (TypeError, ValueError):
        report_count = 1

    if report_count <= 0:
        return 0
    elif report_count == 1:
        return 15
    elif report_count == 2:
        return 35
    elif report_count <= 4:
        return 55
    elif report_count <= 6:
        return 75
    elif report_count <= 9:
        return 90
    else:
        return 100


def get_reliability_score(validation):
    if not validation:
        return 50

    score = 50

    if validation.get("governmentAlert", {}).get("found"):
        score += 30

    social_count = validation.get("socialMediaEvidence", {}).get("reportCount", 0)
    score += min(20, social_count * 4)

    image_similarity = validation.get("imageSimilarity")
    if isinstance(image_similarity, dict):
        similarity = image_similarity.get("score")
    else:
        similarity = image_similarity

    if similarity is not None:
        try:
            similarity = float(similarity)
            if similarity > 0.95:
                score -= 20
        except (TypeError, ValueError):
            pass

    return max(0, min(100, score))


# =======================================================
# Priority calculation
# =======================================================

def calculate_priority_score(
    severity=3,
    affected_people=10,
    hazard_type="flooding",
    confidence=0.85,
    report_time=None,
    area_report_count=1,
    validation=None,
) -> float:
    severity_score = get_severity_score(severity)
    people_score = get_affected_people_score(affected_people)
    hazard_score = get_hazard_score(hazard_type)
    confidence_score = get_confidence_score(confidence)
    recency_score = get_recency_score(report_time or datetime.utcnow())
    area_score = get_area_report_score(area_report_count)
    reliability_score = get_reliability_score(validation)

    priority_score = (
        severity_score * 0.25
        + people_score * 0.15
        + hazard_score * 0.15
        + recency_score * 0.10
        + confidence_score * 0.10
        + area_score * 0.15
        + reliability_score * 0.10
    )

    return round(priority_score, 2)


def get_priority_level(priority_score: float) -> str:
    if priority_score >= 80:
        return "CRITICAL"
    elif priority_score >= 60:
        return "HIGH"
    elif priority_score >= 40:
        return "MEDIUM"
    else:
        return "LOW"


def rank_report(report: dict, area_report_count: int = 1) -> dict:
    score = calculate_priority_score(
        severity=report.get("severity", 3),
        affected_people=report.get("affected_people", 10),
        hazard_type=report.get("hazard_type") or report.get("category", "flooding"),
        confidence=report.get("confidence", 0.85),
        report_time=report.get("time") or report.get("createdAt"),
        area_report_count=area_report_count,
        validation=report.get("validation"),
    )

    report_id = str(report.get("report_id") or report.get("id") or report.get("_id") or "")

    return {
        "report_id": report_id,
        "hazard_type": report.get("hazard_type") or report.get("category", "flooding"),
        "severity": report.get("severity", 3),
        "location": report.get("location", {}),
        "latitude": report.get("latitude") or report.get("location", {}).get("latitude", 0),
        "longitude": report.get("longitude") or report.get("location", {}).get("longitude", 0),
        "description": report.get("description", ""),
        "confidence": report.get("confidence", 0.85),
        "time": report.get("time") or report.get("createdAt"),
        "priority_score": score,
        "priority": get_priority_level(score),
    }


def rank_reports(reports: List[dict]) -> List[dict]:
    if not reports:
        return []

    hotspots = detect_hotspots(
        [
            {
                "report_id": str(r.get("report_id") or r.get("id") or r.get("_id") or ""),
                "latitude": float(r.get("latitude") or r.get("location", {}).get("latitude", 0)),
                "longitude": float(r.get("longitude") or r.get("location", {}).get("longitude", 0)),
            }
            for r in reports
            if (r.get("latitude") or r.get("location", {}).get("latitude"))
        ],
        eps_km=1.0,
        min_samples=2,
    )

    area_counts = {}
    for hotspot in hotspots:
        count = hotspot["report_count"]
        for report_id in hotspot["report_ids"]:
            area_counts[report_id] = count

    ranked = []
    for report in reports:
        rep_id = str(report.get("report_id") or report.get("id") or report.get("_id") or "")
        area_count = area_counts.get(rep_id, 1)
        ranked.append(rank_report(report, area_count))

    ranked.sort(key=lambda item: item["priority_score"], reverse=True)
    return ranked
