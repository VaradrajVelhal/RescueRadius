from rest_framework import serializers

from rescue.serializers import AnimalReportSerializer
from rescue.models import RescueAssignment
from .models import NGOProfile


class NGOProfileSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()

    class Meta:
        model = NGOProfile
        fields = (
            "id",
            "organization_name",
            "description",
            "phone",
            "email",
            "address",
            "operating_radius_km",
            "verification_status",
            "verified_at",
            "location",
            "created_at",
        )
        read_only_fields = fields

    def get_location(self, obj):
        if obj.location:
            return {
                "latitude": obj.location.y,
                "longitude": obj.location.x,
            }
        return None


class NGODiscoverReportSerializer(AnimalReportSerializer):
    distance_meters = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()

    class Meta(AnimalReportSerializer.Meta):
        fields = AnimalReportSerializer.Meta.fields + (
            "distance_meters",
            "distance_km",
        )

    def get_distance_meters(self, obj):
        if hasattr(obj, "distance") and obj.distance:
            return round(obj.distance.m, 2)
        return None

    def get_distance_km(self, obj):
        if hasattr(obj, "distance") and obj.distance:
            return round(obj.distance.km, 2)
        return None


class RescueAssignmentSerializer(serializers.ModelSerializer):
    report = AnimalReportSerializer(read_only=True)
    ngo = NGOProfileSerializer(read_only=True)

    class Meta:
        model = RescueAssignment
        fields = (
            "id",
            "report",
            "ngo",
            "status",
            "claimed_at",
            "completed_at",
        )
        read_only_fields = fields
