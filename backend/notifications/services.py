from .models import Notification


def create_notification(recipient, notification_type, title, message, report=None):
    """
    Reusable helper service to create notifications.
    """
    return Notification.objects.create(
        recipient=recipient,
        report=report,
        notification_type=notification_type,
        title=title,
        message=message,
    )
