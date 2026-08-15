from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.location.routes import router as locationRouter
from app.reports.routes import router as reportRouter
from app.relief.routes import router as reliefRouter
from app.missingPerson.routes import router as missingPersonRouter
from app.validation.routes import router as validationRouter

app = FastAPI(
title="CoastalEye Backend",
version="1.0.0"
)

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

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
"/uploads",
StaticFiles(directory=UPLOADS_DIR),
name="uploads"
)

app.include_router(reportRouter)
app.include_router(locationRouter)
app.include_router(reliefRouter)
app.include_router(missingPersonRouter)
app.include_router(validationRouter)

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
