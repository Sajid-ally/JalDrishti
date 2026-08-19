# Backend/reset_db.py
"""
JalDrishti Database Reset & Clean Seeder
Wipes old test data and seeds clean demo accounts and initial verified reports.
"""

import asyncio
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.auth.service import get_password_hash

async def reset_database():
    mongo_uri = getattr(settings, "MONGO_URI", None) or os.getenv("MONGO_URI") or "mongodb://localhost:27017"
    database_name = getattr(settings, "DATABASE_NAME", None) or os.getenv("DATABASE_NAME") or "coastal_eye"

    print(f"Connecting to MongoDB Atlas ({database_name})...")
    if mongo_uri.startswith("mongodb+srv://") or "mongodb.net" in mongo_uri:
        client = AsyncIOMotorClient(mongo_uri, tlsCAFile=certifi.where())
    else:
        client = AsyncIOMotorClient(mongo_uri)

    db = client[database_name]

    # 1. Clear old collections
    collections_to_clean = ["reports", "relief_requests", "social_reports", "hotspots", "notifications"]
    for col in collections_to_clean:
        deleted = await db[col].delete_many({})
        print(f"Cleaned {col}: deleted {deleted.deleted_count} old test records.")

    # 2. Reset Users (Ensure demo accounts exist with password123)
    await db.users.delete_many({})
    print("Cleaned users collection.")

    demo_password_hash = get_password_hash("password123")

    clean_users = [
        {
            "name": "Mohd Sajid",
            "email": "twoboysgaming09@gmail.com",
            "passwordHash": demo_password_hash,
            "role": "citizen",
            "phone": "+91 98765 12345",
            "location": "Kanpur, Uttar Pradesh",
            "createdAt": "2026-08-19 10:00:00",
        },
        {
            "name": "Citizen User",
            "email": "citizen@jaldrishti.in",
            "passwordHash": demo_password_hash,
            "role": "citizen",
            "phone": "+91 98765 43210",
            "location": "Kanpur, Uttar Pradesh",
            "createdAt": "2026-08-19 10:00:00",
        },
        {
            "name": "Disaster Response Officer",
            "email": "official@jaldrishti.gov.in",
            "passwordHash": demo_password_hash,
            "role": "government",
            "department": "Coastal Disaster Response Authority (CDRA)",
            "designation": "Senior Incident Commander",
            "governmentId": "GOV-IN-8842",
            "phone": "+91 94321 00998",
            "location": "State Emergency Operations Center",
            "createdAt": "2026-08-19 10:00:00",
        }
    ]

    await db.users.insert_many(clean_users)
    print(f"Seeded {len(clean_users)} fresh verified user accounts.")

    # 3. Seed Fresh Initial Reports for Live Map
    initial_reports = [
        {
            "publicReportId": "JAL-2026-KNP001",
            "title": "Severe Waterlogging on VIP Road",
            "description": "Heavy monsoon downpour caused 2 feet waterlogging near VIP Road junction, affecting vehicular transit.",
            "category": "urban_flooding",
            "severity": 4,
            "priority": "HIGH",
            "confidence": 0.92,
            "status": "verified",
            "reportStatus": "In Progress",
            "location": {
                "latitude": 26.4729,
                "longitude": 80.3316,
                "locality": "Civil Lines",
                "city": "Kanpur",
                "district": "Kanpur Nagar",
                "state": "Uttar Pradesh",
                "formattedAddress": "VIP Road, Civil Lines, Kanpur, Uttar Pradesh, 208001"
            },
            "imageUrl": "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
            "source": "CITIZEN",
            "aiAnalysis": {
                "title": "Severe Waterlogging on VIP Road",
                "description": "Water depth over 2 feet detected on commercial roadway.",
                "detectedIssue": "urban_flooding",
                "source": "ml",
                "sourceLabel": "Detected by MobileNetV2 ML Service"
            },
            "createdAt": "2026-08-19T08:30:00Z"
        },
        {
            "publicReportId": "JAL-2026-KNP002",
            "title": "Drainage Overflow Near Sisamau Nala",
            "description": "Solid waste blockage in open drainage culvert resulting in sewage backflow.",
            "category": "drainage_problem",
            "severity": 3,
            "priority": "MEDIUM",
            "confidence": 0.88,
            "status": "assigned",
            "reportStatus": "Open",
            "location": {
                "latitude": 26.4682,
                "longitude": 80.3245,
                "locality": "Sisamau",
                "city": "Kanpur",
                "district": "Kanpur Nagar",
                "state": "Uttar Pradesh",
                "formattedAddress": "Sisamau Culvert, Kanpur, Uttar Pradesh, 208012"
            },
            "imageUrl": "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80",
            "source": "CITIZEN",
            "aiAnalysis": {
                "title": "Drainage Overflow Near Sisamau Nala",
                "description": "Stormwater drainage blockage detected.",
                "detectedIssue": "drainage_problem",
                "source": "ml",
                "sourceLabel": "Detected by MobileNetV2 ML Service"
            },
            "createdAt": "2026-08-19T09:15:00Z"
        },
        {
            "publicReportId": "JAL-2026-MUM001",
            "title": "High Tide Inundation at Marine Drive",
            "description": "Sea water overtopping promenade wall during high tide warning.",
            "category": "urban_flooding",
            "severity": 4,
            "priority": "HIGH",
            "confidence": 0.94,
            "status": "verified",
            "reportStatus": "In Progress",
            "location": {
                "latitude": 18.9438,
                "longitude": 72.8233,
                "locality": "Marine Drive",
                "city": "Mumbai",
                "district": "Mumbai City",
                "state": "Maharashtra",
                "formattedAddress": "Marine Drive Promenade, Mumbai, Maharashtra 400020"
            },
            "imageUrl": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80",
            "source": "CITIZEN",
            "aiAnalysis": {
                "title": "High Tide Inundation at Marine Drive",
                "description": "Coastal tidal inundation detected.",
                "detectedIssue": "urban_flooding",
                "source": "gemini",
                "sourceLabel": "Verified by Gemini AI"
            },
            "createdAt": "2026-08-19T09:45:00Z"
        }
    ]

    await db.reports.insert_many(initial_reports)
    print(f"Seeded {len(initial_reports)} initial verified hazard reports for live map & dashboard.")

    print("\nDatabase reset complete! MongoDB Atlas is clean and ready.")

if __name__ == "__main__":
    asyncio.run(reset_database())
