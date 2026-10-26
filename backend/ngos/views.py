from django.contrib.gis.db.models import PointField
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from django.db.models import Value
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from rescue.models import AnimalReport, RescueAssignment
from rescue.serializers import AnimalReportSerializer
from rescue.services import claim_report, complete_rescue, start_rescue
from .permissions import IsAssignmentOwner, IsVerifiedNGO
from .serializers import (
    NGODiscoverReportSerializer,
    RescueAssignmentSerializer,
)


class NGODiscoverReportsView(generics.ListAPIView):
    """
    GET /api/ngo/reports/ -> List nearby VERIFIED reports within NGO operating radius
    Annotates PostGIS distance and orders by nearest distance first.
    """
    permission_classes = [permissions.IsAuthenticated, IsVerifiedNGO]
    serializer_class = NGODiscoverReportSerializer

    def get_queryset(self):
        ngo = self.request.user.ngo_profile
        if not ngo.location:
            return AnimalReport.objects.none()

        ngo_location = Value(
            ngo.location,
            output_field=PointField(srid=4326, geography=True),
        )

        return (
            AnimalReport.objects
            .filter(
                status=AnimalReport.Status.VERIFIED,
                location__distance_lte=(ngo.location, D(km=ngo.operating_radius_km)),
            )
            .annotate(
                distance=Distance("location", ngo_location)
            )
            .select_related("reporter", "animal")
            .prefetch_related("images")
            .order_by("distance")
        )


class ClaimReportView(APIView):
    """
    POST /api/ngo/reports/<report_id>/claim/ -> Claim a verified report using existing concurrency-safe service.
    """
    permission_classes = [permissions.IsAuthenticated, IsVerifiedNGO]

    def post(self, request, report_id):
        ngo = request.user.ngo_profile

        try:
            assignment = claim_report(report_id=report_id, ngo=ngo)
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

        report = AnimalReport.objects.select_related("reporter", "animal").prefetch_related("images").get(pk=report_id)

        return Response(
            {
                "message": "Report successfully claimed.",
                "assignment": RescueAssignmentSerializer(assignment).data,
                "report": AnimalReportSerializer(report).data,
            },
            status=status.HTTP_201_CREATED,
        )


class StartRescueView(APIView):
    """
    POST /api/ngo/reports/<report_id>/start/ -> Start rescue operation on a claimed report.
    """
    permission_classes = [permissions.IsAuthenticated, IsVerifiedNGO]

    def post(self, request, report_id):
        ngo = request.user.ngo_profile
        comment = request.data.get("comment", "")

        try:
            report = start_rescue(report_id=report_id, ngo=ngo, comment=comment)
        except AnimalReport.DoesNotExist:
            return Response(
                {"detail": f"Report #{report_id} does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as exc:
            err_msg = str(exc)
            if "not authorized" in err_msg.lower() or "does not own" in err_msg.lower():
                return Response({"detail": err_msg}, status=status.HTTP_403_FORBIDDEN)
            return Response({"detail": err_msg}, status=status.HTTP_400_BAD_REQUEST)

        assignment = getattr(report, "assignment", None)
        return Response(
            {
                "message": "Rescue operation started.",
                "report": AnimalReportSerializer(report).data,
                "assignment": RescueAssignmentSerializer(assignment).data if assignment else None,
            },
            status=status.HTTP_200_OK,
        )


class CompleteRescueView(APIView):
    """
    POST /api/ngo/reports/<report_id>/complete/ -> Complete rescue operation on an in-progress report.
    """
    permission_classes = [permissions.IsAuthenticated, IsVerifiedNGO]

    def post(self, request, report_id):
        ngo = request.user.ngo_profile
        comment = request.data.get("comment", "")

        try:
            report = complete_rescue(report_id=report_id, ngo=ngo, comment=comment)
        except AnimalReport.DoesNotExist:
            return Response(
                {"detail": f"Report #{report_id} does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as exc:
            err_msg = str(exc)
            if "not authorized" in err_msg.lower() or "does not own" in err_msg.lower():
                return Response({"detail": err_msg}, status=status.HTTP_403_FORBIDDEN)
            return Response({"detail": err_msg}, status=status.HTTP_400_BAD_REQUEST)

        assignment = getattr(report, "assignment", None)
        return Response(
            {
                "message": "Rescue operation completed successfully.",
                "report": AnimalReportSerializer(report).data,
                "assignment": RescueAssignmentSerializer(assignment).data if assignment else None,
            },
            status=status.HTTP_200_OK,
        )


class NGOAssignmentListView(generics.ListAPIView):
    """
    GET /api/ngo/assignments/ -> List rescue assignments belonging to the authenticated NGO
    """
    permission_classes = [permissions.IsAuthenticated, IsVerifiedNGO]
    serializer_class = RescueAssignmentSerializer

    def get_queryset(self):
        ngo = self.request.user.ngo_profile
        queryset = RescueAssignment.objects.filter(ngo=ngo).select_related(
            "report", "report__reporter", "report__animal", "ngo"
        ).prefetch_related("report__images")

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param.upper())

        return queryset.order_by("-claimed_at")


class NGOAssignmentDetailView(generics.RetrieveAPIView):
    """
    GET /api/ngo/assignments/<id>/ -> Retrieve single assignment if owned by the authenticated NGO
    """
    permission_classes = [permissions.IsAuthenticated, IsVerifiedNGO, IsAssignmentOwner]
    serializer_class = RescueAssignmentSerializer
    queryset = RescueAssignment.objects.select_related(
        "report", "report__reporter", "report__animal", "ngo"
    ).prefetch_related("report__images")
