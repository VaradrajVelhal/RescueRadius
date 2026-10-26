from django.contrib import admin

from .models import NGOProfile


@admin.register(NGOProfile)
class NGOProfileAdmin(admin.ModelAdmin):
    list_display = [
        "organization_name",
        "user",
        "verification_status",
        "operating_radius_km",
        "created_at",
    ]

    list_filter = [
        "verification_status",
    ]

    search_fields = [
        "organization_name",
        "user__email",
    ]