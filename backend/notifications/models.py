from django.conf import settings
from django.db import models


class Notification(models.Model):

    class NotificationType(models.TextChoices):
        REPORT_VERIFIED = "REPORT_VERIFIED", "Report Verified"
        CASE_CLAIMED = "CASE_CLAIMED", "Case Claimed"
        RESCUE_STARTED = "RESCUE_STARTED", "Rescue Started"
        ANIMAL_RESCUED = "ANIMAL_RESCUED", "Animal Rescued"
        CASE_CLOSED = "CASE_CLOSED", "Case Closed"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    report = models.ForeignKey(
        "rescue.AnimalReport",
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )

    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
    )

    title = models.CharField(max_length=200)

    message = models.TextField()

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.recipient.email} - {self.title}"