from django.contrib.gis.db.models import PointField
from django.contrib.gis.db.models.functions import Distance
from django.db.models import Value

from .models import NGOProfile


def find_nearby_ngos(report):
    report_location = Value(
        report.location,
        output_field=PointField(srid=4326, geography=True),
    )

    ngos = (
        NGOProfile.objects
        .filter(
            verification_status=NGOProfile.VerificationStatus.VERIFIED,
        )
        .annotate(
            distance=Distance("location", report_location)
        )
        .order_by("distance")
    )

    return [
        ngo
        for ngo in ngos
        if ngo.distance.m <= ngo.operating_radius_km * 1000
    ]