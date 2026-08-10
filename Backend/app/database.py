#from motor.motor_asyncio import AsyncIOMotorClient
#from app.config import settings

# Create MongoDB client
#client = AsyncIOMotorClient(settings.MONGO_URI)

# Select database
#database = client[settings.DATABASE_NAME]

import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "coastal_eye")

client = AsyncIOMotorClient(
    MONGO_URI,
    tls=True,
    tlsCAFile=certifi.where()
)

database = client[DATABASE_NAME]
