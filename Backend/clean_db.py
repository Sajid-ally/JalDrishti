import asyncio
from app.database import database

async def main():
    res = await database.reports.delete_many({
        "$or": [
            {"publicReportId": None},
            {"publicReportId": {"$exists": False}},
            {"category": None},
            {"category": "normal"},
            {"category": "unknown"},
            {"category": "irrelevant"}
        ]
    })
    print(f"Cleaned {res.deleted_count} invalid reports.")

    # Also clean relief collection of invalid documents if any
    res_rel = await database.relief.delete_many({
        "$or": [
            {"status": None},
            {"location": None}
        ]
    })
    print(f"Cleaned {res_rel.deleted_count} invalid relief requests.")

    reports = await database.reports.find({}).to_list(100)
    print(f"Current valid database reports count: {len(reports)}")
    for r in reports:
        loc = r.get("location", {})
        print(f" - [{r.get('publicReportId')}] {r.get('category')} | {r.get('city')}, {r.get('locality')} | ({loc.get('latitude')}, {loc.get('longitude')})")

if __name__ == "__main__":
    asyncio.run(main())
