from datetime import datetime

from fastapi import APIRouter

from app.relief.service import (
    createReliefRequest,
    getReliefRequests,
    getReliefRequestById,
    assignReliefRequest
)


router = APIRouter(
    prefix="/relief",
    tags=["Relief Assistance"]
)


# =========================================================
# CREATE RELIEF REQUEST
# =========================================================

@router.post("/")
async def addReliefRequest(

    title: str,

    description: str,

    latitude: float,

    longitude: float,

    peopleAffected: int,

    assistanceRequired: list[str],

    urgency: str

):

    print("CREATING RELIEF REQUEST")

    reliefData = {

        "title": title,

        "description": description,

        "location": {
            "latitude": latitude,
            "longitude": longitude
        },

        "peopleAffected": peopleAffected,

        "assistanceRequired": assistanceRequired,

        "urgency": urgency,

        "createdAt": datetime.utcnow(),

        "updatedAt": datetime.utcnow()
    }

    requestId = await createReliefRequest(
        reliefData
    )

    print(
        "RELIEF REQUEST CREATED:",
        requestId
    )

    return {

        "message": "Relief request submitted successfully",

        "requestId": str(requestId),

        "status": "Pending"
    }


# =========================================================
# GET ALL RELIEF REQUESTS
# =========================================================

@router.get("/")
async def fetchReliefRequests():

    print("FETCHING RELIEF REQUESTS")

    requests = await getReliefRequests()

    return {

        "count": len(requests),

        "requests": requests
    }


# =========================================================
# GET SINGLE RELIEF REQUEST
# =========================================================

@router.get("/{requestId}")
async def fetchReliefRequest(
    requestId: str
):

    print(
        "FETCHING RELIEF REQUEST:",
        requestId
    )

    request = await getReliefRequestById(
        requestId
    )

    if request is None:

        return {
            "message": "Relief request not found"
        }

    return request

# =========================================================
# ASSIGN RESCUE TEAM
# GOVERNMENT PORTAL
# =========================================================

@router.patch("/{requestId}/assign")
async def assignRescueTeam(

    requestId: str,

    organization: str,

    teamName: str,

    resources: list[str],

    governmentNote: str = None

):

    print(
        "ASSIGNING RESCUE TEAM:",
        requestId
    )

    assignmentData = {

        "organization": organization,

        "teamName": teamName,

        "resources": resources,

        "governmentNote": governmentNote
    }

    updatedRequest = await assignReliefRequest(

        requestId,

        assignmentData
    )

    if updatedRequest is None:

        return {
            "message": "Relief request not found"
        }

    return {

        "message": "Rescue team assigned successfully",

        "request": updatedRequest
    }