from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


from notifications.models import Notification
from ngos.models import NGOProfile
from rescue.models import Animal, AnimalReport, ReportStatusHistory, RescueAssignment
from rescue.services import (
    claim_report,
    close_report,
    complete_rescue,
    start_rescue,
)

User = get_user_model()


class RescueWorkflowServicesTestCase(TestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            email="citizen@example.com",
            password="password123",
            role=User.Role.CITIZEN,
        )
        self.ngo_user = User.objects.create_user(
            email="ngo@example.com",
            password="password123",
            role=User.Role.NGO,
        )
        self.other_ngo_user = User.objects.create_user(
            email="other_ngo@example.com",
            password="password123",
            role=User.Role.NGO,
        )
        self.unauthorized_citizen = User.objects.create_user(
            email="unauth@example.com",
            password="password123",
            role=User.Role.CITIZEN,
        )
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="password123",
            role=User.Role.ADMIN,
        )

        self.ngo_profile = NGOProfile.objects.create(
            user=self.ngo_user,
            organization_name="Paws Care",
            phone="1234567890",
            email="ngo@example.com",
            address="123 Rescue St",
            operating_radius_km=15,
            verification_status=NGOProfile.VerificationStatus.VERIFIED,
            location=Point(77.5946, 12.9716),
        )

        self.other_ngo_profile = NGOProfile.objects.create(
            user=self.other_ngo_user,
            organization_name="Other Paws",
            phone="0987654321",
            email="other_ngo@example.com",
            address="456 Shelter Rd",
            operating_radius_km=10,
            verification_status=NGOProfile.VerificationStatus.VERIFIED,
            location=Point(77.6000, 12.9800),
        )

        self.animal = Animal.objects.create(
            species="Dog",
            breed="Indie",
            color="Brown",
        )

        self.report = AnimalReport.objects.create(
            reporter=self.citizen,
            animal=self.animal,
            description="Injured dog near park",
            urgency=AnimalReport.Urgency.HIGH,
            location=Point(77.5950, 12.9720),
            status=AnimalReport.Status.VERIFIED,
        )

    def test_start_rescue_success(self):
        assignment = claim_report(self.report.id, self.ngo_profile)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, AnimalReport.Status.CLAIMED)

        updated_report = start_rescue(self.report.id, self.ngo_profile, comment="Starting rescue operations")
        self.assertEqual(updated_report.status, AnimalReport.Status.IN_PROGRESS)

        history = ReportStatusHistory.objects.filter(
            report=self.report,
            new_status=AnimalReport.Status.IN_PROGRESS,
        ).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_status, AnimalReport.Status.CLAIMED)

    def test_start_rescue_invalid_status_fails(self):
        with self.assertRaises(ValueError):
            start_rescue(self.report.id, self.ngo_profile)

    def test_start_rescue_unauthorized_ngo_fails(self):
        claim_report(self.report.id, self.ngo_profile)
        with self.assertRaises(ValueError):
            start_rescue(self.report.id, self.other_ngo_profile)

    def test_complete_rescue_success(self):
        claim_report(self.report.id, self.ngo_profile)
        start_rescue(self.report.id, self.ngo_profile)

        updated_report = complete_rescue(self.report.id, self.ngo_profile, comment="Animal safely rescued")
        self.assertEqual(updated_report.status, AnimalReport.Status.RESCUED)

        assignment = RescueAssignment.objects.get(report=self.report)
        self.assertEqual(assignment.status, RescueAssignment.Status.COMPLETED)

    def test_complete_rescue_invalid_status_fails(self):
        claim_report(self.report.id, self.ngo_profile)
        with self.assertRaises(ValueError):
            complete_rescue(self.report.id, self.ngo_profile)

    def test_close_report_success_by_reporter(self):
        claim_report(self.report.id, self.ngo_profile)
        start_rescue(self.report.id, self.ngo_profile)
        complete_rescue(self.report.id, self.ngo_profile)

        updated_report = close_report(self.report.id, self.citizen, comment="Closing case")
        self.assertEqual(updated_report.status, AnimalReport.Status.CLOSED)

    def test_close_report_unauthorized_user_fails(self):
        claim_report(self.report.id, self.ngo_profile)
        start_rescue(self.report.id, self.ngo_profile)
        complete_rescue(self.report.id, self.ngo_profile)

        with self.assertRaises(ValueError):
            close_report(self.report.id, self.unauthorized_citizen)


class AnimalReportAPITestCase(APITestCase):
    def setUp(self):
        self.list_create_url = reverse("report-list-create")

        self.citizen = User.objects.create_user(
            email="citizen@example.com",
            password="password123",
            role=User.Role.CITIZEN,
        )
        self.other_citizen = User.objects.create_user(
            email="other_citizen@example.com",
            password="password123",
            role=User.Role.CITIZEN,
        )
        self.admin_user = User.objects.create_user(
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
            organization_name="Paws Care",
            phone="1234567890",
            email="ngo@example.com",
            address="123 Rescue St",
            operating_radius_km=15,
            verification_status=NGOProfile.VerificationStatus.VERIFIED,
            location=Point(77.5946, 12.9716),
        )

        self.valid_payload = {
            "species": "Cat",
            "breed": "Persian",
            "color": "White",
            "description": "Injured cat near street market",
            "urgency": "HIGH",
            "address": "123 Main St, Bangalore",
            "latitude": 12.9720,
            "longitude": 77.5950,
        }

    def test_citizen_can_create_report(self):
        self.client.force_authenticate(user=self.citizen)
        response = self.client.post(self.list_create_url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["animal"]["species"], "Cat")
        self.assertEqual(response.data["status"], AnimalReport.Status.REPORTED)
        self.assertEqual(response.data["reporter"]["email"], "citizen@example.com")

        # Verify DB entry
        report = AnimalReport.objects.get(id=response.data["id"])
        self.assertEqual(report.reporter, self.citizen)
        self.assertEqual(report.status, AnimalReport.Status.REPORTED)

    def test_unauthenticated_user_cannot_create_report(self):
        self.client.logout()
        response = self.client.post(self.list_create_url, self.valid_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reporter_is_automatically_request_user_and_cannot_be_overridden(self):
        self.client.force_authenticate(user=self.citizen)
        payload = self.valid_payload.copy()
        payload["reporter"] = self.other_citizen.id  # Attempt to forge reporter

        response = self.client.post(self.list_create_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["reporter"]["email"], "citizen@example.com")

        report = AnimalReport.objects.get(id=response.data["id"])
        self.assertEqual(report.reporter, self.citizen)
        self.assertNotEqual(report.reporter, self.other_citizen)

    def test_new_report_starts_as_reported(self):
        self.client.force_authenticate(user=self.citizen)
        payload = self.valid_payload.copy()
        payload["status"] = "RESCUED"  # Attempt to forge status

        response = self.client.post(self.list_create_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], AnimalReport.Status.REPORTED)

    def test_invalid_urgency_rejected(self):
        self.client.force_authenticate(user=self.citizen)
        payload = self.valid_payload.copy()
        payload["urgency"] = "EXTREME_SUPER_URGENT"

        response = self.client.post(self.list_create_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("urgency", response.data)

    def test_invalid_coordinates_rejected(self):
        self.client.force_authenticate(user=self.citizen)
        payload = self.valid_payload.copy()
        payload["latitude"] = 100.0  # Invalid latitude (> 90)

        response = self.client.post(self.list_create_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("latitude", response.data)

    def test_citizen_can_retrieve_their_own_report(self):
        self.client.force_authenticate(user=self.citizen)
        res = self.client.post(self.list_create_url, self.valid_payload, format="json")
        report_id = res.data["id"]

        detail_url = reverse("report-detail", kwargs={"pk": report_id})
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], report_id)

    def test_unauthorized_citizen_cannot_access_another_citizens_report(self):
        # Citizen creates a report
        self.client.force_authenticate(user=self.citizen)
        res = self.client.post(self.list_create_url, self.valid_payload, format="json")
        report_id = res.data["id"]

        # Other citizen attempts to access it
        self.client.force_authenticate(user=self.other_citizen)
        detail_url = reverse("report-detail", kwargs={"pk": report_id})
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_all_reports(self):
        self.client.force_authenticate(user=self.citizen)
        res = self.client.post(self.list_create_url, self.valid_payload, format="json")
        report_id = res.data["id"]

        self.client.force_authenticate(user=self.admin_user)
        detail_url = reverse("report-detail", kwargs={"pk": report_id})
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], report_id)

    def test_ngo_access_nearby_verified_reports(self):
        # Create a report as citizen and verify it
        animal = Animal.objects.create(species="Dog")
        report = AnimalReport.objects.create(
            reporter=self.citizen,
            animal=animal,
            description="Verified report nearby",
            urgency=AnimalReport.Urgency.HIGH,
            location=Point(77.5950, 12.9720),  # Close to NGO location (77.5946, 12.9716)
            status=AnimalReport.Status.VERIFIED,
        )

        self.client.force_authenticate(user=self.ngo_user)
        response = self.client.get(self.list_create_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report_ids = [r["id"] for r in response.data]
        self.assertIn(report.id, report_ids)

    def test_status_cannot_be_directly_modified_through_report_api(self):
        self.client.force_authenticate(user=self.citizen)
        res = self.client.post(self.list_create_url, self.valid_payload, format="json")
        report_id = res.data["id"]

        detail_url = reverse("report-detail", kwargs={"pk": report_id})
        patch_payload = {
            "status": "RESCUED",
            "description": "Updated description",
        }
        response = self.client.patch(detail_url, patch_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

        # Verify status did not change in DB
        report = AnimalReport.objects.get(id=report_id)
        self.assertEqual(report.status, AnimalReport.Status.REPORTED)

    def test_close_report_via_api_success(self):
        # Create a report in RESCUED status
        animal = Animal.objects.create(species="Cat")
        rescued_report = AnimalReport.objects.create(
            reporter=self.citizen,
            animal=animal,
            description="Rescued cat",
            urgency=AnimalReport.Urgency.HIGH,
            location=Point(77.5950, 12.9720),
            status=AnimalReport.Status.RESCUED,
        )

        close_url = reverse("report-close", kwargs={"report_id": rescued_report.id})
        self.client.force_authenticate(user=self.citizen)
        response = self.client.post(close_url, {"comment": "Case closed by reporter"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rescued_report.refresh_from_db()
        self.assertEqual(rescued_report.status, AnimalReport.Status.CLOSED)
        self.assertIsNotNone(rescued_report.closed_at)

        # Verify ReportStatusHistory created
        history = ReportStatusHistory.objects.filter(
            report=rescued_report, new_status=AnimalReport.Status.CLOSED
        ).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_status, AnimalReport.Status.RESCUED)

    def test_close_report_via_api_unauthorized_fails(self):
        animal = Animal.objects.create(species="Cat")
        rescued_report = AnimalReport.objects.create(
            reporter=self.citizen,
            animal=animal,
            description="Rescued cat",
            urgency=AnimalReport.Urgency.HIGH,
            location=Point(77.5950, 12.9720),
            status=AnimalReport.Status.RESCUED,
        )

        close_url = reverse("report-close", kwargs={"report_id": rescued_report.id})
        self.client.force_authenticate(user=self.other_citizen)
        response = self.client.post(close_url, {"comment": "Unauthorized close"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_verify_report(self):
        self.client.force_authenticate(user=self.citizen)
        res = self.client.post(self.list_create_url, self.valid_payload, format="json")
        report_id = res.data["id"]

        self.client.force_authenticate(user=self.admin_user)
        verify_url = reverse("report-verify", kwargs={"report_id": report_id})
        response = self.client.post(verify_url, {"comment": "Verified by admin"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report = AnimalReport.objects.get(id=report_id)
        self.assertEqual(report.status, AnimalReport.Status.VERIFIED)

        # Check ReportStatusHistory created
        history = ReportStatusHistory.objects.filter(
            report=report, new_status=AnimalReport.Status.VERIFIED
        ).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_status, AnimalReport.Status.REPORTED)
        self.assertEqual(history.comment, "Verified by admin")

        # Check Notification created
        notification = Notification.objects.filter(
            recipient=self.citizen, report=report, notification_type=Notification.NotificationType.REPORT_VERIFIED
        ).first()
        self.assertIsNotNone(notification)

    def test_non_admin_cannot_verify_report(self):
        self.client.force_authenticate(user=self.citizen)
        res = self.client.post(self.list_create_url, self.valid_payload, format="json")
        report_id = res.data["id"]

        verify_url = reverse("report-verify", kwargs={"report_id": report_id})

        # Citizen attempt
        self.client.force_authenticate(user=self.other_citizen)
        res_cit = self.client.post(verify_url)
        self.assertEqual(res_cit.status_code, status.HTTP_403_FORBIDDEN)

        # NGO attempt
        self.client.force_authenticate(user=self.ngo_user)
        res_ngo = self.client.post(verify_url)
        self.assertEqual(res_ngo.status_code, status.HTTP_403_FORBIDDEN)

    def test_verify_report_invalid_status_rejected(self):
        animal = Animal.objects.create(species="Dog")
        verified_report = AnimalReport.objects.create(
            reporter=self.citizen,
            animal=animal,
            description="Already verified",
            urgency=AnimalReport.Urgency.HIGH,
            location=Point(77.5950, 12.9720),
            status=AnimalReport.Status.VERIFIED,
        )

        self.client.force_authenticate(user=self.admin_user)
        verify_url = reverse("report-verify", kwargs={"report_id": verified_report.id})
        response = self.client.post(verify_url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


