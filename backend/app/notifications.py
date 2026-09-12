import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import Notification, User

def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    related_id: Optional[str] = None,
    related_type: Optional[str] = None,
    prevent_duplicate_seconds: int = 5
) -> Optional[Notification]:
    """
    Safely creates and persists a notification for a specific authenticated user.
    Never crashes the calling transaction if notification insertion fails.
    """
    try:
        if not user_id:
            return None

        # Duplicate prevention check within a short window for same event + record
        if prevent_duplicate_seconds > 0 and related_id:
            cutoff = datetime.datetime.utcnow() - datetime.timedelta(seconds=prevent_duplicate_seconds)
            existing = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.notification_type == notification_type,
                Notification.related_id == str(related_id),
                Notification.created_at >= cutoff
            ).first()
            if existing:
                return existing

        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            related_id=str(related_id) if related_id is not None else None,
            related_type=related_type,
            is_read=False,
            created_at=datetime.datetime.utcnow()
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif
    except Exception as e:
        db.rollback()
        print(f"[Notification Helper Error]: {e}")
        return None

def notify_admins(
    db: Session,
    title: str,
    message: str,
    notification_type: str = "ADMIN_NOTIFICATION",
    related_id: Optional[str] = None,
    related_type: Optional[str] = None
) -> List[Notification]:
    """
    Broadcasts a notification to all active system administrators.
    """
    created = []
    try:
        admins = db.query(User).filter(User.role.ilike("admin")).all()
        for admin in admins:
            n = create_notification(
                db=db,
                user_id=admin.id,
                title=title,
                message=message,
                notification_type=notification_type,
                related_id=related_id,
                related_type=related_type
            )
            if n:
                created.append(n)
    except Exception as e:
        print(f"[Admin Notification Broadcast Error]: {e}")
    return created
