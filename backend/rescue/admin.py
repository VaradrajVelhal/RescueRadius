
from django.contrib import admin
from .models import (
    Animal,
    AnimalReport,
    AnimalImage,
    ReportStatusHistory,
    RescueAssignment,
)


@admin.register(Animal)
class AnimalAdmin(admin.ModelAdmin):
    list_display = ["id", "species", "breed", "color"]


@admin.register(AnimalReport)
class AnimalReportAdmin(admin.ModelAdmin):
    list_display = [
        "id", "reporter", "animal",
        "urgency", "status", "reported_at"
    ]
    list_filter = ["urgency", "status"]
    search_fields = ["description", "reporter__email"]


from .models import AnimalImage


@admin.register(AnimalImage)
class AnimalImageAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "report",
        "is_primary",
        "uploaded_at",
    ]

@admin.register(ReportStatusHistory)
class ReportStatusHistoryAdmin(admin.ModelAdmin):
    list_display = [
        "report",
        "old_status",
        "new_status",
        "changed_by",
        "changed_at",
    ]

    list_filter = [
        "old_status",
        "new_status",
    ]

@admin.register(RescueAssignment)
class RescueAssignmentAdmin(admin.ModelAdmin):
    list_display = [
        "report",
        "ngo",
        "status",
        "claimed_at",
        "completed_at",
    ]

    list_filter = ["status"]

    search_fields = [
        "ngo__organization_name",
        "report__id",
    ]