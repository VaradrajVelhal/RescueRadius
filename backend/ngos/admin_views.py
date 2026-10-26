from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import NGOProfile
from .serializers import NGOProfileSerializer


class AdminNGOListView(generics.ListAPIView):
    """
    GET /api/admin/ngos/ -> List all NGO profiles.
    Supports optional status filtering: ?status=PENDING, VERIFIED, REJECTED, SUSPENDED.
    ADMIN users only.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = NGOProfileSerializer

    def get_queryset(self):
        queryset = NGOProfile.objects.select_related("user").order_by("-created_at")
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(verification_status=status_param.upper())
        return queryset


class AdminNGODetailView(generics.RetrieveAPIView):
    """
    GET /api/admin/ngos/<id>/ -> Retrieve details of a single NGO profile.
    ADMIN users only.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = NGOProfileSerializer
    queryset = NGOProfile.objects.select_related("user")


class AdminNGOVerifyView(APIView):
    """
    POST /api/admin/ngos/<ngo_id>/verify/ -> Verify a pending NGO profile application.
    ADMIN users only.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @transaction.atomic
    def post(self, request, ngo_id):
        try:
            ngo = NGOProfile.objects.select_for_update().get(pk=ngo_id)
        except NGOProfile.DoesNotExist:
            return Response(
                {"detail": f"NGO profile #{ngo_id} does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if ngo.verification_status == NGOProfile.VerificationStatus.VERIFIED:
            return Response(
                {"detail": "NGO profile is already verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ngo.verification_status = NGOProfile.VerificationStatus.VERIFIED
        ngo.verified_at = timezone.now()
        ngo.save(update_fields=["verification_status", "verified_at", "updated_at"])

        return Response(
            {
                "message": "NGO profile successfully verified.",
                "ngo": NGOProfileSerializer(ngo).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminNGORejectView(APIView):
    """
    POST /api/admin/ngos/<ngo_id>/reject/ -> Reject a pending NGO profile application.
    ADMIN users only.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @transaction.atomic
    def post(self, request, ngo_id):
        try:
            ngo = NGOProfile.objects.select_for_update().get(pk=ngo_id)
        except NGOProfile.DoesNotExist:
            return Response(
                {"detail": f"NGO profile #{ngo_id} does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if ngo.verification_status == NGOProfile.VerificationStatus.REJECTED:
            return Response(
                {"detail": "NGO profile is already rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ngo.verification_status == NGOProfile.VerificationStatus.VERIFIED:
            return Response(
                {"detail": "Cannot reject a verified NGO profile. Suspend the profile instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ngo.verification_status = NGOProfile.VerificationStatus.REJECTED
        ngo.save(update_fields=["verification_status", "updated_at"])

        return Response(
            {
                "message": "NGO profile application rejected.",
                "ngo": NGOProfileSerializer(ngo).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminNGOSuspendView(APIView):
    """
    POST /api/admin/ngos/<ngo_id>/suspend/ -> Suspend an NGO profile.
    ADMIN users only.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @transaction.atomic
    def post(self, request, ngo_id):
        try:
            ngo = NGOProfile.objects.select_for_update().get(pk=ngo_id)
        except NGOProfile.DoesNotExist:
            return Response(
                {"detail": f"NGO profile #{ngo_id} does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if ngo.verification_status == NGOProfile.VerificationStatus.SUSPENDED:
            return Response(
                {"detail": "NGO profile is already suspended."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ngo.verification_status = NGOProfile.VerificationStatus.SUSPENDED
        ngo.save(update_fields=["verification_status", "updated_at"])

        return Response(
            {
                "message": "NGO profile suspended.",
                "ngo": NGOProfileSerializer(ngo).data,
            },
            status=status.HTTP_200_OK,
        )
