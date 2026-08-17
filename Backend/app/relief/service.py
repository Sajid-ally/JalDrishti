from app.database import database
from bson import ObjectId
from datetime import datetime


# =========================================================
# CREATE RELIEF REQUEST
# =========================================================

async def createReliefRequest(reliefData: dict):

    locationData = reliefData["location"]

    reliefDocument = {

        "disasterType": reliefData.get(
            "disasterType"
        ),

        "title": reliefData.get(
            "title",
            f"{reliefData.get('disasterType', 'General')} Rescue Request"
        ),

        "description": reliefData["description"],

        "location": {
            "latitude": locationData["latitude"],
            "longitude": locationData["longitude"],
            "address": locationData.get("address"),
            "landmark": locationData.get("landmark")
        },

        "locationName": reliefData.get(
            "locationName"
        ),

        "peopleAffected": reliefData["peopleAffected"],

        "assistanceRequired": reliefData["assistanceRequired"],

        "urgency": reliefData["urgency"],

        "username": reliefData.get(
            "username"
        ),

        "status": "Pending",

        "assignedTeam": None,

        "governmentNote": None,

        "createdAt": reliefData.get(
            "createdAt",
            datetime.utcnow()
        ),

        "updatedAt": reliefData.get(
            "updatedAt",
            datetime.utcnow()
        )
    }

    result = await database.reliefRequests.insert_one(
        reliefDocument
    )

    return result.inserted_id


# =========================================================
# GET ALL RELIEF REQUESTS
# =========================================================

async def getReliefRequests():

    cursor = database.reliefRequests.find().sort(
        "createdAt",
        -1
    )

    requests = []

    async for request in cursor:

        request["id"] = str(
            request["_id"]
        )

        del request["_id"]

        requests.append(
            request
        )

    return requests


# =========================================================
# GET SINGLE RELIEF REQUEST
# =========================================================

async def getReliefRequestById(
    requestId: str
):

    if not ObjectId.is_valid(requestId):
        return None

    request = await database.reliefRequests.find_one(
        {
            "_id": ObjectId(requestId)
        }
    )

    if request is None:
        return None

    request["id"] = str(
        request["_id"]
    )

    del request["_id"]

    return request


# =========================================================
# ASSIGN RESCUE TEAM
# GOVERNMENT PORTAL
# =========================================================

async def assignReliefRequest(
    requestId: str,
    assignmentData: dict
):

    if not ObjectId.is_valid(requestId):
        return None

    request = await database.reliefRequests.find_one(
        {
            "_id": ObjectId(requestId)
        }
    )

    if request is None:
        return None

    updateData = {

        "status": "Assigned",

        "assignedTeam": {
            "organization": assignmentData["organization"],
            "teamName": assignmentData["teamName"],
            "resources": assignmentData["resources"]
        },

        "governmentNote": assignmentData.get(
            "governmentNote"
        ),

        "assignedAt": datetime.utcnow(),

        "updatedAt": datetime.utcnow()
    }

    await database.reliefRequests.update_one(
        {
            "_id": ObjectId(requestId)
        },
        {
            "$set": updateData
        }
    )

    return await getReliefRequestById(
        requestId
    )


# =========================================================
# UPDATE STATUS
# GOVERNMENT
# =========================================================

async def updateReliefStatus(
    requestId: str,
    status: str,
    governmentNote: str = None
):

    if not ObjectId.is_valid(requestId):
        return None

    result = await database.reliefRequests.update_one(
        {
            "_id": ObjectId(requestId)
        },
        {
            "$set": {
                "status": status,
                "governmentNote": governmentNote,
                "updatedAt": datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:
        return None

    return await getReliefRequestById(
        requestId
    )