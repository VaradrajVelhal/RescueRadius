from django.urls import path
from .admin_views import (
    AdminNGODetailView,
    AdminNGOListView,
    AdminNGORejectView,
    AdminNGOSuspendView,
    AdminNGOVerifyView,
)

urlpatterns = [
    path("", AdminNGOListView.as_view(), name="admin-ngo-list"),
    path("<int:pk>/", AdminNGODetailView.as_view(), name="admin-ngo-detail"),
    path("<int:ngo_id>/verify/", AdminNGOVerifyView.as_view(), name="admin-ngo-verify"),
    path("<int:ngo_id>/reject/", AdminNGORejectView.as_view(), name="admin-ngo-reject"),
    path("<int:ngo_id>/suspend/", AdminNGOSuspendView.as_view(), name="admin-ngo-suspend"),
]
