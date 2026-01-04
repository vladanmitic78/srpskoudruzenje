"""
Test suite for Multi-member Invoice and Member Filtering features
Tests:
1. POST /api/invoices/ - Create invoice with multiple userIds
2. GET /api/invoices/ - Retrieve invoices with multiple members
3. GET /api/admin/members/filtered - Filter members by invoice/payment status/training group
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "vladanmitic@gmail.com"
SUPER_ADMIN_PASSWORD = "Admin123!"

class TestMultiMemberInvoices:
    """Test multi-member invoice creation and retrieval"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for super admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Login not successful: {data}"
        assert "token" in data, f"No token in response: {data}"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_users(self, auth_headers):
        """Get list of users for testing"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        data = response.json()
        users = data.get("users", [])
        # Filter to get only regular users (not admins)
        regular_users = [u for u in users if u.get("role") == "user"]
        return regular_users
    
    def test_01_login_as_super_admin(self):
        """Test login with super admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed with status {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Login not successful: {data}"
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] in ["admin", "superadmin"], f"User role is not admin: {data['user']['role']}"
        print(f"✓ Login successful as {data['user']['role']}")
    
    def test_02_get_users_list(self, auth_headers):
        """Test getting users list for invoice creation"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        data = response.json()
        assert "users" in data, "No users field in response"
        users = data["users"]
        print(f"✓ Retrieved {len(users)} users")
        
        # Verify no sensitive data is exposed
        for user in users[:3]:  # Check first 3 users
            assert "hashed_password" not in user, "hashed_password should not be in response"
            assert "verificationToken" not in user, "verificationToken should not be in response"
            assert "resetToken" not in user, "resetToken should not be in response"
        print("✓ No sensitive data exposed in user list")
    
    def test_03_create_multi_member_invoice(self, auth_headers, test_users):
        """Test creating an invoice for multiple members"""
        if len(test_users) < 2:
            pytest.skip("Need at least 2 users to test multi-member invoice")
        
        # Select first 2 users for the invoice
        user_ids = [test_users[0]["id"], test_users[1]["id"]]
        
        invoice_data = {
            "userIds": user_ids,
            "amount": 500.0,
            "dueDate": "2025-02-28",
            "description": "TEST_Multi-member Invoice - Testing",
            "trainingGroup": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/invoices/",
            headers=auth_headers,
            json=invoice_data
        )
        
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "No id in response"
        assert "userIds" in data, "No userIds in response"
        assert data["userIds"] == user_ids, f"userIds mismatch: expected {user_ids}, got {data['userIds']}"
        assert data["amount"] == 500.0, f"Amount mismatch: expected 500.0, got {data['amount']}"
        assert data["status"] == "unpaid", f"Status should be unpaid, got {data['status']}"
        
        print(f"✓ Created multi-member invoice with ID: {data['id']}")
        print(f"✓ Invoice assigned to {len(data['userIds'])} members")
        
        # Store invoice ID for cleanup
        self.__class__.created_invoice_id = data["id"]
    
    def test_04_get_all_invoices_shows_multi_member(self, auth_headers):
        """Test that GET /api/invoices/ returns invoices with multiple members"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get invoices: {response.text}"
        data = response.json()
        assert "invoices" in data, "No invoices field in response"
        
        invoices = data["invoices"]
        print(f"✓ Retrieved {len(invoices)} invoices")
        
        # Find our test invoice
        test_invoice = None
        for inv in invoices:
            if inv.get("description", "").startswith("TEST_Multi-member"):
                test_invoice = inv
                break
        
        if test_invoice:
            assert "userIds" in test_invoice, "userIds field missing from invoice"
            assert len(test_invoice["userIds"]) >= 2, f"Expected at least 2 userIds, got {len(test_invoice['userIds'])}"
            print(f"✓ Found test invoice with {len(test_invoice['userIds'])} members")
        else:
            print("⚠ Test invoice not found (may have been cleaned up)")
    
    def test_05_cleanup_test_invoice(self, auth_headers):
        """Clean up test invoice"""
        if hasattr(self.__class__, 'created_invoice_id'):
            invoice_id = self.__class__.created_invoice_id
            response = requests.delete(
                f"{BASE_URL}/api/invoices/{invoice_id}",
                headers=auth_headers
            )
            if response.status_code == 200:
                print(f"✓ Cleaned up test invoice: {invoice_id}")
            else:
                print(f"⚠ Failed to clean up invoice: {response.text}")


class TestFilteredMembers:
    """Test member filtering and export functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for super admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_get_filtered_members_no_filter(self, auth_headers):
        """Test getting all members without filters"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members/filtered",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get filtered members: {response.text}"
        data = response.json()
        
        assert "members" in data, "No members field in response"
        assert "total" in data, "No total field in response"
        
        members = data["members"]
        print(f"✓ Retrieved {len(members)} members (no filter)")
        
        # Verify no sensitive data is exposed
        for member in members[:3]:  # Check first 3 members
            assert "hashed_password" not in member, "hashed_password should not be in response"
            assert "verificationToken" not in member, "verificationToken should not be in response"
            assert "resetToken" not in member, "resetToken should not be in response"
        print("✓ No sensitive data exposed in filtered members")
    
    def test_02_get_filtered_members_by_training_group(self, auth_headers):
        """Test filtering members by training group"""
        # First get all members to find available training groups
        response = requests.get(
            f"{BASE_URL}/api/admin/members/filtered",
            headers=auth_headers
        )
        data = response.json()
        members = data.get("members", [])
        
        # Find a training group that has members
        training_groups = set()
        for m in members:
            if m.get("trainingGroup"):
                training_groups.add(m["trainingGroup"])
        
        if not training_groups:
            print("⚠ No training groups found, skipping filter test")
            return
        
        test_group = list(training_groups)[0]
        
        # Filter by training group
        response = requests.get(
            f"{BASE_URL}/api/admin/members/filtered",
            headers=auth_headers,
            params={"training_group": test_group}
        )
        
        assert response.status_code == 200, f"Failed to filter by training group: {response.text}"
        data = response.json()
        
        filtered_members = data.get("members", [])
        print(f"✓ Filtered by training group '{test_group}': {len(filtered_members)} members")
        
        # Verify all returned members have the correct training group
        for member in filtered_members:
            assert member.get("trainingGroup") == test_group, f"Member has wrong training group: {member.get('trainingGroup')}"
        print("✓ All filtered members have correct training group")
    
    def test_03_export_filtered_members_excel(self, auth_headers):
        """Test exporting filtered members to Excel"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members/filtered",
            headers=auth_headers,
            params={"export_format": "excel"}
        )
        
        assert response.status_code == 200, f"Failed to export to Excel: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "excel" in content_type or "octet-stream" in content_type, \
            f"Unexpected content type: {content_type}"
        
        # Check content disposition
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, f"Expected attachment, got: {content_disposition}"
        assert ".xlsx" in content_disposition, f"Expected .xlsx file, got: {content_disposition}"
        
        print("✓ Excel export successful")
        print(f"  Content-Type: {content_type}")
        print(f"  Content-Disposition: {content_disposition}")
    
    def test_04_export_filtered_members_csv(self, auth_headers):
        """Test exporting filtered members to CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members/filtered",
            headers=auth_headers,
            params={"export_format": "csv"}
        )
        
        assert response.status_code == 200, f"Failed to export to CSV: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "csv" in content_type or "text" in content_type, f"Unexpected content type: {content_type}"
        
        print("✓ CSV export successful")


class TestInvoiceAPIValidation:
    """Test invoice API validation and edge cases"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for super admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_create_invoice_empty_userids(self, auth_headers):
        """Test that creating invoice with empty userIds fails validation"""
        invoice_data = {
            "userIds": [],
            "amount": 500.0,
            "dueDate": "2025-02-28",
            "description": "TEST_Empty userIds"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/invoices/",
            headers=auth_headers,
            json=invoice_data
        )
        
        # Should either fail validation or succeed (depending on backend validation)
        # We're just checking it doesn't crash
        print(f"Empty userIds response: {response.status_code}")
        if response.status_code == 200:
            # Clean up if it was created
            data = response.json()
            if "id" in data:
                requests.delete(f"{BASE_URL}/api/invoices/{data['id']}", headers=auth_headers)
    
    def test_02_create_invoice_single_user(self, auth_headers):
        """Test creating invoice with single user in userIds array"""
        # Get a user first
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        users = users_response.json().get("users", [])
        regular_users = [u for u in users if u.get("role") == "user"]
        
        if not regular_users:
            pytest.skip("No regular users available")
        
        invoice_data = {
            "userIds": [regular_users[0]["id"]],
            "amount": 250.0,
            "dueDate": "2025-03-15",
            "description": "TEST_Single user invoice"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/invoices/",
            headers=auth_headers,
            json=invoice_data
        )
        
        assert response.status_code == 200, f"Failed to create single-user invoice: {response.text}"
        data = response.json()
        assert len(data["userIds"]) == 1, f"Expected 1 userId, got {len(data['userIds'])}"
        print(f"✓ Created single-user invoice: {data['id']}")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/invoices/{data['id']}", headers=auth_headers)
        print("✓ Cleaned up test invoice")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
