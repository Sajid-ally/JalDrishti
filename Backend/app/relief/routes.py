from datetime import datetime
from typing import Optional, List, Union
from fastapi import APIRouter, Form, HTTPException, Request, Body

from app.relief.schemas import ReliefAssignment, ReliefStatusUpdate, ReliefRequestCreate
from app.relief.service import (
    createReliefRequest,
    getReliefRequests,
    getReliefRequestById,
    assignReliefRequest,
    updateReliefStatus,
    deleteReliefRequest,
)


router = APIRouter(
    prefix="/relief",
    tags=["Relief Assistance"],
)


# =========================================================
# CREATE RELIEF REQUEST
# Citizen
# =========================================================

@router.post("/")
async def addReliefRequest(request: Request):
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        disasterType = body.get("disasterType") or body.get("title") or "Water Hazard"
        description = body.get("description", "")
        loc = body.get("location", {})
        latitude = float(loc.get("latitude") or body.get("latitude", 20.2961))
        longitude = float(loc.get("longitude") or body.get("longitude", 85.8245))
        locationName = body.get("locationName") or loc.get("address") or loc.get("landmark")
        peopleAffected = int(body.get("peopleAffected", 1))
        assistanceRequired = body.get("assistanceRequired", ["Rescue", "Evacuation"])
        urgency = body.get("urgency", "High")
    else:
        form = await request.form()
        disasterType = form.get("disasterType") or "Water Hazard"
        description = form.get("description", "")
        latitude = float(form.get("latitude", 20.2961))
        longitude = float(form.get("longitude", 85.8245))
        locationName = form.get("locationName")
        peopleAffected = int(form.get("peopleAffected", 1))
        assistanceRequired = form.getlist("assistanceRequired") or ["Rescue", "Evacuation"]
        urgency = form.get("urgency", "High")

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
        "success": True,
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
        "success": True,
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
        raise HTTPException(
            status_code=404,
            detail="Relief request not found",
        )
    return {
        "success": True,
        "request": request,
    }


# =========================================================
# ASSIGN RESCUE TEAM
# Government
# =========================================================

@router.patch("/{requestId}/assign")
async def assignRescueTeam(requestId: str, request: Request):
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        organization = body.get("organization", "Emergency Response Force")
        teamName = body.get("teamName", "Rescue Team Alpha")
        resources = body.get("resources", ["Rescue Boat", "Medical Kit"])
        governmentNote = body.get("governmentNote")
    else:
        form = await request.form()
        organization = form.get("organization", "Emergency Response Force")
        teamName = form.get("teamName", "Rescue Team Alpha")
        resources = form.getlist("resources") or ["Rescue Boat", "Medical Kit"]
        governmentNote = form.get("governmentNote")

    assignmentData = {
        "organization": organization,
        "teamName": teamName,
        "resources": resources,
        "governmentNote": governmentNote,
    }

    updatedRequest = await assignReliefRequest(
        requestId,
        assignmentData,
    )

    if updatedRequest is None:
        raise HTTPException(
            status_code=404,
            detail="Relief request not found",
        )

    return {
        "success": True,
        "message": f"Rescue team '{teamName}' assigned successfully",
        "request": updatedRequest,
    }


# =========================================================
# UPDATE STATUS
# Government
# =========================================================

@router.patch("/{requestId}/status")
async def changeReliefStatus(requestId: str, request: Request):
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        status = body.get("status", "Assigned")
        governmentNote = body.get("governmentNote")
    else:
        form = await request.form()
        status = form.get("status", "Assigned")
        governmentNote = form.get("governmentNote")

    status_clean = status.strip().title()
    allowed = [
        "Pending",
        "Assigned",
        "In Progress",
        "Completed",
        "Resolved",
        "Rejected",
    ]

    if status_clean not in allowed:
        status_clean = "Assigned"

    updated = await updateReliefStatus(
        requestId,
        status_clean,
        governmentNote,
    )

    if updated is None:
        raise HTTPException(
            status_code=404,
            detail="Relief request not found",
        )

    return {
        "success": True,
        "message": f"Request marked as {status_clean}",
        "request": updated,
    }


# =========================================================
# DELETE / REMOVE RELIEF REQUEST
# =========================================================

@router.delete("/{requestId}")
async def removeReliefRequest(requestId: str):
    success = await deleteReliefRequest(requestId)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Relief request not found or delete failed",
        )
    return {
        "success": True,
        "message": "Relief request removed and deleted from database successfully",
        "requestId": requestId,
    }