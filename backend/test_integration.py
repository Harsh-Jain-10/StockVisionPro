import os
import sys
import unittest
from fastapi.testclient import TestClient
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend dir to path to make imports work cleanly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
from models.database import Base, get_db, User, OTPCode, CreditRequest, PortfolioTransaction

# Setup in-memory test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_stockvision.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Override app dependency
app.dependency_overrides[get_db] = override_get_db

class TestStockVisionEnhancements(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create tables
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        # Drop tables and remove temp file
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_stockvision.db"):
            try:
                os.remove("./test_stockvision.db")
            except OSError:
                pass

    def setUp(self):
        # Patch the email sending function to mock successful email dispatch
        self.patcher = patch("services.mail_service.send_html_email", return_value=True)
        self.mock_send = self.patcher.start()

        # Clean up database tables before each test
        db = TestingSessionLocal()
        db.query(User).delete()
        db.query(OTPCode).delete()
        db.query(CreditRequest).delete()
        db.query(PortfolioTransaction).delete()
        db.commit()
        db.close()

    def tearDown(self):
        self.patcher.stop()

    def _get_otp_code_from_db(self, email: str) -> str | None:
        db = TestingSessionLocal()
        try:
            from sqlalchemy import select
            from models.database import OTPCode
            otp_entry = db.scalar(select(OTPCode).where(OTPCode.email == email.strip().lower()))
            return otp_entry.code if otp_entry else None
        finally:
            db.close()

    def test_signup_otp_and_signin_flow(self):
        # 1. Send OTP for signup
        email = "testuser@stockvision.pro"
        password = "secure_password_123"
        response = self.client.post(
            "/api/auth/send-otp",
            json={"email": email, "password": password, "action": "signup"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        otp_code = self._get_otp_code_from_db(email)
        self.assertIsNotNone(otp_code)

        # 2. Verify OTP code to complete registration
        response = self.client.post(
            "/api/auth/verify-otp",
            json={"email": email, "code": otp_code, "action": "signup"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        token = data.get("token")
        self.assertIsNotNone(token)
        self.assertEqual(data["email"], email)

        # 3. Try to sign in with password
        response = self.client.post(
            "/api/auth/signin",
            json={"email": email, "password": password}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        signin_token = data.get("token")
        self.assertIsNotNone(signin_token)

        # 4. Try to sign in with wrong password
        response = self.client.post(
            "/api/auth/signin",
            json={"email": email, "password": "wrong_password"}
        )
        self.assertEqual(response.status_code, 401)

    def test_credit_request_workflow(self):
        # 1. Setup Admin credentials in environment
        admin_email = "adminuser@stockvision.pro"
        admin_password = "adminpassword"
        
        with patch.dict(os.environ, {"ADMIN_EMAIL": admin_email, "ADMIN_PASSWORD": admin_password}):
            # Initiate admin signin via new endpoint
            signin_res = self.client.post(
                "/api/admin/signin",
                json={"email": admin_email, "password": admin_password}
            )
            self.assertEqual(signin_res.status_code, 200)
            self.assertTrue(signin_res.json()["success"])

            # Retrieve admin OTP from DB
            admin_otp = self._get_otp_code_from_db(admin_email)
            self.assertIsNotNone(admin_otp)

            # Verify OTP via new admin verify endpoint
            admin_verify = self.client.post(
                "/api/admin/verify-otp",
                json={"email": admin_email, "code": admin_otp}
            )
            self.assertEqual(admin_verify.status_code, 200)
            admin_token = admin_verify.json()["token"]
            admin_headers = {"Authorization": f"Bearer {admin_token}"}

            # 2. Setup standard user
            user_email = "credituser@stockvision.pro"
            user_password = "creditpassword"
            self.client.post(
                "/api/auth/send-otp",
                json={"email": user_email, "password": user_password, "action": "signup", "role": "user"}
            )
            user_otp = self._get_otp_code_from_db(user_email)
            user_verify = self.client.post(
                "/api/auth/verify-otp",
                json={"email": user_email, "code": user_otp, "action": "signup"}
            )
            user_token = user_verify.json()["token"]
            user_headers = {"Authorization": f"Bearer {user_token}"}

            # 3. Standard user requests credits
            req_res = self.client.post(
                "/api/portfolio/request-credits",
                json={"amount": 50000.0, "reason": "Expand options trading strategy"},
                headers=user_headers
            )
            self.assertEqual(req_res.status_code, 200)
            req_data = req_res.json()
            self.assertEqual(req_data["status"], "pending")
            self.assertEqual(req_data["amount"], 50000.0)
            request_id = req_data["id"]

            # 4. Standard user tries to access admin list requests (should return 403 Forbidden)
            bad_admin_res = self.client.get("/api/admin/requests", headers=user_headers)
            self.assertEqual(bad_admin_res.status_code, 403)

            # 5. Standard user tries to approve own request (should return 403 Forbidden)
            bad_approve_res = self.client.post(
                f"/api/admin/approve/{request_id}",
                headers=user_headers
            )
            self.assertEqual(bad_approve_res.status_code, 403)

            # 6. Standard user fetches their own request history
            user_req_history = self.client.get("/api/portfolio/requests", headers=user_headers)
            self.assertEqual(user_req_history.status_code, 200)
            user_req_data = user_req_history.json()
            self.assertTrue(len(user_req_data) > 0)
            self.assertEqual(user_req_data[0]["id"], request_id)

            # 7. Admin user lists requests
            admin_res = self.client.get("/api/admin/requests", headers=admin_headers)
            self.assertEqual(admin_res.status_code, 200)
            admin_data = admin_res.json()
            self.assertTrue(len(admin_data) > 0)
            self.assertEqual(admin_data[0]["id"], request_id)

            # 8. Admin user approves credit request
            approve_res = self.client.post(
                f"/api/admin/approve/{request_id}",
                headers=admin_headers
            )
            self.assertEqual(approve_res.status_code, 200)
            self.assertEqual(approve_res.json()["status"], "approved")
            self.assertIsNotNone(approve_res.json()["approved_at"])
            self.assertEqual(approve_res.json()["approved_by"], admin_email)

            # 9. Standard user checks portfolio balance ($100k start + $50k credit = $150k)
            portfolio_res = self.client.get(
                f"/api/portfolio/{user_verify.json()['user_id']}",
                headers=user_headers
            )
            self.assertEqual(portfolio_res.status_code, 200)
            self.assertEqual(portfolio_res.json()["cash_balance"], 150000.0)

            # 10. Standard user requests credits again for rejection test
            req_res_2 = self.client.post(
                "/api/portfolio/request-credits",
                json={"amount": 20000.0, "reason": "Too much risk"},
                headers=user_headers
            )
            request_id_2 = req_res_2.json()["id"]

            # 11. Admin rejects credit request with reason payload
            reject_res = self.client.post(
                f"/api/admin/reject/{request_id_2}",
                json={"reason": "Leverage is too high"},
                headers=admin_headers
            )
            self.assertEqual(reject_res.status_code, 200)
            reject_data = reject_res.json()
            self.assertEqual(reject_data["status"], "rejected")
            self.assertEqual(reject_data["admin_note"], "Leverage is too high")

    def test_password_reset_flow(self):
        # 1. Signup user first
        email = "resetuser@stockvision.pro"
        old_password = "old_password_123"
        new_password = "new_password_456"
        
        self.client.post(
            "/api/auth/send-otp",
            json={"email": email, "password": old_password, "action": "signup"}
        )
        otp = self._get_otp_code_from_db(email)
        self.client.post(
            "/api/auth/verify-otp",
            json={"email": email, "code": otp, "action": "signup"}
        )
        
        # Verify signin with old password works
        response = self.client.post(
            "/api/auth/signin",
            json={"email": email, "password": old_password}
        )
        self.assertEqual(response.status_code, 200)
        
        # Clear rate limiting logs for this email to bypass cooldown in test
        db = TestingSessionLocal()
        from models.database import OTPRequestLog
        db.query(OTPRequestLog).filter(OTPRequestLog.email == email).delete()
        db.commit()
        db.close()
        
        # 2. Trigger password reset OTP
        response = self.client.post(
            "/api/auth/send-otp",
            json={"email": email, "password": new_password, "action": "reset_password"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        
        # Retrieve reset OTP code
        reset_otp = self._get_otp_code_from_db(email)
        self.assertIsNotNone(reset_otp)
        
        # 3. Verify reset OTP code
        response = self.client.post(
            "/api/auth/verify-otp",
            json={"email": email, "code": reset_otp, "action": "reset_password"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        token = data.get("token")
        self.assertIsNotNone(token)
        
        # 4. Try to sign in with old password (should fail)
        response = self.client.post(
            "/api/auth/signin",
            json={"email": email, "password": old_password}
        )
        self.assertEqual(response.status_code, 401)
        
        # 5. Try to sign in with new password (should succeed)
        response = self.client.post(
            "/api/auth/signin",
            json={"email": email, "password": new_password}
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])

if __name__ == "__main__":
    unittest.main()
