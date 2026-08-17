from datetime import datetime

from bson import ObjectId

from app.database import database

from sklearn.cluster import DBSCAN

import math
from app.notifications.service import createNotification
import re

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

        "imageHash": reportData.get("imageHash"),

        "aiAnalysis": {
            "title": reportData["aiAnalysis"]["title"],
            "description": reportData["aiAnalysis"]["description"]
        },

        "mlAnalysis": {
            "category": reportData["mlAnalysis"]["category"],
            "severity": reportData["mlAnalysis"]["severity"],
            "confidence": reportData["mlAnalysis"]["confidence"],
            "priority": reportData["mlAnalysis"].get("priority", "normal"),
            "source": reportData["mlAnalysis"].get("source")
        },

        # -------------------------------------------------
        # GOVERNMENT / MANUAL VERIFICATION
        # -------------------------------------------------

        "verification": reportData.get("verification", {
            "status": "Pending",
            "verifiedBy": None,
            "verifiedAt": None,
            "reliabilityScore": 0,
            "validationSources": []
        }),

        # -------------------------------------------------
        # AUTOMATIC VALIDATION
        # -------------------------------------------------

        "validation": reportData.get("validation", {

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
        }),

        "reportStatus": reportData.get("reportStatus", "Submitted"),

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

    if len(reports) < 2:

        print(
            "NOT ENOUGH REPORTS FOR CLUSTERING"
        )

        return []

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

    clusters = {}

    for index, label in enumerate(labels):

        if label == -1:
            continue

        if label not in clusters:

            clusters[label] = []

        clusters[label].append(
            reports[index]
        )

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

async def getMapReports(
    state=None,
    district=None,
    city=None,
    locality=None,
    category=None,
    status=None
):

    print(
        "FETCHING MAP REPORTS"
    )

    query = {}

    # -----------------------------------------------------
    # LOCATION FILTERS
    # -----------------------------------------------------

    if state:
        query["location.state"] = {
            "$regex": f"^{re.escape(state)}$",
            "$options": "i"
        }

    if district:
        query["location.district"] = {
            "$regex": f"^{re.escape(district)}$",
            "$options": "i"
        }

    if city:
        query["location.city"] = {
            "$regex": f"^{re.escape(city)}$",
            "$options": "i"
        }

    if locality:
        query["location.locality"] = {
            "$regex": f"^{re.escape(locality)}$",
            "$options": "i"
        }

    # -----------------------------------------------------
    # CATEGORY FILTER
    # -----------------------------------------------------

    if category:

        query["$or"] = [

            {
                "mlAnalysis.category": {
                    "$regex": f"^{re.escape(category)}$",
                    "$options": "i"
                }
            },

            {
                "category": {
                    "$regex": f"^{re.escape(category)}$",
                    "$options": "i"
                }
            }

        ]

    # -----------------------------------------------------
    # STATUS FILTER
    # Your reports use reportStatus, NOT status
    # -----------------------------------------------------

    if status:

        query["reportStatus"] = {
            "$regex": f"^{re.escape(status)}$",
            "$options": "i"
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

        distanceKm = calculateDistance(

            latitude,
            longitude,

            reportLatitude,
            reportLongitude
        )

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


# =========================================================
# GET REPORTS FOR RANKING
# Fetches live MongoDB reports in the shape report_ranker.py
# expects, excluding closed/non-hazard reports.
# =========================================================

async def getReportsForRanking():
    cursor = database.reports.find({
        "reportStatus": {"$ne": "Closed"},
        "mlAnalysis.category": {"$ne": "no_flood"},
        "mlAnalysis.severity": {"$gt": 0}
    })

    reports = []

    async for report in cursor:
        ml = report.get("mlAnalysis", {})
        loc = report.get("location", {})

        reports.append({
            "report_id": str(report.get("_id")),
            "hazard_type": ml.get("category"),
            "severity": ml.get("severity", 0),
            "affected_people": report.get("affectedPeople", 0),
            "location": f"{loc.get('latitude')},{loc.get('longitude')}",
            "latitude": loc.get("latitude"),
            "longitude": loc.get("longitude"),
            "description": report.get("description"),
            "confidence": ml.get("confidence", 0),
            "time": report.get("createdAt"),
            "validation": report.get("validation", {})
        })

    reports.sort(
        key=lambda r: (
            r["severity"],
            r["validation"].get("nearbyReportEvidence", {}).get("similarReportCount", 0),
            r["confidence"]
        ),
        reverse=True
    )

    return reports
# =========================================================
# GOVERNMENT REPORT TRACKING
# =========================================================

async def getReportTracking(reportId: str):

    print("TRACKING REPORT:", reportId)

    query = {"publicReportId": reportId}

    if ObjectId.is_valid(reportId):
        query = {
            "$or": [
                {"publicReportId": reportId},
                {"_id": ObjectId(reportId)}
            ]
        }

    report = await database.reports.find_one(query)

    if report is None:
        return None

    report["id"] = str(report["_id"])
    del report["_id"]

    return {
        "id": report["id"],
        "title": report.get("title"),
        "description": report.get("description"),
        "category": report.get(
            "mlAnalysis", {}
        ).get("category"),
        "severity": report.get(
            "mlAnalysis", {}
        ).get("severity"),
        "priority": report.get(
            "mlAnalysis", {}
        ).get(
            "priority",
            "normal"
        ),
        "reportStatus": report.get(
            "reportStatus",
            "Submitted"
        ),
        "location": report.get(
            "location",
            {}
        ),
        "verification": report.get(
            "verification",
            {}
        ),
        "timeline": report.get(
            "timeline",
            []
        ),
        "createdAt": report.get("createdAt"),
        "updatedAt": report.get("updatedAt")
    }


# =========================================================
# GOVERNMENT ADMINISTRATIVE REPORTS
# =========================================================

async def getAdministrativeReports(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None,
    status: str = None,
    priority: str = None,
    department: str = None
):

    print("FETCHING ADMINISTRATIVE REPORTS")

    query = {}

    # -----------------------------------------------------
    # LOCATION
    # -----------------------------------------------------

    if state:
        query["location.state"] = {
            "$regex": f"^{re.escape(state)}$",
            "$options": "i"
        }

    if district:
        query["location.district"] = {
            "$regex": f"^{re.escape(district)}$",
            "$options": "i"
        }

    if city:
        query["location.city"] = {
            "$regex": f"^{re.escape(city)}$",
            "$options": "i"
        }

    if locality:
        query["location.locality"] = {
            "$regex": f"^{re.escape(locality)}$",
            "$options": "i"
        }

    # -----------------------------------------------------
    # CATEGORY
    # -----------------------------------------------------

    if category:

        query["$or"] = [
            {
                "mlAnalysis.category": {
                    "$regex": f"^{re.escape(category)}$",
                    "$options": "i"
                }
            },
            {
                "category": {
                    "$regex": f"^{re.escape(category)}$",
                    "$options": "i"
                }
            }
        ]

    # -----------------------------------------------------
    # STATUS
    # Your schema uses reportStatus
    # -----------------------------------------------------

    if status:

        query["reportStatus"] = {
            "$regex": f"^{re.escape(status)}$",
            "$options": "i"
        }

    # -----------------------------------------------------
    # PRIORITY
    # Priority is primarily stored inside mlAnalysis
    # -----------------------------------------------------

    if priority:

        query["mlAnalysis.priority"] = {
            "$regex": f"^{re.escape(priority)}$",
            "$options": "i"
        }

    # -----------------------------------------------------
    # DEPARTMENT
    # -----------------------------------------------------

    if department:

        query["assignment.department"] = {
            "$regex": f"^{re.escape(department)}$",
            "$options": "i"
        }

    print(
        "ADMINISTRATIVE QUERY:",
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

        reports.append(report)

    print(
        "ADMINISTRATIVE REPORTS FOUND:",
        len(reports)
    )

    return reports


# =========================================================
# GOVERNMENT ADMINISTRATIVE HOTSPOTS
# =========================================================

async def getAdministrativeHotspots(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None
):

    print(
        "FETCHING ADMINISTRATIVE HOTSPOTS"
    )

    query = {}

    # -----------------------------------------------------
    # LOCATION FILTERS
    # -----------------------------------------------------

    if state:
        query["location.state"] = {
            "$regex": f"^{re.escape(state)}$",
            "$options": "i"
        }

    if district:
        query["location.district"] = {
            "$regex": f"^{re.escape(district)}$",
            "$options": "i"
        }

    if city:
        query["location.city"] = {
            "$regex": f"^{re.escape(city)}$",
            "$options": "i"
        }

    if locality:
        query["location.locality"] = {
            "$regex": f"^{re.escape(locality)}$",
            "$options": "i"
        }

    # -----------------------------------------------------
    # CATEGORY
    # -----------------------------------------------------

    if category:

        query["$or"] = [
            {
                "mlAnalysis.category": {
                    "$regex": f"^{re.escape(category)}$",
                    "$options": "i"
                }
            },
            {
                "category": {
                    "$regex": f"^{re.escape(category)}$",
                    "$options": "i"
                }
            }
        ]

    cursor = database.reports.find(query)

    reports = []

    async for report in cursor:

        location = report.get(
            "location",
            {}
        )

        latitude = location.get(
            "latitude"
        )

        longitude = location.get(
            "longitude"
        )

        if latitude is None or longitude is None:
            continue

        ml = report.get(
            "mlAnalysis",
            {}
        )

        reports.append({
            "id": str(report["_id"]),
            "latitude": float(latitude),
            "longitude": float(longitude),
            "title": report.get("title"),
            "category": ml.get("category"),
            "severity": ml.get("severity", 0),
            "confidence": ml.get("confidence", 0),
            "status": report.get(
                "reportStatus",
                "Submitted"
            ),
            "priority": ml.get(
                "priority",
                "normal"
            ),
            "location": location
        })

    print(
        "REPORTS WITH LOCATION:",
        len(reports)
    )

    if len(reports) < 2:
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
                math.radians(
                    meanLatitude
                )
            )
        )

        coordinates.append([
            x,
            y
        ])

    # -----------------------------------------------------
    # DBSCAN
    # 0.5 km radius
    # Minimum 2 reports
    # -----------------------------------------------------

    clustering = DBSCAN(
        eps=0.5,
        min_samples=2,
        metric="euclidean"
    ).fit(
        coordinates
    )

    labels = clustering.labels_

    clusters = {}

    for index, label in enumerate(labels):

        if label == -1:
            continue

        clusters.setdefault(
            label,
            []
        ).append(
            reports[index]
        )

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

        if reportCount >= 11:
            level = "high"
        elif reportCount >= 4:
            level = "medium"
        else:
            level = "low"

        categoryCounts = {}
        statusCounts = {}

        for report in clusterReports:

            reportCategory = report.get(
                "category"
            )

            if reportCategory:
                categoryCounts[
                    reportCategory
                ] = categoryCounts.get(
                    reportCategory,
                    0
                ) + 1

            reportStatus = report.get(
                "status",
                "Submitted"
            )

            statusCounts[
                reportStatus
            ] = statusCounts.get(
                reportStatus,
                0
            ) + 1

        hotspots.append({

            "hotspotId":
                f"HS-{round(averageLatitude, 5)}-"
                f"{round(averageLongitude, 5)}",

            "latitude": averageLatitude,

            "longitude": averageLongitude,

            "reportCount": reportCount,

            "level": level,

            "reportIds": [
                report["id"]
                for report in clusterReports
            ],

            "categoryCounts": categoryCounts,

            "statusCounts": statusCounts,

            "reports": clusterReports
        })

    hotspots.sort(
        key=lambda hotspot:
            hotspot["reportCount"],
        reverse=True
    )

    print(
        "ADMINISTRATIVE HOTSPOTS FOUND:",
        len(hotspots)
    )

    return hotspots


# =========================================================
# HOTSPOT DETAILS
# =========================================================

async def getHotspotDetails(
    hotspotId: str,
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None
):

    hotspots = await getAdministrativeHotspots(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category
    )

    for hotspot in hotspots:

        currentHotspotId = (
            f"HS-{round(hotspot['latitude'], 5)}-"
            f"{round(hotspot['longitude'], 5)}"
        )

        if currentHotspotId == hotspotId:
            return hotspot

    return None


# =========================================================
# ASSIGN REPORT TO DEPARTMENT
# =========================================================

async def assignReport(
    reportId: str,
    department: str,
    assignedTo: str,
    assignedBy: str = "admin"
):

    print(
        "ASSIGNING REPORT:",
        reportId
    )

    query = {
        "publicReportId": reportId
    }

    if ObjectId.is_valid(reportId):

        query = {
            "$or": [
                {
                    "publicReportId": reportId
                },
                {
                    "_id": ObjectId(reportId)
                }
            ]
        }

    report = await database.reports.find_one(
        query
    )

    if report is None:

        return {
            "success": False,
            "error": "report_not_found"
        }

    objectId = report["_id"]

    now = datetime.utcnow()

    assignmentData = {

        "department": department,

        "assignedTo": assignedTo,

        "assignedBy": assignedBy,

        "assignedAt": now
    }

    timelineEntry = {

        "status": "Assigned",

        "timestamp": now,

        "description":
            f"Report assigned to {department}."
    }

    result = await database.reports.update_one(

        {
            "_id": objectId
        },

        {
            "$set": {

                "assignment": assignmentData,

                "reportStatus": "Assigned",

                "updatedAt": now
            },

            "$push": {

                "timeline": timelineEntry
            }
        }
    )

    if result.matched_count == 0:

        return {
            "success": False,
            "error": "report_not_found"
        }

    # -----------------------------------------------------
    # NOTIFICATION
    # -----------------------------------------------------

    try:

        await createNotification(

            notificationType="report_assigned",

            message=(
                f"Report assigned to "
                f"{department} ({assignedTo})."
            ),

            reportId=reportId,

            department=department,

            assignedTo=assignedTo,

            username=report.get(
                "username"
            )
        )

    except Exception as e:

        print(
            "Assignment notification failed:",
            str(e)
        )

    return {

        "success": True,

        "reportId": reportId,

        "assignment": assignmentData
    }


# =========================================================
# GOVERNMENT DASHBOARD
# =========================================================

async def getGovernmentDashboard(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None
):

    query = {}

    if state:

        query["location.state"] = {
            "$regex": f"^{re.escape(state)}$",
            "$options": "i"
        }

    if district:

        query["location.district"] = {
            "$regex": f"^{re.escape(district)}$",
            "$options": "i"
        }

    if city:

        query["location.city"] = {
            "$regex": f"^{re.escape(city)}$",
            "$options": "i"
        }

    if locality:

        query["location.locality"] = {
            "$regex": f"^{re.escape(locality)}$",
            "$options": "i"
        }

    if category:

        query["$or"] = [
            {
                "category": {
                    "$regex": f"^{re.escape(category)}$",
                    "$options": "i"
                }
            },
            {
                "mlAnalysis.category": {
                    "$regex": f"^{re.escape(category)}$",
                    "$options": "i"
                }
            }
        ]

    cursor = database.reports.find(
        query
    )

    reports = []

    async for report in cursor:
        reports.append(report)

    summary = {

        "totalReports": len(reports),

        "submitted": 0,

        "underReview": 0,

        "assigned": 0,

        "inProgress": 0,

        "resolved": 0,

        "rejected": 0
    }

    priorityCounts = {

        "low": 0,

        "moderate": 0,

        "high": 0,

        "critical": 0
    }

    categoryCounts = {}

    departmentCounts = {}

    for report in reports:

        status = report.get(
            "reportStatus",
            "Submitted"
        ).lower()

        if status == "submitted":
            summary["submitted"] += 1

        elif status in {
            "under_review",
            "under review"
        }:
            summary["underReview"] += 1

        elif status == "assigned":
            summary["assigned"] += 1

        elif status in {
            "in_progress",
            "in progress",
            "action_in_progress"
        }:
            summary["inProgress"] += 1

        elif status == "resolved":
            summary["resolved"] += 1

        elif status == "rejected":
            summary["rejected"] += 1

        ml = report.get(
            "mlAnalysis",
            {}
        )

        priority = ml.get(
            "priority",
            "normal"
        )

        if priority in priorityCounts:
            priorityCounts[priority] += 1

        category = (
            report.get("category")
            or ml.get("category")
        )

        if category:

            categoryCounts[
                category
            ] = categoryCounts.get(
                category,
                0
            ) + 1

        department = report.get(
            "assignment",
            {}
        ).get(
            "department"
        )

        if department:

            departmentCounts[
                department
            ] = departmentCounts.get(
                department,
                0
            ) + 1

    return {

        "success": True,

        "summary": summary,

        "priority": priorityCounts,

        "categories": categoryCounts,

        "departments": departmentCounts
    }


# =========================================================
# DELETE REPORT
# =========================================================

async def deleteReport(
    reportId: str
):

    query = {
        "publicReportId": reportId
    }

    if ObjectId.is_valid(reportId):

        query = {
            "$or": [
                {
                    "publicReportId": reportId
                },
                {
                    "_id": ObjectId(reportId)
                }
            ]
        }

    report = await database.reports.find_one(
        query
    )

    if report is None:

        return {
            "success": False,
            "error": "report_not_found"
        }

    objectId = report["_id"]

    await database.reports.delete_one(
        {
            "_id": objectId
        }
    )

    try:

        await database.notifications.delete_many({
            "$or": [
                {
                    "reportId": reportId
                },
                {
                    "reportId": str(objectId)
                }
            ]
        })

    except Exception as e:

        print(
            "Notification cleanup failed:",
            str(e)
        )

    return {

        "success": True,

        "reportId": reportId
    }