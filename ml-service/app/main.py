from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import reports, detect

app = FastAPI(title="CoastalEye ML Service")

app.add_middleware(
CORSMiddleware,
allow_origins=["*"],
allow_methods=["*"],
allow_headers=["*"],
)

app.include_router(detect.router)
app.include_router(reports.router)

@app.get("/health")
def health():
 return {"status": "ok"}
 