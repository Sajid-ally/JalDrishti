import json
from datetime import datetime, timezone


SEVERITY_SCORE = {
    "low": 25,
    "medium": 50,
    "high": 75,
    "critical": 100
}

def get_severity_score(severity):
    if not isinstance(severity, str):
        return 0

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


def calculate_priority_score(
    severity,
    affected_people,
    hazard_type,
    confidence,
    report_time
):
    severity_score = get_severity_score(severity)
    people_score = get_affected_people_score(affected_people)
    hazard_score = get_hazard_score(hazard_type)
    confidence_score = get_confidence_score(confidence)
    recency_score = get_recency_score(report_time)

    priority_score = (
        severity_score * 0.30
        + people_score * 0.25
        + hazard_score * 0.20
        + recency_score * 0.15
        + confidence_score * 0.10
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
        report_time=report["time"]
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
    ranked_reports = []

    for report in reports:
        ranked_report = rank_report(report)
        ranked_reports.append(ranked_report)

    ranked_reports.sort(
        key=lambda report: report["priority_score"],
        reverse=True
    )

    return ranked_reports

