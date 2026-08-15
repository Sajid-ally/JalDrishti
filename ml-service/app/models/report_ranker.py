from datetime import datetime, timezone

from app.models.hotspot_clustering import detect_hotspots

CATEGORY_BASE_SCORE = {
    "flooding": 10.0,
    "drainage_problem": 8.5,
    "pond_lake_problem": 6.5
}



def get_category_score(category):
    if not isinstance(category, str):
        return 5.0

    category = category.lower().strip()

    return CATEGORY_BASE_SCORE.get(category, 5.0)

def get_confidence_score(confidence):
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        return 0.0

    confidence = max(0.0, min(1.0, confidence))

    return confidence * 10.0


def get_hazard_score(report):
    category = report.get("category") or report.get("hazardTypeVerified")

    confidence = report.get("aiConfidence")

    if confidence is None:
        confidence = report.get("mlAnalysis", {}).get("confidence", 0)

    category_score = get_category_score(category)
    confidence_score = get_confidence_score(confidence)
    confidence_ratio = confidence_score / 10.0

    return round(category_score * confidence_ratio, 2)


def get_recency_score(report_time):
   

    try:
        report_datetime = datetime.fromisoformat(
            str(report_time).replace("Z", "+00:00")
        )
    except (TypeError, ValueError):
        return 0.0

    current_time = datetime.now(timezone.utc)

    if report_datetime.tzinfo is None:
        report_datetime = report_datetime.replace(
            tzinfo=timezone.utc
        )

    age = (
        current_time -
        report_datetime.astimezone(timezone.utc)
    )

    minutes = age.total_seconds() / 60

    if minutes <= 15:
        return 10.0
    elif minutes <= 30:
        return 8.0
    elif minutes <= 60:
        return 6.0
    elif minutes <= 180:
        return 4.0
    elif minutes <= 360:
        return 2.0
    else:
        return 1.0

def get_nearby_density_score(report_count):
  
    try:
        count = int(report_count)
    except (TypeError, ValueError):
        return 1.0

    if count <= 1:
        return 1.0
    elif count <= 5:
        return float(count)
    elif count <= 12:
        return round(
            5 + ((count - 5) * 4 / 7),
            2
        )
    else:
        return 10.0


def get_concentration_score(cluster_size):

    try:
        count = int(cluster_size)
    except (TypeError, ValueError):
        return 1.0

    if count <= 2:
        return 1.0
    elif count <= 5:
        return 4.0
    elif count <= 10:
        return 7.0
    else:
        return 10.0

INFRASTRUCTURE_SCORE = {
    "hospital": 10.0,
    "emergency_route": 10.0,
    "school": 8.0,
    "residential": 8.0,
    "major_road": 7.0,
    "highway": 7.0,
    "commercial": 5.0,
    "open_land": 2.0
}


def get_infrastructure_score(report):
   
    infrastructure = report.get(
        "infrastructureCriticality"
    )

    if infrastructure is None:
        return 0.0

    if isinstance(infrastructure, (int, float)):
        return max(
            0.0,
            min(10.0, float(infrastructure))
        )

    if isinstance(infrastructure, str):
        key = infrastructure.lower().strip()

        return INFRASTRUCTURE_SCORE.get(
            key,
            0.0
        )

    return 0.0

def normalize_bool(value):

    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value.lower().strip() in [
            "true",
            "yes",
            "1",
            "high",
            "critical"
        ]

    if isinstance(value, (int, float)):
        return value == 1

    return False


def has_life_threat(report):

    return (
        normalize_bool(report.get("lifeThreat"))
        or
        normalize_bool(report.get("peopleTrapped"))
        or
        normalize_bool(report.get("immediateDanger"))
    )

def calculate_priority_score(
    report,
    nearby_report_count=1,
    cluster_size=1
):
   
    if has_life_threat(report):
        return 10.0

    hazard_score = get_hazard_score(report)

    nearby_density_score = get_nearby_density_score(
        nearby_report_count
    )

    concentration_score = get_concentration_score(
        cluster_size
    )

    recency_score = get_recency_score(
        report.get("createdAt")
    )

    infrastructure_score = get_infrastructure_score(
        report
    )

    priority_score = (
        hazard_score * 0.35
        + nearby_density_score * 0.20
        + concentration_score * 0.20
        + recency_score * 0.15
        + infrastructure_score * 0.10
    )

    return round(
        min(priority_score, 10.0),
        2
    )


def get_priority_level(priority_score):

    if priority_score >= 8.0:
        return "critical"

    elif priority_score >= 6.0:
        return "high"

    elif priority_score >= 4.0:
        return "medium"

    else:
        return "low"


def rank_report(
    report,
    nearby_report_count=1,
    cluster_size=1
):
    priority_score = calculate_priority_score(
        report,
        nearby_report_count,
        cluster_size
    )

    priority = get_priority_level(
        priority_score
    )

    return {
        "reportId": report.get("reportId"),
        "category": report.get("category"),
        "aiConfidence": report.get("aiConfidence"),
        "priority": priority,
        "priorityScore": priority_score
    }

def rank_reports(reports):

    internal_reports = []

    for report in reports:

        copied_report = dict(report)

        copied_report["report_id"] = report.get(
            "reportId"
        )

        internal_reports.append(
            copied_report
        )



    hotspots = detect_hotspots(
        internal_reports,
        eps_km=0.5,
        min_samples=3
    )

    report_cluster_sizes = {}

    for hotspot in hotspots:

        cluster_size = hotspot["report_count"]

        for report_id in hotspot["report_ids"]:

            report_cluster_sizes[
                report_id
            ] = cluster_size


    ranked_reports = []

    for report in reports:

        report_id = report.get(
            "reportId"
        )

        cluster_size = report_cluster_sizes.get(
            report_id,
            1
        )

        nearby_report_count = cluster_size

        ranked_report = rank_report(
            report,
            nearby_report_count,
            cluster_size
        )

        ranked_reports.append(
            ranked_report
        )

    ranked_reports.sort(
        key=lambda report: report["priorityScore"],
        reverse=True
    )

    return ranked_reports