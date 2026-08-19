# Backend/app/reset_script.py
import asyncio
from app.database import database

async def main():
    r1 = await database.reports.delete_many({})
    r2 = await database.reliefRequests.delete_many({})
    r2_alt = await database.relief_requests.delete_many({})
    r3 = await database.social_reports.delete_many({})
    r4 = await database.hotspots.delete_many({})
    print(f"DONE! Wiped {r1.deleted_count} reports, {r2.deleted_count + r2_alt.deleted_count} relief requests, {r3.deleted_count} social reports.")

if __name__ == "__main__":
    asyncio.run(main())
