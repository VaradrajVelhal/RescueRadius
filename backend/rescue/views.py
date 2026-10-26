from django.contrib.gis.measure import D
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin
from ngos.models import NGOProfile
from .models import AnimalReport, RescueAssignment
from .permissions import IsCitizen, IsReportAccessAllowed
from .serializers import (
    AnimalReportCreateSerializer,
    AnimalReportSerializer,
    AnimalReportUpdateSerializer,
)
from .services import close_report, verify_report


class AnimalReportListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/reports/ -> List reports based on role permissions
    POST /api/reports/ -> Create new animal report (CITIZEN only)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AnimalReportCreateSerializer
        return AnimalReportSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return AnimalReport.objects.none()

        if user.role == User.Role.ADMIN or getattr(user, "is_staff", False):
            return AnimalReport.objects.select_related("reporter", "animal").prefetch_related("images").all()

        if user.role == User.Role.CITIZEN:
            return AnimalReport.objects.filter(reporter=user).select_related("reporter", "animal").prefetch_related("images")

        if user.role == User.Role.NGO:
            if hasattr(user, "ngo_profile"):
                ngo = user.ngo_profile
                assigned_ids = RescueAssignment.objects.filter(ngo=ngo).values_list("report_id", flat=True)

                if ngo.location:
                    nearby_ids = AnimalReport.objects.filter(
                        status=AnimalReport.Status.VERIFIED,
                        location__distance_lte=(ngo.location, D(km=ngo.operating_radius_km)),
                    ).values_list("id", flat=True)
                else:
                    nearby_ids = []

                accessible_ids = set(assigned_ids).union(set(nearby_ids))
                return AnimalReport.objects.filter(id__in=accessible_ids).select_related("reporter", "animal").prefetch_related("images")
            return AnimalReport.objects.none()

        return AnimalReport.objects.none()

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Role.CITIZEN and not getattr(request.user, "is_staff", False) and request.user.role != User.Role.ADMIN:
            raise PermissionDenied("Only citizen users can create animal rescue reports.")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save()

        output_serializer = AnimalReportSerializer(report, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class AnimalReportDetailView(generics.RetrieveUpdateAPIView):
    """
    GET /api/reports/<id>/ -> Retrieve detail
    PUT/PATCH /api/reports/<id>/ -> Update report details (status/reporter read-only)
    """
    permission_classes = [permissions.IsAuthenticated, IsReportAccessAllowed]
    queryset = AnimalReport.objects.select_related("reporter", "animal").prefetch_related("images")

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return AnimalReportUpdateSerializer
        return AnimalReportSerializer


class CloseReportView(APIView):
    """
    POST /api/reports/<report_id>/close/ -> Close a rescued report.
    Delegates directly to close_report() service.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, report_id):
        comment = request.data.get("comment", "")

        try:
            report = close_report(report_id=report_id, user=request.user, comment=comment)
        except AnimalReport.DoesNotExist:
            return Response(
                {"detail": f"Report #{report_id} does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as exc:
            err_msg = str(exc)
            if "not authorized" in err_msg.lower():
                return Response({"detail": err_msg}, status=status.HTTP_403_FORBIDDEN)
            return Response({"detail": err_msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "message": "Rescue report closed.",
                "report": AnimalReportSerializer(report).data,
            },
            status=status.HTTP_200_OK,
        )


class VerifyReportView(APIView):
    """
    POST /api/reports/<report_id>/verify/ -> Verify a reported animal case.
    Delegates directly to verify_report() service.
    ADMIN users only.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, report_id):
        comment = request.data.get("comment", "")

        try:
            report = verify_report(report_id=report_id, changed_by=request.user, comment=comment)
        except AnimalReport.DoesNotExist:
            return Response(
                {"detail": f"Report #{report_id} does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Report successfully verified.",
                "report": AnimalReportSerializer(report).data,
            },
            status=status.HTTP_200_OK,
        )

