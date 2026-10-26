from django.urls import path

from .views import (
    ClaimReportView,
    CompleteRescueView,
    NGOAssignmentDetailView,
    NGOAssignmentListView,
    NGODiscoverReportsView,
    StartRescueView,
)

urlpatterns = [
    path("reports/", NGODiscoverReportsView.as_view(), name="ngo-discover-reports"),
    path("reports/<int:report_id>/claim/", ClaimReportView.as_view(), name="ngo-claim-report"),
    path("reports/<int:report_id>/start/", StartRescueView.as_view(), name="ngo-start-rescue"),
    path("reports/<int:report_id>/complete/", CompleteRescueView.as_view(), name="ngo-complete-rescue"),
    path("assignments/", NGOAssignmentListView.as_view(), name="ngo-assignment-list"),
    path("assignments/<int:pk>/", NGOAssignmentDetailView.as_view(), name="ngo-assignment-detail"),
]
