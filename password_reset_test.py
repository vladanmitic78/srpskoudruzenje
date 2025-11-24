#!/usr/bin/env python3
"""
Comprehensive Password Reset Testing for Serbian Cultural Association
Tests the complete password reset flow with real database integration
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime, timedelta
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# Get backend URL from environment
BACKEND_URL = "https://taby-serb-community.preview.emergentagent.com/api"
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

class PasswordResetTester:
    def __init__(self):
        self.session = None
        self.db_client = None
        self.db = None
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    async def setup(self):
        """Initialize HTTP session and database connection"""
        self.session = aiohttp.ClientSession()
        self.db_client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.db_client[DB_NAME]

    async def cleanup(self):
        """Close connections"""
        if self.session:
            await self.session.close()
        if self.db_client:
            self.db_client.close()

    def log_result(self, test_name, success, message=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")

    async def test_forgot_password_and_db_storage(self):
        """Test forgot-password API and verify token storage in database"""
        try:
            test_email = "vladanmitic@gmail.com"
            
            # Clear any existing reset token first
            await self.db.users.update_one(
                {"email": test_email},
                {"$unset": {"resetToken": "", "resetTokenExpiry": ""}}
            )
            
            # Request password reset
            async with self.session.post(f"{BACKEND_URL}/auth/forgot-password?email={test_email}") as response:
                if response.status != 200:
                    text = await response.text()
                    self.log_result("Forgot Password + DB Storage", False, f"HTTP {response.status}: {text}")
                    return False
                
                data = await response.json()
                if not data.get("success"):
                    self.log_result("Forgot Password + DB Storage", False, "API returned success=false")
                    return False
            
            # Check database for reset token
            user = await self.db.users.find_one({"email": test_email})
            if not user:
                self.log_result("Forgot Password + DB Storage", False, "User not found in database")
                return False
            
            if "resetToken" not in user or "resetTokenExpiry" not in user:
                self.log_result("Forgot Password + DB Storage", False, "Reset token or expiry not stored in database")
                return False
            
            # Verify expiry is approximately 1 hour from now
            expiry = user["resetTokenExpiry"]
            now = datetime.utcnow()
            expected_expiry = now + timedelta(hours=1)
            time_diff = abs((expiry - expected_expiry).total_seconds())
            
            if time_diff > 60:  # Allow 1 minute tolerance
                self.log_result("Forgot Password + DB Storage", False, f"Reset token expiry incorrect. Expected ~{expected_expiry}, got {expiry}")
                return False
            
            self.log_result("Forgot Password + DB Storage", True, f"Reset token stored with correct expiry: {expiry}")
            return user["resetToken"]
            
        except Exception as e:
            self.log_result("Forgot Password + DB Storage", False, f"Exception: {str(e)}")
            return False

    async def test_reset_password_with_valid_token(self, reset_token):
        """Test reset-password API with valid token"""
        try:
            test_email = "vladanmitic@gmail.com"
            new_password = "NewTestPassword123!"
            
            # Reset password using the token
            async with self.session.post(f"{BACKEND_URL}/auth/reset-password?token={reset_token}&new_password={new_password}") as response:
                if response.status != 200:
                    text = await response.text()
                    self.log_result("Reset Password (Valid Token)", False, f"HTTP {response.status}: {text}")
                    return False
                
                data = await response.json()
                if not data.get("success"):
                    self.log_result("Reset Password (Valid Token)", False, "API returned success=false")
                    return False
            
            # Verify reset token and expiry are cleared from database
            user = await self.db.users.find_one({"email": test_email})
            if "resetToken" in user or "resetTokenExpiry" in user:
                self.log_result("Reset Password (Valid Token)", False, "Reset token fields not cleared from database")
                return False
            
            self.log_result("Reset Password (Valid Token)", True, "Password reset successful, token fields cleared")
            return new_password
            
        except Exception as e:
            self.log_result("Reset Password (Valid Token)", False, f"Exception: {str(e)}")
            return False

    async def test_login_with_new_password(self, new_password):
        """Test login with the new password"""
        try:
            login_data = {
                "username": "vladanmitic@gmail.com",
                "password": new_password
            }
            
            async with self.session.post(f"{BACKEND_URL}/auth/login", json=login_data) as response:
                if response.status != 200:
                    text = await response.text()
                    self.log_result("Login with New Password", False, f"HTTP {response.status}: {text}")
                    return False
                
                data = await response.json()
                if not data.get("success") or not data.get("token"):
                    self.log_result("Login with New Password", False, "Login failed or no token returned")
                    return False
            
            self.log_result("Login with New Password", True, "Successfully logged in with new password")
            return True
            
        except Exception as e:
            self.log_result("Login with New Password", False, f"Exception: {str(e)}")
            return False

    async def test_login_with_old_password(self):
        """Test that old password no longer works"""
        try:
            login_data = {
                "username": "vladanmitic@gmail.com",
                "password": "Admin123!"  # Original password
            }
            
            async with self.session.post(f"{BACKEND_URL}/auth/login", json=login_data) as response:
                if response.status == 401:
                    self.log_result("Old Password Rejected", True, "Old password correctly rejected")
                    return True
                elif response.status == 200:
                    self.log_result("Old Password Rejected", False, "Old password still works (should be rejected)")
                    return False
                else:
                    text = await response.text()
                    self.log_result("Old Password Rejected", False, f"Unexpected response {response.status}: {text}")
                    return False
            
        except Exception as e:
            self.log_result("Old Password Rejected", False, f"Exception: {str(e)}")
            return False

    async def restore_original_password(self):
        """Restore the original admin password for system stability"""
        try:
            # Import the hash_password function
            import sys
            sys.path.append('/app/backend')
            from auth_utils import hash_password
            
            original_password_hash = hash_password("Admin123!")
            await self.db.users.update_one(
                {"email": "vladanmitic@gmail.com"},
                {"$set": {"hashed_password": original_password_hash}}
            )
            
            self.log_result("Restore Original Password", True, "Original admin password restored")
            return True
            
        except Exception as e:
            self.log_result("Restore Original Password", False, f"Exception: {str(e)}")
            return False

    async def test_expired_token(self):
        """Test reset-password with expired token"""
        try:
            test_email = "vladanmitic@gmail.com"
            
            # Create an expired token manually
            expired_token = "expired_test_token_123"
            expired_time = datetime.utcnow() - timedelta(hours=2)  # 2 hours ago
            
            await self.db.users.update_one(
                {"email": test_email},
                {"$set": {"resetToken": expired_token, "resetTokenExpiry": expired_time}}
            )
            
            # Try to reset password with expired token
            async with self.session.post(f"{BACKEND_URL}/auth/reset-password?token={expired_token}&new_password=TestPassword123!") as response:
                if response.status == 400:
                    data = await response.json()
                    if "Invalid or expired reset token" in data.get("detail", ""):
                        self.log_result("Expired Token Test", True, "Expired token correctly rejected")
                        return True
                    else:
                        self.log_result("Expired Token Test", False, "Wrong error message for expired token")
                        return False
                else:
                    text = await response.text()
                    self.log_result("Expired Token Test", False, f"Expected 400, got {response.status}: {text}")
                    return False
            
        except Exception as e:
            self.log_result("Expired Token Test", False, f"Exception: {str(e)}")
            return False
        finally:
            # Clean up expired token
            await self.db.users.update_one(
                {"email": test_email},
                {"$unset": {"resetToken": "", "resetTokenExpiry": ""}}
            )

    async def run_comprehensive_test(self):
        """Run comprehensive password reset testing"""
        print("🔐 Starting Comprehensive Password Reset Testing...")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Database: {DB_NAME}")
        print("=" * 70)

        await self.setup()

        try:
            # Test 1: Forgot password and database storage
            reset_token = await self.test_forgot_password_and_db_storage()
            if not reset_token:
                print("❌ Cannot continue without valid reset token")
                return False

            # Test 2: Reset password with valid token
            new_password = await self.test_reset_password_with_valid_token(reset_token)
            if not new_password:
                print("❌ Cannot continue without successful password reset")
                return False

            # Test 3: Login with new password
            await self.test_login_with_new_password(new_password)

            # Test 4: Verify old password no longer works
            await self.test_login_with_old_password()

            # Test 5: Test expired token
            await self.test_expired_token()

            # Restore original password for system stability
            await self.restore_original_password()

        finally:
            await self.cleanup()

        # Print summary
        print("=" * 70)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")

        return self.results['failed'] == 0

async def main():
    """Main test runner"""
    tester = PasswordResetTester()
    success = await tester.run_comprehensive_test()
    
    if success:
        print("\n🎉 All comprehensive password reset tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())