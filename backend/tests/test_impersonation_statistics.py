"""
Test suite for Admin Dashboard Statistics and User Impersonation features
Tests:
1. Statistics endpoint returns correct numbers
2. User impersonation API endpoint
3. Impersonation restrictions (cannot impersonate superadmin)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminStatistics:
    """Test admin dashboard statistics endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as superadmin and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "vladanmitic@gmail.com", "password": "Admin123!"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_statistics_endpoint_returns_correct_structure(self):
        """Test that statistics endpoint returns all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/statistics",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields are present
        assert "totalMembers" in data, "Missing totalMembers field"
        assert "paidInvoices" in data, "Missing paidInvoices field"
        assert "unpaidInvoices" in data, "Missing unpaidInvoices field"
        assert "totalRevenue" in data, "Missing totalRevenue field"
        
        # Verify data types
        assert isinstance(data["totalMembers"], int), "totalMembers should be int"
        assert isinstance(data["paidInvoices"], int), "paidInvoices should be int"
        assert isinstance(data["unpaidInvoices"], int), "unpaidInvoices should be int"
        assert isinstance(data["totalRevenue"], (int, float)), "totalRevenue should be numeric"
        
        print(f"Statistics: totalMembers={data['totalMembers']}, paidInvoices={data['paidInvoices']}, unpaidInvoices={data['unpaidInvoices']}, totalRevenue={data['totalRevenue']}")
    
    def test_statistics_values_are_non_negative(self):
        """Test that all statistics values are non-negative"""
        response = requests.get(
            f"{BASE_URL}/api/admin/statistics",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["totalMembers"] >= 0, "totalMembers should be non-negative"
        assert data["paidInvoices"] >= 0, "paidInvoices should be non-negative"
        assert data["unpaidInvoices"] >= 0, "unpaidInvoices should be non-negative"
        assert data["totalRevenue"] >= 0, "totalRevenue should be non-negative"


class TestUserImpersonation:
    """Test user impersonation feature for Super Admins"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as superadmin and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "vladanmitic@gmail.com", "password": "Admin123!"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get a regular user ID for testing
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.headers
        )
        assert users_response.status_code == 200
        users = users_response.json().get("users", [])
        
        # Find a regular user (not superadmin)
        self.regular_user = None
        self.superadmin_user = None
        for user in users:
            if user.get("role") == "user" and not self.regular_user:
                self.regular_user = user
            if user.get("role") == "superadmin":
                self.superadmin_user = user
    
    def test_impersonate_regular_user_success(self):
        """Test successful impersonation of a regular user"""
        if not self.regular_user:
            pytest.skip("No regular user found for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate/{self.regular_user['id']}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Impersonation failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should indicate success"
        assert "token" in data, "Response should contain impersonation token"
        assert "user" in data, "Response should contain user info"
        assert "message" in data, "Response should contain message"
        
        # Verify user info
        user_info = data["user"]
        assert user_info["id"] == self.regular_user["id"], "User ID should match"
        assert user_info["role"] == "user", "Impersonated user should have 'user' role"
        
        print(f"Successfully impersonated: {user_info.get('fullName', user_info.get('email'))}")
    
    def test_impersonate_superadmin_forbidden(self):
        """Test that impersonating another superadmin returns 403"""
        if not self.superadmin_user:
            pytest.skip("No superadmin user found for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate/{self.superadmin_user['id']}",
            headers=self.headers
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        data = response.json()
        assert "Cannot impersonate another super admin" in data.get("detail", ""), \
            "Error message should indicate cannot impersonate superadmin"
        
        print("Correctly blocked impersonation of superadmin")
    
    def test_impersonate_nonexistent_user_not_found(self):
        """Test that impersonating non-existent user returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate/nonexistent_user_12345",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "User not found" in data.get("detail", ""), \
            "Error message should indicate user not found"
        
        print("Correctly returned 404 for non-existent user")
    
    def test_impersonation_token_contains_special_flags(self):
        """Test that impersonation token contains is_impersonation flag"""
        if not self.regular_user:
            pytest.skip("No regular user found for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate/{self.regular_user['id']}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Decode JWT token to verify claims (without verification)
        import base64
        import json
        
        token = data["token"]
        # JWT has 3 parts: header.payload.signature
        payload_b64 = token.split('.')[1]
        # Add padding if needed
        payload_b64 += '=' * (4 - len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        
        assert payload.get("is_impersonation") == True, "Token should have is_impersonation=True"
        assert "impersonated_by" in payload, "Token should contain impersonated_by field"
        
        print(f"Token correctly contains impersonation flags: is_impersonation={payload.get('is_impersonation')}, impersonated_by={payload.get('impersonated_by')}")


class TestImpersonationWithoutAuth:
    """Test impersonation endpoint without authentication"""
    
    def test_impersonate_without_token_unauthorized(self):
        """Test that impersonation without token returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate/some_user_id"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Correctly returned 401 for unauthenticated request")
    
    def test_impersonate_with_invalid_token_unauthorized(self):
        """Test that impersonation with invalid token returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/impersonate/some_user_id",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Correctly returned 401 for invalid token")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
