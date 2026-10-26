from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.db import transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ngos.models import NGOProfile
from notifications.models import Notification
from rescue.models import Animal, AnimalReport
from rescue.services import (
    claim_report,
    close_report,
    complete_rescue,
    start_rescue,
    verify_report,
)

User = get_user_model()


class NotificationAPITestCase(APITestCase):
    def setUp(self):
        self.list_url = reverse("notification-list")
        self.mark_all_read_url = reverse("notification-mark-all-read")

        self.user_a = User.objects.create_user(
            email="usera@example.com",
            password="password123",
            role=User.Role.CITIZEN,
        )
        self.user_b = User.objects.create_user(
            email="userb@example.com",
            password="password123",
            role=User.Role.CITIZEN,
        )

        self.notif_a1 = Notification.objects.create(
            recipient=self.user_a,
            notification_type=Notification.NotificationType.REPORT_VERIFIED,
            title="Notification 1",
            message="Message 1",
            is_read=False,
        )
        self.notif_a2 = Notification.objects.create(
            recipient=self.user_a,
            notification_type=Notification.NotificationType.CASE_CLAIMED,
            title="Notification 2",
            message="Message 2",
            is_read=True,
        )
        self.notif_b = Notification.objects.create(
            recipient=self.user_b,
            notification_type=Notification.NotificationType.REPORT_VERIFIED,
            title="User B Notification",
            message="Message B",
            is_read=False,
        )

    def test_authenticated_user_can_list_own_notifications(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notif_ids = [n["id"] for n in response.data]

        self.assertIn(self.notif_a1.id, notif_ids)
        self.assertIn(self.notif_a2.id, notif_ids)
        self.assertNotIn(self.notif_b.id, notif_ids)

    def test_unauthenticated_access_rejected(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_is_read_filtering(self):
        self.client.force_authenticate(user=self.user_a)

        # Unread notifications only
        unread_res = self.client.get(f"{self.list_url}?is_read=false")
        self.assertEqual(unread_res.status_code, status.HTTP_200_OK)
        unread_ids = [n["id"] for n in unread_res.data]
        self.assertIn(self.notif_a1.id, unread_ids)
        self.assertNotIn(self.notif_a2.id, unread_ids)

        # Read notifications only
        read_res = self.client.get(f"{self.list_url}?is_read=true")
        self.assertEqual(read_res.status_code, status.HTTP_200_OK)
        read_ids = [n["id"] for n in read_res.data]
        self.assertNotIn(self.notif_a1.id, read_ids)
        self.assertIn(self.notif_a2.id, read_ids)

    def test_user_can_mark_own_notification_as_read(self):
        self.client.force_authenticate(user=self.user_a)
        read_url = reverse("notification-mark-read", kwargs={"pk": self.notif_a1.id})
        response = self.client.patch(read_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_read"])

        self.notif_a1.refresh_from_db()
        self.assertTrue(self.notif_a1.is_read)

    def test_user_cannot_mark_another_users_notification_as_read(self):
        self.client.force_authenticate(user=self.user_a)
        read_url = reverse("notification-mark-read", kwargs={"pk": self.notif_b.id})
        response = self.client.patch(read_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.notif_b.refresh_from_db()
        self.assertFalse(self.notif_b.is_read)

    def test_mark_all_read_only_affects_current_user(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(self.mark_all_read_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["updated_count"], 1)

        self.notif_a1.refresh_from_db()
        self.assertTrue(self.notif_a1.is_read)

        self.notif_b.refresh_from_db()
        self.assertFalse(self.notif_b.is_read)


class WorkflowNotificationIntegrationTestCase(TestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            email="citizen@example.com",
            password="password123",
            role=User.Role.CITIZEN,
        )
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="password123",
            role=User.Role.ADMIN,
        )
        self.ngo_user = User.objects.create_user(
            email="ngo@example.com",
            password="password123",
            role=User.Role.NGO,
        )

        self.ngo_profile = NGOProfile.objects.create(
            user=self.ngo_user,
            organization_name="Rescue Paws",
            phone="1234567890",
            email="ngo@example.com",
            address="Street 1",
            operating_radius_km=10,
            verification_status=NGOProfile.VerificationStatus.VERIFIED,
            location=Point(77.5946, 12.9716),
        )

        self.animal = Animal.objects.create(species="Dog", breed="Indie")
        self.report = AnimalReport.objects.create(
            reporter=self.citizen,
            animal=self.animal,
            description="Injured dog",
            urgency=AnimalReport.Urgency.HIGH,
            location=Point(77.5950, 12.9720),
            status=AnimalReport.Status.REPORTED,
        )

    def test_notifications_created_for_full_rescue_lifecycle(self):
        verify_report(self.report.id, changed_by=self.admin)
        notif1 = Notification.objects.filter(
            recipient=self.citizen,
            notification_type=Notification.NotificationType.REPORT_VERIFIED
        ).first()
        self.assertIsNotNone(notif1)
        self.assertEqual(notif1.report, self.report)

        claim_report(self.report.id, self.ngo_profile)
        notif2 = Notification.objects.filter(
            recipient=self.citizen,
            notification_type=Notification.NotificationType.CASE_CLAIMED
        ).first()
        self.assertIsNotNone(notif2)

        start_rescue(self.report.id, self.ngo_profile)
        notif3 = Notification.objects.filter(
            recipient=self.citizen,
            notification_type=Notification.NotificationType.RESCUE_STARTED
        ).first()
        self.assertIsNotNone(notif3)

        complete_rescue(self.report.id, self.ngo_profile)
        notif4 = Notification.objects.filter(
            recipient=self.citizen,
            notification_type=Notification.NotificationType.ANIMAL_RESCUED
        ).first()
        self.assertIsNotNone(notif4)

        close_report(self.report.id, self.citizen)
        notif5 = Notification.objects.filter(
            recipient=self.citizen,
            notification_type=Notification.NotificationType.CASE_CLOSED
        ).first()
        self.assertIsNotNone(notif5)

    def test_notifications_transactional_rollback(self):
        initial_notif_count = Notification.objects.count()

        try:
            with transaction.atomic():
                claim_report(self.report.id, self.ngo_profile)
        except ValueError:
            pass

        self.assertEqual(Notification.objects.count(), initial_notif_count)
