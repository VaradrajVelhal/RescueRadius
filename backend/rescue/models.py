
from django.conf import settings
from django.contrib.gis.db import models


class Animal(models.Model):
    species = models.CharField(max_length=50)
    breed = models.CharField(max_length=100, blank=True)
    color = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.species


class AnimalReport(models.Model):

    class Urgency(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    class Status(models.TextChoices):
        REPORTED = "REPORTED", "Reported"
        VERIFIED = "VERIFIED", "Verified"
        CLAIMED = "CLAIMED", "Claimed"
        IN_PROGRESS = "IN_PROGRESS", "Rescue In Progress"
        RESCUED = "RESCUED", "Rescued"
        CLOSED = "CLOSED", "Closed"

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="animal_reports"
    )

    animal = models.ForeignKey(
        Animal,
        on_delete=models.PROTECT,
        related_name="reports"
    )

    description = models.TextField()

    urgency = models.CharField(
        max_length=20,
        choices=Urgency.choices,
        default=Urgency.MEDIUM
    )

    address = models.TextField(blank=True)

    location = models.PointField(
    geography=True,
    srid=4326,
    null=True,
    blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REPORTED
    )

    reported_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Report #{self.pk} - {self.animal.species}"

class AnimalImage(models.Model):
    report = models.ForeignKey(
        AnimalReport,
        on_delete=models.CASCADE,
        related_name="images"
    )

    image = models.ImageField(
        upload_to="animal_reports/"
    )

    is_primary = models.BooleanField(default=False)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for Report #{self.report_id}"





class ReportStatusHistory(models.Model):
    report = models.ForeignKey(
        AnimalReport,
        on_delete=models.CASCADE,
        related_name="status_history"
    )

    old_status = models.CharField(
        max_length=20,
        choices=AnimalReport.Status.choices,
        null=True,
        blank=True
    )

    new_status = models.CharField(
        max_length=20,
        choices=AnimalReport.Status.choices
    )

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="status_changes"
    )

    comment = models.TextField(blank=True)

    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["changed_at"]

    def __str__(self):
        return (
            f"Report #{self.report_id}: "
            f"{self.old_status} → {self.new_status}"
        )


class RescueAssignment(models.Model):

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    report = models.OneToOneField(
        AnimalReport,
        on_delete=models.CASCADE,
        related_name="assignment",
    )

    ngo = models.ForeignKey(
        "ngos.NGOProfile",
        on_delete=models.PROTECT,
        related_name="assignments",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    claimed_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"Report #{self.report_id} → {self.ngo.organization_name}"