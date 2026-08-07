from fastapi import APIRouter, UploadFile, File
from app.routers.detect import detect_hazard

router = APIRouter()

@router.post("/reports")
async def submit_report(file: UploadFile = File(...)):
    ai_result = await detect_hazard(file)
    # TODO: save report + ai_result to DB
    return {"message": "Report received", "aiResult": ai_result}