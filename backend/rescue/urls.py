from django.urls import path

from .views import (
    AnimalReportDetailView,
    AnimalReportListCreateView,
    CloseReportView,
    VerifyReportView,
)

urlpatterns = [
    path("", AnimalReportListCreateView.as_view(), name="report-list-create"),
    path("<int:pk>/", AnimalReportDetailView.as_view(), name="report-detail"),
    path("<int:report_id>/close/", CloseReportView.as_view(), name="report-close"),
    path("<int:report_id>/verify/", VerifyReportView.as_view(), name="report-verify"),
]

