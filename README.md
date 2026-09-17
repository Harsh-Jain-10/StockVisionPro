<div align="center">
  <a href="https://github.com/Harsh-Jain-10/StockVisionPro">
    <img src="banner_v2.svg" alt="StockVision Pro Banner" width="100%" style="border-radius: 16px;" />
  </a>

  <br /><br />

  [![React](https://img.shields.io/badge/React-18-blue.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-6-purple.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Python](https://img.shields.io/badge/Python-3.10+-yellow.svg?style=for-the-badge&logo=python)](https://www.python.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-blueviolet?style=for-the-badge&logo=supabase)](https://supabase.com/)
</div>

<br />

**StockVision Pro** is an institutional-grade, full-stack financial analytics and market intelligence platform engineered for modern retail investors and quant analysts. Seamlessly blending real-time market feeds with machine learning price forecasting, natural language catalyst analysis, and automated technical alert triggers, StockVision Pro equips you with data-driven decision support directly in your browser.

Now upgraded for enterprise cloud deployment, the platform features Supabase PostgreSQL database clustering (with automatic offline SQLite fallback), real-time US market session tracking, and a streamlined desktop/mobile interface.

---

## ✨ Core Capabilities

### 🔔 Smart Price & Technical Alerts Hub
- **Human-Centric Monitoring Hub**: Replaced rigid, robotic alert forms with an intuitive trading trigger desk.
- **Live Asset Quote Banner**: Automatically previews the active ticker's real-time price, day's percentage move, and intraday high/low range without guesswork.
- **5 Strategy Conditions**:
  - 🚀 **Price Above (Breakout)**: Alerts when price crosses through resistance into new highs.
  - 🛡️ **Price Below (Dip / Stop-Loss)**: Alerts when price drops to key buy support or protection stops.
  - ⚡ **Golden Cross (50/200 SMA)**: Alerts on major moving average momentum trend confirmations.
  - 🟢 **RSI Oversold (< 30)**: Alerts when severe selling exhaustion creates high-probability bounce setups.
  - 🔴 **RSI Overbought (> 70)**: Alerts on extended momentum for take-profit opportunities.
- **Dynamic 1-Click Target Presets**: Automatically calculates and sets targets (`+2% Bounce`, `+5% Breakout`, `+10% Surge`, `-3% Dip Buy`, `-5% Stop Loss`) based on the active stock's live price.
- **Real-Time Target Proximity Indicator**: Displays exact price delta and percentage distance from market price (e.g. `Target is +$6.50 (+5.06%) from current price`).
- **Web Audio Synthesizer Chime**: Integrated dual-tone audio notification chime (D5 → A5) with an instant "Test Chime 🔔" preview button and an on/off sound toggle.
- **1-Click Starter Templates**: Zero-state quick launchers for popular triggers (NVDA Breakout, SPY Dip Shield, AAPL Golden Cross).
- **24/7 Active Trigger Ledger**: Card-based monitor displaying active armed status, live targets, sound test previews, and one-click deletion.

### 📰 Global Catalyst Radar & News Sentiment Engine
- **Daily Top 20 Catalyst News Feed**: Surfaces high-impact market news with automated sentiment scoring (Compound Polarity & Bullish/Bearish/Neutral classifications).
- **Macro Sector Categorization**: Categorizes news across *Tech & AI Infrastructure*, *Monetary Policy & Rates*, *Geopolitics & Global Trade*, *Energy & Commodities*, and *Corporate Strategy & Earnings*.
- **High-Probability Beneficiaries & Downside Exposure**: Ranks specific stocks with projected upside moves (`+4.2%`) or downside risks (`-3.1%`) based on sentiment scoring, complete with sector tags and direct deep-links to Stock Lab.
- **AI Macro Synthesis**: Aggregates macro themes (central bank liquidity, AI capital expenditure, geopolitical accords) into a unified narrative summary.
- **Resilient Multi-Source Engine**: Features fallback curated catalysts ensuring zero empty-screen states during upstream API rate limits.

### 🔮 Predictive Forecasting & Forecast Studio
- **Dynamic Auto Model Selection**: Automatically trains 4 machine learning models (Random Forest, Gradient Boosting, Multi-Layer Perceptron, Seasonal Trend Decomposition) on an 80/20 train/validation split, evaluates price-space validation MAPE, selects the best-fit model dynamically per stock, and runs recursive forecasting only on the winning algorithm.
- **Log-Return Target Regressor**: Models logarithmic returns rather than raw price series, overcoming tree-model extrapolation ceilings and capturing genuine trend continuation.
- **Dynamic Indicator Feature Matrix**: Feeds technical indicators (RSI-14, MACD histogram, Bollinger Band width, volatility lags) directly into model inputs.
- **Log-Normal Multiplicative Confidence Bands**: Generates statistically robust future price envelope bounds.
- **Forecast Opportunities Scanner**: Automatically scans the equity universe to identify and rank under/overvalued options based on algorithmic upside targets.
- **Forecast Accuracy Ledger**: Tracks historical predictions against actual market outcomes, recording model verification history in the database.

### 📊 Advanced Interactive Charting & Stock Lab
- **Interactive Lightweight Charts**: High-performance SVG and canvas-based time-series OHLC candlestick visualization.
- **Automated Candlestick Pattern Detection**: Detects Doji, Hammer, Shooting Star, Bullish Engulfing, and Bearish Engulfing patterns annotated directly on charts.
- **Technical Overlays**: Dynamic toggle for RSI, MACD, Bollinger Bands, and Simple Moving Averages.
- **Multi-Ticker Comparison Lab**: Normalizes and compares relative strength across multiple symbols on a single percentage scale (e.g., AAPL vs MSFT vs NVDA).

### 🤖 AI Market Intelligence & Ergonomic Assistant
- **AI Analyst Summaries**: Context-aware natural language analysis breaking down technical setups, scenario price bands, and risk factors.
- **Refined Floating AI Assistant**: Compact, 48px floating launcher button with live online status indicator, contextual stock awareness, and instant natural language market Q&A.
- **Natural Language Screener**: Queries the market universe using natural prompts to filter for specific technical and momentum criteria.

### 🕒 Real-Time Market Status & Session Tracking
- **Market Session Pill**: Top bar tracker with real-time indicators for Pre-Market, Regular Trading, After-Hours, and Weekend/Closed sessions with countdown timers.

### 📱 Premium Responsive Mobile Experience (V2)
- **Mobile Navigation (< 768px)**: Sticky 56px header and fixed 68px bottom navigation bar with iOS/Android safe area support.
- **Tablet Layout (768px – 1023px)**: Narrow collapsed sidebar view keeping charts and analytical modules focused.
- **Full-Screen Search Modal**: Autocomplete search with trending symbols and local search history.

---

## 🛠️ Architecture & Tech Stack

### **Frontend** (React + Vite + TypeScript)
- **Framework**: React 18 with Vite for lightning-fast HMR and optimized production bundles.
- **State & Server Cache**: TanStack React Query v5 for optimized caching, polling, and optimistic mutations.
- **Styling**: Vanilla CSS design token system with dark/light themes and glassmorphism cards.
- **Visualizations**: Lightweight Charts (TradingView) and Recharts.
- **Audio Notifications**: HTML5 Web Audio API synthesizer for low-latency alerts without asset dependencies.

### **Backend** (Python + FastAPI)
- **Framework**: FastAPI for async, high-performance API endpoints.
- **Market Feeds**: `yfinance` for live and historical market data ingestion.
- **NLP Sentiment**: NLTK VADER sentiment intensity analysis tailored for financial headlines.
- **Machine Learning**: Scikit-Learn (RandomForestRegressor, GradientBoostingRegressor, MLPRegressor).
- **Databases**: Supabase PostgreSQL with SQLAlchemy ORM and automatic local SQLite fallback.

---

## 🚀 Getting Started

### Option 1: Docker (Fastest)

1. Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is running.
2. Run from the repository root:
   ```bash
   docker-compose up --build
   ```
3. Access:
   - **Web Interface:** `http://localhost:5173`
   - **Backend API Docs:** `http://localhost:8000/docs`

---

### Option 2: Local Development Setup

#### 1. Start the Backend (Terminal 1)
Ensure you have Python 3.10+ installed:
```powershell
cd backend
python -m venv venv

# Activate Virtual Environment
# On Windows (PowerShell):
.\venv\Scripts\activate
# On macOS / Linux:
# source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory (or use default development SQLite fallback):
```env
# Optional AI / LLM API Keys
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_key
NEWSAPI_KEY=your_newsapi_key

# App config
ENV=development
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://user:password@host:5432/postgres  # Omit to use local SQLite fallback
ML_RETRAIN_INTERVAL_HOURS=24
PRICE_REFRESH_SECONDS=10
```

Start the FastAPI server:
```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
> *Using `python -m uvicorn` prevents path-with-spaces resolution issues on Windows.*

---

#### 2. Start the Frontend (Terminal 2)
Ensure you have Node.js 18+ installed:
```powershell
cd frontend
npm install
```

Verify or create `frontend/.env.local`:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Start the Vite development server:
```powershell
npm run dev
```

Open your browser at **`http://127.0.0.1:5173`**.

---

## 📁 Repository Structure

```text
StockVisionPro/
├── backend/
│   ├── main.py                     # FastAPI API entry point & WebSocket feeds
│   ├── routers/
│   │   ├── stock.py                # Quotes, historical data, and technical indicator routes
│   │   ├── market.py               # News sentiment, market overview, and screeners
│   │   ├── alerts.py               # User price & technical alert management
│   │   └── forecast.py             # Machine learning forecast endpoints
│   ├── services/
│   │   ├── analysis_service.py     # News sentiment engine, AI summaries, comparison
│   │   ├── data_service.py         # Market data ingestion & normalization
│   │   └── forecast_service.py     # Dynamic multi-model ML training & recursive forecaster
│   ├── models/
│   │   ├── database.py             # SQLAlchemy models & engine configuration
│   │   └── schemas.py              # Pydantic request & response schemas
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts           # Axios client & typed API SDK
│   │   ├── components/
│   │   │   ├── ForecastStudio.tsx  # Dynamic ML forecasting studio
│   │   │   ├── ForecastOpportunities.tsx # Undervalued opportunities scanner
│   │   │   ├── ForecastAccuracy.tsx # Model performance tracking ledger
│   │   │   ├── MobileHeader.tsx    # Responsive mobile top bar
│   │   │   ├── MobileBottomNav.tsx # iOS/Android safe area bottom bar
│   │   │   └── MobileSearchModal.tsx # Fullscreen modal with search history
│   │   ├── styles/
│   │   │   └── globals.css         # Design system tokens, glassmorphism, animations
│   │   ├── utils/
│   │   │   └── marketStatus.ts     # US market session tracking & countdowns
│   │   └── main.tsx                # App bootstrapping, Alerts Hub, News Sentiment, Stock Lab
│   ├── index.html                  # HTML5 shell
│   ├── package.json                # Frontend dependencies & scripts
│   └── vite.config.ts              # Vite bundler configuration
├── docker-compose.yml              # Multi-container orchestration
└── README.md                       # Documentation
```
---

## 👨‍💻 Author

> **Built by Harsh Jain**  
> *Full-Stack Developer | Innovator*  
> GitHub: [@Harsh-Jain-10](https://github.com/Harsh-Jain-10)

---

## ⚠️ Disclaimer
*StockVision Pro is a portfolio and analytical platform built for educational and research purposes. Algorithmic forecasts and AI-generated insights do not constitute financial advice. Always consult a certified financial planner and conduct your own due diligence before making investment decisions.*
