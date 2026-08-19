import math

def haversine_dist_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(max(0.0, min(1.0, a))))

def cluster_reports(reports, eps_km=1.0, min_samples=3):
    if not reports:
        return []
    n = len(reports)
    labels = [-1] * n
    cluster_id = 0

    for i in range(n):
        if labels[i] != -1:
            continue
        
        lat1, lon1 = reports[i]["latitude"], reports[i]["longitude"]
        neighbors = [j for j in range(n) if haversine_dist_km(lat1, lon1, reports[j]["latitude"], reports[j]["longitude"]) <= eps_km]

        if len(neighbors) < min_samples:
            continue

        labels[i] = cluster_id
        queue = list(neighbors)
        for nb in queue:
            if labels[nb] == -1:
                labels[nb] = cluster_id
                lat_nb, lon_nb = reports[nb]["latitude"], reports[nb]["longitude"]
                nb_neighbors = [k for k in range(n) if haversine_dist_km(lat_nb, lon_nb, reports[k]["latitude"], reports[k]["longitude"]) <= eps_km]
                if len(nb_neighbors) >= min_samples:
                    for k in nb_neighbors:
                        if k not in queue:
                            queue.append(k)
        cluster_id += 1

    return labels



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