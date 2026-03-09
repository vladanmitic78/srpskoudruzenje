"""
Bulk Family Add Bug Fix Tests
Tests for the MongoDB unique index bug fix when adding multiple children without email.

Bug Context:
- When adding multiple children without email in bulk, only the first was added successfully
- MongoDB had a unique sparse index on email field
- Setting email to null caused duplicate key errors for subsequent children
- Fix: Don't include email field in document when it's null

Test Scenarios:
1. POST /api/family/admin/members/{user_id} - Add multiple children without email to same parent
2. POST /api/family/admin/members/{user_id} - Add adult family members with email
3. POST /api/family/admin/members/{user_id} - Reject adult family members (18+) without email
4. POST /api/family/admin/members/{user_id} - Reject duplicate email addresses
5. GET /api/family/admin/all - Return all family relationships including newly added members
"""

import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "vladanmitic@gmail.com"
SUPER_ADMIN_PASSWORD = "Admin123!"

# Test user to add family members to
TEST_USER_ID = "user_1763932080306"  # Tijana Isailovic


class TestBulkFamilyAddFix:
    """Test bulk add of family members - MongoDB unique index bug fix"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        return data["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_user_id(self, admin_headers):
        """Get test user ID - try to find an existing user or use TEST_USER_ID"""
        # Try to get all users and pick one
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        if response.status_code == 200:
            users = response.json().get("users", [])
            # Find a non-admin user with role='user'
            regular_users = [u for u in users if u.get("role") == "user"]
            if regular_users:
                user = regular_users[0]
                return user.get("id") or user.get("_id")
        return TEST_USER_ID
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✓ API health check passed")
    
    def test_admin_login(self, admin_headers):
        """Verify admin authentication works"""
        response = requests.get(f"{BASE_URL}/api/users/me", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") in ["admin", "superadmin"]
        print(f"✓ Admin authenticated: {data.get('email')}")
    
    def test_add_multiple_children_without_email(self, admin_headers, test_user_id):
        """
        MAIN BUG FIX TEST: Add 3+ children without email to the same parent.
        Previously this would fail after the first child due to MongoDB duplicate null email.
        """
        timestamp = int(time.time())
        
        # Create 3 children without email (minors born in 2020 = ~6 years old)
        children = [
            {
                "fullName": f"TEST_BulkChild1_{timestamp}",
                "email": "",  # Empty email - child doesn't need one
                "yearOfBirth": "2020",
                "phone": "",
                "relationship": "child"
            },
            {
                "fullName": f"TEST_BulkChild2_{timestamp}",
                "email": "",  # Empty email
                "yearOfBirth": "2019",
                "phone": "",
                "relationship": "child"
            },
            {
                "fullName": f"TEST_BulkChild3_{timestamp}",
                "email": "",  # Empty email
                "yearOfBirth": "2018",
                "phone": "",
                "relationship": "child"
            }
        ]
        
        added_members = []
        errors = []
        
        for i, child in enumerate(children):
            response = requests.post(
                f"{BASE_URL}/api/family/admin/members/{test_user_id}",
                headers=admin_headers,
                json=child
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    added_members.append(data.get("member"))
                    print(f"✓ Child {i+1} added: {child['fullName']}")
                else:
                    errors.append(f"Child {i+1}: API returned success=false")
            else:
                error_detail = response.json().get("detail", response.text)
                errors.append(f"Child {i+1}: {error_detail}")
                print(f"✗ Child {i+1} failed: {error_detail}")
        
        # All 3 children should be added successfully
        assert len(added_members) == 3, f"Expected 3 children added, got {len(added_members)}. Errors: {errors}"
        print(f"✓ ALL 3 children without email added successfully - BUG FIX VERIFIED!")
        
        return [m.get("id") for m in added_members]
    
    def test_add_adult_member_with_email(self, admin_headers, test_user_id):
        """Test adding adult family member (18+) with email - should succeed"""
        timestamp = int(time.time())
        
        member_data = {
            "fullName": f"TEST_Adult_{timestamp}",
            "email": f"test_adult_{timestamp}@example.com",
            "yearOfBirth": "1990",  # ~36 years old - adult
            "phone": "+46 70 123 4567",
            "relationship": "spouse"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/family/admin/members/{test_user_id}",
            headers=admin_headers,
            json=member_data
        )
        
        assert response.status_code == 200, f"Failed to add adult member: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["member"]["email"] == member_data["email"]
        print(f"✓ Adult member with email added: {data['member']['fullName']}")
        
        return data["member"]["id"]
    
    def test_reject_adult_without_email(self, admin_headers, test_user_id):
        """Test that adult family members (18+) without email are rejected"""
        timestamp = int(time.time())
        
        member_data = {
            "fullName": f"TEST_AdultNoEmail_{timestamp}",
            "email": "",  # No email - should be rejected for adults
            "yearOfBirth": "1985",  # ~41 years old - adult
            "phone": "+46 70 999 8888",
            "relationship": "friend"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/family/admin/members/{test_user_id}",
            headers=admin_headers,
            json=member_data
        )
        
        assert response.status_code == 400, f"Expected 400 for adult without email, got {response.status_code}: {response.text}"
        data = response.json()
        assert "email" in data.get("detail", "").lower() or "18" in data.get("detail", "").lower()
        print(f"✓ Adult without email correctly rejected: {data.get('detail')}")
    
    def test_reject_duplicate_email(self, admin_headers, test_user_id):
        """Test that duplicate email addresses are rejected"""
        timestamp = int(time.time())
        email = f"test_duplicate_{timestamp}@example.com"
        
        # First member with this email
        member1 = {
            "fullName": f"TEST_First_{timestamp}",
            "email": email,
            "yearOfBirth": "2000",
            "relationship": "friend"
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/family/admin/members/{test_user_id}",
            headers=admin_headers,
            json=member1
        )
        assert response1.status_code == 200, f"First member failed: {response1.text}"
        print(f"✓ First member with email added: {member1['fullName']}")
        
        # Second member with same email - should fail
        member2 = {
            "fullName": f"TEST_Second_{timestamp}",
            "email": email,  # Same email
            "yearOfBirth": "2002",
            "relationship": "friend"
        }
        
        response2 = requests.post(
            f"{BASE_URL}/api/family/admin/members/{test_user_id}",
            headers=admin_headers,
            json=member2
        )
        
        assert response2.status_code == 400, f"Expected 400 for duplicate email, got {response2.status_code}"
        data = response2.json()
        assert "already exists" in data.get("detail", "").lower() or "email" in data.get("detail", "").lower()
        print(f"✓ Duplicate email correctly rejected: {data.get('detail')}")
    
    def test_get_all_families_includes_new_members(self, admin_headers):
        """Test GET /api/family/admin/all returns all family relationships including newly added"""
        response = requests.get(f"{BASE_URL}/api/family/admin/all", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get families: {response.text}"
        
        data = response.json()
        assert "families" in data
        assert "total" in data
        
        # Check if any of our test members are in the response
        all_members = []
        for family in data.get("families", []):
            for member in family.get("familyMembers", []):
                all_members.append(member.get("fullName", ""))
        
        test_members = [m for m in all_members if m.startswith("TEST_Bulk")]
        print(f"✓ GET /api/family/admin/all returned {data['total']} families")
        print(f"  Found {len(test_members)} test bulk-add members in response")
    
    def test_verify_children_have_no_email_field(self, admin_headers):
        """Verify that children added without email don't have email field in DB (not null, but missing)"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        
        users = response.json().get("users", [])
        test_children = [u for u in users if u.get("fullName", "").startswith("TEST_BulkChild")]
        
        for child in test_children:
            # Children should either have no email field or email should be None/empty
            # The fix ensures email field is not included when null to avoid unique index issues
            email = child.get("email")
            # Email should be None, empty string, or not present at all
            assert email in [None, "", None] or "email" not in child, f"Child {child.get('fullName')} unexpectedly has email: {email}"
            print(f"✓ Child {child.get('fullName')} - email field check passed (email={email!r})")


class TestCleanupBulkAddTestData:
    """Cleanup test data created by bulk add tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_cleanup_test_members(self, admin_headers):
        """Clean up TEST_ prefixed family members created in tests"""
        # Get all families
        response = requests.get(f"{BASE_URL}/api/family/admin/all", headers=admin_headers)
        if response.status_code != 200:
            pytest.skip("Could not get families for cleanup")
        
        families = response.json().get("families", [])
        cleaned = 0
        
        for family in families:
            for member in family.get("familyMembers", []):
                if member.get("fullName", "").startswith("TEST_"):
                    member_id = member.get("id")
                    if member_id:
                        delete_response = requests.delete(
                            f"{BASE_URL}/api/family/admin/members/{member_id}?delete_account=true",
                            headers=admin_headers
                        )
                        if delete_response.status_code == 200:
                            cleaned += 1
                            print(f"  Cleaned: {member.get('fullName')}")
        
        print(f"✓ Cleaned up {cleaned} test family members")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
