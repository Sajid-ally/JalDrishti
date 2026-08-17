from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.location.routes import router as locationRouter
from app.reports.routes import router as reportRouter
from app.relief.routes import router as reliefRouter
from app.missingPerson.routes import router as missingPersonRouter
from app.validation.routes import router as validationRouter

from app.gemini.service import analyzeImage
from app.utils.fileHandler import saveImage

from app.socialMedia.routes import router as socialMediaRouter
from app.notifications.routes import router as notificationRouter
from app.social_reports.routes import router as socialReportsRouter


app = FastAPI(
    title="CoastalEye Backend",
    version="1.0.0"
)


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# SERVE UPLOADED FILES
# =====================================================

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOADS_DIR),
    name="uploads"
)


# =====================================================
# ROUTERS
# =====================================================

app.include_router(reportRouter)
app.include_router(locationRouter)
app.include_router(reliefRouter)
app.include_router(missingPersonRouter)
app.include_router(validationRouter)

# Integration features
app.include_router(socialMediaRouter)
app.include_router(notificationRouter)
app.include_router(socialReportsRouter)


# =====================================================
# HEALTH / HOME
# =====================================================

@app.get("/")
async def home():
    return {
        "message": "CoastalEye Backend Running Successfully"
    }


@app.get("/health")
async def health():
    return {
        "status": "ok"
    }