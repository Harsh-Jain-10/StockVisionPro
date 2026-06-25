<div align="center">
  <a href="https://github.com/Harsh-Jain-10/StockVisionPro">
    <img src="banner.svg" alt="StockVision Pro Banner" width="100%" style="border-radius: 16px;" />
  </a>

  <br /><br />

  [![React](https://img.shields.io/badge/React-18-blue.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-5-purple.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Python](https://img.shields.io/badge/Python-3.10+-yellow.svg?style=for-the-badge&logo=python)](https://www.python.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-blueviolet?style=for-the-badge&logo=supabase)](https://supabase.com/)
</div>

<br />

**StockVision Pro** is a state-of-the-art, full-stack stock analytics platform engineered for modern investors. By seamlessly blending real-time market data with advanced AI insights, it delivers institutional-grade financial analysis directly to your browser. From interactive candlestick charts to fully automated technical analysis, StockVision Pro equips you with the tools to make smarter, data-driven decisions.

Now fully upgraded for cloud-ready enterprise deployment, the platform integrates Supabase PostgreSQL database support (with local SQLite fallback) and configurable environment management.

---

## ✨ Core Capabilities

### 📊 Advanced Interactive Charting
- **Candlestick & Line Charts**: Fully interactive, time-series visualization using historical OHLC data.
- **Pattern Recognition**: Automated detection of Candlestick patterns (Doji, Hammer, Shooting Star, Bullish/Bearish Engulfing) directly annotated on the chart.
- **Technical Indicators**: Overlay RSI, MACD, Bollinger Bands, and SMA values dynamically.
- **Comparison Lab**: Normalize and compare multiple tickers on a single scale to analyze relative strength (e.g., AAPL vs MSFT).

### 🤖 AI-Powered Market Intelligence
- **AI Analyst Summaries**: Driven narrative summaries breaking down complex technical setups into readable insights.
- **Sentiment Analysis**: Real-time financial news classification with an aggregated positive/negative/neutral sentiment gauge.
- **AI Screener**: Prompt the AI to find bullish setups across the NSE universe based on live technicals.
- **AI Chatbot Assistant**: Ask natural language questions about market trends or specific stock fundamentals.

### 🔮 Predictive Forecasting & Signals
- **Forecast Studio**: Model future performance using machine learning algorithms (e.g., Random Forest) directly on historical prices.
- **Forecast Opportunities**: Auto-scans the stock universe to identify and rank under/overvalued options.
- **Technical Signals**: Instantly calculates and aggregates signal metrics (Buy/Sell/Neutral) across leading indicators.
- **Forecast Accuracy**: Tracks and visualizes past forecasting performance to gauge model reliability.

### 💼 Live Watchlist & Real-Time Alerts
- **Live Watchlist**: Persisted watchlists with real-time 30-second polling and mini sparkline charts.
- **Rule-Based Alerts**: Set price crossing thresholds (e.g., Price > X, RSI < 30) and get notified instantly via email or console logs.
- **Economic Calendar**: Keep track of High, Medium, and Low-impact macroeconomic events globally.
- **Dark Mode**: Flawless CSS-variable-based theme toggles for night trading sessions.

### 🔌 Database Sync & SQLite Fallback
- **Supabase Shared Pooler (PostgreSQL)**: Connected via SQLAlchemy and `psycopg2-binary` for primary relational data (watchlists, alerts, and cached forecasts).
- **SQLite fallback**: Seamlessly reverts to a local SQLite database configuration when running in offline/local-only mode.

### 📱 V2 Premium Mobile & Responsive Design
- **Tablet Layout (768px-1023px)**: Narrow collapsed sidebar view showing icons only, keeping core layout uncluttered.
- **Mobile Experience (<768px)**: Completely hidden sidebar, replaced by a sticky 56px Mobile Header and fixed 68px Bottom Navigation bar with iOS/Android safe area support.
- **Interactive Search**: Dynamic full-screen search modal with autocomplete, trending symbols, and `localStorage` search history persistence.
- **Robinhood-Style Movers Card Layout**: Stacks and re-formats stock tables on mobile into a compact 2x2 grid (Symbol and Name on the left, Price and Change on the right).
- **Responsive Chart Controls**: Implemented responsive heights and `touch-action: pan-y` rules to prevent layout breaking or scroll-locking on mobile touch inputs.
- **Forecast Studio Mobile Reordering**: Orders sections to present AI Insights and News Correlation directly above charts on mobile.
- **Desktop Guard**: Confines overrides strictly inside media queries, ensuring the Desktop view (1024px+) remains 100% untouched.

---

## 🛠️ Architecture & Tech Stack

### **Frontend** (React + Vite)
- **Framework**: React 18 powered by Vite for lightning-fast HMR and optimized builds.
- **Typing safety**: Configured with `vite-env.d.ts` for Vite client-side properties (e.g., `import.meta.env`).
- **Dynamic Config**: Adapts base API URLs and WS endpoints dynamically from `import.meta.env.VITE_API_URL` to prevent hardcoded client lockups in production.
- **Styling**: Vanilla CSS for maximized performance, custom design properties, and instant theme switches.
- **Charting**: Recharts for SVG-based data visualizations.

### **Backend** (Python + FastAPI)
- **Framework**: FastAPI for async, high-performance API routing.
- **CORS Middleware**: Dynamic parsing supporting multi-origin configurations (comma-separated origins from `CORS_ORIGIN` env).
- **Market Data**: `yfinance` for historical and live ticker data fetching.
- **Databases**: Supabase PostgreSQL / SQLite fallback (SQLAlchemy).

---

## 🚀 Getting Started

### Option 1: Docker (Recommended)
The fastest way to spin up the entire ecosystem locally is via Docker Compose.

1. Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running.
2. Clone the repository and execute:
   ```bash
   docker-compose up --build
   ```
3. Access the platform:
   - **Web Interface:** `http://localhost:5173`
   - **Backend API Docs:** `http://localhost:8000/docs`

### Option 2: Local Development Setup

#### 1. Configure the Backend
Ensure you have Python 3.10+ installed.
```bash
cd backend
python -m venv venv

# Activate Virtual Environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
```

Create an `.env` file in the `backend/` directory and configure the environment variables:
```env
# Optional keys. The current MVP runs without these.
NEWSAPI_KEY=your_newsapi_key
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_key

# App config
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres.rvsqggigzpemerolmtfu:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
ML_RETRAIN_INTERVAL_HOURS=24
PRICE_REFRESH_SECONDS=10

# SMTP Configuration for alert email notifications (Optional – console logging fallback in dev)
ENV=development
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_digit_app_password
SMTP_SENDER=StockVision Pro <your_email@gmail.com>
ADMIN_EMAIL=recipient_email@gmail.com
```

Run the API server:
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

> [!TIP]
> A workspace [.vscode/settings.json](file:///.vscode/settings.json) configuration is provided to align your editor with the virtual environment automatically and resolve linter warnings.

#### 2. Configure the Frontend
Ensure you have Node.js 18+ installed.
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory to configure the backend API endpoints:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Run the Vite development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 📁 Repository Structure

```text
stock-vision-pro/
├── .vscode/               # Editor configurations
├── backend/               # FastAPI async Python backend
│   ├── main.py            # API Entry Point
│   ├── routers/           # Endpoint controllers (auth, data, ai)
│   ├── services/          # Business logic, forecasting, pattern detection
│   └── models/            # Pydantic schemas and DB definitions (SQLAlchemy models)
├── frontend/              # Vite + React SPA
│   ├── src/               
│   │   ├── api/           # API Client helpers
│   │   ├── components/    # Reusable UI components
│   │   ├── styles/        # Global style declarations
│   │   └── main.tsx       # Core React bootstrapping & websocket feeds
│   ├── index.html         # Frontend frame
│   └── vite.config.ts     # Vite configuration
├── docker-compose.yml     # Orchestration
└── README.md              # Project documentation
```

---

## 👨‍💻 Author

> **Built by Harsh Jain**  
> *Full-Stack Developer | Innovator*

---

## ⚠️ Disclaimer
*StockVision Pro is a portfolio application built for educational and analytical purposes. The AI-generated insights and forecasting results do not constitute financial advice. Always consult a certified financial planner and conduct your own due diligence before making real investment decisions.*
