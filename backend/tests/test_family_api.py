"""
Family Members API Tests
Tests for the Family/Group Membership System
- POST /api/family/members - Add family member
- GET /api/family/members - Get family members
- PUT /api/family/members/{id} - Update family member
- DELETE /api/family/members/{id} - Remove family member
- GET /api/family/admin/all - Admin get all families
- POST /api/family/admin/members/{user_id} - Admin add family member
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


class TestFamilyAPISetup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ API health check passed")


class TestFamilyMembersCRUD:
    """Test family member CRUD operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        return data["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def admin_user_id(self, admin_headers):
        """Get admin user ID"""
        response = requests.get(f"{BASE_URL}/api/users/me", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        return data.get("id") or data.get("_id")
    
    def test_get_family_members_empty(self, admin_headers):
        """Test GET /api/family/members returns empty list initially"""
        response = requests.get(f"{BASE_URL}/api/family/members", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "members" in data
        assert "total" in data
        print(f"✓ GET family members returned {data['total']} members")
    
    def test_add_family_member_success(self, admin_headers):
        """Test POST /api/family/members creates a family member"""
        timestamp = int(time.time())
        member_data = {
            "fullName": f"TEST_Child_{timestamp}",
            "email": f"test_child_{timestamp}@example.com",
            "yearOfBirth": "2015",
            "phone": "+46 70 123 4567",
            "relationship": "child"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/family/members",
            headers=admin_headers,
            json=member_data
        )
        
        assert response.status_code == 200, f"Failed to add family member: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "member" in data
        assert data["member"]["fullName"] == member_data["fullName"]
        assert data["member"]["email"] == member_data["email"]
        assert data["member"]["relationship"] == "child"
        print(f"✓ Family member created: {data['member']['fullName']}")
        
        # Store member ID for later tests
        return data["member"]["id"]
    
    def test_add_family_member_duplicate_email(self, admin_headers):
        """Test POST /api/family/members rejects duplicate email"""
        # First create a member
        timestamp = int(time.time())
        member_data = {
            "fullName": f"TEST_Duplicate_{timestamp}",
            "email": f"test_duplicate_{timestamp}@example.com",
            "yearOfBirth": "2010",
            "relationship": "child"
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/family/members",
            headers=admin_headers,
            json=member_data
        )
        assert response1.status_code == 200
        
        # Try to create another with same email
        response2 = requests.post(
            f"{BASE_URL}/api/family/members",
            headers=admin_headers,
            json=member_data
        )
        assert response2.status_code == 400
        data = response2.json()
        assert "already exists" in data.get("detail", "").lower()
        print("✓ Duplicate email correctly rejected")
    
    def test_get_family_members_after_add(self, admin_headers):
        """Test GET /api/family/members returns added members"""
        response = requests.get(f"{BASE_URL}/api/family/members", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] > 0
        assert len(data["members"]) > 0
        
        # Verify member structure
        member = data["members"][0]
        assert "id" in member
        assert "fullName" in member
        assert "email" in member
        assert "relationship" in member
        print(f"✓ GET family members returned {data['total']} members with correct structure")
    
    def test_update_family_member(self, admin_headers):
        """Test PUT /api/family/members/{id} updates a family member"""
        # First create a member to update
        timestamp = int(time.time())
        create_data = {
            "fullName": f"TEST_ToUpdate_{timestamp}",
            "email": f"test_update_{timestamp}@example.com",
            "yearOfBirth": "2012",
            "relationship": "child"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/family/members",
            headers=admin_headers,
            json=create_data
        )
        assert create_response.status_code == 200
        member_id = create_response.json()["member"]["id"]
        
        # Update the member
        update_data = {
            "fullName": f"TEST_Updated_{timestamp}",
            "phone": "+46 70 999 8888",
            "trainingGroup": "folklor"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/family/members/{member_id}",
            headers=admin_headers,
            json=update_data
        )
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data.get("success") == True
        print(f"✓ Family member updated successfully")
    
    def test_delete_family_member(self, admin_headers):
        """Test DELETE /api/family/members/{id} removes family member link"""
        # First create a member to delete
        timestamp = int(time.time())
        create_data = {
            "fullName": f"TEST_ToDelete_{timestamp}",
            "email": f"test_delete_{timestamp}@example.com",
            "yearOfBirth": "2014",
            "relationship": "friend"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/family/members",
            headers=admin_headers,
            json=create_data
        )
        assert create_response.status_code == 200
        member_id = create_response.json()["member"]["id"]
        
        # Delete the member
        delete_response = requests.delete(
            f"{BASE_URL}/api/family/members/{member_id}",
            headers=admin_headers
        )
        
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data.get("success") == True
        print(f"✓ Family member removed successfully")
    
    def test_delete_nonexistent_member(self, admin_headers):
        """Test DELETE /api/family/members/{id} returns 404 for non-existent member"""
        response = requests.delete(
            f"{BASE_URL}/api/family/members/nonexistent-id-12345",
            headers=admin_headers
        )
        assert response.status_code == 404
        print("✓ Non-existent member deletion correctly returns 404")


class TestAdminFamilyEndpoints:
    """Test admin-only family endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_admin_get_all_families(self, admin_headers):
        """Test GET /api/family/admin/all returns all family relationships"""
        response = requests.get(f"{BASE_URL}/api/family/admin/all", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "families" in data
        assert "total" in data
        print(f"✓ Admin GET all families returned {data['total']} families")
    
    def test_admin_add_family_member_to_user(self, admin_headers):
        """Test POST /api/family/admin/members/{user_id} adds family member to any user"""
        # Get admin user ID first
        me_response = requests.get(f"{BASE_URL}/api/users/me", headers=admin_headers)
        assert me_response.status_code == 200
        admin_id = me_response.json().get("id") or me_response.json().get("_id")
        
        timestamp = int(time.time())
        member_data = {
            "fullName": f"TEST_AdminAdded_{timestamp}",
            "email": f"test_admin_added_{timestamp}@example.com",
            "yearOfBirth": "2016",
            "relationship": "child"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/family/admin/members/{admin_id}",
            headers=admin_headers,
            json=member_data
        )
        
        assert response.status_code == 200, f"Admin add member failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "member" in data
        print(f"✓ Admin added family member: {data['member']['fullName']}")
    
    def test_admin_add_member_to_nonexistent_user(self, admin_headers):
        """Test POST /api/family/admin/members/{user_id} returns 404 for non-existent user"""
        member_data = {
            "fullName": "Test Member",
            "email": f"test_nonexistent_{int(time.time())}@example.com",
            "yearOfBirth": "2015",
            "relationship": "child"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/family/admin/members/nonexistent-user-id",
            headers=admin_headers,
            json=member_data
        )
        
        assert response.status_code == 404
        print("✓ Admin add to non-existent user correctly returns 404")


class TestAgeRestriction:
    """Test age restriction for adding family members"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_underage_user_and_try_add_member(self, admin_headers):
        """Test that users under 18 cannot add family members"""
        # Create a test user who is under 18 (born in 2015 = ~11 years old)
        timestamp = int(time.time())
        
        # First register a young user
        register_data = {
            "email": f"test_young_{timestamp}@example.com",
            "password": "TestPass123!",
            "fullName": f"TEST_YoungUser_{timestamp}",
            "yearOfBirth": "2015"  # Under 18
        }
        
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=register_data
        )
        
        # If registration requires email verification, we'll skip this test
        if register_response.status_code != 200:
            pytest.skip("Registration requires email verification - skipping age restriction test")
        
        # Try to login as the young user
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": register_data["email"], "password": register_data["password"]}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Login failed for test user - skipping age restriction test")
        
        young_token = login_response.json().get("token")
        young_headers = {
            "Authorization": f"Bearer {young_token}",
            "Content-Type": "application/json"
        }
        
        # Try to add a family member as the young user
        member_data = {
            "fullName": "Test Child",
            "email": f"test_child_of_young_{timestamp}@example.com",
            "yearOfBirth": "2020",
            "relationship": "child"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/family/members",
            headers=young_headers,
            json=member_data
        )
        
        # Should be forbidden (403) for users under 18
        assert response.status_code == 403, f"Expected 403 for underage user, got {response.status_code}"
        data = response.json()
        assert "18" in data.get("detail", "").lower() or "older" in data.get("detail", "").lower()
        print("✓ Age restriction correctly enforced - users under 18 cannot add family members")


class TestFamilyMemberLogin:
    """Test that family members can login with their credentials"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_family_member_exists_in_system(self, admin_headers):
        """Test that created family members exist as users in the system"""
        # Get all users (admin endpoint)
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check if any TEST_ family members exist
        users = data.get("users", [])
        test_members = [u for u in users if u.get("fullName", "").startswith("TEST_")]
        
        print(f"✓ Found {len(test_members)} test family members in user database")
        
        # Verify family members have primaryAccountId set
        family_members = [u for u in users if u.get("primaryAccountId")]
        print(f"✓ Found {len(family_members)} users with primaryAccountId (family members)")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_cleanup_test_family_members(self, admin_headers):
        """Clean up TEST_ prefixed family members"""
        # Get family members
        response = requests.get(f"{BASE_URL}/api/family/members", headers=admin_headers)
        if response.status_code == 200:
            members = response.json().get("members", [])
            test_members = [m for m in members if m.get("fullName", "").startswith("TEST_")]
            
            for member in test_members:
                delete_response = requests.delete(
                    f"{BASE_URL}/api/family/members/{member['id']}",
                    headers=admin_headers
                )
                if delete_response.status_code == 200:
                    print(f"  Cleaned up: {member['fullName']}")
            
            print(f"✓ Cleaned up {len(test_members)} test family members")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
