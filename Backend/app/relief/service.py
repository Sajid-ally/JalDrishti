from datetime import datetime

from bson import ObjectId

from app.database import database


# =========================================================
# CREATE RELIEF REQUEST
# =========================================================

async def createReliefRequest(reliefData: dict):

    locationData = reliefData["location"]

    reliefDocument = {

        "title": reliefData["title"],

        "description": reliefData["description"],

        "location": {
            "latitude": locationData["latitude"],
            "longitude": locationData["longitude"],
            "address": locationData.get("address"),
            "landmark": locationData.get("landmark")
        },

        "peopleAffected": reliefData["peopleAffected"],

        "assistanceRequired": reliefData["assistanceRequired"],

        "urgency": reliefData["urgency"],

        "username": reliefData.get("username"),

        "status": "Pending",

        "createdAt": datetime.utcnow(),

        "updatedAt": datetime.utcnow()
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

        request["id"] = str(request["_id"])

        del request["_id"]

        requests.append(request)

    return requests


# =========================================================
# GET SINGLE RELIEF REQUEST
# =========================================================

async def getReliefRequestById(requestId: str):

    if not ObjectId.is_valid(requestId):
        return None

    request = await database.reliefRequests.find_one(
        {
            "_id": ObjectId(requestId)
        }
    )

    if request is None:
        return None

    request["id"] = str(request["_id"])

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

    updatedRequest = await database.reliefRequests.find_one(
        {
            "_id": ObjectId(requestId)
        }
    )

    updatedRequest["id"] = str(
        updatedRequest["_id"]
    )

    del updatedRequest["_id"]

    return updatedRequest