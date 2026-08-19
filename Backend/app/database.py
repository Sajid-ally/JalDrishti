import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

mongo_uri = getattr(settings, "MONGO_URI", None) or os.getenv("MONGO_URI") or "mongodb://localhost:27017"
database_name = getattr(settings, "DATABASE_NAME", None) or os.getenv("DATABASE_NAME") or "coastal_eye"

if mongo_uri.startswith("mongodb+srv://") or "mongodb.net" in mongo_uri:
    client = AsyncIOMotorClient(
        mongo_uri,
        tlsCAFile=certifi.where()
    )
else:
    client = AsyncIOMotorClient(mongo_uri)

database = client[database_name]

