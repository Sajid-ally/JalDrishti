from datetime import datetime
from bson import ObjectId

from app.database import database

async def createNotification(
    notificationType: str,
    message: str,
    reportId: str = None,
    department: str = None,
    assignedTo: str = None,
    username: str = None
):
    notification = {
        "notificationType": notificationType,
        "message": message,
        "reportId": reportId,
        "department": department,
        "assignedTo": assignedTo,
        "username": username,
        "read": False,
        "createdAt": datetime.utcnow()
    }

    result = await database.notifications.insert_one(notification)

    return {
        "notificationId": str(result.inserted_id),
        "notificationType": notificationType,
        "message": message,
        "reportId": reportId,
        "department": department,
        "assignedTo": assignedTo,
        "username": username,
        "read": False,
        "createdAt": notification["createdAt"].isoformat()
    }


async def getNotifications(
    department: str = None,
    username: str = None,
    unreadOnly: bool = False
):
    query = {}

    if department:
        query["department"] = department

    if username:
        query["username"] = username

    if unreadOnly:
        query["read"] = False

    cursor = database.notifications.find(query).sort("createdAt", -1)

    notifications = []

    async for notification in cursor:
        createdAt = notification.get("createdAt")

        notifications.append({
            "notificationId": str(notification["_id"]),
            "notificationType": notification.get("notificationType"),
            "message": notification.get("message"),
            "reportId": notification.get("reportId"),
            "department": notification.get("department"),
            "assignedTo": notification.get("assignedTo"),
            "username": notification.get("username"),
            "read": notification.get("read", False),
            "createdAt": createdAt.isoformat() if createdAt else None
        })

    return notifications


async def markNotificationAsRead(notificationId: str):
    try:
        objectId = ObjectId(notificationId)
    except Exception:
        return {
            "success": False,
            "error": "invalid_notification_id"
        }

    result = await database.notifications.update_one(
        {"_id": objectId},
        {"$set": {"read": True}}
    )

    if result.matched_count == 0:
        return {
            "success": False,
            "error": "notification_not_found"
        }

    return {
        "success": True,
        "notificationId": notificationId,
        "read": True
    }


async def getUnreadNotificationCount(
    department: str = None,
    username: str = None
):
    query = {"read": False}

    if department:
        query["department"] = department

    if username:
        query["username"] = username

    count = await database.notifications.count_documents(query)

    return {
        "success": True,
        "unreadCount": count
    }