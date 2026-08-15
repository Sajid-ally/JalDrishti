from app.models.report_ranker import rank_reports

reports = [
    {
        "reportId": "R1",
        "category": "flooding",
        "aiConfidence": 0.92,
        "createdAt": "2026-08-15T10:00:00+00:00",
        "infrastructureCriticality": "hospital",
        "location": {"latitude": 26.4499, "longitude": 80.3319}
    },
    {
        "reportId": "R2",
        "category": "drainage_problem",
        "aiConfidence": 0.81,
        "createdAt": "2026-08-15T09:50:00+00:00",
        "infrastructureCriticality": "residential",
        "location": {"latitude": 26.4501, "longitude": 80.3321}
    },
    {
        "reportId": "R3",
        "category": "pond_lake_problem",
        "aiConfidence": 0.76,
        "createdAt": "2026-08-15T08:30:00+00:00",
        "infrastructureCriticality": "school",
        "location": {"latitude": 26.4500, "longitude": 80.3320}
    }
]

ranked = rank_reports(reports)

for report in ranked:
    print(report)