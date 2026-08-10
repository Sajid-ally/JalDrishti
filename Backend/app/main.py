from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Existing backend routes
from app.location.routes import router as locationRouter
from app.reports.routes import router as reportRouter
from app.relief.routes import router as reliefRouter
from app.missingPerson.routes import router as missingPersonRouter
from app.validation.routes import router as validationRouter
#from app.socialMedia.routes import router as socialMediaRouter

# ML / Gemini
from app.gemini.service import analyzeImage
from app.utils.fileHandler import saveImage

app = FastAPI(
    title="OceanShield Backend",
    version="1.0.0"
)

# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
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
# REGISTER ROUTES
# =====================================================

app.include_router(reportRouter)
app.include_router(locationRouter)
app.include_router(reliefRouter)
app.include_router(missingPersonRouter)
app.include_router(validationRouter)
#app.include_router(socialMediaRouter)

# =====================================================
# ROOT
# =====================================================

@app.get("/")
async def home():
    return {
        "message": "OceanShield Backend Running Successfully"
    }

# =====================================================
# GEMINI / ML TEST ENDPOINT
# =====================================================

@app.post("/test-gemini")
async def testGemini(image: UploadFile = File(...)):
    print("STEP 1")

    imagePath = saveImage(image, "uploads/test")

    print("STEP 2")
    print(imagePath)

    result = await analyzeImage(imagePath)

    print("STEP 3")
    print(result)

    return result