from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

# Create MongoDB client
client = AsyncIOMotorClient(settings.MONGO_URI)

# Select database
database = client[settings.DATABASE_NAME]