from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import reports, detect

app = FastAPI(title="Coastal Eye API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict this later
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detect.router, prefix="/api")
app.include_router(reports.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}