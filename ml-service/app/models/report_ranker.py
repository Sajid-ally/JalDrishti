import json
from datetime import datetime, timezone
from app.models.hotspot_clustering import detect_hotspots

SEVERITY_SCORE = {
    "low": 25,
    "medium": 50,
    "high": 75,
    "critical": 100
}


# -------------------------------------------------------
# Converts our ML pipeline's numeric severity (0-5) into
# the string labels this ranker understands.
# -------------------------------------------------------
SEVERITY_NUMBER_TO_LABEL = {
    0: "low",
    1: "low",
    2: "medium",
    3: "medium",
    4: "high",
    5: "critical"
}


def normalize_severity(severity):
    """
    Accepts either a string ("high") or a number (0-5) and
    always returns a string label the ranker understands.
    """
    if isinstance(severity, str):
        return severity
    if isinstance(severity, (int, float)):
        return SEVERITY_NUMBER_TO_LABEL.get(round(severity), "low")
    return "low"


def get_severity_score(severity):
    severity = normalize_severity(severity)
    return SEVERITY_SCORE.get(severity.lower(), 0)
def get_affected_people_score(affected_people):
    try:
        affected_people = int(affected_people)
    except (TypeError, ValueError):
        return 0

    if affected_people <= 0:
        return 0
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


HAZARD_SCORE = {
    "flood": 100,
    "cyclone": 100,
    "storm_surge": 95,
    "landslide": 90,
    "road_damage": 60,
    "erosion": 50,
    "no_flood": 0,
    "other": 30
}


def get_hazard_score(hazard_type):
    if not isinstance(hazard_type, str):
        return HAZARD_SCORE["other"]

    return HAZARD_SCORE.get(
        hazard_type.lower(),
        HAZARD_SCORE["other"]
    )


def get_confidence_score(confidence):
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        return 0

    confidence = max(0.0, min(1.0, confidence))

    return confidence * 100


def get_recency_score(report_time):
    try:
        report_datetime = datetime.fromisoformat(report_time)
    except (TypeError, ValueError):
        return 0

    current_time = datetime.now(timezone.utc)

    if report_datetime.tzinfo is None:
        report_datetime = report_datetime.replace(tzinfo=timezone.utc)

    age = current_time - report_datetime.astimezone(timezone.utc)

    hours = age.total_seconds() / 3600

    if hours < 0:
        return 100
    elif hours <= 1:
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
        return 0

    if report_count <= 0:
        return 0
    elif report_count == 1:
        return 10
    elif report_count == 2:
        return 30
    elif report_count <= 4:
        return 55
    elif report_count <= 6:
        return 75
    elif report_count <= 9:
        return 90
    else:
        return 100


def get_reliability_score(validation: dict) -> float:
    """
    Fraud/trust signal — separate from area clustering.
    Government confirmation and duplicate-image detection
    aren't captured by geographic clustering alone.
    """
    if not validation:
        return 0

    score = 0

    if validation.get("governmentAlert", {}).get("found"):
        score += 50

    #nearby_count = validation.get("nearbyReportEvidence", {}).get("similarReportCount", 0)
    #score += min(30, nearby_count * 10)

    social_count = validation.get("socialMediaEvidence", {}).get("reportCount", 0)
    score += min(20, social_count * 4)

    image_sim_score = validation.get("imageSimilarity", {}).get("score")
    if image_sim_score is not None and image_sim_score > 0.9:
        score -= 30  # likely duplicate/reused image — red flag

    return max(0, min(100, score))


def calculate_priority_score(
    severity,
    affected_people,
    hazard_type,
    confidence,
    report_time,
    validation=None
):
    severity_score = get_severity_score(severity)
    people_score = get_affected_people_score(affected_people)
    hazard_score = get_hazard_score(hazard_type)
    confidence_score = get_confidence_score(confidence)
    recency_score = get_recency_score(report_time)
    reliability_score = get_reliability_score(validation)

    priority_score = (
        severity_score * 0.25
        + people_score * 0.15
        + hazard_score * 0.15
        + recency_score * 0.10
        + confidence_score * 0.10
        +area_score * 0.15
        + reliability_score * 0.15
    )

    return round(priority_score, 2)

def get_priority_level(priority_score):
    if priority_score >= 80:
        return "CRITICAL"
    elif priority_score >= 60:
        return "HIGH"
    elif priority_score >= 40:
        return "MEDIUM"
    else:
        return "LOW"


def validate_report(report):
    required_fields = [
        "report_id",
        "severity",
        "affected_people",
        "hazard_type",
        "confidence",
        "time",
        "location",
        "latitude",
        "longitude",
        "description"
    ]
    missing_fields = [
        field for field in required_fields
        if field not in report
    ]

    return missing_fields


def rank_report(report):
    missing_fields = validate_report(report)

    if missing_fields:
        raise ValueError(
            f"Missing required fields: {missing_fields}"
        )

    priority_score = calculate_priority_score(
        severity=report["severity"],
        affected_people=report["affected_people"],
        hazard_type=report["hazard_type"],
        confidence=report["confidence"],
        report_time=report["time"],
        validation=report.get("validation")
    )

    priority_level = get_priority_level(priority_score)

    return {
        "report_id": report["report_id"],
        "hazard_type": report["hazard_type"],
        "severity": report["severity"],
        "affected_people": report["affected_people"],
        "location": report["location"],
        "latitude": report["latitude"],
        "longitude": report["longitude"],
        "description": report["description"],
        "confidence": report["confidence"],
        "time": report["time"],
        "priority_score": priority_score,
        "priority": priority_level
    }


def load_reports(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def rank_reports(reports):
     hotspots = detect_hotspots(
        reports,
        eps_km=1.0,
        min_samples=3
    )

    report_area_counts = {}

    for hotspot in hotspots:
        count = hotspot["report_count"]

        for report_id in hotspot["report_ids"]:
            report_area_counts[report_id] = count

    ranked_reports = []

    for report in reports:
        area_report_count = report_area_counts.get(
            report["report_id"],
            1
        )

        ranked_report = rank_report(
            report,
            area_report_count
        )

        ranked_reports.append(ranked_report)

    ranked_reports.sort(
        key=lambda report: report["priority_score"],
        reverse=True
    )

    return ranked_reports