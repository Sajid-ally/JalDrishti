from pydantic import BaseModel
from typing import Optional

class NotificationCreate(BaseModel):
    notificationType: str
    message: str
    reportId: Optional[str] = None
    department: Optional[str] = None
    assignedTo: Optional[str] = None
    username: Optional[str] = None

class NotificationResponse(BaseModel):
    notificationId: str
    notificationType: str
    message: str
    reportId: Optional[str] = None
    department: Optional[str] = None
    assignedTo: Optional[str] = None
    username: Optional[str] = None
    read: bool
    createdAt: str