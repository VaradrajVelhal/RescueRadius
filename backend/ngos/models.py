from django.conf import settings
from django.contrib.gis.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class NGOProfile(models.Model):

    class VerificationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"
        SUSPENDED = "SUSPENDED", "Suspended"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ngo_profile",
    )

    organization_name = models.CharField(max_length=200)

    description = models.TextField(
        blank=True
    )

    phone = models.CharField(
        max_length=20
    )

    email = models.EmailField()

    address = models.TextField()

    operating_radius_km = models.PositiveIntegerField(
    default=10,
    validators=[
        MinValueValidator(1),
        MaxValueValidator(100),
    ],
    )

    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )

    verified_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    location = models.PointField(
    geography=True,
    srid=4326,
    null=True,
    blank=True,
    )
    
    def __str__(self):
        return self.organization_name