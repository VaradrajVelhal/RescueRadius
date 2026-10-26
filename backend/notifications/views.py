from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .permissions import IsNotificationRecipient
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/ -> List authenticated user's notifications.
    Supports optional filtering by ?is_read=true or ?is_read=false.
    Ordered newest first.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Notification.objects.none()

        queryset = Notification.objects.filter(recipient=user)

        is_read_param = self.request.query_params.get("is_read")
        if is_read_param is not None:
            if is_read_param.lower() in ["true", "1"]:
                queryset = queryset.filter(is_read=True)
            elif is_read_param.lower() in ["false", "0"]:
                queryset = queryset.filter(is_read=False)

        return queryset.order_by("-created_at")


class MarkNotificationReadView(APIView):
    """
    PATCH /api/notifications/<id>/read/ -> Mark a specific notification as read.
    Recipient user only.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk)
        except Notification.DoesNotExist:
            return Response(
                {"detail": f"Notification #{pk} does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if notification.recipient != request.user:
            return Response(
                {"detail": "You do not have permission to modify this notification."},
                status=status.HTTP_403_FORBIDDEN,
            )

        notification.is_read = True
        notification.save(update_fields=["is_read"])

        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_200_OK,
        )


class MarkAllNotificationsReadView(APIView):
    """
    POST /api/notifications/mark-all-read/ -> Mark all notifications for request.user as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True)

        return Response(
            {
                "message": "All notifications marked as read.",
                "updated_count": updated_count,
            },
            status=status.HTTP_200_OK,
        )
