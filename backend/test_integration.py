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
from models.database import Base, get_db, Alert, WatchlistItem

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

class TestStockVisionAnalytics(unittest.TestCase):
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
        # Clean up database tables before each test
        db = TestingSessionLocal()
        db.query(Alert).delete()
        db.query(WatchlistItem).delete()
        db.commit()
        db.close()

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_market_overview(self):
        response = self.client.get("/api/market/overview")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("indices", data)
        self.assertIn("top_gainers", data)

    def test_stock_quote_and_analytics(self):
        # Test standard analytics endpoints
        symbol = "AAPL"
        
        # 1. Quote
        res = self.client.get(f"/api/stock/{symbol}/quote")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["symbol"], symbol)

        # 2. Technicals
        res = self.client.get(f"/api/stock/{symbol}/technicals")
        self.assertEqual(res.status_code, 200)
        
        # 3. Sentiment
        res = self.client.get(f"/api/stock/{symbol}/sentiment")
        self.assertEqual(res.status_code, 200)

        # 4. News
        res = self.client.get(f"/api/stock/{symbol}/news")
        self.assertEqual(res.status_code, 200)

    def test_watchlist_endpoints(self):
        user_id = "local_user"
        symbol = "MSFT"

        # 1. Get initial watchlist (should be empty)
        res = self.client.get(f"/api/watchlist/{user_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 0)

        # 2. Add item to watchlist
        res = self.client.post("/api/watchlist/add", json={"user_id": user_id, "symbol": symbol})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["symbol"], symbol)

        # 3. Get watchlist (should have 1 item)
        res = self.client.get(f"/api/watchlist/{user_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        self.assertEqual(res.json()[0]["symbol"], symbol)

        # 4. Remove item
        res = self.client.delete(f"/api/watchlist/{user_id}/{symbol}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "deleted")

    def test_alert_endpoints(self):
        user_id = "local_user"
        symbol = "TSLA"

        # 1. Add alert
        res = self.client.post(
            "/api/alerts/add",
            json={"user_id": user_id, "symbol": symbol, "type": "above", "value": 250.0}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["symbol"], symbol)
        alert_id = res.json()["id"]

        # 2. List alerts
        res = self.client.get(f"/api/alerts/{user_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        self.assertEqual(res.json()[0]["id"], alert_id)

        # 3. Delete alert
        res = self.client.delete(f"/api/alerts/{alert_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "deleted")

if __name__ == "__main__":
    unittest.main()
