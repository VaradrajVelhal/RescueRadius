from rest_framework import permissions


class IsNotificationRecipient(permissions.BasePermission):
    """
    Object-level permission allowing only the recipient to view or modify their notification.
    """
    def has_object_permission(self, request, view, obj):
        return bool(
            request.user
            and request.user.is_authenticated
            and obj.recipient == request.user
        )
