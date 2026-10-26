from django.contrib.gis.geos import Point
from rest_framework import serializers

from accounts.serializers import UserMeSerializer
from .models import Animal, AnimalImage, AnimalReport


class AnimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Animal
        fields = ("id", "species", "breed", "color")


class AnimalImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnimalImage
        fields = ("id", "image", "is_primary", "uploaded_at")


class AnimalReportSerializer(serializers.ModelSerializer):
    animal = AnimalSerializer(read_only=True)
    images = AnimalImageSerializer(many=True, read_only=True)
    reporter = UserMeSerializer(read_only=True)
    location = serializers.SerializerMethodField()

    class Meta:
        model = AnimalReport
        fields = (
            "id",
            "reporter",
            "animal",
            "description",
            "urgency",
            "address",
            "location",
            "status",
            "reported_at",
            "updated_at",
            "closed_at",
            "images",
        )
        read_only_fields = fields

    def get_location(self, obj):
        if obj.location:
            return {
                "latitude": obj.location.y,
                "longitude": obj.location.x,
            }
        return None


class AnimalReportCreateSerializer(serializers.Serializer):
    species = serializers.CharField(max_length=50, required=True)
    breed = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    color = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    description = serializers.CharField(required=True)
    urgency = serializers.ChoiceField(choices=AnimalReport.Urgency.choices, default=AnimalReport.Urgency.MEDIUM)
    address = serializers.CharField(required=False, allow_blank=True, default="")
    latitude = serializers.FloatField(required=True, min_value=-90.0, max_value=90.0)
    longitude = serializers.FloatField(required=True, min_value=-180.0, max_value=180.0)
    images = serializers.ListField(
        child=serializers.ImageField(max_length=100000, allow_empty_file=False, use_url=False),
        required=False,
        default=list,
    )

    def validate_latitude(self, value):
        if value < -90.0 or value > 90.0:
            raise serializers.ValidationError("Latitude must be between -90 and 90 degrees.")
        return value

    def validate_longitude(self, value):
        if value < -180.0 or value > 180.0:
            raise serializers.ValidationError("Longitude must be between -180 and 180 degrees.")
        return value

    def create(self, validated_data):
        species = validated_data.pop("species")
        breed = validated_data.pop("breed", "")
        color = validated_data.pop("color", "")
        latitude = validated_data.pop("latitude")
        longitude = validated_data.pop("longitude")
        image_files = validated_data.pop("images", [])

        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required to create a report.")

        animal = Animal.objects.create(
            species=species,
            breed=breed,
            color=color,
        )

        location = Point(x=longitude, y=latitude, srid=4326)

        report = AnimalReport.objects.create(
            reporter=request.user,
            animal=animal,
            description=validated_data.get("description"),
            urgency=validated_data.get("urgency", AnimalReport.Urgency.MEDIUM),
            address=validated_data.get("address", ""),
            location=location,
            status=AnimalReport.Status.REPORTED,
        )

        for index, img_file in enumerate(image_files):
            AnimalImage.objects.create(
                report=report,
                image=img_file,
                is_primary=(index == 0),
            )

        return report


class AnimalReportUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnimalReport
        fields = ("description", "address", "urgency")

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.data:
            restricted_fields = ["status", "reporter", "closed_at", "reported_at", "location"]
            for field in restricted_fields:
                if field in request.data:
                    raise serializers.ValidationError({
                        field: f"Field '{field}' cannot be updated directly through this API."
                    })
        return attrs
