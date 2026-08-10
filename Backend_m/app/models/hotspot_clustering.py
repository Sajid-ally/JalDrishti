import numpy as np
from sklearn.cluster import DBSCAN

def extract_coordinates(reports):
    coordinates = []

    for report in reports:
        latitude = report["latitude"]
        longitude = report["longitude"]

        coordinates.append([latitude, longitude])

    return np.array(coordinates)


def cluster_reports(reports, eps_km=1.0, min_samples=3):
    if not reports:
        return []

    coordinates = extract_coordinates(reports)

    coordinates_radians = np.radians(coordinates)

    earth_radius_km = 6371.0

    eps = eps_km / earth_radius_km

    dbscan = DBSCAN(
        eps=eps,
        min_samples=min_samples,
        metric="haversine"
    )

    labels = dbscan.fit_predict(coordinates_radians)

    return labels.tolist()


def get_hotspot_level(report_count):
    if report_count >= 10:
        return "CRITICAL"
    elif report_count >= 6:
        return "HIGH"
    else:
        return "MEDIUM"


def build_hotspots(reports, labels):
    hotspots = {}

    for report, label in zip(reports, labels):

        if label == -1:
            continue

        if label not in hotspots:
            hotspots[label] = {
                "reports": [],
                "latitude_sum": 0.0,
                "longitude_sum": 0.0
            }

        hotspots[label]["reports"].append(report)

        hotspots[label]["latitude_sum"] += (
            report["latitude"]
        )

        hotspots[label]["longitude_sum"] += (
            report["longitude"]
        )

    result = []

    for cluster_id, data in hotspots.items():

        count = len(data["reports"])

        center_latitude = data["latitude_sum"] / count
        center_longitude = data["longitude_sum"] / count

        result.append({
            "cluster_id": int(cluster_id),
            "report_count": count,
            "center": {
                "latitude": center_latitude,
                "longitude": center_longitude
            },
            "report_ids": [
                report["report_id"]
                for report in data["reports"]
            ],
            "level": get_hotspot_level(count)
        })

    return result


def detect_hotspots(reports, eps_km=1.0, min_samples=3):
    labels = cluster_reports(
        reports,
        eps_km=eps_km,
        min_samples=min_samples
    )

    return build_hotspots(reports, labels)