from rest_framework import permissions
from accounts.models import User


class IsCitizen(permissions.BasePermission):
    """
    Allows access only to authenticated citizens (or admins).
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.CITIZEN
        )


class IsReportAccessAllowed(permissions.BasePermission):
    """
    Object-level permission checking:
    - Admin: access all
    - Citizen: access own reports
    - NGO: access assigned reports or nearby verified reports
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.role == User.Role.ADMIN or getattr(user, "is_staff", False):
            return True

        if user.role == User.Role.CITIZEN:
            return obj.reporter == user

        if user.role == User.Role.NGO:
            if hasattr(user, "ngo_profile"):
                ngo = user.ngo_profile
                # Access if assigned to NGO
                if hasattr(obj, "assignment") and obj.assignment.ngo == ngo:
                    return True
                # Access if report is VERIFIED and within operating radius
                if obj.status == "VERIFIED" and obj.location and ngo.location:
                    from ngos.services import find_nearby_ngos
                    return ngo in find_nearby_ngos(obj)
            return False

        return False
