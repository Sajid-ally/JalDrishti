from fastapi import APIRouter, Query

from app.social_reports.service import (
    createSocialReport,
    getSocialReports,
    getSocialReport,
    reviewSocialReport,
    convertSocialReport
)

from app.social_reports.schemas import (
    SocialReportCreate,
    SocialReportReview
)


router = APIRouter(
    prefix="/social-reports",
    tags=["Social Media Reports"]
)


# =========================================================
# CREATE SOCIAL MEDIA CANDIDATE
# =========================================================

@router.post("")
@router.post("/")
async def create(
    data: SocialReportCreate
):

    return await createSocialReport(
        data
    )


# =========================================================
# GET SOCIAL MEDIA REPORTS
# =========================================================

@router.get("")
@router.get("/")
async def getAll(

    status: str = Query(
        None,
        description="pending_verification / approved / rejected"
    ),

    platform: str = Query(
        None
    )
):

    return await getSocialReports(

        status=status,

        platform=platform
    )


# =========================================================
# GET SINGLE SOCIAL MEDIA REPORT
# =========================================================

@router.get("/{socialReportId}")
async def getOne(
    socialReportId: str
):

    return await getSocialReport(
        socialReportId
    )


# =========================================================
# VERIFY / REJECT
# =========================================================

@router.put("/{socialReportId}/review")
async def review(

    socialReportId: str,

    data: SocialReportReview
):

    return await reviewSocialReport(

        socialReportId=socialReportId,

        status=data.status.value,

        reviewedBy=data.reviewedBy,

        rejectionReason=data.rejectionReason
    )


# =========================================================
# CONVERT APPROVED SOCIAL REPORT
# =========================================================

@router.post("/{socialReportId}/convert")
async def convert(
    socialReportId: str
):

    return await convertSocialReport(
        socialReportId
    )