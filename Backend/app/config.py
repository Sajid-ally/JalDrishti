import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "coastal_eye"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-flash-lite-latest"
    SECRET_KEY: str = "jaldrishti_super_secret_jwt_key_2026"
    ML_SERVICE_URL: str = "http://localhost:8001"
    ML_CONFIDENCE_THRESHOLD: float = 0.70
    FRONTEND_URL: str = "http://localhost:5173"
    NEARBY_REPORT_RADIUS_KM: float = 5.0
    DUPLICATE_RADIUS_METERS: float = 150.0
    DUPLICATE_TIME_WINDOW_HOURS: int = 48
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()