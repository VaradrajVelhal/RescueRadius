from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
        min_length=8,
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=False,
        style={"input_type": "password"},
    )
    role = serializers.CharField(required=False, default=User.Role.CITIZEN)

    # NGO profile fields (optional for citizens, strictly validated for NGOs)
    organization_name = serializers.CharField(required=False, allow_blank=True, max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    organization_email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.FloatField(required=False, allow_null=True, min_value=-90.0, max_value=90.0)
    longitude = serializers.FloatField(required=False, allow_null=True, min_value=-180.0, max_value=180.0)
    operating_radius_km = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=100, default=10)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "role",
            "organization_name",
            "description",
            "phone",
            "organization_email",
            "address",
            "latitude",
            "longitude",
            "operating_radius_km",
        )

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        # Support nested ngo_profile or organization dictionary if provided
        ngo_data = data.get("ngo_profile") or data.get("organization")
        if isinstance(ngo_data, dict):
            for field in [
                "organization_name",
                "description",
                "phone",
                "organization_email",
                "email",
                "address",
                "latitude",
                "longitude",
                "operating_radius_km",
            ]:
                if field in ngo_data and field not in data:
                    if field == "email" and "organization_email" not in data:
                        data["organization_email"] = ngo_data["email"]
                    else:
                        data[field] = ngo_data[field]
        return super().to_internal_value(data)

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_role(self, value):
        if not value:
            return User.Role.CITIZEN
        role_upper = value.upper()
        if role_upper == User.Role.ADMIN:
            raise serializers.ValidationError("Public registration as ADMIN is not allowed.")
        if role_upper not in [User.Role.CITIZEN, User.Role.NGO]:
            raise serializers.ValidationError(f"Invalid role '{value}'. Must be CITIZEN or NGO.")
        return role_upper

    def validate(self, attrs):
        password_confirm = attrs.get("password_confirm")
        if password_confirm and attrs["password"] != password_confirm:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        role = attrs.get("role", User.Role.CITIZEN)
        if role == User.Role.NGO:
            errors = {}

            org_name = attrs.get("organization_name")
            if not org_name or not str(org_name).strip():
                errors["organization_name"] = "Organization name is required for NGO registration."

            phone = attrs.get("phone")
            if not phone or not str(phone).strip():
                errors["phone"] = "Contact phone number is required for NGO registration."

            address = attrs.get("address")
            if not address or not str(address).strip():
                errors["address"] = "Address is required for NGO registration."

            lat = attrs.get("latitude")
            if lat is None:
                errors["latitude"] = "Latitude coordinate is required for NGO registration."

            lng = attrs.get("longitude")
            if lng is None:
                errors["longitude"] = "Longitude coordinate is required for NGO registration."

            radius = attrs.get("operating_radius_km")
            if radius is not None and (radius < 1 or radius > 100):
                errors["operating_radius_km"] = "Operating radius must be between 1 and 100 km."

            if errors:
                raise serializers.ValidationError(errors)

        return attrs

    def create(self, validated_data):
        from django.db import transaction
        from django.contrib.gis.geos import Point
        from ngos.models import NGOProfile

        validated_data.pop("password_confirm", None)
        password = validated_data.pop("password")
        role = validated_data.pop("role", User.Role.CITIZEN)

        # Pop NGO profile fields
        org_name = validated_data.pop("organization_name", None)
        description = validated_data.pop("description", "")
        phone = validated_data.pop("phone", None)
        org_email = validated_data.pop("organization_email", None)
        address = validated_data.pop("address", None)
        latitude = validated_data.pop("latitude", None)
        longitude = validated_data.pop("longitude", None)
        operating_radius_km = validated_data.pop("operating_radius_km", 10) or 10

        with transaction.atomic():
            user = User.objects.create_user(
                password=password,
                role=role,
                **validated_data
            )

            if role == User.Role.NGO:
                contact_email = org_email.strip() if org_email and str(org_email).strip() else user.email
                location = Point(x=longitude, y=latitude, srid=4326)

                NGOProfile.objects.create(
                    user=user,
                    organization_name=org_name.strip(),
                    description=description.strip() if description else "",
                    phone=phone.strip(),
                    email=contact_email,
                    address=address.strip(),
                    operating_radius_km=operating_radius_km,
                    location=location,
                    verification_status=NGOProfile.VerificationStatus.PENDING,
                    verified_at=None,
                )

        return user


class UserMeSerializer(serializers.ModelSerializer):
    ngo_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "created_at", "updated_at", "ngo_profile")
        read_only_fields = fields

    def get_ngo_profile(self, obj):
        if getattr(obj, "role", None) == User.Role.NGO and hasattr(obj, "ngo_profile") and obj.ngo_profile:
            from ngos.serializers import NGOProfileSerializer
            return NGOProfileSerializer(obj.ngo_profile).data
        return None


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        user_data = {
            "id": self.user.id,
            "email": self.user.email,
            "role": self.user.role,
        }
        if self.user.role == User.Role.NGO and hasattr(self.user, "ngo_profile") and self.user.ngo_profile:
            from ngos.serializers import NGOProfileSerializer
            user_data["ngo_profile"] = NGOProfileSerializer(self.user.ngo_profile).data
        else:
            user_data["ngo_profile"] = None
        data["user"] = user_data
        return data
