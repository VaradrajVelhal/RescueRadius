from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ngos.models import NGOProfile
from rescue.models import Animal, AnimalReport, ReportStatusHistory, RescueAssignment

User = get_user_model()


class NGOAPITestCase(APITestCase):
    def setUp(self):
        self.discover_url = reverse("ngo-discover-reports")
        self.assignments_url = reverse("ngo-assignment-list")

        # Citizen user
        self.citizen = User.objects.create_user(
            email="citizen@example.com",
            password="password123",
            role=User.Role.CITIZEN,
        )

        # Verified NGO A
        self.ngo_user_a = User.objects.create_user(
            email="ngo_a@example.com",
            password="password123",
            role=User.Role.NGO,
        )
        self.ngo_profile_a = NGOProfile.objects.create(
            user=self.ngo_user_a,
            organization_name="NGO Alpha",
            phone="1111111111",
            email="ngo_a@example.com",
            address="Center Street 1",
            operating_radius_km=10,
            verification_status=NGOProfile.VerificationStatus.VERIFIED,
            location=Point(77.5946, 12.9716),
        )

        # Verified NGO B
        self.ngo_user_b = User.objects.create_user(
            email="ngo_b@example.com",
            password="password123",
            role=User.Role.NGO,
        )
        self.ngo_profile_b = NGOProfile.objects.create(
            user=self.ngo_user_b,
            organization_name="NGO Beta",
            phone="2222222222",
            email="ngo_b@example.com",
            address="Center Street 2",
            operating_radius_km=10,
            verification_status=NGOProfile.VerificationStatus.VERIFIED,
            location=Point(77.5946, 12.9716),
        )

        # Unverified NGO
        self.unverified_ngo_user = User.objects.create_user(
            email="unverified_ngo@example.com",
            password="password123",
            role=User.Role.NGO,
        )
        self.unverified_ngo_profile = NGOProfile.objects.create(
            user=self.unverified_ngo_user,
            organization_name="Unverified NGO",
            phone="3333333333",
            email="unverified_ngo@example.com",
            address="Pending St",
            operating_radius_km=10,
            verification_status=NGOProfile.VerificationStatus.PENDING,
            location=Point(77.5946, 12.9716),
        )

        # Animal & Reports
        self.animal = Animal.objects.create(species="Dog", breed="Labrador")

        # Nearby verified report
        self.nearby_report = AnimalReport.objects.create(
            reporter=self.citizen,
            animal=self.animal,
            description="Nearby injured dog",
            urgency=AnimalReport.Urgency.HIGH,
            location=Point(77.5980, 12.9720),
            status=AnimalReport.Status.VERIFIED,
        )

        # Distant verified report
        self.distant_report = AnimalReport.objects.create(
            reporter=self.citizen,
            animal=self.animal,
            description="Distant injured dog",
            urgency=AnimalReport.Urgency.HIGH,
            location=Point(78.0000, 13.5000),
            status=AnimalReport.Status.VERIFIED,
        )

        # Unverified status report
        self.unverified_status_report = AnimalReport.objects.create(
            reporter=self.citizen,
            animal=self.animal,
            description="Unverified report nearby",
            urgency=AnimalReport.Urgency.MEDIUM,
            location=Point(77.5950, 12.9720),
            status=AnimalReport.Status.REPORTED,
        )

    def test_verified_ngo_can_discover_nearby_verified_reports(self):
        self.client.force_authenticate(user=self.ngo_user_a)
        response = self.client.get(self.discover_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report_ids = [r["id"] for r in response.data]

        self.assertIn(self.nearby_report.id, report_ids)
        self.assertNotIn(self.distant_report.id, report_ids)
        self.assertNotIn(self.unverified_status_report.id, report_ids)

        first_result = response.data[0]
        self.assertIn("distance_meters", first_result)
        self.assertIn("distance_km", first_result)

    def test_distant_reports_are_excluded(self):
        self.client.force_authenticate(user=self.ngo_user_a)
        response = self.client.get(self.discover_url)

        report_ids = [r["id"] for r in response.data]
        self.assertNotIn(self.distant_report.id, report_ids)

    def test_unverified_ngo_cannot_discover_or_claim_cases(self):
        self.client.force_authenticate(user=self.unverified_ngo_user)
        discover_res = self.client.get(self.discover_url)
        self.assertEqual(discover_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Access restricted to verified NGO accounts", discover_res.data["detail"])

        claim_url = reverse("ngo-claim-report", kwargs={"report_id": self.nearby_report.id})
        claim_res = self.client.post(claim_url)
        self.assertEqual(claim_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Access restricted to verified NGO accounts", claim_res.data["detail"])

    def test_ngo_without_profile_cannot_discover_reports(self):
        ngo_no_profile = User.objects.create_user(
            email="noprofile@example.com",
            password="password123",
            role=User.Role.NGO,
        )
        self.client.force_authenticate(user=ngo_no_profile)
        discover_res = self.client.get(self.discover_url)
        self.assertEqual(discover_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Access restricted to verified NGO accounts", discover_res.data["detail"])

    def test_citizen_cannot_use_ngo_endpoints(self):
        self.client.force_authenticate(user=self.citizen)

        discover_res = self.client.get(self.discover_url)
        self.assertEqual(discover_res.status_code, status.HTTP_403_FORBIDDEN)

        claim_url = reverse("ngo-claim-report", kwargs={"report_id": self.nearby_report.id})
        claim_res = self.client.post(claim_url)
        self.assertEqual(claim_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_ngo_can_claim_verified_report(self):
        self.client.force_authenticate(user=self.ngo_user_a)
        claim_url = reverse("ngo-claim-report", kwargs={"report_id": self.nearby_report.id})
        response = self.client.post(claim_url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.nearby_report.refresh_from_db()
        self.assertEqual(self.nearby_report.status, AnimalReport.Status.CLAIMED)
        assignment = RescueAssignment.objects.get(report=self.nearby_report)
        self.assertEqual(assignment.ngo, self.ngo_profile_a)

    def test_second_ngo_cannot_claim_same_report(self):
        self.client.force_authenticate(user=self.ngo_user_a)
        claim_url = reverse("ngo-claim-report", kwargs={"report_id": self.nearby_report.id})
        self.client.post(claim_url)

        self.client.force_authenticate(user=self.ngo_user_b)
        response = self.client.post(claim_url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verified_assigned_ngo_can_start_rescue(self):
        # NGO A claims report
        self.client.force_authenticate(user=self.ngo_user_a)
        claim_url = reverse("ngo-claim-report", kwargs={"report_id": self.nearby_report.id})
        self.client.post(claim_url)

        # NGO A starts rescue
        start_url = reverse("ngo-start-rescue", kwargs={"report_id": self.nearby_report.id})
        response = self.client.post(start_url, {"comment": "En route"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.nearby_report.refresh_from_db()
        self.assertEqual(self.nearby_report.status, AnimalReport.Status.IN_PROGRESS)

        # Check ReportStatusHistory
        history = ReportStatusHistory.objects.filter(
            report=self.nearby_report, new_status=AnimalReport.Status.IN_PROGRESS
        ).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_status, AnimalReport.Status.CLAIMED)
        self.assertEqual(history.comment, "En route")

    def test_wrong_ngo_cannot_start_rescue(self):
        # NGO A claims report
        self.client.force_authenticate(user=self.ngo_user_a)
        claim_url = reverse("ngo-claim-report", kwargs={"report_id": self.nearby_report.id})
        self.client.post(claim_url)

        # NGO B attempts to start rescue
        self.client.force_authenticate(user=self.ngo_user_b)
        start_url = reverse("ngo-start-rescue", kwargs={"report_id": self.nearby_report.id})
        response = self.client.post(start_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_citizen_cannot_start_rescue(self):
        self.client.force_authenticate(user=self.ngo_user_a)
        claim_url = reverse("ngo-claim-report", kwargs={"report_id": self.nearby_report.id})
        self.client.post(claim_url)

        self.client.force_authenticate(user=self.citizen)
        start_url = reverse("ngo-start-rescue", kwargs={"report_id": self.nearby_report.id})
        response = self.client.post(start_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_verified_assigned_ngo_can_complete_rescue(self):
        self.client.force_authenticate(user=self.ngo_user_a)
        claim_url = reverse("ngo-claim-report", kwargs={"report_id": self.nearby_report.id})
        self.client.post(claim_url)

        start_url = reverse("ngo-start-rescue", kwargs={"report_id": self.nearby_report.id})
        self.client.post(start_url)

        complete_url = reverse("ngo-complete-rescue", kwargs={"report_id": self.nearby_report.id})
        response = self.client.post(complete_url, {"comment": "Rescued safely"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.nearby_report.refresh_from_db()
        self.assertEqual(self.nearby_report.status, AnimalReport.Status.RESCUED)

        assignment = RescueAssignment.objects.get(report=self.nearby_report)
        self.assertEqual(assignment.status, RescueAssignment.Status.COMPLETED)
        self.assertIsNotNone(assignment.completed_at)

        # Check ReportStatusHistory
        history = ReportStatusHistory.objects.filter(
            report=self.nearby_report, new_status=AnimalReport.Status.RESCUED
        ).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_status, AnimalReport.Status.IN_PROGRESS)

    def test_wrong_ngo_cannot_complete_rescue(self):
        self.client.force_authenticate(user=self.ngo_user_a)
        claim_url = reverse("ngo-claim-report", kwargs={"report_id": self.nearby_report.id})
        self.client.post(claim_url)
        start_url = reverse("ngo-start-rescue", kwargs={"report_id": self.nearby_report.id})
        self.client.post(start_url)

        self.client.force_authenticate(user=self.ngo_user_b)
        complete_url = reverse("ngo-complete-rescue", kwargs={"report_id": self.nearby_report.id})
        response = self.client.post(complete_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminNGOManagementAPITestCase(APITestCase):
    def setUp(self):
        self.list_url = reverse("admin-ngo-list")

        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="password123",
            role=User.Role.ADMIN,
        )
        self.citizen = User.objects.create_user(
            email="citizen@example.com",
            password="password123",
            role=User.Role.CITIZEN,
        )
        self.ngo_user_pending = User.objects.create_user(
            email="ngo_pending@example.com",
            password="password123",
            role=User.Role.NGO,
        )
        self.pending_ngo = NGOProfile.objects.create(
            user=self.ngo_user_pending,
            organization_name="Pending NGO",
            phone="1234567890",
            email="ngo_pending@example.com",
            address="Address 1",
            operating_radius_km=10,
            verification_status=NGOProfile.VerificationStatus.PENDING,
        )

        self.ngo_user_verified = User.objects.create_user(
            email="ngo_verified@example.com",
            password="password123",
            role=User.Role.NGO,
        )
        self.verified_ngo = NGOProfile.objects.create(
            user=self.ngo_user_verified,
            organization_name="Verified NGO",
            phone="0987654321",
            email="ngo_verified@example.com",
            address="Address 2",
            operating_radius_km=15,
            verification_status=NGOProfile.VerificationStatus.VERIFIED,
        )

    def test_admin_can_list_ngo_applications(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_ngo_status_filtering_works(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"{self.list_url}?status=PENDING")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.pending_ngo.id)

    def test_admin_can_get_ngo_detail(self):
        self.client.force_authenticate(user=self.admin)
        detail_url = reverse("admin-ngo-detail", kwargs={"pk": self.pending_ngo.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["organization_name"], "Pending NGO")

    def test_admin_can_verify_pending_ngo(self):
        self.client.force_authenticate(user=self.admin)
        verify_url = reverse("admin-ngo-verify", kwargs={"ngo_id": self.pending_ngo.id})
        response = self.client.post(verify_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pending_ngo.refresh_from_db()
        self.assertEqual(self.pending_ngo.verification_status, NGOProfile.VerificationStatus.VERIFIED)
        self.assertIsNotNone(self.pending_ngo.verified_at)

    def test_admin_can_reject_pending_ngo(self):
        self.client.force_authenticate(user=self.admin)
        reject_url = reverse("admin-ngo-reject", kwargs={"ngo_id": self.pending_ngo.id})
        response = self.client.post(reject_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pending_ngo.refresh_from_db()
        self.assertEqual(self.pending_ngo.verification_status, NGOProfile.VerificationStatus.REJECTED)

    def test_admin_can_suspend_verified_ngo(self):
        self.client.force_authenticate(user=self.admin)
        suspend_url = reverse("admin-ngo-suspend", kwargs={"ngo_id": self.verified_ngo.id})
        response = self.client.post(suspend_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.verified_ngo.refresh_from_db()
        self.assertEqual(self.verified_ngo.verification_status, NGOProfile.VerificationStatus.SUSPENDED)

    def test_non_admin_users_cannot_access_or_mutate_ngo_applications(self):
        # Citizen
        self.client.force_authenticate(user=self.citizen)
        self.assertEqual(self.client.get(self.list_url).status_code, status.HTTP_403_FORBIDDEN)
        verify_url = reverse("admin-ngo-verify", kwargs={"ngo_id": self.pending_ngo.id})
        self.assertEqual(self.client.post(verify_url).status_code, status.HTTP_403_FORBIDDEN)

        # NGO User
        self.client.force_authenticate(user=self.ngo_user_pending)
        self.assertEqual(self.client.get(self.list_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post(verify_url).status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_ngo_state_transitions_rejected(self):
        self.client.force_authenticate(user=self.admin)
        # Cannot verify an already verified NGO
        verify_url = reverse("admin-ngo-verify", kwargs={"ngo_id": self.verified_ngo.id})
        res = self.client.post(verify_url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Cannot reject a verified NGO directly
        reject_url = reverse("admin-ngo-reject", kwargs={"ngo_id": self.verified_ngo.id})
        res_reject = self.client.post(reject_url)
        self.assertEqual(res_reject.status_code, status.HTTP_400_BAD_REQUEST)

