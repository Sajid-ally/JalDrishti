from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.location.routes import router as locationRouter
from app.reports.routes import router as reportRouter
from app.gemini.service import analyzeImage
from app.utils.fileHandler import saveImage
from app.relief.routes import router as reliefRouter
from app.missingPerson.routes import router as missingPersonRouter
from app.validation.routes import router as validationRouter
from app.socialMedia.routes import router as socialMediaRouter
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.notifications.routes import router as notificationRouter
from app.social_reports.routes import router as socialReportsRouter

app = FastAPI(
    title="OceanShield Backend",
    version="1.0.0"
)

# =====================================================
# SERVE UPLOADED FILES
# =====================================================

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOADS_DIR = BASE_DIR / "uploads"

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOADS_DIR),
    name="uploads"
)

app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)

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

app.include_router(reportRouter)
app.include_router(locationRouter)
app.include_router(reliefRouter)
app.include_router(missingPersonRouter)
app.include_router(validationRouter)
app.include_router(socialMediaRouter)
app.include_router(notificationRouter)
app.include_router(socialReportsRouter)


@app.get("/")
async def home():
    return {
        "message": "OceanShield Backend Running Successfully"
    }


@app.post("/test-gemini")
async def testGemini(
    image: UploadFile = File(...)
):
    print("STEP 1")

    imagePath = saveImage(image, "uploads/test")

    print("STEP 2")
    print(imagePath)

    result = await analyzeImage(imagePath)

    print("STEP 3")
    print(result)

    return result