from datetime import datetime
from fastapi import APIRouter, Form, HTTPException

from app.relief.service import (
createReliefRequest,
getReliefRequests,
getReliefRequestById,
assignReliefRequest,
updateReliefStatus,
)

router = APIRouter(
prefix="/relief",
tags=["Relief Assistance"],
)

# =========================================================

# CREATE RELIEF REQUEST (Citizen)

# =========================================================

@router.post("/")
async def addReliefRequest(
disasterType: str = Form(...),
description: str = Form(...),
latitude: float = Form(...),
longitude: float = Form(...),
locationName: str = Form(None),
peopleAffected: int = Form(...),
assistanceRequired: list[str] = Form(...),
urgency: str = Form(...),
):
    reliefData = {
        "disasterType": disasterType,
        "description": description,
        "location": {
            "latitude": latitude,
            "longitude": longitude,
        },
        "locationName": locationName,
        "peopleAffected": peopleAffected,
        "assistanceRequired": assistanceRequired,
        "urgency": urgency,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }

    requestId = await createReliefRequest(reliefData)

    return {
        "message": "Relief request submitted successfully",
        "requestId": str(requestId),
        "status": "Pending",
    }


# =========================================================

# GET ALL RELIEF REQUESTS

# =========================================================

@router.get("/")
async def fetchReliefRequests():
  requests = await getReliefRequests()


  return {
    "count": len(requests),
    "requests": requests,
}


# =========================================================

# GET SINGLE RELIEF REQUEST

# =========================================================

@router.get("/{requestId}")
async def fetchReliefRequest(requestId: str):
 request = await getReliefRequestById(requestId)


 if request is None:
    raise HTTPException(status_code=404, detail="Relief request not found")

 return request


# =========================================================

# ASSIGN RESCUE TEAM (Government)

# =========================================================

@router.patch("/{requestId}/assign")
async def assignRescueTeam(
requestId: str,
organization: str = Form(...),
teamName: str = Form(...),
resources: list[str] = Form(...),
governmentNote: str = Form(None),
):
 assignmentData = {
"organization": organization,
"teamName": teamName,
"resources": resources,
"governmentNote": governmentNote,
}


 updatedRequest = await assignReliefRequest(requestId, assignmentData)

 if updatedRequest is None:
    raise HTTPException(status_code=404, detail="Relief request not found")

 return {
    "message": "Rescue team assigned successfully",
    "request": updatedRequest,
}


# =========================================================

# UPDATE STATUS (Government)

# =========================================================

@router.patch("/{requestId}/status")
async def changeReliefStatus(
requestId: str,
status: str = Form(...),
governmentNote: str = Form(None),
):
 allowed = ["Pending", "Assigned", "Completed", "Rejected"]


 if status not in allowed:
    raise HTTPException(
        status_code=400,
        detail=f"Status must be one of {allowed}",
    )

 updated = await updateReliefStatus(requestId, status, governmentNote)

 if updated is None:
    raise HTTPException(status_code=404, detail="Relief request not found")

 return {
    "message": f"Request marked as {status}",
    "request": updated,
}

