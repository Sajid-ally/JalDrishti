from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.auth.service import ensure_demo_users
from app.auth.routes import router as authRouter
from app.location.routes import router as locationRouter
from app.reports.routes import router as reportRouter
from app.relief.routes import router as reliefRouter
from app.validation.routes import router as validationRouter
from app.socialMedia.routes import router as socialMediaRouter
from app.notifications.routes import router as notificationRouter
from app.social_reports.routes import router as socialReportsRouter

app = FastAPI(
    title="JalDrishti Backend",
    description="Real-time water hazard detection, reporting, and disaster response platform",
    version="1.0.0",
)

@app.on_event("startup")
async def on_startup():
    await ensure_demo_users()

# =====================================================
# CORS
# =====================================================

cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in cors_origins:
    cors_origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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
    name="uploads",
)

# =====================================================
# ROUTERS
# =====================================================

# Authentication
app.include_router(authRouter)
app.include_router(authRouter, prefix="/api")

# Reports
app.include_router(reportRouter)
app.include_router(reportRouter, prefix="/api")

# Location & Geocoding
app.include_router(locationRouter)
app.include_router(locationRouter, prefix="/api")

# Relief & SOS
app.include_router(reliefRouter)
app.include_router(reliefRouter, prefix="/api")

# Validation & Community
app.include_router(validationRouter)
app.include_router(socialMediaRouter)
app.include_router(notificationRouter)
app.include_router(socialReportsRouter)

# =====================================================
# HEALTH / HOME
# =====================================================

@app.get("/")
async def home():
    return {
        "message": "JalDrishti Backend Running Successfully",
        "service": "JalDrishti API",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "jaldrishti-backend",
    }