import math
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from bson import ObjectId

from app.config import settings
from app.database import database
from app.utils.geoUtils import haversine_distance_km
from app.models.hotspot_clustering import detect_hotspots


# =========================================================
# HELPER: Generate Public Report ID
# =========================================================

def generate_public_report_id() -> str:
    random_hex = secrets.token_hex(3).upper()
    return f"JAL-{datetime.utcnow().year}-{random_hex}"


# =========================================================
# CREATE REPORT
# =========================================================

async def createReport(reportData: dict) -> dict:
    now = datetime.utcnow()
    public_id = reportData.get("publicReportId") or generate_public_report_id()

    loc = reportData.get("location", {})
    lat = loc.get("latitude", 0.0)
    lng = loc.get("longitude", 0.0)

    # Determine or assign clusterId
    cluster_id = reportData.get("clusterId")
    if not cluster_id and lat and lng:
        # Search nearby active reports to join existing cluster
        nearby_cluster_report = await database.reports.find_one({
            "location.latitude": {"$gte": lat - 0.005, "$lte": lat + 0.005},
            "location.longitude": {"$gte": lng - 0.005, "$lte": lng + 0.005},
            "clusterId": {"$exists": True, "$ne": None},
        })
        if nearby_cluster_report:
            cluster_id = nearby_cluster_report.get("clusterId")
        else:
            cluster_id = f"CLUST-{secrets.token_hex(2).upper()}"

    timeline = reportData.get("timeline") or [
        {
            "status": "submitted",
            "title": "Report Submitted",
            "description": "Hazard reported and logged in JalDrishti system.",
            "timestamp": now.isoformat(),
        }
    ]

    reportDocument = {
        "publicReportId": public_id,
        "userId": str(reportData.get("userId") or reportData.get("username") or "anonymous"),
        "username": reportData.get("username") or "citizen",
        "title": reportData.get("title") or "Water Hazard Incident",
        "description": reportData.get("description") or "",
        "category": reportData.get("category") or reportData.get("hazardTypeVerified") or "flooding",
        "hazardTypeClaimed": reportData.get("hazardTypeClaimed"),
        "hazardTypeVerified": reportData.get("hazardTypeVerified") or reportData.get("category"),
        "claimVerified": reportData.get("claimVerified", True),
        "severity": reportData.get("severity", 3),
        "priority": reportData.get("priority", "MEDIUM"),
        "priorityScore": reportData.get("priorityScore", 50.0),
        "governmentPriority": reportData.get("governmentPriority", "medium"),
        "city": reportData.get("city") or loc.get("city", ""),
        "district": reportData.get("district") or loc.get("district", ""),
        "state": reportData.get("state") or loc.get("state", ""),
        "locality": reportData.get("locality") or loc.get("locality", ""),
        "location": {
            "latitude": lat,
            "longitude": lng,
            "state": loc.get("state", ""),
            "district": loc.get("district", ""),
            "city": loc.get("city", ""),
            "locality": loc.get("locality", ""),
            "formattedAddress": loc.get("formattedAddress", f"Coordinates: {lat:.4f}, {lng:.4f}"),
        },
        "imageUrl": reportData.get("imageUrl"),
        "imageHash": reportData.get("imageHash"),
        "source": reportData.get("source", "CITIZEN"),
        "clusterId": cluster_id,
        "aiAnalysis": reportData.get("aiAnalysis", {}),
        "mlAnalysis": reportData.get("mlAnalysis", {}),
        "geminiAnalysis": reportData.get("geminiAnalysis", {}),
        "validation": reportData.get("validation", {}),
        "verification": reportData.get("verification", {
            "status": "Pending",
            "verifiedBy": None,
            "verifiedAt": None,
            "officerNotes": None,
            "assignedDepartment": None,
        }),
        "assignment": reportData.get("assignment", {
            "department": None,
            "assignedTo": None,
            "assignedBy": None,
            "assignedAt": None,
        }),
        "status": reportData.get("status", "submitted"),
        "reportStatus": reportData.get("reportStatus", "Open"),
        "timeline": timeline,
        "createdAt": now,
        "updatedAt": now,
    }

    res = await database.reports.insert_one(reportDocument)
    reportDocument["id"] = str(res.inserted_id)
    if "_id" in reportDocument:
        del reportDocument["_id"]

    return {
        "insertedId": str(res.inserted_id),
        "publicReportId": public_id,
        "report": reportDocument,
    }


# =========================================================
# GET REPORTS (With Formatting)
# =========================================================

def _format_report(doc: dict) -> dict:
    if not doc:
        return {}
    doc["id"] = str(doc.get("_id", doc.get("id", "")))
    if "_id" in doc:
        del doc["_id"]
    if not doc.get("publicReportId"):
        doc["publicReportId"] = doc["id"]
    if isinstance(doc.get("createdAt"), datetime):
        doc["createdAt"] = doc["createdAt"].isoformat()
    if isinstance(doc.get("updatedAt"), datetime):
        doc["updatedAt"] = doc["updatedAt"].isoformat()
    if isinstance(doc.get("concludedAt"), datetime):
        doc["concludedAt"] = doc["concludedAt"].isoformat()
    if isinstance(doc.get("expiresAt"), datetime):
        doc["expiresAt"] = doc["expiresAt"].isoformat()
    return doc


async def cleanup_expired_reports():
    try:
        now = datetime.utcnow()
        await database.reports.delete_many({"expiresAt": {"$ne": None, "$lte": now}})
    except Exception as e:
        pass


async def getReports() -> List[dict]:
    await cleanup_expired_reports()
    cursor = database.reports.find().sort("createdAt", -1)
    reports = []
    async for report in cursor:
        reports.append(_format_report(report))
    return reports


# =========================================================
# GET CITIZEN'S OWN REPORTS
# =========================================================

async def getCitizenReports(user_id: str, email: Optional[str] = None) -> List[dict]:
    if not user_id:
        return []

    queries = [{"userId": str(user_id)}, {"username": str(user_id)}]
    if email:
        queries.append({"username": email.split("@")[0]})
        queries.append({"userId": email})

    cursor = database.reports.find({"$or": queries}).sort("createdAt", -1)
    reports = []
    async for report in cursor:
        reports.append(_format_report(report))
    return reports


# =========================================================
# GET NEARBY REPORTS (For Citizen Live View)
# =========================================================

async def getNearbyReports(
    latitude: float,
    longitude: float,
    radiusKm: float = 5.0,
    category: Optional[str] = None,
) -> List[dict]:
    query = {}
    if category and category.lower() != "all":
        query["$or"] = [
            {"category": category},
            {"mlAnalysis.category": category},
            {"hazardTypeVerified": category},
        ]

    cursor = database.reports.find(query).sort("createdAt", -1)
    nearby = []

    async for report in cursor:
        loc = report.get("location", {})
        r_lat = loc.get("latitude")
        r_lng = loc.get("longitude")

        if r_lat is not None and r_lng is not None:
            try:
                dist_km = haversine_distance_km(latitude, longitude, float(r_lat), float(r_lng))
                if dist_km <= radiusKm:
                    formatted = _format_report(report)
                    formatted["distanceKm"] = round(dist_km, 2)
                    formatted["distanceMeters"] = round(dist_km * 1000, 0)
                    nearby.append(formatted)
            except Exception:
                pass

    nearby.sort(key=lambda r: r.get("distanceKm", 999))
    return nearby


# =========================================================
# GET ADMINISTRATIVE REPORTS (Government Large Area View)
# =========================================================

async def getAdministrativeReports(
    state: Optional[str] = None,
    district: Optional[str] = None,
    city: Optional[str] = None,
    locality: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    source: Optional[str] = None,
    department: Optional[str] = None,
) -> List[dict]:
    query = {}
    conditions = []

    if state and state.lower() != "all":
        conditions.append({"$or": [
            {"state": {"$regex": state, "$options": "i"}},
            {"location.state": {"$regex": state, "$options": "i"}},
            {"location.formattedAddress": {"$regex": state, "$options": "i"}},
        ]})

    target_city = city or district
    if target_city and target_city.lower() != "all":
        # Extract base name (e.g., 'Kanpur' from 'Kanpur Nagar')
        base_name = target_city.split()[0]
        conditions.append({"$or": [
            {"district": {"$regex": base_name, "$options": "i"}},
            {"location.district": {"$regex": base_name, "$options": "i"}},
            {"city": {"$regex": base_name, "$options": "i"}},
            {"location.city": {"$regex": base_name, "$options": "i"}},
            {"location.formattedAddress": {"$regex": base_name, "$options": "i"}},
        ]})

    if locality and locality.lower() != "all":
        conditions.append({"$or": [
            {"locality": {"$regex": locality, "$options": "i"}},
            {"location.locality": {"$regex": locality, "$options": "i"}},
            {"location.formattedAddress": {"$regex": locality, "$options": "i"}},
            {"title": {"$regex": locality, "$options": "i"}},
            {"description": {"$regex": locality, "$options": "i"}},
        ]})

    if category and category.lower() != "all":
        query["category"] = category
    if status and status.lower() != "all":
        query["status"] = status
    if priority and priority.lower() != "all":
        query["priority"] = {"$regex": f"^{priority}$", "$options": "i"}
    if source and source.lower() != "all":
        query["source"] = source.upper()
    if department:
        query["verification.assignedDepartment"] = department

    if conditions:
        query["$and"] = conditions

    cursor = database.reports.find(query).sort("createdAt", -1)
    reports = []
    async for report in cursor:
        reports.append(_format_report(report))
    return reports


# =========================================================
# GET SINGLE REPORT & TRACKING
# =========================================================

async def getReportById(reportId: str) -> Optional[dict]:
    if not reportId:
        return None

    query = {"publicReportId": reportId}
    if ObjectId.is_valid(reportId):
        query = {
            "$or": [
                {"publicReportId": reportId},
                {"_id": ObjectId(reportId)},
            ]
        }

    report = await database.reports.find_one(query)
    if not report:
        return None

    return _format_report(report)


async def getReportTracking(reportId: str) -> Optional[dict]:
    report = await getReportById(reportId)
    if not report:
        return None

    return {
        "id": report["id"],
        "reportId": report.get("publicReportId", report["id"]),
        "legacyReportId": report.get("publicReportId", report["id"]),
        "publicReportId": report.get("publicReportId", report["id"]),
        "title": report.get("title"),
        "description": report.get("description"),
        "category": report.get("category") or report.get("mlAnalysis", {}).get("category"),
        "severity": report.get("severity"),
        "priority": report.get("priority", "MEDIUM"),
        "status": report.get("status", "submitted"),
        "currentStatus": report.get("status", "submitted"),
        "reportStatus": report.get("reportStatus", "Open"),
        "location": report.get("location", {}),
        "imageUrl": report.get("imageUrl"),
        "aiAnalysis": report.get("aiAnalysis", {}),
        "mlAnalysis": report.get("mlAnalysis", {}),
        "geminiAnalysis": report.get("geminiAnalysis", {}),
        "verification": report.get("verification", {}),
        "assignment": report.get("assignment", {}),
        "timeline": report.get("timeline", []),
        "source": report.get("source", "CITIZEN"),
        "clusterId": report.get("clusterId"),
        "createdAt": report.get("createdAt"),
        "updatedAt": report.get("updatedAt"),
    }


# =========================================================
# UPDATE REPORT STATUS & VERIFICATION
# =========================================================

async def updateReportStatus(reportId: str, status: str, officerNotes: Optional[str] = None) -> bool:
    query = {"$or": [{"publicReportId": reportId}, {"reportId": reportId}, {"id": reportId}]}
    if ObjectId.is_valid(reportId):
        query["$or"].append({"_id": ObjectId(reportId)})

    existing = await database.reports.find_one(query)
    if not existing:
        return False

    now = datetime.utcnow()
    timeline = existing.get("timeline", [])

    norm_status = status.lower().strip()
    if norm_status in ["in_progress", "inprogress", "action_in_progress"]:
        canonical_status = "action_in_progress"
        gov_status = "in_progress"
        report_status_str = "In Progress"
    elif norm_status == "assigned":
        canonical_status = "assigned"
        gov_status = "assigned"
        report_status_str = "Assigned"
    elif norm_status in ["resolved", "completed"]:
        canonical_status = "resolved"
        gov_status = "resolved"
        report_status_str = "Resolved"
    elif norm_status in ["rejected", "invalid"]:
        canonical_status = "rejected"
        gov_status = "rejected"
        report_status_str = "Rejected"
    elif norm_status == "verified":
        canonical_status = "verified"
        gov_status = "under_review"
        report_status_str = "Verified"
    else:
        canonical_status = "under_review"
        gov_status = "under_review"
        report_status_str = "Under Review"

    if canonical_status == "rejected":
        title_str = "Report Rejected"
        desc_str = f"Rejection Reason: {officerNotes}" if officerNotes else "Report marked as rejected by municipal review officer."
    else:
        title_str = f"Status updated to {report_status_str}"
        desc_str = officerNotes or f"Report status changed to {report_status_str} by municipal authority."

    # Avoid duplicate consecutive timeline events
    should_append = True
    if timeline:
        last_entry = timeline[-1]
        if (
            last_entry.get("status") == canonical_status
            and last_entry.get("title") == title_str
            and (not officerNotes or last_entry.get("description") == desc_str)
        ):
            should_append = False

    if should_append:
        timeline.append({
            "status": canonical_status,
            "title": title_str,
            "description": desc_str,
            "timestamp": now.isoformat(),
        })

    update_fields = {
        "status": canonical_status,
        "currentStatus": canonical_status,
        "govStatus": gov_status,
        "reportStatus": report_status_str,
        "timeline": timeline,
        "updatedAt": now,
    }
    if canonical_status in ["resolved", "rejected"]:
        update_fields["concludedAt"] = now
        update_fields["expiresAt"] = now + timedelta(hours=24)
    else:
        update_fields["concludedAt"] = None
        update_fields["expiresAt"] = None

    if canonical_status == "rejected":
        update_fields["assignedDepartment"] = None
        verification = existing.get("verification", {})
        verification["status"] = "Rejected"
        verification["verifiedAt"] = now.isoformat()
        if officerNotes:
            verification["officerNotes"] = officerNotes
        update_fields["verification"] = verification

    res = await database.reports.update_one(query, {"$set": update_fields})
    return res.matched_count > 0


async def updateReportVerification(
    reportId: str,
    status: str,
    verifiedBy: Optional[str] = None,
    officerNotes: Optional[str] = None,
    assignedDepartment: Optional[str] = None,
) -> bool:
    query = {"publicReportId": reportId}
    if ObjectId.is_valid(reportId):
        query = {"$or": [{"publicReportId": reportId}, {"_id": ObjectId(reportId)}]}

    existing = await database.reports.find_one(query)
    if not existing:
        return False

    now = datetime.utcnow()
    norm_status = status.lower().strip()
    is_rejected = norm_status == "rejected"
    is_verified = norm_status == "verified"

    verif_status_label = "Rejected" if is_rejected else "Verified" if is_verified else "Under Review"
    canonical_status = "rejected" if is_rejected else "verified" if is_verified else "under_review"
    gov_status = "rejected" if is_rejected else "assigned" if assignedDepartment else "under_review"

    verification = existing.get("verification", {})
    verification.update({
        "status": verif_status_label,
        "verifiedBy": verifiedBy or "Municipal Authority",
        "verifiedAt": now.isoformat(),
        "officerNotes": officerNotes,
    })
    if assignedDepartment:
        verification["assignedDepartment"] = assignedDepartment

    timeline = existing.get("timeline", [])
    title_str = f"Incident {verif_status_label}"
    desc_str = officerNotes or f"Report marked as {verif_status_label} by {verifiedBy or 'Municipal Authority'}."

    should_append = True
    if timeline:
        last_entry = timeline[-1]
        if (
            last_entry.get("status") == canonical_status
            and last_entry.get("title") == title_str
            and (not officerNotes or last_entry.get("description") == desc_str)
        ):
            should_append = False

    if should_append:
        timeline.append({
            "status": canonical_status,
            "title": title_str,
            "description": desc_str,
            "timestamp": now.isoformat(),
        })

    update_fields = {
        "status": canonical_status,
        "currentStatus": canonical_status,
        "govStatus": gov_status,
        "reportStatus": verif_status_label,
        "verification": verification,
        "timeline": timeline,
        "updatedAt": now,
    }
    if canonical_status in ["resolved", "rejected"]:
        update_fields["concludedAt"] = now
        update_fields["expiresAt"] = now + timedelta(hours=24)
    else:
        update_fields["concludedAt"] = None
        update_fields["expiresAt"] = None

    if assignedDepartment:
        update_fields["assignedDepartment"] = assignedDepartment

    res = await database.reports.update_one(query, {"$set": update_fields})
    return res.matched_count > 0


async def assignReport(reportId: str, department: str, assignedTo: Optional[str] = None, assignedBy: Optional[str] = None) -> bool:
    query = {"$or": [{"publicReportId": reportId}, {"reportId": reportId}, {"id": reportId}]}
    if ObjectId.is_valid(reportId):
        query["$or"].append({"_id": ObjectId(reportId)})

    existing = await database.reports.find_one(query)
    if not existing:
        return False

    now = datetime.utcnow()
    assignment = {
        "department": department,
        "assignedTo": assignedTo or "Field Response Unit",
        "assignedBy": assignedBy or "Command Center",
        "assignedAt": now.isoformat(),
    }

    verification = existing.get("verification", {})
    verification["assignedDepartment"] = department
    verification["status"] = "Verified"
    verification["verifiedBy"] = assignedBy or "Command Center"
    verification["verifiedAt"] = now.isoformat()

    timeline = existing.get("timeline", [])
    title_str = f"Assigned to {department}"
    desc_str = f"Dispatched to {department} ({assignedTo or 'Field Response Unit'}) for on-ground response."

    should_append = True
    if timeline:
        last_entry = timeline[-1]
        if (
            last_entry.get("status") == "assigned"
            and last_entry.get("title") == title_str
        ):
            should_append = False

    if should_append:
        timeline.append({
            "status": "assigned",
            "title": title_str,
            "description": desc_str,
            "timestamp": now.isoformat(),
        })

    res = await database.reports.update_one(
        query,
        {
            "$set": {
                "status": "assigned",
                "currentStatus": "assigned",
                "govStatus": "assigned",
                "reportStatus": "Assigned",
                "assignedDepartment": department,
                "assignment": assignment,
                "verification": verification,
                "timeline": timeline,
                "updatedAt": now,
            }
        },
    )
    return res.matched_count > 0


async def deleteReport(reportId: str) -> bool:
    query = {"publicReportId": reportId}
    if ObjectId.is_valid(reportId):
        query = {"$or": [{"publicReportId": reportId}, {"_id": ObjectId(reportId)}]}
    res = await database.reports.delete_one(query)
    return res.deleted_count > 0


# =========================================================
# HOTSPOTS & MAP AGGREGATIONS
# =========================================================

async def getHotspots(category: Optional[str] = None) -> List[dict]:
    query = {"status": {"$in": ["submitted", "under_review", "verified", "action_in_progress", "assigned"]}}
    if category and category.lower() != "all":
        query["category"] = category

    cursor = database.reports.find(query)
    reports = []
    async for report in cursor:
        reports.append(_format_report(report))

    clusters = []
    processed = set()

    for i, rep in enumerate(reports):
        if i in processed:
            continue

        lat1 = rep["location"].get("latitude")
        lng1 = rep["location"].get("longitude")
        if lat1 is None or lng1 is None:
            continue

        cluster_members = [rep]
        processed.add(i)

        for j, other in enumerate(reports):
            if j in processed:
                continue
            lat2 = other["location"].get("latitude")
            lng2 = other["location"].get("longitude")
            if lat2 is None or lng2 is None:
                continue

            dist = haversine_distance_km(lat1, lng1, lat2, lng2)
            if dist <= settings.NEARBY_REPORT_RADIUS_KM:
                cluster_members.append(other)
                processed.add(j)

        if len(cluster_members) >= 2:
            avg_lat = sum(m["location"]["latitude"] for m in cluster_members) / len(cluster_members)
            avg_lng = sum(m["location"]["longitude"] for m in cluster_members) / len(cluster_members)
            clusters.append({
                "hotspotId": f"hotspot-{len(clusters)+1}",
                "latitude": round(avg_lat, 6),
                "longitude": round(avg_lng, 6),
                "reportCount": len(cluster_members),
                "category": cluster_members[0].get("category", "flood"),
                "severity": "CRITICAL" if any(m.get("priority") == "CRITICAL" for m in cluster_members) else "HIGH",
                "reports": cluster_members,
            })

    return clusters


async def getMapReports(
    state: Optional[str] = None,
    district: Optional[str] = None,
    city: Optional[str] = None,
    locality: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
) -> dict:
    reports = await getAdministrativeReports(
        state=state,
        district=district,
        city=city,
        locality=locality,
        category=category,
        status=status,
    )
    hotspots = await getHotspots(category=category)

    return {
        "reportCount": len(reports),
        "hotspotCount": len(hotspots),
        "reports": reports,
        "hotspots": hotspots,
    }


async def getGovernmentDashboard(
    state: Optional[str] = None,
    district: Optional[str] = None,
    city: Optional[str] = None,
    locality: Optional[str] = None,
) -> dict:
    reports = await getAdministrativeReports(
        state=state,
        district=district,
        city=city,
        locality=locality,
    )
    total = len(reports)
    pending = len([r for r in reports if r.get("status") in ["submitted", "under_review"]])
    assigned = len([r for r in reports if r.get("status") in ["assigned", "action_in_progress"]])
    verified = len([r for r in reports if r.get("status") in ["verified", "assigned", "action_in_progress"]])
    resolved = len([r for r in reports if r.get("status") == "resolved"])
    rejected = len([r for r in reports if r.get("status") == "rejected"])
    critical = len([r for r in reports if str(r.get("priority", "")).upper() == "CRITICAL"])
    high = len([r for r in reports if str(r.get("priority", "")).upper() == "HIGH"])

    hotspots = await getHotspots()

    return {
        "totalReports": total,
        "pendingReview": pending,
        "assigned": assigned,
        "verifiedIncidents": verified,
        "resolvedIncidents": resolved,
        "rejected": rejected,
        "rejectedIncidents": rejected,
        "criticalPriority": critical,
        "highPriority": high,
        "activeHotspots": len(hotspots),
        "recentReports": reports[:10],
        "summary": {
            "totalReports": total,
            "submitted": pending,
            "pending": pending,
            "assigned": assigned,
            "verified": verified,
            "resolved": resolved,
            "rejected": rejected,
        },
    }