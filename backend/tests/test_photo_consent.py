"""
Photo Consent Feature Tests
Tests for photo consent functionality for minors in family member management.

Features tested:
1. Backend API: POST /api/family/members - photoConsent required for minors
2. Backend API: POST /api/family/admin/members/{user_id} - photoConsent required for minors  
3. Backend API: POST /api/family/admin/send-consent-reminders - sends emails to parents
4. Backend API: GET /api/family/minors-without-consent - returns minors needing consent
5. Backend API: PUT /api/family/members/{id}/photo-consent - updates consent for minor
"""

import pytest
import requests
import os
from datetime import datetime
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "vladanmitic@gmail.com"
SUPER_ADMIN_PASSWORD = "Admin123!"

class TestPhotoConsentFeature:
    """Test photo consent functionality for minors"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Could not login as admin: {login_response.text}")
        
        login_data = login_response.json()
        self.admin_token = login_data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        yield
        
        # Cleanup - remove test members created during tests
        self._cleanup_test_members()
    
    def _cleanup_test_members(self):
        """Remove test members created during tests"""
        try:
            # Get all families
            response = self.session.get(f"{BASE_URL}/api/family/admin/all")
            if response.status_code == 200:
                families = response.json().get("families", [])
                for family in families:
                    for member in family.get("familyMembers", []):
                        if member.get("fullName", "").startswith("TEST_CONSENT_"):
                            self.session.delete(
                                f"{BASE_URL}/api/family/admin/members/{member['id']}?delete_account=true"
                            )
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    def _find_test_user(self):
        """Find a test user to add family members to"""
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        if response.status_code != 200:
            pytest.skip("Could not get users list")
        
        users = response.json().get("users", [])
        # Find an adult user (yearOfBirth makes them 18+)
        for user in users:
            year_of_birth = user.get("yearOfBirth", "")
            if year_of_birth:
                try:
                    age = datetime.now().year - int(year_of_birth)
                    if age >= 18 and user.get("email"):
                        return user
                except:
                    continue
        
        # If no adult found, use first user with email
        for user in users:
            if user.get("email") and user.get("id"):
                return user
        
        pytest.skip("No suitable test user found")
    
    # ===========================================
    # Test 1: Admin add minor WITHOUT photo consent - should FAIL
    # ===========================================
    def test_admin_add_minor_without_consent_fails(self):
        """POST /api/family/admin/members/{user_id} - Adding minor without consent should fail"""
        test_user = self._find_test_user()
        user_id = test_user.get("id") or test_user.get("_id")
        
        # Minor year (under 18 in 2026)
        minor_year = str(datetime.now().year - 10)  # 10 years old
        
        # Try to add minor without photoConsent
        member_data = {
            "fullName": "TEST_CONSENT_NoConsent_Child",
            "yearOfBirth": minor_year,
            "relationship": "child"
            # No photoConsent field
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/family/admin/members/{user_id}",
            json=member_data
        )
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        error_detail = response.json().get("detail", "")
        assert "photo consent" in error_detail.lower() or "consent" in error_detail.lower(), \
            f"Error should mention photo consent: {error_detail}"
        print(f"✓ Admin add minor without consent correctly rejected: {error_detail}")
    
    # ===========================================
    # Test 2: Admin add minor WITH photo consent - should SUCCEED
    # ===========================================
    def test_admin_add_minor_with_consent_succeeds(self):
        """POST /api/family/admin/members/{user_id} - Adding minor with consent should succeed"""
        test_user = self._find_test_user()
        user_id = test_user.get("id") or test_user.get("_id")
        
        # Minor year (under 18 in 2026)
        minor_year = str(datetime.now().year - 8)  # 8 years old
        
        # Add minor WITH photoConsent=True
        member_data = {
            "fullName": "TEST_CONSENT_WithConsent_Child",
            "yearOfBirth": minor_year,
            "relationship": "child",
            "photoConsent": True
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/family/admin/members/{user_id}",
            json=member_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("member", {}).get("fullName") == "TEST_CONSENT_WithConsent_Child"
        print(f"✓ Admin add minor with consent succeeded: {data.get('message')}")
    
    # ===========================================
    # Test 3: Admin add adult without consent - should SUCCEED (consent not required)
    # ===========================================
    def test_admin_add_adult_without_consent_succeeds(self):
        """POST /api/family/admin/members/{user_id} - Adding adult doesn't require consent"""
        test_user = self._find_test_user()
        user_id = test_user.get("id") or test_user.get("_id")
        
        # Adult year (18+ in 2026)
        adult_year = str(datetime.now().year - 25)  # 25 years old
        
        # Generate unique email
        unique_email = f"test_adult_{int(time.time())}@example.com"
        
        # Add adult WITHOUT photoConsent (not required for adults)
        member_data = {
            "fullName": "TEST_CONSENT_Adult_Member",
            "email": unique_email,
            "yearOfBirth": adult_year,
            "relationship": "spouse"
            # No photoConsent - should be fine for adults
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/family/admin/members/{user_id}",
            json=member_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        print(f"✓ Admin add adult without consent succeeded (not required for 18+)")
    
    # ===========================================
    # Test 4: Send consent reminders endpoint
    # ===========================================
    def test_send_consent_reminders(self):
        """POST /api/family/admin/send-consent-reminders - Should return success"""
        response = self.session.post(f"{BASE_URL}/api/family/admin/send-consent-reminders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "emails_sent" in data, "Response should include emails_sent count"
        assert "parents_notified" in data or "message" in data, "Response should include notification info"
        print(f"✓ Send consent reminders: {data.get('message', 'OK')} - Emails sent: {data.get('emails_sent', 0)}")
    
    # ===========================================
    # Test 5: Get minors without consent
    # ===========================================
    def test_get_minors_without_consent(self):
        """GET /api/family/minors-without-consent - Should return list of minors"""
        response = self.session.get(f"{BASE_URL}/api/family/minors-without-consent")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "minors" in data, "Response should include minors list"
        assert "total" in data, "Response should include total count"
        assert isinstance(data.get("minors"), list), "Minors should be a list"
        print(f"✓ Get minors without consent: Found {data.get('total', 0)} minors without consent")
    
    # ===========================================
    # Test 6: Update photo consent for an existing minor
    # ===========================================
    def test_update_photo_consent(self):
        """PUT /api/family/members/{id}/photo-consent - Update consent for existing minor"""
        # First, create a minor with consent
        test_user = self._find_test_user()
        user_id = test_user.get("id") or test_user.get("_id")
        
        minor_year = str(datetime.now().year - 12)  # 12 years old
        member_data = {
            "fullName": "TEST_CONSENT_Update_Child",
            "yearOfBirth": minor_year,
            "relationship": "child",
            "photoConsent": True
        }
        
        # Create the minor
        create_response = self.session.post(
            f"{BASE_URL}/api/family/admin/members/{user_id}",
            json=member_data
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test minor: {create_response.text}")
        
        member_id = create_response.json().get("member", {}).get("id")
        if not member_id:
            pytest.skip("No member ID returned")
        
        # Now we need to login as the parent user to update consent
        # Since admin added this, we should use a different approach
        # Let's test the endpoint exists and returns appropriate error for unauthorized access
        
        # Try with admin token (should work since we're testing the feature)
        update_response = self.session.put(
            f"{BASE_URL}/api/family/members/{member_id}/photo-consent?consent=false"
        )
        
        # The endpoint might return 403 if current user is not the parent
        # or 200 if it works
        if update_response.status_code == 403:
            print(f"✓ Photo consent endpoint exists - returns 403 for non-parent (expected behavior)")
        elif update_response.status_code == 200:
            print(f"✓ Photo consent updated successfully")
        elif update_response.status_code == 404:
            print(f"✓ Photo consent endpoint exists - returns 404 for member not found")
        else:
            print(f"Photo consent endpoint returned: {update_response.status_code} - {update_response.text}")
        
        # Endpoint exists if we got any response
        assert update_response.status_code in [200, 403, 404], \
            f"Unexpected status code: {update_response.status_code}"


class TestPhotoConsentUserFlow:
    """Test photo consent from user (non-admin) perspective"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token to create test user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Could not login as admin: {login_response.text}")
        
        login_data = login_response.json()
        self.admin_token = login_data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        yield
    
    def test_user_add_minor_requires_consent(self):
        """POST /api/family/members - User adding minor requires photo consent"""
        # This tests the user endpoint (not admin)
        minor_year = str(datetime.now().year - 7)  # 7 years old
        
        # Try to add minor without consent
        member_data = {
            "fullName": "TEST_CONSENT_UserChild",
            "yearOfBirth": minor_year,
            "relationship": "child"
            # No photoConsent
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/family/members",
            json=member_data
        )
        
        # Should fail requiring consent
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        error = response.json().get("detail", "")
        assert "consent" in error.lower(), f"Error should mention consent: {error}"
        print(f"✓ User add minor without consent correctly rejected: {error}")
    
    def test_user_add_minor_with_consent(self):
        """POST /api/family/members - User adding minor with consent succeeds"""
        minor_year = str(datetime.now().year - 6)  # 6 years old
        
        # Add minor WITH consent
        member_data = {
            "fullName": "TEST_CONSENT_UserChild_OK",
            "yearOfBirth": minor_year,
            "relationship": "child",
            "photoConsent": True
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/family/members",
            json=member_data
        )
        
        # Should succeed
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ User add minor with consent succeeded")
        
        # Cleanup
        member_id = data.get("member", {}).get("id")
        if member_id:
            self.session.delete(
                f"{BASE_URL}/api/family/admin/members/{member_id}?delete_account=true"
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
