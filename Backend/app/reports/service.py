from datetime import datetime

from bson import ObjectId

from app.database import database
from app.notifications.service import createNotification

from sklearn.cluster import DBSCAN

import math
import re


# =========================================================
# CREATE REPORT
# =========================================================

async def createReport(reportData: dict):

    reportDocument = {

        # -------------------------------------------------
        # BASIC INFORMATION
        # -------------------------------------------------

        "username": reportData.get(
            "username",
            "anonymous"
        ),

        "title": reportData["title"],

        "description": reportData["description"],

        "imageUrl": reportData["imageUrl"],

        # -------------------------------------------------
        # FINAL CATEGORY
        # -------------------------------------------------

        "category": (
            reportData.get("category")
            or reportData.get("mlAnalysis", {}).get("category")
        ),

        # -------------------------------------------------
        # LOCATION
        # -------------------------------------------------

        "location": {

            "latitude": reportData[
                "location"
            ]["latitude"],

            "longitude": reportData[
                "location"
            ]["longitude"],

            "state": reportData[
                "location"
            ].get("state"),

            "district": reportData[
                "location"
            ].get("district"),

            "city": reportData[
                "location"
            ].get("city"),

            "locality": reportData[
                "location"
            ].get("locality")
        },

        # -------------------------------------------------
        # GEMINI
        # -------------------------------------------------

        "aiAnalysis": {

            "title": reportData[
                "aiAnalysis"
            ].get("title"),

            "description": reportData[
                "aiAnalysis"
            ].get("description")
        },

        # -------------------------------------------------
        # ML
        # -------------------------------------------------

        "mlAnalysis": {

            "isWaterRelated": reportData[
                "mlAnalysis"
            ].get("isWaterRelated"),

            "category": reportData[
                "mlAnalysis"
            ].get("category"),

            "confidence": reportData[
                "mlAnalysis"
            ].get("confidence")
        },

        # -------------------------------------------------
        # REPORT MANAGEMENT
        # -------------------------------------------------

        "status": reportData.get(
            "status",
            "submitted"
        ),

        "priority": reportData.get(
            "priority",
            "medium"
        ),

        # -------------------------------------------------
        # REPORT TIMELINE
        # -------------------------------------------------

        "timeline": reportData.get(
            "timeline",
            []
        ),

        # -------------------------------------------------
        # VERIFICATION
        # -------------------------------------------------

        "verification": {

            "status": reportData[
                "verification"
            ].get(
                "status",
                "Pending"
            ),

            "verifiedBy": reportData[
                "verification"
            ].get(
                "verifiedBy"
            ),

            "verifiedAt": reportData[
                "verification"
            ].get(
                "verifiedAt"
            )
        },

        # -------------------------------------------------
        # -------------------------------------------------
        # TIMESTAMPS
        # -------------------------------------------------

        "createdAt": reportData[
            "createdAt"
        ],

        "updatedAt": reportData[
            "updatedAt"
        ]
    }

    result = await database.reports.insert_one(
        reportDocument
    )

    # -------------------------------------------------
    # CREATE NOTIFICATION FOR NEW REPORT
    # -------------------------------------------------

    await createNotification(
        notificationType="new_report",
        message=(
            f"New water-related report submitted: "
            f"{reportDocument['title']}"
        ),
        reportId=str(result.inserted_id),
        username=reportDocument.get("username")
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

async def getMapReports(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None,
    status: str = None
):

    print(
        "FETCHING MAP REPORTS"
    )

    print("STATE:", state)
    print("DISTRICT:", district)
    print("CITY:", city)
    print("LOCALITY:", locality)
    print("CATEGORY:", category)
    print("STATUS:", status)

    # -----------------------------------------------------
    # BUILD QUERY
    # -----------------------------------------------------

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
    #
    # New reports store category at the top level.
    # mlAnalysis.category is also supported for compatibility
    # with existing reports.
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # STATUS FILTER
    # -----------------------------------------------------

    if status:

        query["status"] = {
            "$regex": f"^{re.escape(status)}$",
            "$options": "i"
        }

    print(
        "MAP QUERY:",
        query
    )

    # -----------------------------------------------------
    # FETCH REPORTS
    # -----------------------------------------------------

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

        # -------------------------------------------------
        # NORMALIZE TOP-LEVEL CATEGORY
        # -------------------------------------------------

        if not report.get("category"):

            report["category"] = report.get(
                "mlAnalysis",
                {}
            ).get(
                "category"
            )

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
# GET REPORT TRACKING INFORMATION
# =========================================================

async def getReportTracking(reportId: str):

    print("FETCHING REPORT TRACKING")
    print("REPORT ID:", reportId)

    # -----------------------------------------------------
    # CONVERT REPORT ID
    # -----------------------------------------------------

    try:

        objectId = ObjectId(reportId)

    except Exception:

        return None

    # -----------------------------------------------------
    # FIND REPORT
    # -----------------------------------------------------

    report = await database.reports.find_one(
        {
            "_id": objectId
        }
    )

    if report is None:

        return None

    # -----------------------------------------------------
    # RETURN TRACKING INFORMATION
    # -----------------------------------------------------

    return {

        "reportId": str(
            report["_id"]
        ),

        "username": report.get(
            "username"
        ),

        "title": report.get(
            "title"
        ),

        "description": report.get(
            "description"
        ),

        "imageUrl": report.get(
            "imageUrl"
        ),

        "category": (
            report.get("category")
            or report.get(
                "mlAnalysis",
                {}
            ).get("category")
        ),

        "priority": report.get(
            "priority",
            "medium"
        ),

        "currentStatus": report.get(
            "status",
            "submitted"
        ),

        "location": report.get(
            "location",
            {}
        ),

        "verification": report.get(
            "verification",
            {}
        ),

        "assignment": report.get(
            "assignment"
        ),

        "assignmentHistory": report.get(
            "assignmentHistory",
            []
        ),

        "timeline": report.get(
            "timeline",
            []
        ),

        "createdAt": report.get(
            "createdAt"
        ),

        "updatedAt": report.get(
            "updatedAt"
        )
    }

# =========================================================
# UPDATE REPORT STATUS
# =========================================================

# =========================================================
# UPDATE REPORT STATUS
# =========================================================

# =========================================================
# UPDATE REPORT STATUS
# =========================================================

async def updateReportStatus(
    reportId: str,
    reportStatus: str,
    verifiedBy: str = None
):

    print("UPDATING REPORT STATUS")
    print("REPORT ID:", reportId)
    print("NEW STATUS:", reportStatus)

    # -----------------------------------------------------
    # ALLOWED STATUS TRANSITIONS
    # -----------------------------------------------------

    allowedTransitions = {

        "submitted": [
            "under_review"
        ],

        "under_review": [
            "verified",
            "rejected"
        ],

        "verified": [
            "action_in_progress"
        ],

        "action_in_progress": [
            "resolved"
        ],

        "rejected": [],

        "resolved": []
    }

    # -----------------------------------------------------
    # VALID STATUS VALUES
    # -----------------------------------------------------

    validStatuses = {

        "submitted",
        "under_review",
        "verified",
        "rejected",
        "action_in_progress",
        "resolved"
    }

    if reportStatus not in validStatuses:

        return {
            "success": False,
            "error": "invalid_status"
        }

    # -----------------------------------------------------
    # CONVERT REPORT ID
    # -----------------------------------------------------

    try:

        objectId = ObjectId(reportId)

    except Exception:

        return {
            "success": False,
            "error": "invalid_report_id"
        }

    # -----------------------------------------------------
    # FIND REPORT
    # -----------------------------------------------------

    report = await database.reports.find_one(
        {
            "_id": objectId
        }
    )

    if report is None:

        return {
            "success": False,
            "error": "report_not_found"
        }

    # -----------------------------------------------------
    # CURRENT STATUS
    # -----------------------------------------------------

    currentStatus = report.get(
        "status",
        "submitted"
    )

    print(
        "CURRENT STATUS:",
        currentStatus
    )

    # -----------------------------------------------------
    # CHECK TRANSITION
    # -----------------------------------------------------

    allowedNextStatuses = allowedTransitions.get(
        currentStatus,
        []
    )

    if reportStatus not in allowedNextStatuses:

        return {
            "success": False,
            "error": "invalid_transition",
            "currentStatus": currentStatus,
            "requestedStatus": reportStatus,
            "allowedNextStatuses": allowedNextStatuses
        }

    # -----------------------------------------------------
    # CURRENT TIME
    # -----------------------------------------------------

    now = datetime.utcnow()

    # -----------------------------------------------------
    # BUILD UPDATE
    # -----------------------------------------------------

    updateData = {

        "$set": {

            "status": reportStatus,

            "updatedAt": now
        },

        "$push": {

            "timeline": {

                "status": reportStatus,

                "timestamp": now
            }
        },

        "$unset": {

            "reportStatus": ""
        }
    }

    # -----------------------------------------------------
    # SYNCHRONIZE VERIFICATION
    # -----------------------------------------------------

    if reportStatus == "verified":

        updateData["$set"][
            "verification"
        ] = {

            "status": "Verified",

            "verifiedBy": verifiedBy,

            "verifiedAt": now
        }

    elif reportStatus == "rejected":

        updateData["$set"][
            "verification"
        ] = {

            "status": "Rejected",

            "verifiedBy": verifiedBy,

            "verifiedAt": now
        }

    # -----------------------------------------------------
    # UPDATE DATABASE
    # -----------------------------------------------------

    result = await database.reports.update_one(

        {
            "_id": objectId
        },

        updateData
    )

    if result.matched_count == 0:

        return {
            "success": False,
            "error": "report_not_found"
        }

    # -------------------------------------------------
    # CREATE STATUS CHANGE NOTIFICATION
    # -------------------------------------------------

    assignment = report.get(
        "assignment",
        {}
    )

    await createNotification(
        notificationType="status_changed",
        message=(
            f"Report status changed from "
            f"{currentStatus} to {reportStatus}."
        ),
        reportId=reportId,
        department=assignment.get("department"),
        assignedTo=assignment.get("assignedTo"),
        username=report.get("username")
    )

    print(
        "STATUS UPDATED:",
        currentStatus,
        "->",
        reportStatus
    )

    return {

        "success": True,

        "previousStatus": currentStatus,

        "status": reportStatus,

        "verifiedBy": verifiedBy
    }


# =========================================================
# UPDATE REPORT VERIFICATION
# =========================================================

async def updateReportVerification(
    reportId: str,
    status: str,
    verifiedBy: str = None
):

    print("UPDATING REPORT VERIFICATION")

    validVerificationStatuses = {
        "Pending",
        "Verified",
        "Rejected"
    }

    if status not in validVerificationStatuses:
        return {
            "success": False,
            "error": "invalid_verification_status"
        }

    try:
        objectId = ObjectId(reportId)
    except Exception:
        return {
            "success": False,
            "error": "invalid_report_id"
        }

    report = await database.reports.find_one({"_id": objectId})

    if report is None:
        return {
            "success": False,
            "error": "report_not_found"
        }

    now = datetime.utcnow()

    verificationData = {
        "status": status,
        "verifiedBy": verifiedBy,
        "verifiedAt": now if status == "Verified" else None
    }

    await database.reports.update_one(
        {"_id": objectId},
        {"$set": {
            "verification": verificationData,
            "updatedAt": now
        }}
    )

    return {
        "success": True,
        "verification": verificationData
    }


# =========================================================
# GET REPORTS BY ADMINISTRATIVE LOCATION
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

    print("STATE:", state)
    print("DISTRICT:", district)
    print("CITY:", city)
    print("LOCALITY:", locality)
    print("CATEGORY:", category)
    print("STATUS:", status)
    print("PRIORITY:", priority)
    print("DEPARTMENT:", department)

    # -----------------------------------------------------
    # BUILD QUERY
    # -----------------------------------------------------

    query = {}

    # -----------------------------------------------------
    # ADMINISTRATIVE LOCATION FILTERS
    # -----------------------------------------------------

    if state:

        query[
            "location.state"
        ] = {
            "$regex": f"^{state}$",
            "$options": "i"
        }

    if district:

        query[
            "location.district"
        ] = {
            "$regex": f"^{district}$",
            "$options": "i"
        }

    if city:

        query[
            "location.city"
        ] = {
            "$regex": f"^{city}$",
            "$options": "i"
        }

    if locality:

        query[
            "location.locality"
        ] = {
            "$regex": f"^{locality}$",
            "$options": "i"
        }

    # -----------------------------------------------------
    # CATEGORY FILTER
    #
    # ML category will be the main category source.
    # Old category field is also supported.
    # -----------------------------------------------------

    if category:

        query[
            "$or"
        ] = [

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

    # -----------------------------------------------------
    # STATUS FILTER
    # -----------------------------------------------------

    if status:

        query[
            "status"
        ] = {
            "$regex": f"^{re.escape(status)}$",
            "$options": "i"
        }

    # -----------------------------------------------------
    # PRIORITY FILTER
    # -----------------------------------------------------

    if priority:

        query[
            "priority"
        ] = {
            "$regex": f"^{re.escape(priority)}$",
            "$options": "i"
        }

    # -----------------------------------------------------
    # DEPARTMENT FILTER
    # -----------------------------------------------------

    if department:

        query[
            "assignment.department"
        ] = {
            "$regex": f"^{re.escape(department)}$",
            "$options": "i"
        }

    # -----------------------------------------------------
    # FETCH REPORTS
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # FORMAT REPORTS
    # -----------------------------------------------------

    async for report in cursor:

        report["id"] = str(
            report["_id"]
        )

        del report["_id"]

        reports.append(
            report
        )

    print(
        "ADMINISTRATIVE REPORTS FOUND:",
        len(reports)
    )

    return reports

# =========================================================
# GET ADMINISTRATIVE HOTSPOTS
# =========================================================

async def getAdministrativeHotspots(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None
):

    print("FETCHING ADMINISTRATIVE HOTSPOTS")

    query = {}

    # -----------------------------------------------------
    # ADMINISTRATIVE FILTERS
    # -----------------------------------------------------

    if state:

        query["location.state"] = {
            "$regex": f"^{state}$",
            "$options": "i"
        }

    if district:

        query["location.district"] = {
            "$regex": f"^{district}$",
            "$options": "i"
        }

    if city:

        query["location.city"] = {
            "$regex": f"^{city}$",
            "$options": "i"
        }

    if locality:

        query["location.locality"] = {
            "$regex": f"^{locality}$",
            "$options": "i"
        }

    # -----------------------------------------------------
    # CATEGORY FILTER
    # -----------------------------------------------------

    if category:

        query["$or"] = [

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

    print(
        "ADMINISTRATIVE HOTSPOT QUERY:",
        query
    )

    cursor = database.reports.find(
        query
    )

    reports = []

    # -----------------------------------------------------
    # GET REPORT LOCATIONS AND DETAILS
    # -----------------------------------------------------

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

        mlAnalysis = report.get(
            "mlAnalysis",
            {}
        )

        reports.append({

            "id": str(
                report["_id"]
            ),

            "latitude": float(latitude),

            "longitude": float(longitude),

            "title": report.get(
                "title"
            ),

            "category": mlAnalysis.get(
                "category"
            ),

            "status": report.get(
                "status",
                "submitted"
            ),

            "priority": report.get(
                "priority",
                "medium"
            ),

            "location": location
        })

    print(
        "REPORTS WITH LOCATION:",
        len(reports)
    )

    # -----------------------------------------------------
    # NOT ENOUGH REPORTS FOR A CLUSTER
    # -----------------------------------------------------

    if len(reports) < 2:

        print(
            "NOT ENOUGH REPORTS FOR ADMINISTRATIVE CLUSTERING"
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
    # DBSCAN CLUSTERING
    # 0.5 km radius, minimum 2 reports
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

        if label not in clusters:
            clusters[label] = []

        clusters[label].append(
            reports[index]
        )

    # -----------------------------------------------------
    # BUILD HOTSPOT RESPONSE
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
                "submitted"
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
# GET HOTSPOT DETAILS
# =========================================================

async def getHotspotDetails(
    hotspotId: str,
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None
):

    print("FETCHING HOTSPOT DETAILS")
    print("HOTSPOT ID:", hotspotId)

    # -----------------------------------------------------
    # GET ADMINISTRATIVE HOTSPOTS
    # -----------------------------------------------------

    hotspots = await getAdministrativeHotspots(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category
    )

    # -----------------------------------------------------
    # FIND REQUESTED HOTSPOT
    # -----------------------------------------------------

    for hotspot in hotspots:

        currentHotspotId = (
            f"HS-{round(hotspot['latitude'], 5)}"
            f"-{round(hotspot['longitude'], 5)}"
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

    print("ASSIGNING REPORT")

    print("REPORT ID:", reportId)
    print("DEPARTMENT:", department)
    print("ASSIGNED TO:", assignedTo)
    print("ASSIGNED BY:", assignedBy)

    # -----------------------------------------------------
    # CONVERT REPORT ID
    # -----------------------------------------------------

    try:

        objectId = ObjectId(reportId)

    except Exception:

        return {
            "success": False,
            "error": "invalid_report_id"
        }

    # -----------------------------------------------------
    # FIND REPORT
    # -----------------------------------------------------

    report = await database.reports.find_one(
        {
            "_id": objectId
        }
    )

    if report is None:

        return {
            "success": False,
            "error": "report_not_found"
        }

    # -----------------------------------------------------
    # CHECK REPORT STATUS
    # -----------------------------------------------------

    currentStatus = report.get(
        "status",
        "submitted"
    )

    if currentStatus != "verified":

        return {
            "success": False,
            "error": "report_must_be_verified",
            "currentStatus": currentStatus
        }

    # -----------------------------------------------------
    # CURRENT TIME
    # -----------------------------------------------------

    now = datetime.utcnow()

    # -----------------------------------------------------
    # ASSIGNMENT DATA
    # -----------------------------------------------------

    assignmentData = {

        "department": department,

        "assignedTo": assignedTo,

        "assignedBy": assignedBy,

        "assignedAt": now
    }

    # -----------------------------------------------------
    # UPDATE REPORT
    # -----------------------------------------------------

    result = await database.reports.update_one(

        {
            "_id": objectId
        },

        {
            "$set": {

                "assignment": assignmentData,

                "updatedAt": now
            },

            "$push": {

                "assignmentHistory": assignmentData
            }
        }
    )

    # -----------------------------------------------------
    # CHECK UPDATE
    # -----------------------------------------------------

    if result.matched_count == 0:

        return {
            "success": False,
            "error": "report_not_found"
        }

    # -------------------------------------------------
    # CREATE ASSIGNMENT NOTIFICATION
    # -------------------------------------------------

    await createNotification(
        notificationType="report_assigned",
        message=(
            f"Report assigned to {department} "
            f"({assignedTo})."
        ),
        reportId=reportId,
        department=department,
        assignedTo=assignedTo,
        username=report.get("username")
    )

    print(
        "REPORT ASSIGNED SUCCESSFULLY"
    )

    return {

        "success": True,

        "assignment": assignmentData
    }

    
# =========================================================
# GOVERNMENT DASHBOARD SUMMARY
# =========================================================

async def getGovernmentDashboard(
    state: str = None,
    district: str = None,
    city: str = None,
    locality: str = None,
    category: str = None
):

    print("FETCHING GOVERNMENT DASHBOARD")

    print("STATE:", state)
    print("DISTRICT:", district)
    print("CITY:", city)
    print("LOCALITY:", locality)
    print("CATEGORY:", category)

    # -----------------------------------------------------
    # BUILD QUERY
    # -----------------------------------------------------

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

    print(
        "DASHBOARD QUERY:",
        query
    )

    # -----------------------------------------------------
    # FETCH REPORTS
    # -----------------------------------------------------

    cursor = database.reports.find(query)

    reports = []

    async for report in cursor:

        reports.append(report)

    # -----------------------------------------------------
    # BASIC COUNTS
    # -----------------------------------------------------

    totalReports = len(reports)

    submitted = 0
    underReview = 0
    verified = 0
    actionInProgress = 0
    resolved = 0
    rejected = 0

    # -----------------------------------------------------
    # PRIORITY COUNTS
    # -----------------------------------------------------

    lowPriority = 0
    mediumPriority = 0
    highPriority = 0
    criticalPriority = 0

    # -----------------------------------------------------
    # DEPARTMENT COUNTS
    # -----------------------------------------------------

    departmentCounts = {}

    # -----------------------------------------------------
    # CATEGORY COUNTS
    # -----------------------------------------------------

    categoryCounts = {}

    # -----------------------------------------------------
    # PROCESS REPORTS
    # -----------------------------------------------------

    for report in reports:

        # -------------------------------------------------
        # STATUS
        # -------------------------------------------------

        status = report.get(
            "status",
            "submitted"
        )

        if status == "submitted":

            submitted += 1

        elif status == "under_review":

            underReview += 1

        elif status == "verified":

            verified += 1

        elif status == "action_in_progress":

            actionInProgress += 1

        elif status == "resolved":

            resolved += 1

        elif status == "rejected":

            rejected += 1

        # -------------------------------------------------
        # PRIORITY
        # -------------------------------------------------

        priority = report.get(
            "priority",
            "medium"
        )

        if priority == "low":

            lowPriority += 1

        elif priority == "medium":

            mediumPriority += 1

        elif priority == "high":

            highPriority += 1

        elif priority == "critical":

            criticalPriority += 1

        # -------------------------------------------------
        # CATEGORY
        # -------------------------------------------------

        reportCategory = report.get(
            "category"
        )

        if not reportCategory:

            reportCategory = report.get(
                "mlAnalysis",
                {}
            ).get(
                "category"
            )

        if reportCategory:

            categoryCounts[
                reportCategory
            ] = categoryCounts.get(
                reportCategory,
                0
            ) + 1

        # -------------------------------------------------
        # DEPARTMENT
        # -------------------------------------------------

        assignment = report.get(
            "assignment",
            {}
        )

        department = assignment.get(
            "department"
        )

        if department:

            departmentCounts[
                department
            ] = departmentCounts.get(
                department,
                0
            ) + 1

    # -----------------------------------------------------
    # RETURN DASHBOARD
    # -----------------------------------------------------

    return {

        "success": True,

        "filters": {

            "state": state,

            "district": district,

            "city": city,

            "locality": locality,

            "category": category
        },

        "summary": {

            "totalReports": totalReports,

            "submitted": submitted,

            "underReview": underReview,

            "verified": verified,

            "actionInProgress": actionInProgress,

            "resolved": resolved,

            "rejected": rejected
        },

        "priority": {

            "low": lowPriority,

            "medium": mediumPriority,

            "high": highPriority,

            "critical": criticalPriority
        },

        "categories": categoryCounts,

        "departments": departmentCounts
    }