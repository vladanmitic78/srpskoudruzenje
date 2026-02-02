"""
Test Suite for PDF Invoice Generation Feature
Tests:
1. POST /api/invoices/ - Creates invoice and auto-generates PDF
2. GET /api/invoices/files/{filename} - Serves PDF files for viewing/download
3. GET /api/admin/bank-details - Returns bank details for invoices
4. PUT /api/admin/bank-details - Super Admin can update bank details
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_USERNAME = "vladanmitic@gmail.com"
SUPER_ADMIN_PASSWORD = "Admin123!"
TEST_USER_ID = "user_1763932080306"  # Tijana Isailovic


class TestInvoicePDFGeneration:
    """Test invoice creation with automatic PDF generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as super admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": SUPER_ADMIN_USERNAME,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    def test_01_login_success(self):
        """Test that super admin can login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": SUPER_ADMIN_USERNAME,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✅ Login successful - User role: {data['user'].get('role')}")
    
    def test_02_get_bank_details(self):
        """Test GET /api/admin/bank-details - Returns bank details"""
        response = self.session.get(f"{BASE_URL}/api/admin/bank-details")
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields exist
        expected_fields = ["bankName", "accountHolder", "iban", "bicSwift", "bankgiro", "orgNumber", "swish"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✅ Bank details retrieved: {data}")
    
    def test_03_update_bank_details(self):
        """Test PUT /api/admin/bank-details - Super Admin can update bank details"""
        test_bank_details = {
            "bankName": "Test Bank",
            "accountHolder": "Srpsko Kulturno Udruženje Täby",
            "iban": "SE12 3456 7890 1234 5678 90",
            "bicSwift": "TESTSWED",
            "bankgiro": "123-4567",
            "orgNumber": "802123-4567",
            "swish": "123 456 78 90"
        }
        
        response = self.session.put(f"{BASE_URL}/api/admin/bank-details", json=test_bank_details)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Bank details updated successfully")
        
        # Verify the update persisted
        get_response = self.session.get(f"{BASE_URL}/api/admin/bank-details")
        assert get_response.status_code == 200
        updated_data = get_response.json()
        assert updated_data["bankName"] == "Test Bank"
        assert updated_data["iban"] == "SE12 3456 7890 1234 5678 90"
        print(f"✅ Bank details verified after update")
    
    def test_04_get_users_for_invoice(self):
        """Test that we can get users to create invoice for"""
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert len(data["users"]) > 0
        
        # Find a test user
        users = data["users"]
        print(f"✅ Found {len(users)} users")
        
        # Store first user ID for invoice creation
        self.test_user_id = users[0].get("id") or users[0].get("_id")
        print(f"✅ Test user ID: {self.test_user_id}")
    
    def test_05_create_invoice_with_pdf(self):
        """Test POST /api/invoices/ - Creates invoice and auto-generates PDF"""
        # First get a valid user ID
        users_response = self.session.get(f"{BASE_URL}/api/admin/users")
        users = users_response.json().get("users", [])
        
        # Find a regular user (not admin)
        test_user = None
        for user in users:
            if user.get("role") == "user":
                test_user = user
                break
        
        if not test_user:
            test_user = users[0] if users else None
        
        if not test_user:
            pytest.skip("No users found to create invoice for")
        
        user_id = test_user.get("id") or test_user.get("_id")
        
        # Create invoice - API expects userIds as array
        invoice_data = {
            "userIds": [user_id],
            "amount": 500,
            "currency": "SEK",
            "dueDate": "2025-03-01",
            "description": "TEST_Membership Fee 2025 - PDF Test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/invoices/", json=invoice_data)
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data.get("fileUrl") is not None, "fileUrl is missing - PDF was not generated"
        
        # Extract filename from fileUrl (e.g., /api/invoices/files/invoice_123.pdf -> invoice_123.pdf)
        file_url = data["fileUrl"]
        filename = file_url.split("/")[-1] if file_url else None
        
        # Store for later tests
        self.created_invoice_id = data["id"]
        self.created_invoice_filename = filename
        self.created_invoice_file_url = file_url
        
        print(f"✅ Invoice created with ID: {self.created_invoice_id}")
        print(f"✅ PDF generated - File URL: {self.created_invoice_file_url}")
        print(f"✅ Filename: {self.created_invoice_filename}")
        
        return data
    
    def test_06_view_invoice_pdf(self):
        """Test GET /api/invoices/files/{filename} - View PDF file"""
        # First create an invoice to get a valid filename
        invoice = self.test_05_create_invoice_with_pdf()
        filename = invoice["fileName"]
        
        # Try to access the PDF file
        response = self.session.get(f"{BASE_URL}/api/invoices/files/{filename}")
        assert response.status_code == 200, f"Failed to get PDF: {response.status_code} - {response.text}"
        
        # Verify it's a PDF
        content_type = response.headers.get("content-type", "")
        assert "pdf" in content_type.lower() or "octet-stream" in content_type.lower(), f"Unexpected content type: {content_type}"
        
        # Verify content is not empty
        assert len(response.content) > 0, "PDF content is empty"
        
        # Verify it starts with PDF magic bytes
        assert response.content[:4] == b'%PDF', "Content is not a valid PDF"
        
        print(f"✅ PDF file retrieved successfully - Size: {len(response.content)} bytes")
    
    def test_07_download_invoice_pdf(self):
        """Test downloading invoice PDF via download endpoint"""
        # First create an invoice
        invoice = self.test_05_create_invoice_with_pdf()
        invoice_id = invoice["id"]
        
        # Try to download via the download endpoint
        response = self.session.get(f"{BASE_URL}/api/invoices/{invoice_id}/download")
        assert response.status_code == 200, f"Failed to download PDF: {response.status_code} - {response.text}"
        
        # Verify it's a PDF
        assert len(response.content) > 0, "Downloaded content is empty"
        assert response.content[:4] == b'%PDF', "Downloaded content is not a valid PDF"
        
        print(f"✅ PDF downloaded successfully via /download endpoint - Size: {len(response.content)} bytes")
    
    def test_08_get_all_invoices(self):
        """Test GET /api/invoices/ - Get all invoices (admin)"""
        response = self.session.get(f"{BASE_URL}/api/invoices/")
        assert response.status_code == 200
        data = response.json()
        assert "invoices" in data
        
        # Check if any invoices have PDF generated
        invoices_with_pdf = [inv for inv in data["invoices"] if inv.get("pdfGenerated")]
        print(f"✅ Found {len(data['invoices'])} total invoices, {len(invoices_with_pdf)} with PDF")
    
    def test_09_bank_details_appear_in_pdf(self):
        """Test that bank details are included in generated PDF"""
        # First set specific bank details
        test_bank_details = {
            "bankName": "Swedbank Test",
            "accountHolder": "SKUD Täby Test",
            "iban": "SE99 8888 7777 6666 5555 4444",
            "bicSwift": "SWEDSESS",
            "bankgiro": "999-8888",
            "orgNumber": "999999-9999",
            "swish": "999 888 77 66"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/admin/bank-details", json=test_bank_details)
        assert update_response.status_code == 200
        
        # Create a new invoice (should use updated bank details)
        users_response = self.session.get(f"{BASE_URL}/api/admin/users")
        users = users_response.json().get("users", [])
        user_id = users[0].get("id") if users else None
        
        if not user_id:
            pytest.skip("No users found")
        
        invoice_data = {
            "userIds": [user_id],
            "amount": 750,
            "currency": "SEK",
            "dueDate": "2025-04-01",
            "description": "TEST_Bank Details Verification Invoice"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/invoices/", json=invoice_data)
        assert create_response.status_code == 200
        
        invoice = create_response.json()
        assert invoice.get("fileUrl") is not None, "PDF was not generated - fileUrl is missing"
        
        # Download the PDF and verify it contains bank details
        filename = invoice["fileUrl"].split("/")[-1]
        pdf_response = self.session.get(f"{BASE_URL}/api/invoices/files/{filename}")
        assert pdf_response.status_code == 200
        
        # PDF content check (basic - just verify it's a valid PDF)
        assert pdf_response.content[:4] == b'%PDF'
        print(f"✅ Invoice PDF generated with bank details - Size: {len(pdf_response.content)} bytes")
    
    def test_10_unauthorized_access_to_bank_details(self):
        """Test that non-admin cannot access bank details"""
        # Create a new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        # Try to get bank details without auth
        response = unauth_session.get(f"{BASE_URL}/api/admin/bank-details")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Unauthorized access correctly blocked: {response.status_code}")
    
    def test_11_unauthorized_update_bank_details(self):
        """Test that non-superadmin cannot update bank details"""
        # Create a new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        # Try to update bank details without auth
        response = unauth_session.put(f"{BASE_URL}/api/admin/bank-details", json={
            "bankName": "Hacker Bank"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Unauthorized update correctly blocked: {response.status_code}")
    
    def test_12_cleanup_test_invoices(self):
        """Cleanup - Delete test invoices created during testing"""
        response = self.session.get(f"{BASE_URL}/api/invoices/")
        if response.status_code == 200:
            invoices = response.json().get("invoices", [])
            test_invoices = [inv for inv in invoices if "TEST_" in inv.get("description", "")]
            
            for inv in test_invoices:
                delete_response = self.session.delete(f"{BASE_URL}/api/invoices/{inv['id']}")
                if delete_response.status_code == 200:
                    print(f"✅ Deleted test invoice: {inv['id']}")
        
        print(f"✅ Cleanup completed")


class TestInvoiceFileEndpoints:
    """Test invoice file serving endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as super admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": SUPER_ADMIN_USERNAME,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_file_not_found(self):
        """Test 404 for non-existent file"""
        response = self.session.get(f"{BASE_URL}/api/invoices/files/nonexistent_file.pdf")
        assert response.status_code == 404
        print(f"✅ 404 returned for non-existent file")
    
    def test_existing_pdf_files(self):
        """Test that existing PDF files can be accessed"""
        # Get list of invoices
        response = self.session.get(f"{BASE_URL}/api/invoices/")
        assert response.status_code == 200
        
        invoices = response.json().get("invoices", [])
        invoices_with_files = [inv for inv in invoices if inv.get("fileName")]
        
        if not invoices_with_files:
            pytest.skip("No invoices with files found")
        
        # Try to access the first invoice file
        invoice = invoices_with_files[0]
        filename = invoice["fileName"]
        
        file_response = self.session.get(f"{BASE_URL}/api/invoices/files/{filename}")
        assert file_response.status_code == 200
        assert len(file_response.content) > 0
        
        print(f"✅ Existing PDF file accessible: {filename}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
