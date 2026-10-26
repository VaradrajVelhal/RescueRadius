from rest_framework import permissions
from accounts.models import User


class IsAdmin(permissions.BasePermission):
    """
    Permission check for system administrators:
    - User must be authenticated
    - User role must be User.Role.ADMIN or user.is_staff or user.is_superuser
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                getattr(user, "role", None) == User.Role.ADMIN
                or getattr(user, "is_staff", False)
                or getattr(user, "is_superuser", False)
            )
        )
