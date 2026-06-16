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

        # Class-level patches to mock yfinance and sentiment database calls offline
        import pandas as pd
        import numpy as np
        from models.schemas import Quote
        from datetime import datetime, timezone

        def mock_get_history_df(symbol, period, db=None):
            dates = pd.date_range(end=pd.Timestamp.now(), periods=100, freq="D")
            closes = 100.0 + np.cumsum(np.random.normal(0.1, 1.0, 100))
            volumes = np.random.randint(1000, 5000, 100)
            return pd.DataFrame({
                "Date": dates,
                "Open": closes - 1.0,
                "High": closes + 2.0,
                "Low": closes - 2.0,
                "Close": closes,
                "Volume": volumes,
                "Symbol": symbol
            })

        def mock_get_quote(symbol, db=None):
            return Quote(
                symbol=symbol.upper(),
                name=symbol.upper(),
                price=150.0,
                previous_close=148.0,
                open=149.0,
                day_high=152.0,
                day_low=148.0,
                change=2.0,
                change_pct=1.35,
                volume=1000000,
                market_cap=1000000000.0,
                currency="USD",
                exchange="NASDAQ",
                timestamp=datetime.now(timezone.utc),
                cached=True
            )

        def mock_get_sentiment(symbol, db=None):
            return {
                "score": 0.25,
                "positive_pct": 50,
                "neutral_pct": 30,
                "negative_pct": 20,
                "bullish_headlines": [{"title": "Strong earnings for " + symbol}],
                "bearish_headlines": [],
                "headlines": []
            }

        cls.patcher_hist = patch("services.data_service.get_history_df", side_effect=mock_get_history_df)
        cls.patcher_hist.start()

        cls.patcher_quote = patch("services.data_service.get_quote", side_effect=mock_get_quote)
        cls.patcher_quote.start()

        cls.patcher_sent = patch("services.analysis_service.get_sentiment", side_effect=mock_get_sentiment)
        cls.patcher_sent.start()

    @classmethod
    def tearDownClass(cls):
        cls.patcher_hist.stop()
        cls.patcher_quote.stop()
        cls.patcher_sent.stop()

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

    def test_forecast_endpoints(self):
        symbol = "AAPL"
        
        # 1. Test /api/forecast/run endpoint
        res = self.client.post(
            "/api/forecast/run",
            json={"symbol": symbol, "model": "seasonal_trend", "horizon": 7}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("forecast", data)
        self.assertIn("metrics", data)
        self.assertIn("historical", data)
        self.assertIn("insights", data)
        self.assertEqual(len(data["forecast"]), 7)
        self.assertEqual(data["insights"]["direction"] in ["bullish", "bearish", "neutral"], True)

        # 2. Test /api/forecast/compare endpoint
        res = self.client.get(
            f"/api/forecast/compare?symbol={symbol}&model=seasonal_trend"
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["symbol"], symbol)
        self.assertEqual(data["model"], "seasonal_trend")
        self.assertIn("forecast_7d", data)
        self.assertIn("forecast_30d", data)
        self.assertIn("forecast_90d", data)
        self.assertEqual(len(data["forecast_7d"]), 7)
        self.assertEqual(len(data["forecast_30d"]), 30)
        self.assertEqual(len(data["forecast_90d"]), 90)

        # 3. Test /api/forecast/signal-card endpoint
        res = self.client.get(f"/api/forecast/signal-card?symbol={symbol}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("signal", data)
        self.assertIn("confidence", data)
        self.assertIn("score", data)

        # 4. Test /api/forecast/opportunities endpoint
        res = self.client.get("/api/forecast/opportunities")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("bullish", data)
        self.assertIn("bearish", data)

        # 5. Test /api/forecast/accuracy endpoint
        res = self.client.get("/api/forecast/accuracy")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("average_accuracy", data)
        self.assertIn("history", data)

if __name__ == "__main__":
    unittest.main()
