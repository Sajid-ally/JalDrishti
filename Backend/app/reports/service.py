from datetime import datetime

from bson import ObjectId

from app.database import database

from sklearn.cluster import DBSCAN

import math


# =========================================================
# CREATE REPORT
# =========================================================

async def createReport(reportData: dict):

    reportDocument = {

        "title": reportData["title"],

        "description": reportData["description"],

        "location": {
            "latitude": reportData["location"]["latitude"],
            "longitude": reportData["location"]["longitude"]
        },

        "imageUrl": reportData["imageUrl"],

        "aiAnalysis": {
            "title": reportData["aiAnalysis"]["title"],
            "description": reportData["aiAnalysis"]["description"]
        },

        "mlAnalysis": {
            "category": reportData["mlAnalysis"]["category"],
            "severity": reportData["mlAnalysis"]["severity"],
            "confidence": reportData["mlAnalysis"]["confidence"],
            "priority": reportData["mlAnalysis"]["priority"]
        },

        # -------------------------------------------------
        # GOVERNMENT / MANUAL VERIFICATION
        # -------------------------------------------------

        "verification": {
            "status": "Pending",
            "verifiedBy": None,
            "verifiedAt": None,
            "reliabilityScore": 0,
            "validationSources": []
        },

        # -------------------------------------------------
        # AUTOMATIC VALIDATION
        # -------------------------------------------------

        "validation": {

            "status": "Pending",

            "reliabilityScore": 0,

            "governmentAlert": {
                "found": False
            },

            "socialMediaEvidence": {
                "reportCount": 0
            },

            "nearbyReportEvidence": {
                "similarReportCount": 0
            },

            "imageSimilarity": {
                "score": None
            }
        },

        "reportStatus": "Submitted",

        "createdAt": reportData["createdAt"],

        "updatedAt": reportData["updatedAt"]
    }

    result = await database.reports.insert_one(
        reportDocument
    )

    return result.inserted_id


# =========================================================
# GET ALL REPORTS
# =========================================================

async def getReports():

    cursor = database.reports.find().sort(
        "createdAt",
        -1
    )

    reports = []

    async for report in cursor:

        report["id"] = str(
            report["_id"]
        )

        del report["_id"]

        reports.append(report)

    return reports


# =========================================================
# GET HOTSPOTS
# =========================================================

async def getHotspots(category=None):

    print("CALCULATING HOTSPOTS")

    # -----------------------------------------------------
    # BUILD QUERY
    # -----------------------------------------------------

    if not category:

        query = {}

    else:

        query = {
            "$or": [

                {
                    "mlAnalysis.category": {
                        "$regex": f"^{category}$",
                        "$options": "i"
                    }
                },

                {
                    "category": {
                        "$regex": f"^{category}$",
                        "$options": "i"
                    }
                }

            ]
        }

    print(
        "HOTSPOT QUERY:",
        query
    )

    cursor = database.reports.find(
        query
    )

    reports = []

    # -----------------------------------------------------
    # GET REPORT LOCATIONS
    # -----------------------------------------------------

    async for report in cursor:

        if "location" in report:

            latitude = report["location"].get(
                "latitude"
            )

            longitude = report["location"].get(
                "longitude"
            )

        else:

            latitude = report.get(
                "latitude"
            )

            longitude = report.get(
                "longitude"
            )

        # Ignore reports without coordinates

        if (
            latitude is None
            or longitude is None
        ):
            continue

        reports.append({
            "latitude": float(latitude),
            "longitude": float(longitude)
        })

    print(
        "REPORTS WITH LOCATION:",
        len(reports)
    )

    for report in reports:

        print(
            "REPORT LOCATION:",
            report["latitude"],
            report["longitude"]
        )

    # -----------------------------------------------------
    # NOT ENOUGH REPORTS
    # -----------------------------------------------------

    if len(reports) < 2:

        print(
            "NOT ENOUGH REPORTS FOR CLUSTERING"
        )

        return []

    # -----------------------------------------------------
    # CONVERT LAT/LONG TO APPROX KM
    # -----------------------------------------------------

    meanLatitude = sum(
        report["latitude"]
        for report in reports
    ) / len(reports)

    coordinates = []

    for report in reports:

        latitude = report["latitude"]

        longitude = report["longitude"]

        x = latitude * 111.0

        y = (
            longitude
            * 111.0
            * math.cos(
                math.radians(meanLatitude)
            )
        )

        coordinates.append(
            [x, y]
        )

    # -----------------------------------------------------
    # DBSCAN
    #
    # eps = 0.5 km = 500 meters
    # min_samples = 2 reports
    # -----------------------------------------------------

    clustering = DBSCAN(
        eps=0.5,
        min_samples=2,
        metric="euclidean"
    ).fit(
        coordinates
    )

    labels = clustering.labels_

    print(
        "CLUSTER LABELS:",
        labels
    )

    # -----------------------------------------------------
    # GROUP CLUSTERS
    # -----------------------------------------------------

    clusters = {}

    for index, label in enumerate(labels):

        if label == -1:
            continue

        if label not in clusters:

            clusters[label] = []

        clusters[label].append(
            reports[index]
        )

    # -----------------------------------------------------
    # CREATE HOTSPOTS
    # -----------------------------------------------------

    hotspots = []

    for clusterReports in clusters.values():

        reportCount = len(
            clusterReports
        )

        averageLatitude = sum(
            report["latitude"]
            for report in clusterReports
        ) / reportCount

        averageLongitude = sum(
            report["longitude"]
            for report in clusterReports
        ) / reportCount

        # -------------------------------------------------
        # HOTSPOT LEVEL
        # -------------------------------------------------

        if reportCount >= 11:

            level = "high"

        elif reportCount >= 4:

            level = "medium"

        else:

            level = "low"

        hotspots.append({

            "latitude": averageLatitude,

            "longitude": averageLongitude,

            "reportCount": reportCount,

            "level": level
        })

    # -----------------------------------------------------
    # SORT BY REPORT COUNT
    # -----------------------------------------------------

    hotspots.sort(
        key=lambda hotspot:
        hotspot["reportCount"],
        reverse=True
    )

    print(
        "HOTSPOTS FOUND:",
        len(hotspots)
    )

    return hotspots


# =========================================================
# GET MAP REPORTS
# =========================================================

async def getMapReports(category=None):

    print(
        "FETCHING MAP REPORTS"
    )

    # -----------------------------------------------------
    # NO FILTER
    # -----------------------------------------------------

    if not category:

        query = {}

    # -----------------------------------------------------
    # CATEGORY FILTER
    # -----------------------------------------------------

    else:

        query = {
            "$or": [

                {
                    "mlAnalysis.category": {
                        "$regex": f"^{category}$",
                        "$options": "i"
                    }
                },

                {
                    "category": {
                        "$regex": f"^{category}$",
                        "$options": "i"
                    }
                }

            ]
        }

    print(
        "MAP QUERY:",
        query
    )

    cursor = database.reports.find(
        query
    ).sort(
        "createdAt",
        -1
    )

    reports = []

    async for report in cursor:

        report["id"] = str(
            report["_id"]
        )

        del report["_id"]

        reports.append(
            report
        )

    print(
        "MAP REPORTS FOUND:",
        len(reports)
    )

    return reports


# =========================================================
# GET REPORTS NEAR A LOCATION
# =========================================================

async def getNearbyReports(
    latitude: float,
    longitude: float,
    radiusKm: float = 5,
    category: str = None
):

    print(
        "SEARCHING NEARBY REPORTS"
    )

    # -----------------------------------------------------
    # CATEGORY QUERY
    # -----------------------------------------------------

    if not category:

        query = {}

    else:

        query = {
            "$or": [

                {
                    "mlAnalysis.category": {
                        "$regex": f"^{category}$",
                        "$options": "i"
                    }
                },

                {
                    "category": {
                        "$regex": f"^{category}$",
                        "$options": "i"
                    }
                }

            ]
        }

    cursor = database.reports.find(
        query
    )

    nearbyReports = []

    # -----------------------------------------------------
    # CHECK EACH REPORT
    # -----------------------------------------------------

    async for report in cursor:

        if "location" in report:

            reportLatitude = report[
                "location"
            ].get("latitude")

            reportLongitude = report[
                "location"
            ].get("longitude")

        else:

            reportLatitude = report.get(
                "latitude"
            )

            reportLongitude = report.get(
                "longitude"
            )

        # -------------------------------------------------
        # IGNORE INVALID LOCATION
        # -------------------------------------------------

        if (
            reportLatitude is None
            or reportLongitude is None
        ):
            continue

        reportLatitude = float(
            reportLatitude
        )

        reportLongitude = float(
            reportLongitude
        )

        # -------------------------------------------------
        # CALCULATE DISTANCE
        # -------------------------------------------------

        distanceKm = calculateDistance(

            latitude,
            longitude,

            reportLatitude,
            reportLongitude
        )

        # -------------------------------------------------
        # CHECK RADIUS
        # -------------------------------------------------

        if distanceKm <= radiusKm:

            report["id"] = str(
                report["_id"]
            )

            del report["_id"]

            report["distanceKm"] = round(
                distanceKm,
                2
            )

            nearbyReports.append(
                report
            )

    # -----------------------------------------------------
    # NEAREST FIRST
    # -----------------------------------------------------

    nearbyReports.sort(
        key=lambda report:
        report["distanceKm"]
    )

    print(
        "NEARBY REPORTS FOUND:",
        len(nearbyReports)
    )

    return nearbyReports


# =========================================================
# DISTANCE CALCULATION
# =========================================================

def calculateDistance(
    latitude1,
    longitude1,
    latitude2,
    longitude2
):

    earthRadiusKm = 6371.0

    latitudeDifference = math.radians(
        latitude2 - latitude1
    )

    longitudeDifference = math.radians(
        longitude2 - longitude1
    )

    a = (

        math.sin(
            latitudeDifference / 2
        ) ** 2

        +

        math.cos(
            math.radians(latitude1)
        )

        *

        math.cos(
            math.radians(latitude2)
        )

        *

        math.sin(
            longitudeDifference / 2
        ) ** 2

    )

    c = 2 * math.atan2(

        math.sqrt(a),

        math.sqrt(1 - a)
    )

    return earthRadiusKm * c


# =========================================================
# GET SINGLE REPORT
# =========================================================

async def getReportById(
    reportId: str
):

    print(
        "FETCHING REPORT:",
        reportId
    )

    try:

        objectId = ObjectId(
            reportId
        )

    except Exception:

        return None

    report = await database.reports.find_one({
        "_id": objectId
    })

    if report is None:

        return None

    report["id"] = str(
        report["_id"]
    )

    del report["_id"]

    return report


# =========================================================
# UPDATE REPORT STATUS
# =========================================================

async def updateReportStatus(
    reportId: str,
    reportStatus: str
):

    print(
        "UPDATING REPORT STATUS"
    )

    print(
        "REPORT ID:",
        reportId
    )

    print(
        "NEW STATUS:",
        reportStatus
    )

    try:

        objectId = ObjectId(
            reportId
        )

    except Exception:

        return False

    result = await database.reports.update_one(

        {
            "_id": objectId
        },

        {
            "$set": {

                "reportStatus": reportStatus,

                "updatedAt": datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:

        return False

    return True


# =========================================================
# UPDATE REPORT VERIFICATION
# =========================================================

async def updateReportVerification(
    reportId: str,
    status: str,
    verifiedBy: str = None,
    reliabilityScore: float = 0,
    validationSources: list = None
):

    print(
        "UPDATING REPORT VERIFICATION"
    )

    print(
        "REPORT ID:",
        reportId
    )

    print(
        "STATUS:",
        status
    )

    print(
        "RELIABILITY SCORE:",
        reliabilityScore
    )

    if validationSources is None:

        validationSources = []

    try:

        objectId = ObjectId(
            reportId
        )

    except Exception:

        return False

    result = await database.reports.update_one(

        {
            "_id": objectId
        },

        {
            "$set": {

                "verification": {

                    "status": status,

                    "verifiedBy": verifiedBy,

                    "verifiedAt": datetime.utcnow(),

                    "reliabilityScore": reliabilityScore,

                    "validationSources": validationSources
                },

                "updatedAt": datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:

        return False

    return True