from fastapi import APIRouter

from app.relief.schemas import (
    ReliefRequestCreate,
    ReliefAssignment
)

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
    reliefData: ReliefRequestCreate
):

    requestId = await createReliefRequest(
        reliefData.model_dump()
    )

    return {
        "success": True,
        "message": "Relief request submitted successfully",
        "requestId": str(requestId),
        "status": "Pending"
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
        "requests": requests
    }


# =========================================================
# GET SINGLE RELIEF REQUEST
# =========================================================

@router.get("/{requestId}")
async def fetchReliefRequest(
    requestId: str
):

    request = await getReliefRequestById(
        requestId
    )

    if request is None:
        return {
            "success": False,
            "message": "Relief request not found"
        }

    return {
        "success": True,
        "request": request
    }


# =========================================================
# ASSIGN RESCUE TEAM
# GOVERNMENT PORTAL
# =========================================================

@router.patch("/{requestId}/assign")
async def assignRescueTeam(
    requestId: str,
    assignmentData: ReliefAssignment
):

    updatedRequest = await assignReliefRequest(
        requestId,
        assignmentData.model_dump()
    )

    if updatedRequest is None:
        return {
            "success": False,
            "message": "Relief request not found"
        }

    return {
        "success": True,
        "message": "Rescue team assigned successfully",
        "request": updatedRequest
    }