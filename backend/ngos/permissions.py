from rest_framework import permissions

from accounts.models import User
from ngos.models import NGOProfile


class IsVerifiedNGO(permissions.BasePermission):
    """
    Permission check for verified NGO users:
    - User must be authenticated
    - User must have role == NGO
    - User must have an NGOProfile
    - NGOProfile verification_status must be VERIFIED
    """
    message = "Access restricted to verified NGO accounts. Your organization profile is either pending verification by Field Control or has not yet been established."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if getattr(user, "role", None) != User.Role.NGO:
            return False

        if not hasattr(user, "ngo_profile") or user.ngo_profile is None:
            return False

        return user.ngo_profile.verification_status == NGOProfile.VerificationStatus.VERIFIED


class IsAssignmentOwner(permissions.BasePermission):
    """
    Object-level permission ensuring an assignment belongs to the authenticated NGO (or Admin).
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.role == User.Role.ADMIN or getattr(user, "is_staff", False):
            return True

        if hasattr(user, "ngo_profile"):
            return obj.ngo == user.ngo_profile

        return False
