from fastapi import APIRouter, Query

from app.notifications.service import (
    createNotification,
    getNotifications,
    markNotificationAsRead,
    getUnreadNotificationCount
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.post("/")
async def create(
    notificationType: str = Query(...),
    message: str = Query(...),
    reportId: str = Query(None),
    department: str = Query(None),
    assignedTo: str = Query(None),
    username: str = Query(None)
):
    notification = await createNotification(
        notificationType=notificationType,
        message=message,
        reportId=reportId,
        department=department,
        assignedTo=assignedTo,
        username=username
    )

    return {
        "success": True,
        "notification": notification
    }


@router.get("/")
async def getAll(
    department: str = Query(None),
    username: str = Query(None),
    unreadOnly: bool = Query(False)
):
    notifications = await getNotifications(
        department=department,
        username=username,
        unreadOnly=unreadOnly
    )

    return {
        "success": True,
        "count": len(notifications),
        "notifications": notifications
    }


@router.get("/unread-count")
async def unreadCount(
    department: str = Query(None),
    username: str = Query(None)
):
    return await getUnreadNotificationCount(
        department=department,
        username=username
    )


@router.put("/{notificationId}/read")
async def markAsRead(notificationId: str):
    return await markNotificationAsRead(notificationId)