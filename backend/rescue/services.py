from django.db import transaction
from django.utils import timezone

from notifications.models import Notification
from notifications.services import create_notification
from .models import AnimalReport, ReportStatusHistory, RescueAssignment


@transaction.atomic
def verify_report(report_id, changed_by, comment=""):
    """
    Transition report status from REPORTED to VERIFIED.
    """
    report = (
        AnimalReport.objects
        .select_for_update()
        .get(pk=report_id)
    )

    if report.status != AnimalReport.Status.REPORTED:
        raise ValueError(
            f"Report cannot be verified from status {report.status}"
        )

    old_status = report.status
    report.status = AnimalReport.Status.VERIFIED
    report.save(update_fields=["status", "updated_at"])

    ReportStatusHistory.objects.create(
        report=report,
        old_status=old_status,
        new_status=AnimalReport.Status.VERIFIED,
        changed_by=changed_by,
        comment=comment,
    )

    create_notification(
        recipient=report.reporter,
        report=report,
        notification_type=Notification.NotificationType.REPORT_VERIFIED,
        title="Report Verified",
        message=f"Your animal rescue report #{report.id} ({report.animal.species}) has been verified.",
    )

    return report


@transaction.atomic
def claim_report(report_id, ngo, comment=""):
    """
    Transition report status from VERIFIED to CLAIMED and assign to NGO.
    Guarantees concurrency safety using select_for_update().
    """
    report = (
        AnimalReport.objects
        .select_for_update()
        .get(pk=report_id)
    )

    if report.status != AnimalReport.Status.VERIFIED:
        raise ValueError(
            f"Report cannot be claimed from status {report.status}"
        )

    if RescueAssignment.objects.filter(
        report=report,
        status=RescueAssignment.Status.ACTIVE,
    ).exists():
        raise ValueError("Report has already been claimed")

    assignment = RescueAssignment.objects.create(
        report=report,
        ngo=ngo,
        status=RescueAssignment.Status.ACTIVE,
    )

    old_status = report.status
    report.status = AnimalReport.Status.CLAIMED
    report.save(update_fields=["status", "updated_at"])

    ReportStatusHistory.objects.create(
        report=report,
        old_status=old_status,
        new_status=AnimalReport.Status.CLAIMED,
        changed_by=ngo.user,
        comment=comment,
    )

    create_notification(
        recipient=report.reporter,
        report=report,
        notification_type=Notification.NotificationType.CASE_CLAIMED,
        title="Rescue Case Claimed",
        message=f"NGO '{ngo.organization_name}' has claimed your rescue report #{report.id}.",
    )

    return assignment


@transaction.atomic
def start_rescue(report_id, ngo, comment=""):
    """
    Transition report status from CLAIMED to IN_PROGRESS.
    Requires the report to be in CLAIMED status and the specified NGO
    to own the active RescueAssignment.
    """
    report = (
        AnimalReport.objects
        .select_for_update()
        .get(pk=report_id)
    )

    if report.status != AnimalReport.Status.CLAIMED:
        raise ValueError(
            f"Rescue cannot be started from status {report.status}"
        )

    try:
        assignment = report.assignment
    except RescueAssignment.DoesNotExist:
        raise ValueError("No active rescue assignment found for this report")

    if assignment.status != RescueAssignment.Status.ACTIVE or assignment.ngo != ngo:
        raise ValueError("NGO does not own the active rescue assignment for this report")

    old_status = report.status
    report.status = AnimalReport.Status.IN_PROGRESS
    report.save(update_fields=["status", "updated_at"])

    ReportStatusHistory.objects.create(
        report=report,
        old_status=old_status,
        new_status=AnimalReport.Status.IN_PROGRESS,
        changed_by=ngo.user,
        comment=comment,
    )

    create_notification(
        recipient=report.reporter,
        report=report,
        notification_type=Notification.NotificationType.RESCUE_STARTED,
        title="Rescue Operations Started",
        message=f"Rescue operations have started for report #{report.id}.",
    )

    return report


@transaction.atomic
def complete_rescue(report_id, ngo, comment=""):
    """
    Transition report status from IN_PROGRESS to RESCUED.
    Requires the report to be in IN_PROGRESS status and the specified NGO
    to own the active RescueAssignment. Sets assignment status to COMPLETED
    and sets completed_at timestamp.
    """
    report = (
        AnimalReport.objects
        .select_for_update()
        .get(pk=report_id)
    )

    if report.status != AnimalReport.Status.IN_PROGRESS:
        raise ValueError(
            f"Rescue cannot be completed from status {report.status}"
        )

    try:
        assignment = report.assignment
    except RescueAssignment.DoesNotExist:
        raise ValueError("No active rescue assignment found for this report")

    if assignment.status != RescueAssignment.Status.ACTIVE or assignment.ngo != ngo:
        raise ValueError("NGO does not own the active rescue assignment for this report")

    now = timezone.now()
    assignment.status = RescueAssignment.Status.COMPLETED
    assignment.completed_at = now
    assignment.save(update_fields=["status", "completed_at"])

    old_status = report.status
    report.status = AnimalReport.Status.RESCUED
    report.save(update_fields=["status", "updated_at"])

    ReportStatusHistory.objects.create(
        report=report,
        old_status=old_status,
        new_status=AnimalReport.Status.RESCUED,
        changed_by=ngo.user,
        comment=comment,
    )

    create_notification(
        recipient=report.reporter,
        report=report,
        notification_type=Notification.NotificationType.ANIMAL_RESCUED,
        title="Animal Rescued",
        message=f"The animal in report #{report.id} has been successfully rescued!",
    )

    return report


@transaction.atomic
def close_report(report_id, user, comment=""):
    """
    Transition report status from RESCUED to CLOSED.
    Only authorized users (reporter, assigned NGO user, or admin/staff) can close the report.
    Sets closed_at timestamp on the report.
    """
    report = (
        AnimalReport.objects
        .select_for_update()
        .get(pk=report_id)
    )

    if report.status != AnimalReport.Status.RESCUED:
        raise ValueError(
            f"Report cannot be closed from status {report.status}"
        )

    is_reporter = report.reporter == user
    is_assigned_ngo_user = hasattr(report, "assignment") and report.assignment.ngo.user == user
    is_admin = getattr(user, "role", None) == "ADMIN" or getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)

    if not (is_reporter or is_assigned_ngo_user or is_admin):
        raise ValueError("User is not authorized to close this report")

    now = timezone.now()
    old_status = report.status
    report.status = AnimalReport.Status.CLOSED
    report.closed_at = now
    report.save(update_fields=["status", "closed_at", "updated_at"])

    ReportStatusHistory.objects.create(
        report=report,
        old_status=old_status,
        new_status=AnimalReport.Status.CLOSED,
        changed_by=user,
        comment=comment,
    )

    create_notification(
        recipient=report.reporter,
        report=report,
        notification_type=Notification.NotificationType.CASE_CLOSED,
        title="Case Closed",
        message=f"Rescue report #{report.id} has been closed.",
    )

    return report