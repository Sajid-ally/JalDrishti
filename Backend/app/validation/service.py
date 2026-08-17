import math
from datetime import datetime

from bson import ObjectId

from app.database import database


# =========================================================
# HELPER: CALCULATE DISTANCE
# =========================================================

def calculateDistanceKm(
    latitude1: float,
    longitude1: float,
    latitude2: float,
    longitude2: float
):

    latitudeDifference = latitude2 - latitude1

    longitudeDifference = longitude2 - longitude1

    distanceKm = math.sqrt(
        (latitudeDifference * 111) ** 2
        +
        (
            longitudeDifference
            * 111
            * math.cos(
                math.radians(latitude1)
            )
        ) ** 2
    )

    return distanceKm


# =========================================================
# FIND MATCHING GOVERNMENT ALERT
# =========================================================

async def findGovernmentAlert(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 10
):

    print("CHECKING GOVERNMENT ALERT")

    print("LATITUDE:", latitude)
    print("LONGITUDE:", longitude)
    print("CATEGORY:", category)
    print("RADIUS:", radiusKm)

    # Government alert is OPTIONAL.
    # If category is missing, simply return no alert.

    if not category:

        return None

    cursor = database.governmentAlerts.find({

        "category": {

            "$regex":
                f"^{category}$",

            "$options":
                "i"
        },

        "status":
            "Active"
    })

    closestAlert = None

    closestDistance = None

    async for alert in cursor:

        alertLocation = alert.get(
            "location",
            {}
        )

        alertLatitude = alertLocation.get(
            "latitude"
        )

        alertLongitude = alertLocation.get(
            "longitude"
        )

        if (
            alertLatitude is None
            or
            alertLongitude is None
        ):

            continue

        distanceKm = calculateDistanceKm(

            latitude,

            longitude,

            float(alertLatitude),

            float(alertLongitude)
        )

        print(
            "ALERT DISTANCE:",
            round(distanceKm, 2),
            "KM"
        )

        if distanceKm <= radiusKm:

            if (
                closestDistance is None
                or
                distanceKm < closestDistance
            ):

                closestDistance = distanceKm

                alert["id"] = str(
                    alert["_id"]
                )

                del alert["_id"]

                alert["distanceKm"] = round(
                    distanceKm,
                    2
                )

                closestAlert = alert

    if closestAlert:

        print(
            "GOVERNMENT ALERT FOUND:",
            closestAlert["id"]
        )

    else:

        print(
            "NO MATCHING GOVERNMENT ALERT FOUND"
        )

    return closestAlert


# =========================================================
# CHECK NEARBY REPORT EVIDENCE
# =========================================================

async def findNearbyReportEvidence(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5,
    reportId: str = None
):

    print("CHECKING NEARBY REPORT EVIDENCE")

    print("LATITUDE:", latitude)
    print("LONGITUDE:", longitude)
    print("CATEGORY:", category)
    print("RADIUS:", radiusKm)

    if not category:

        return {

            "similarReportCount":
                0,

            "reports":
                []
        }

    from app.reports.service import getNearbyReports

    nearbyReports = await getNearbyReports(
        latitude,
        longitude,
        radiusKm
    )

    similarReports = []

    for report in nearbyReports:

        # -------------------------------------------------
        # IGNORE CURRENT REPORT
        # -------------------------------------------------

        if (
            reportId
            and
            report.get("id") == reportId
        ):

            continue

        reportCategory = None

        # -------------------------------------------------
        # CATEGORY FROM ML
        # -------------------------------------------------

        mlAnalysis = report.get(
            "mlAnalysis",
            {}
        )

        if mlAnalysis:

            reportCategory = mlAnalysis.get(
                "category"
            )

        # -------------------------------------------------
        # FALLBACK TO NORMAL CATEGORY
        # -------------------------------------------------

        if not reportCategory:

            reportCategory = report.get(
                "category"
            )

        # -------------------------------------------------
        # CATEGORY MATCH
        # -------------------------------------------------

        if (
            reportCategory
            and
            str(reportCategory).lower()
            ==
            str(category).lower()
        ):

            similarReports.append(
                report
            )

    print(
        "SIMILAR NEARBY REPORTS:",
        len(similarReports)
    )

    return {

        "similarReportCount":
            len(similarReports),

        "reports":
            similarReports
    }


# =========================================================
# FIND SOCIAL MEDIA EVIDENCE
# =========================================================

async def findSocialMediaEvidence(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5
):

    print("CHECKING SOCIAL MEDIA EVIDENCE")

    print("LATITUDE:", latitude)
    print("LONGITUDE:", longitude)
    print("CATEGORY:", category)
    print("RADIUS:", radiusKm)

    if not category:

        return {

            "matchingPostCount":
                0,

            "nearestDistanceKm":
                None,

            "posts":
                []
        }

    cursor = database.socialMediaPosts.find({

        "category": {

            "$regex":
                f"^{category}$",

            "$options":
                "i"
        }
    })

    matchingPosts = []

    nearestDistanceKm = None

    async for post in cursor:

        postLocation = post.get(
            "location",
            {}
        )

        postLatitude = postLocation.get(
            "latitude"
        )

        postLongitude = postLocation.get(
            "longitude"
        )

        if (
            postLatitude is None
            or
            postLongitude is None
        ):

            continue

        distanceKm = calculateDistanceKm(

            latitude,

            longitude,

            float(postLatitude),

            float(postLongitude)
        )

        if distanceKm <= radiusKm:

            post["id"] = str(
                post["_id"]
            )

            del post["_id"]

            post["distanceKm"] = round(
                distanceKm,
                2
            )

            matchingPosts.append(
                post
            )

            if (
                nearestDistanceKm is None
                or
                distanceKm < nearestDistanceKm
            ):

                nearestDistanceKm = distanceKm

    # -----------------------------------------------------
    # SORT POSTS BY DISTANCE
    # -----------------------------------------------------

    matchingPosts.sort(
        key=lambda post:
            post.get(
                "distanceKm",
                float("inf")
            )
    )

    print(
        "MATCHING SOCIAL MEDIA POSTS:",
        len(matchingPosts)
    )

    print(
        "NEAREST SOCIAL MEDIA POST:",
        nearestDistanceKm
    )

    return {

        "matchingPostCount":
            len(matchingPosts),

        "nearestDistanceKm":
            (
                round(
                    nearestDistanceKm,
                    2
                )
                if nearestDistanceKm is not None
                else None
            ),

        "posts":
            matchingPosts
    }


# =========================================================
# CALCULATE SOCIAL MEDIA SCORE
# =========================================================

def calculateSocialMediaScore(
    matchingPostCount: int
):

    if matchingPostCount >= 3:

        return 30

    if matchingPostCount == 2:

        return 20

    if matchingPostCount == 1:

        return 10

    return 0


# =========================================================
# CALCULATE NEARBY REPORT SCORE
# =========================================================

def calculateNearbyReportScore(
    similarReportCount: int
):

    if similarReportCount >= 3:

        return 30

    if similarReportCount == 2:

        return 20

    if similarReportCount == 1:

        return 10

    return 0


# =========================================================
# GET REPORT CATEGORY
# =========================================================

def getReportCategory(report: dict):

    category = None

    # -----------------------------------------------------
    # 1. ML CATEGORY
    # -----------------------------------------------------

    mlAnalysis = report.get(
        "mlAnalysis",
        {}
    )

    if mlAnalysis:

        category = mlAnalysis.get(
            "category"
        )

    # -----------------------------------------------------
    # 2. NORMAL CATEGORY
    # -----------------------------------------------------

    if not category:

        category = report.get(
            "category"
        )

    # -----------------------------------------------------
    # 3. AI ANALYSIS CATEGORY
    # -----------------------------------------------------

    if not category:

        aiAnalysis = report.get(
            "aiAnalysis",
            {}
        )

        if aiAnalysis:

            category = aiAnalysis.get(
                "category"
            )

    return category


# =========================================================
# CENTRAL VALIDATION ENGINE
# =========================================================

async def validateReport(
    reportId: str,
    governmentRadiusKm: float = 10,
    socialMediaRadiusKm: float = 5,
    nearbyReportRadiusKm: float = 5
):

    print("")
    print("==========================================")
    print("STARTING CENTRAL REPORT VALIDATION")
    print("REPORT ID:", reportId)
    print("==========================================")

    # =====================================================
    # VALIDATE OBJECT ID
    # =====================================================

    if not ObjectId.is_valid(reportId):

        return {

            "success":
                False,

            "message":
                "Invalid report ID"
        }

    # =====================================================
    # FIND REPORT
    # =====================================================

    report = await database.reports.find_one({

        "_id":
            ObjectId(reportId)
    })

    if report is None:

        return {

            "success":
                False,

            "message":
                "Report not found"
        }

    # =====================================================
    # GET LOCATION
    # =====================================================

    location = report.get(
        "location"
    )

    # -----------------------------------------------------
    # SUPPORT OLD REPORT FORMAT
    # -----------------------------------------------------

    if not isinstance(
        location,
        dict
    ):

        oldLatitude = report.get(
            "latitude"
        )

        oldLongitude = report.get(
            "longitude"
        )

        if (
            oldLatitude is not None
            and
            oldLongitude is not None
        ):

            location = {

                "latitude":
                    oldLatitude,

                "longitude":
                    oldLongitude
            }

        else:

            return {

                "success":
                    False,

                "message":
                    "Report location is missing"
            }

    latitude = location.get(
        "latitude"
    )

    longitude = location.get(
        "longitude"
    )

    if (
        latitude is None
        or
        longitude is None
    ):

        return {

            "success":
                False,

            "message":
                "Report location is missing"
        }

    latitude = float(
        latitude
    )

    longitude = float(
        longitude
    )

    # =====================================================
    # GET CATEGORY
    # =====================================================

    category = getReportCategory(
        report
    )

    if not category:

        return {

            "success":
                False,

            "message":
                "Report category is missing. ML classification is required before validation."
        }

    print(
        "CATEGORY:",
        category
    )

    # =====================================================
    # 1. GOVERNMENT VALIDATION
    # =====================================================

    print("")
    print("1. GOVERNMENT VALIDATION")

    governmentAlert = await findGovernmentAlert(

        latitude=latitude,

        longitude=longitude,

        category=category,

        radiusKm=governmentRadiusKm
    )

    # Government alert is OPTIONAL.
    # It contributes points only when available.

    governmentScore = 0

    if governmentAlert:

        governmentScore = 40

    # =====================================================
    # 2. SOCIAL MEDIA VALIDATION
    # =====================================================

    print("")
    print("2. SOCIAL MEDIA VALIDATION")

    socialMediaEvidence = await findSocialMediaEvidence(

        latitude=latitude,

        longitude=longitude,

        category=category,

        radiusKm=socialMediaRadiusKm
    )

    matchingPostCount = socialMediaEvidence[
        "matchingPostCount"
    ]

    nearestSocialMediaDistance = socialMediaEvidence[
        "nearestDistanceKm"
    ]

    socialMediaScore = calculateSocialMediaScore(

        matchingPostCount
    )

    # =====================================================
    # 3. NEARBY REPORT VALIDATION
    # =====================================================

    print("")
    print("3. NEARBY REPORT VALIDATION")

    nearbyEvidence = await findNearbyReportEvidence(

        latitude=latitude,

        longitude=longitude,

        category=category,

        radiusKm=nearbyReportRadiusKm,

        reportId=reportId
    )

    similarReportCount = nearbyEvidence[
        "similarReportCount"
    ]

    nearbyReportScore = calculateNearbyReportScore(

        similarReportCount
    )

    # =====================================================
    # TOTAL SCORE
    # =====================================================

    reliabilityScore = (

        governmentScore

        +

        socialMediaScore

        +

        nearbyReportScore
    )

    # =====================================================
    # VALIDATION STATUS
    # =====================================================

    if reliabilityScore >= 70:

        validationStatus = "Genuine"

    elif reliabilityScore >= 40:

        validationStatus = "Likely Genuine"

    elif reliabilityScore >= 20:

        validationStatus = "Under Review"

    else:

        validationStatus = "Insufficient Evidence"

    # =====================================================
    # VALIDATION SOURCES
    # =====================================================

    validationSources = []

    if governmentAlert:

        validationSources.append(
            "Government Alert"
        )

    if matchingPostCount > 0:

        validationSources.append(
            "Social Media"
        )

    if similarReportCount > 0:

        validationSources.append(
            "Nearby Reports"
        )

    # =====================================================
    # VALIDATION DOCUMENT
    # =====================================================

    validationData = {

        "status":
            validationStatus,

        "reliabilityScore":
            reliabilityScore,

        "sources":
            validationSources,

        "governmentAlert": {

            "found":
                governmentAlert is not None,

            "score":
                governmentScore,

            "data":
                governmentAlert
        },

        "socialMediaEvidence": {

            "found":
                matchingPostCount > 0,

            "matchingPostCount":
                matchingPostCount,

            "score":
                socialMediaScore,

            "nearestDistanceKm":
                nearestSocialMediaDistance,

            "posts":
                socialMediaEvidence[
                    "posts"
                ]
        },

        "nearbyReportEvidence": {

            "found":
                similarReportCount > 0,

            "similarReportCount":
                similarReportCount,

            "score":
                nearbyReportScore,

            "reports":
                nearbyEvidence[
                    "reports"
                ]
        },

        "imageSimilarity": {

            "score":
                None,

            "status":
                "Waiting for ML integration"
        },

        "validatedAt":
            datetime.utcnow()
    }

    # =====================================================
    # SAVE VALIDATION RESULT
    # =====================================================

    await database.reports.update_one(

        {
            "_id":
                ObjectId(reportId)
        },

        {
            "$set": {

                "validation":
                    validationData,

                "updatedAt":
                    datetime.utcnow()
            }
        }
    )

    # =====================================================
    # LOG RESULT
    # =====================================================

    print("")
    print("==========================================")
    print("VALIDATION COMPLETED")

    print(
        "RELIABILITY SCORE:",
        reliabilityScore
    )

    print(
        "STATUS:",
        validationStatus
    )

    print(
        "GOVERNMENT SCORE:",
        governmentScore
    )

    print(
        "SOCIAL MEDIA SCORE:",
        socialMediaScore
    )

    print(
        "NEARBY REPORT SCORE:",
        nearbyReportScore
    )

    print("==========================================")

    # =====================================================
    # RETURN RESULT
    # =====================================================

    return {

        "success":
            True,

        "reportId":
            reportId,

        "category":
            category,

        "reliabilityScore":
            reliabilityScore,

        "validationStatus":
            validationStatus,

        "validationSources":
            validationSources,

        "governmentAlert": {

            "found":
                governmentAlert is not None,

            "score":
                governmentScore,

            "alert":
                governmentAlert
        },

        "socialMediaEvidence": {

            "found":
                matchingPostCount > 0,

            "matchingPostCount":
                matchingPostCount,

            "score":
                socialMediaScore,

            "nearestDistanceKm":
                nearestSocialMediaDistance,

            "posts":
                socialMediaEvidence[
                    "posts"
                ]
        },

        "nearbyReportEvidence": {

            "found":
                similarReportCount > 0,

            "similarReportCount":
                similarReportCount,

            "score":
                nearbyReportScore,

            "reports":
                nearbyEvidence[
                    "reports"
                ]
        },

        "imageSimilarity": {

            "score":
                None,

            "status":
                "Waiting for ML integration"
        }
    }


# =========================================================
# CALCULATE INCIDENT / CLUSTER CONFIDENCE
# =========================================================

def calculateIncidentConfidence(
    reportScores: list
):

    """
    Calculate overall confidence for a group
    of validated reports from the same area.
    """

    # -----------------------------------------------------
    # NO REPORTS
    # -----------------------------------------------------

    if not reportScores:

        return {

            "reportCount":
                0,

            "averageScore":
                0,

            "highConfidenceReports":
                0,

            "mediumConfidenceReports":
                0,

            "lowConfidenceReports":
                0,

            "incidentStatus":
                "Insufficient Evidence"
        }

    # -----------------------------------------------------
    # REMOVE INVALID SCORES
    # -----------------------------------------------------

    validScores = []

    for score in reportScores:

        if score is None:

            continue

        try:

            score = float(
                score
            )

            # Keep between 0 and 100.

            score = max(
                0,
                min(100, score)
            )

            validScores.append(
                score
            )

        except (
            TypeError,
            ValueError
        ):

            continue

    # -----------------------------------------------------
    # NO VALID SCORES
    # -----------------------------------------------------

    if not validScores:

        return {

            "reportCount":
                0,

            "averageScore":
                0,

            "highConfidenceReports":
                0,

            "mediumConfidenceReports":
                0,

            "lowConfidenceReports":
                0,

            "incidentStatus":
                "Insufficient Evidence"
        }

    # -----------------------------------------------------
    # AVERAGE SCORE
    # -----------------------------------------------------

    averageScore = (

        sum(validScores)

        /

        len(validScores)
    )

    # -----------------------------------------------------
    # COUNT REPORTS
    # -----------------------------------------------------

    highConfidenceReports = 0

    mediumConfidenceReports = 0

    lowConfidenceReports = 0

    for score in validScores:

        if score >= 70:

            highConfidenceReports += 1

        elif score >= 40:

            mediumConfidenceReports += 1

        else:

            lowConfidenceReports += 1

    # -----------------------------------------------------
    # INCIDENT STATUS
    # -----------------------------------------------------

    if averageScore >= 70:

        incidentStatus = "Genuine"

    elif averageScore >= 50:

        incidentStatus = "Likely Genuine"

    elif averageScore >= 30:

        incidentStatus = "Under Review"

    else:

        incidentStatus = "Suspicious"

    # -----------------------------------------------------
    # RETURN RESULT
    # -----------------------------------------------------

    return {

        "reportCount":
            len(validScores),

        "averageScore":
            round(
                averageScore,
                2
            ),

        "highConfidenceReports":
            highConfidenceReports,

        "mediumConfidenceReports":
            mediumConfidenceReports,

        "lowConfidenceReports":
            lowConfidenceReports,

        "incidentStatus":
            incidentStatus
    }


# =========================================================
# GET INCIDENT CONFIDENCE FROM NEARBY VALIDATED REPORTS
# =========================================================

async def getIncidentConfidence(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5
):

    print("")
    print("==========================================")
    print("CALCULATING INCIDENT CONFIDENCE")
    print("==========================================")

    print(
        "LATITUDE:",
        latitude
    )

    print(
        "LONGITUDE:",
        longitude
    )

    print(
        "CATEGORY:",
        category
    )

    print(
        "RADIUS:",
        radiusKm
    )

    # =====================================================
    # VALIDATE CATEGORY
    # =====================================================

    if not category:

        return {

            "latitude":
                latitude,

            "longitude":
                longitude,

            "category":
                category,

            "radiusKm":
                radiusKm,

            "incidentConfidence":
                calculateIncidentConfidence([]),

            "validatedReports":
                []
        }

    # =====================================================
    # GET NEARBY REPORTS
    # =====================================================

    from app.reports.service import getNearbyReports

    nearbyReports = await getNearbyReports(

        latitude,

        longitude,

        radiusKm
    )

    # =====================================================
    # COLLECT VALIDATION SCORES
    # =====================================================

    reportScores = []

    validatedReports = []

    for report in nearbyReports:

        # -------------------------------------------------
        # GET CATEGORY
        # -------------------------------------------------

        reportCategory = getReportCategory(
            report
        )

        if not reportCategory:

            continue

        # -------------------------------------------------
        # SAME CATEGORY ONLY
        # -------------------------------------------------

        if (
            str(reportCategory).lower()
            !=
            str(category).lower()
        ):

            continue

        # -------------------------------------------------
        # GET VALIDATION
        # -------------------------------------------------

        validation = report.get(
            "validation",
            {}
        )

        if not validation:

            # IMPORTANT:
            # Reports without validation are NOT counted
            # in incident confidence.

            continue

        # -------------------------------------------------
        # GET RELIABILITY SCORE
        # -------------------------------------------------

        reliabilityScore = validation.get(
            "reliabilityScore"
        )

        if reliabilityScore is None:

            continue

        try:

            reliabilityScore = float(
                reliabilityScore
            )

        except (
            TypeError,
            ValueError
        ):

            continue

        # -------------------------------------------------
        # STORE SCORE
        # -------------------------------------------------

        reportScores.append(
            reliabilityScore
        )

        validatedReports.append({

            "id":
                report.get("id"),

            "title":
                report.get("title"),

            "reliabilityScore":
                reliabilityScore,

            "validationStatus":
                validation.get(
                    "status"
                )
        })

    # =====================================================
    # CALCULATE OVERALL CONFIDENCE
    # =====================================================

    incidentConfidence = calculateIncidentConfidence(

        reportScores
    )

    # =====================================================
    # FINAL RESULT
    # =====================================================

    result = {

        "latitude":
            latitude,

        "longitude":
            longitude,

        "category":
            category,

        "radiusKm":
            radiusKm,

        "incidentConfidence":
            incidentConfidence,

        "validatedReports":
            validatedReports
    }

    # =====================================================
    # LOG RESULT
    # =====================================================

    print("")
    print("INCIDENT CONFIDENCE:")
    print(
        incidentConfidence
    )

    print("")
    print("VALIDATED REPORT COUNT:")
    print(
        len(validatedReports)
    )

    print("==========================================")

    return result


# =========================================================
# SAVE INCIDENT CONFIDENCE
# =========================================================

async def saveIncidentConfidence(
    latitude: float,
    longitude: float,
    category: str,
    radiusKm: float = 5
):

    print("")
    print("==========================================")
    print("SAVING INCIDENT CONFIDENCE")
    print("==========================================")

    print("LATITUDE:", latitude)
    print("LONGITUDE:", longitude)
    print("CATEGORY:", category)
    print("RADIUS:", radiusKm)

    # =====================================================
    # CALCULATE INCIDENT CONFIDENCE
    # =====================================================

    incidentResult = await getIncidentConfidence(
        latitude=latitude,
        longitude=longitude,
        category=category,
        radiusKm=radiusKm
    )

    # =====================================================
    # SAFETY CHECK
    # =====================================================

    if incidentResult is None:
        return {
            "success": False,
            "message": "Incident confidence calculation returned no result."
        }

    incidentConfidence = incidentResult.get(
        "incidentConfidence"
    )

    if incidentConfidence is None:
        return {
            "success": False,
            "message": "Incident confidence data is missing."
        }

    validatedReports = incidentResult.get(
        "validatedReports",
        []
    )

    # =====================================================
    # FIND EXISTING INCIDENT
    #
    # An incident is identified by:
    #   1. Same category
    #   2. Location within radiusKm
    #
    # This prevents every validation request from creating
    # a new incident document for the same real-world event.
    # =====================================================

    existingIncident = None
    closestDistance = None

    cursor = database.incidents.find({
        "category": {
            "$regex": f"^{category}$",
            "$options": "i"
        }
    })

    async for incident in cursor:

        incidentLocation = incident.get(
            "location",
            {}
        )

        incidentLatitude = incidentLocation.get(
            "latitude"
        )

        incidentLongitude = incidentLocation.get(
            "longitude"
        )

        if (
            incidentLatitude is None
            or
            incidentLongitude is None
        ):
            continue

        distanceKm = calculateDistanceKm(
            latitude,
            longitude,
            float(incidentLatitude),
            float(incidentLongitude)
        )

        print(
            "EXISTING INCIDENT DISTANCE:",
            round(distanceKm, 2),
            "KM"
        )

        if distanceKm <= radiusKm:

            if (
                closestDistance is None
                or
                distanceKm < closestDistance
            ):
                closestDistance = distanceKm
                existingIncident = incident

    # =====================================================
    # UPDATE EXISTING INCIDENT
    # =====================================================

    if existingIncident:

        incidentId = str(
            existingIncident["_id"]
        )

        print(
            "EXISTING INCIDENT FOUND:",
            incidentId
        )

        updatedAt = datetime.utcnow()

        updateData = {

            "reportCount":
                incidentConfidence[
                    "reportCount"
                ],

            "averageScore":
                incidentConfidence[
                    "averageScore"
                ],

            "highConfidenceReports":
                incidentConfidence[
                    "highConfidenceReports"
                ],

            "mediumConfidenceReports":
                incidentConfidence[
                    "mediumConfidenceReports"
                ],

            "lowConfidenceReports":
                incidentConfidence[
                    "lowConfidenceReports"
                ],

            "incidentStatus":
                incidentConfidence[
                    "incidentStatus"
                ],

            "validatedReports":
                validatedReports,

            "updatedAt":
                updatedAt
        }

        await database.incidents.update_one(
            {
                "_id":
                    existingIncident["_id"]
            },
            {
                "$set":
                    updateData
            }
        )

        print(
            "INCIDENT UPDATED:",
            incidentId
        )

        print(
            "REPORT COUNT:",
            updateData["reportCount"]
        )

        print(
            "AVERAGE SCORE:",
            updateData["averageScore"]
        )

        print(
            "INCIDENT STATUS:",
            updateData["incidentStatus"]
        )

        return {

            "success":
                True,

            "action":
                "updated",

            "incidentId":
                incidentId,

            "category":
                category,

            "location":
                existingIncident.get(
                    "location"
                ),

            "radiusKm":
                radiusKm,

            "reportCount":
                updateData[
                    "reportCount"
                ],

            "averageScore":
                updateData[
                    "averageScore"
                ],

            "highConfidenceReports":
                updateData[
                    "highConfidenceReports"
                ],

            "mediumConfidenceReports":
                updateData[
                    "mediumConfidenceReports"
                ],

            "lowConfidenceReports":
                updateData[
                    "lowConfidenceReports"
                ],

            "incidentStatus":
                updateData[
                    "incidentStatus"
                ],

            "validatedReports":
                validatedReports,

            "updatedAt":
                updatedAt.isoformat()
        }

    # =====================================================
    # CREATE NEW INCIDENT
    # =====================================================

    print(
        "NO EXISTING INCIDENT FOUND"
    )

    now = datetime.utcnow()

    incidentDocument = {

        "category":
            category,

        "location": {

            "latitude":
                latitude,

            "longitude":
                longitude
        },

        "radiusKm":
            radiusKm,

        "reportCount":
            incidentConfidence[
                "reportCount"
            ],

        "averageScore":
            incidentConfidence[
                "averageScore"
            ],

        "highConfidenceReports":
            incidentConfidence[
                "highConfidenceReports"
            ],

        "mediumConfidenceReports":
            incidentConfidence[
                "mediumConfidenceReports"
            ],

        "lowConfidenceReports":
            incidentConfidence[
                "lowConfidenceReports"
            ],

        "incidentStatus":
            incidentConfidence[
                "incidentStatus"
            ],

        "validatedReports":
            validatedReports,

        "createdAt":
            now,

        "updatedAt":
            now
    }

    # -----------------------------------------------------
    # INSERT NEW INCIDENT
    # -----------------------------------------------------

    result = await database.incidents.insert_one(
        incidentDocument
    )

    incidentId = str(
        result.inserted_id
    )

    print(
        "NEW INCIDENT CREATED:",
        incidentId
    )

    print(
        "REPORT COUNT:",
        incidentDocument["reportCount"]
    )

    print(
        "AVERAGE SCORE:",
        incidentDocument["averageScore"]
    )

    print(
        "INCIDENT STATUS:",
        incidentDocument["incidentStatus"]
    )

    return {
        "success": True,
        "action": "created",
        "incidentId": incidentId,
        "category": category,
        "location": incidentDocument["location"],
        "radiusKm": radiusKm,
        "reportCount": incidentDocument["reportCount"],
        "averageScore": incidentDocument["averageScore"],
        "highConfidenceReports": incidentDocument["highConfidenceReports"],
        "mediumConfidenceReports": incidentDocument["mediumConfidenceReports"],
        "lowConfidenceReports": incidentDocument["lowConfidenceReports"],
        "incidentStatus": incidentDocument["incidentStatus"],
        "validatedReports": validatedReports,
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat()
    }


# -----------------------------------------------------
# SIMPLE LOCAL TEST
# =========================================================

if __name__ == "__main__":

    testScores = [
        90,
        90,
        80,
        75,
        70
    ]

    result = calculateIncidentConfidence(
        testScores
    )

    print("")
    print("LOCAL INCIDENT TEST")
    print(result)

# =========================================================
# REPORT HEATMAP DATA
# =========================================================

async def getReportHeatmapData(
    latitude: float,
    longitude: float,
    radiusKm: float = 5,
    category: str = None
):

    print("")
    print("==========================================")
    print("GETTING REPORT HEATMAP DATA")
    print("==========================================")

    print("LATITUDE:", latitude)
    print("LONGITUDE:", longitude)
    print("RADIUS:", radiusKm)
    print("CATEGORY:", category)

    from app.reports.service import getNearbyReports

    # -----------------------------------------------------
    # GET ALL REPORTS NEAR LOCATION
    # -----------------------------------------------------

    nearbyReports = await getNearbyReports(
        latitude,
        longitude,
        radiusKm
    )

    reports = []

    validatedReports = 0
    unvalidatedReports = 0

    # -----------------------------------------------------
    # PROCESS REPORTS
    # -----------------------------------------------------

    for report in nearbyReports:

        location = report.get(
            "location",
            {}
        )

        reportLatitude = location.get(
            "latitude"
        )

        reportLongitude = location.get(
            "longitude"
        )

        if (
            reportLatitude is None
            or
            reportLongitude is None
        ):
            continue

        # -------------------------------------------------
        # GET REPORT CATEGORY
        # -------------------------------------------------

        reportCategory = getReportCategory(
            report
        )

        # -------------------------------------------------
        # CATEGORY FILTER
        # -------------------------------------------------

        if category:

            if (
                not reportCategory
                or
                str(reportCategory).lower()
                !=
                str(category).lower()
            ):
                continue

        # -------------------------------------------------
        # VALIDATION
        # -------------------------------------------------

        validation = report.get(
            "validation",
            {}
        )

        reliabilityScore = None
        validationStatus = None
        validated = False

        if validation:

            reliabilityScore = validation.get(
                "reliabilityScore"
            )

            validationStatus = validation.get(
                "status"
            )

            # Pending reports are NOT validated
            if (
                reliabilityScore is not None
                and
                str(validationStatus).strip().lower()
                != "pending"
            ):

                validated = True
                validatedReports += 1

            else:

                unvalidatedReports += 1

        else:

            unvalidatedReports += 1

        # -------------------------------------------------
        # DISTANCE
        # -------------------------------------------------

        distanceKm = calculateDistanceKm(
            latitude,
            longitude,
            float(reportLatitude),
            float(reportLongitude)
        )

        # -------------------------------------------------
        # ADD REPORT
        # -------------------------------------------------

        reports.append({

            "id":
                str(report.get("id"))
                if report.get("id")
                else str(report.get("_id")),

            "title":
                report.get("title"),

            "category":
                reportCategory,

            "location": {

                "latitude":
                    float(reportLatitude),

                "longitude":
                    float(reportLongitude)
            },

            "distanceKm":
                round(
                    distanceKm,
                    2
                ),

            "validated":
                validated,

            "reliabilityScore":
                reliabilityScore,

            "validationStatus":
                validationStatus
        })

    # -----------------------------------------------------
    # SORT BY DISTANCE
    # -----------------------------------------------------

    reports.sort(
        key=lambda report:
            report.get(
                "distanceKm",
                float("inf")
            )
    )

    # -----------------------------------------------------
    # FINAL RESULT
    # -----------------------------------------------------

    result = {

        "latitude":
            latitude,

        "longitude":
            longitude,

        "radiusKm":
            radiusKm,

        "totalReports":
            len(reports),

        "validatedReports":
            validatedReports,

        "unvalidatedReports":
            unvalidatedReports,

        "reports":
            reports
    }

    print("")
    print("HEATMAP REPORT COUNT:")
    print(len(reports))

    print(
        "VALIDATED REPORTS:",
        validatedReports
    )

    print(
        "UNVALIDATED REPORTS:",
        unvalidatedReports
    )

    print("==========================================")

    return result

# =========================================================
# INCIDENT HEATMAP DATA
# =========================================================

async def getIncidentHeatmapData(
    latitude: float,
    longitude: float,
    radiusKm: float = 5,
    category: str = None
):

    print("")
    print("==========================================")
    print("GETTING INCIDENT HEATMAP DATA")
    print("==========================================")

    print("LATITUDE:", latitude)
    print("LONGITUDE:", longitude)
    print("RADIUS:", radiusKm)
    print("CATEGORY:", category)

    from app.reports.service import getNearbyReports

    # -----------------------------------------------------
    # GET NEARBY REPORTS
    # -----------------------------------------------------

    nearbyReports = await getNearbyReports(
        latitude,
        longitude,
        radiusKm
    )

    reports = []

    validatedReports = 0
    unvalidatedReports = 0

    # -----------------------------------------------------
    # PROCESS REPORTS
    # -----------------------------------------------------

    for report in nearbyReports:

        # -------------------------------------------------
        # GET REPORT CATEGORY
        # -------------------------------------------------

        reportCategory = getReportCategory(
            report
        )

        # -------------------------------------------------
        # CATEGORY FILTER
        # -------------------------------------------------

        if category:

            if not reportCategory:
                continue

            if (
                str(reportCategory).lower()
                !=
                str(category).lower()
            ):
                continue

        # -------------------------------------------------
        # LOCATION
        # -------------------------------------------------

        location = report.get(
            "location",
            {}
        )

        reportLatitude = location.get(
            "latitude"
        )

        reportLongitude = location.get(
            "longitude"
        )

        if (
            reportLatitude is None
            or
            reportLongitude is None
        ):
            continue

        # -------------------------------------------------
        # VALIDATION
        # -------------------------------------------------

        validation = report.get(
            "validation",
            {}
        )

        reliabilityScore = None
        validationStatus = None
        validated = False

        if validation:

            reliabilityScore = validation.get(
                "reliabilityScore"
            )

            validationStatus = validation.get(
                "status"
            )

            # IMPORTANT:
            # Pending reports are NOT validated.
            #
            # A score of 0 with status Pending
            # must not be included in incident confidence.

            if (
                reliabilityScore is not None
                and
                str(validationStatus).strip().lower()
                != "pending"
            ):

                validated = True

                validatedReports += 1

            else:

                unvalidatedReports += 1

        else:

            unvalidatedReports += 1

        # -------------------------------------------------
        # DISTANCE
        # -------------------------------------------------

        distanceKm = calculateDistanceKm(

            latitude,

            longitude,

            float(reportLatitude),

            float(reportLongitude)
        )

        # -------------------------------------------------
        # REPORT ID
        # -------------------------------------------------

        reportId = report.get(
            "id"
        )

        if not reportId:

            reportId = report.get(
                "_id"
            )

        # -------------------------------------------------
        # ADD REPORT
        # -------------------------------------------------

        reports.append({

            "id":
                str(reportId)
                if reportId
                else None,

            "title":
                report.get("title"),

            "category":
                reportCategory,

            "location": {

                "latitude":
                    float(reportLatitude),

                "longitude":
                    float(reportLongitude)
            },

            "distanceKm":
                round(
                    distanceKm,
                    2
                ),

            "validated":
                validated,

            "reliabilityScore":
                reliabilityScore,

            "validationStatus":
                validationStatus
        })

    # -----------------------------------------------------
    # SORT BY DISTANCE
    # -----------------------------------------------------

    reports.sort(

        key=lambda report:
            report.get(
                "distanceKm",
                float("inf")
            )
    )

    # -----------------------------------------------------
    # CALCULATE INCIDENT CONFIDENCE
    # -----------------------------------------------------

    reportScores = []

    for report in reports:

        # ONLY genuinely validated reports
        # contribute to incident confidence.

        if (
            report["validated"]
            and
            report["reliabilityScore"] is not None
        ):

            reportScores.append(
                report["reliabilityScore"]
            )

    incidentConfidence = calculateIncidentConfidence(
        reportScores
    )

    # -----------------------------------------------------
    # FINAL RESPONSE
    # -----------------------------------------------------

    result = {

        "latitude":
            latitude,

        "longitude":
            longitude,

        "radiusKm":
            radiusKm,

        "category":
            category,

        "totalReports":
            len(reports),

        "validatedReports":
            validatedReports,

        "unvalidatedReports":
            unvalidatedReports,

        "incident":
            incidentConfidence,

        "reports":
            reports
    }

    print("")
    print("==========================================")
    print("INCIDENT HEATMAP RESULT")
    print("==========================================")

    print(
        "TOTAL REPORTS:",
        len(reports)
    )

    print(
        "VALIDATED REPORTS:",
        validatedReports
    )

    print(
        "UNVALIDATED REPORTS:",
        unvalidatedReports
    )

    print(
        "AVERAGE SCORE:",
        incidentConfidence[
            "averageScore"
        ]
    )

    print(
        "INCIDENT STATUS:",
        incidentConfidence[
            "incidentStatus"
        ]
    )

    print("==========================================")

    return result