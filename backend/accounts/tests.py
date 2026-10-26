from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AuthenticationAPITestCase(APITestCase):
    def setUp(self):
        self.register_url = reverse("auth_register")
        self.login_url = reverse("auth_login")
        self.refresh_url = reverse("auth_token_refresh")
        self.me_url = reverse("auth_me")

        self.user_data = {
            "email": "testuser@example.com",
            "password": "Password123!",
            "first_name": "Test",
            "last_name": "User",
        }

    def test_successful_registration(self):
        response = self.client.post(self.register_url, self.user_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "testuser@example.com")
        self.assertEqual(response.data["role"], User.Role.CITIZEN)
        self.assertNotIn("password", response.data)

        # Verify database record
        user = User.objects.get(email="testuser@example.com")
        self.assertEqual(user.role, User.Role.CITIZEN)
        self.assertEqual(user.first_name, "Test")

    def test_duplicate_email_registration_fails(self):
        self.client.post(self.register_url, self.user_data, format="json")
        response = self.client.post(self.register_url, self.user_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_password_hashing(self):
        self.client.post(self.register_url, self.user_data, format="json")
        user = User.objects.get(email="testuser@example.com")

        self.assertNotEqual(user.password, "Password123!")
        self.assertTrue(user.check_password("Password123!"))

    def test_attempted_admin_registration_fails(self):
        admin_data = self.user_data.copy()
        admin_data["role"] = "ADMIN"

        response = self.client.post(self.register_url, admin_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

        # Ensure no ADMIN user was created
        self.assertFalse(User.objects.filter(email="testuser@example.com").exists())

    def test_successful_login(self):
        # First register
        self.client.post(self.register_url, self.user_data, format="json")

        login_payload = {
            "email": "testuser@example.com",
            "password": "Password123!",
        }
        response = self.client.post(self.login_url, login_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "testuser@example.com")

    def test_invalid_login_fails(self):
        self.client.post(self.register_url, self.user_data, format="json")

        wrong_password_payload = {
            "email": "testuser@example.com",
            "password": "WrongPassword123!",
        }
        response = self.client.post(self.login_url, wrong_password_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        self.client.post(self.register_url, self.user_data, format="json")
        login_res = self.client.post(self.login_url, {
            "email": "testuser@example.com",
            "password": "Password123!",
        }, format="json")
        refresh_token = login_res.data["refresh"]

        response = self.client.post(self.refresh_url, {"refresh": refresh_token}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_authenticated_me_endpoint(self):
        self.client.post(self.register_url, self.user_data, format="json")
        login_res = self.client.post(self.login_url, {
            "email": "testuser@example.com",
            "password": "Password123!",
        }, format="json")
        access_token = login_res.data["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "testuser@example.com")
        self.assertEqual(response.data["role"], User.Role.CITIZEN)
        self.assertNotIn("password", response.data)

    def test_unauthenticated_me_endpoint_fails(self):
        self.client.credentials()  # Clear credentials
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_includes_ngo_profile_for_ngo_user(self):
        from ngos.models import NGOProfile
        ngo_user = User.objects.create_user(
            email="ngo_test@example.com",
            password="Password123!",
            role=User.Role.NGO,
        )
        NGOProfile.objects.create(
            user=ngo_user,
            organization_name="Sanctuary One",
            phone="9999999999",
            email="sanctuary@example.com",
            address="Green Valley",
            operating_radius_km=15,
            verification_status=NGOProfile.VerificationStatus.VERIFIED,
        )
        self.client.force_authenticate(user=ngo_user)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], User.Role.NGO)
        self.assertIsNotNone(response.data.get("ngo_profile"))
        self.assertEqual(response.data["ngo_profile"]["organization_name"], "Sanctuary One")
        self.assertEqual(response.data["ngo_profile"]["verification_status"], "VERIFIED")

    def test_me_endpoint_returns_null_ngo_profile_for_citizen(self):
        citizen_user = User.objects.create_user(
            email="cit_test@example.com",
            password="Password123!",
            role=User.Role.CITIZEN,
        )
        self.client.force_authenticate(user=citizen_user)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data.get("ngo_profile"))

    def test_successful_ngo_registration_creates_user_and_pending_profile(self):
        from ngos.models import NGOProfile

        ngo_payload = {
            "email": "new_ngo@example.com",
            "password": "Password123!",
            "password_confirm": "Password123!",
            "first_name": "Rescue",
            "last_name": "Leader",
            "role": "NGO",
            "organization_name": "Paws & Wings Sanctuary",
            "description": "Rescue operations for strays",
            "phone": "+91 9876543210",
            "organization_email": "contact@pawsandwings.org",
            "address": "456 Wildlife Road, Bengaluru",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "operating_radius_km": 25,
        }
        response = self.client.post(self.register_url, ngo_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], User.Role.NGO)
        self.assertIsNotNone(response.data.get("ngo_profile"))
        self.assertEqual(response.data["ngo_profile"]["organization_name"], "Paws & Wings Sanctuary")
        self.assertEqual(response.data["ngo_profile"]["verification_status"], "PENDING")
        self.assertIsNone(response.data["ngo_profile"]["verified_at"])
        self.assertEqual(response.data["ngo_profile"]["operating_radius_km"], 25)

        # Verify DB records
        user = User.objects.get(email="new_ngo@example.com")
        self.assertEqual(user.role, User.Role.NGO)
        self.assertTrue(hasattr(user, "ngo_profile"))
        profile = user.ngo_profile
        self.assertEqual(profile.organization_name, "Paws & Wings Sanctuary")
        self.assertEqual(profile.verification_status, NGOProfile.VerificationStatus.PENDING)
        self.assertIsNone(profile.verified_at)
        self.assertAlmostEqual(profile.location.x, 77.5946, places=4)
        self.assertAlmostEqual(profile.location.y, 12.9716, places=4)

    def test_ngo_registration_with_nested_ngo_profile_dict(self):
        ngo_payload = {
            "email": "nested_ngo@example.com",
            "password": "Password123!",
            "role": "NGO",
            "ngo_profile": {
                "organization_name": "Nested Wildlife",
                "phone": "9988776655",
                "address": "Sanctuary Hill",
                "latitude": 12.9720,
                "longitude": 77.5950,
                "operating_radius_km": 15,
            },
        }
        response = self.client.post(self.register_url, ngo_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["ngo_profile"]["organization_name"], "Nested Wildlife")
        self.assertEqual(response.data["ngo_profile"]["verification_status"], "PENDING")

    def test_ngo_registration_cannot_self_verify(self):
        from ngos.models import NGOProfile

        ngo_payload = {
            "email": "cheat_ngo@example.com",
            "password": "Password123!",
            "role": "NGO",
            "organization_name": "Cheat Sanctuary",
            "phone": "1234567890",
            "address": "Cheater Lane",
            "latitude": 12.97,
            "longitude": 77.59,
            "verification_status": "VERIFIED",
        }
        response = self.client.post(self.register_url, ngo_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="cheat_ngo@example.com")
        self.assertEqual(user.ngo_profile.verification_status, NGOProfile.VerificationStatus.PENDING)

    def test_ngo_registration_missing_fields_fails(self):
        base_payload = {
            "email": "invalid_ngo@example.com",
            "password": "Password123!",
            "role": "NGO",
        }

        # Missing organization_name
        p1 = base_payload.copy()
        p1.update({"phone": "123", "address": "abc", "latitude": 10.0, "longitude": 70.0})
        r1 = self.client.post(self.register_url, p1, format="json")
        self.assertEqual(r1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("organization_name", r1.data)

        # Missing phone
        p2 = base_payload.copy()
        p2.update({"organization_name": "Org", "address": "abc", "latitude": 10.0, "longitude": 70.0})
        r2 = self.client.post(self.register_url, p2, format="json")
        self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", r2.data)

        # Missing address
        p3 = base_payload.copy()
        p3.update({"organization_name": "Org", "phone": "123", "latitude": 10.0, "longitude": 70.0})
        r3 = self.client.post(self.register_url, p3, format="json")
        self.assertEqual(r3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("address", r3.data)

        # Missing coordinates
        p4 = base_payload.copy()
        p4.update({"organization_name": "Org", "phone": "123", "address": "abc"})
        r4 = self.client.post(self.register_url, p4, format="json")
        self.assertEqual(r4.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("latitude", r4.data)
        self.assertIn("longitude", r4.data)

    def test_ngo_registration_invalid_coordinates_and_radius_rejected(self):
        base_payload = {
            "email": "invalid_coords@example.com",
            "password": "Password123!",
            "role": "NGO",
            "organization_name": "Org",
            "phone": "1234567890",
            "address": "Street",
            "latitude": 95.0,  # invalid (> 90)
            "longitude": 77.0,
            "operating_radius_km": 150,  # invalid (> 100)
        }
        response = self.client.post(self.register_url, base_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("latitude", response.data)
        self.assertIn("operating_radius_km", response.data)

    def test_failed_ngo_registration_rolls_back_atomically(self):
        from unittest.mock import patch
        from ngos.models import NGOProfile

        initial_user_count = User.objects.count()
        initial_ngo_count = NGOProfile.objects.count()

        ngo_payload = {
            "email": "rollback_ngo@example.com",
            "password": "Password123!",
            "role": "NGO",
            "organization_name": "Crash Org",
            "phone": "1234567890",
            "address": "Crash St",
            "latitude": 12.97,
            "longitude": 77.59,
        }

        with patch.object(NGOProfile.objects, "create", side_effect=RuntimeError("Simulated DB Crash")):
            with self.assertRaises(RuntimeError):
                self.client.post(self.register_url, ngo_payload, format="json")

        self.assertEqual(User.objects.count(), initial_user_count)
        self.assertEqual(NGOProfile.objects.count(), initial_ngo_count)
        self.assertFalse(User.objects.filter(email="rollback_ngo@example.com").exists())

    def test_pending_ngo_cannot_access_ngo_protected_operations(self):
        ngo_payload = {
            "email": "pending_ops@example.com",
            "password": "Password123!",
            "role": "NGO",
            "organization_name": "Pending Ops",
            "phone": "1234567890",
            "address": "Pending Lane",
            "latitude": 12.97,
            "longitude": 77.59,
        }
        reg_res = self.client.post(self.register_url, ngo_payload, format="json")
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)

        login_res = self.client.post(self.login_url, {
            "email": "pending_ops@example.com",
            "password": "Password123!",
        }, format="json")
        access_token = login_res.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Discovery endpoint should return 403 Forbidden
        discover_res = self.client.get(reverse("ngo-discover-reports"))
        self.assertEqual(discover_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Access restricted to verified NGO accounts", discover_res.data["detail"])

        # Assignments endpoint should return 403 Forbidden
        asgn_res = self.client.get(reverse("ngo-assignment-list"))
        self.assertEqual(asgn_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_and_approve_registered_ngo(self):
        ngo_payload = {
            "email": "to_approve@example.com",
            "password": "Password123!",
            "role": "NGO",
            "organization_name": "Ready For Approval",
            "phone": "1234567890",
            "address": "Station 9",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "operating_radius_km": 15,
        }
        reg_res = self.client.post(self.register_url, ngo_payload, format="json")
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)
        ngo_profile_id = reg_res.data["ngo_profile"]["id"]

        admin_user = User.objects.create_user(
            email="admin_approver@example.com",
            password="Password123!",
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=admin_user)

        # Admin lists NGOs
        list_res = self.client.get(reverse("admin-ngo-list") + "?status=PENDING")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        pending_ids = [n["id"] for n in list_res.data]
        self.assertIn(ngo_profile_id, pending_ids)

        # Admin verifies the NGO
        verify_url = reverse("admin-ngo-verify", kwargs={"ngo_id": ngo_profile_id})
        verify_res = self.client.post(verify_url)
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertEqual(verify_res.data["ngo"]["verification_status"], "VERIFIED")

        # Authenticate as approved NGO -> discover reports succeeds
        approved_ngo_user = User.objects.get(email="to_approve@example.com")
        self.client.force_authenticate(user=approved_ngo_user)
        discover_res = self.client.get(reverse("ngo-discover-reports"))
        self.assertEqual(discover_res.status_code, status.HTTP_200_OK)
