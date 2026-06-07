<div align="center">
  <h1>📈 StockVision Pro</h1>
  <p><strong>Real markets. Real intelligence. Real edge.</strong></p>

  [![React](https://img.shields.io/badge/React-18-blue.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-5-purple.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Python](https://img.shields.io/badge/Python-3.10+-yellow.svg?style=for-the-badge&logo=python)](https://www.python.org/)
  [![Anthropic Claude](https://img.shields.io/badge/AI-Claude_3.5_Sonnet-orange.svg?style=for-the-badge&logo=anthropic)](https://www.anthropic.com/)
</div>

<br />

**StockVision Pro** is a state-of-the-art, full-stack stock analytics platform engineered for modern investors. By seamlessly blending real-time market data with advanced AI insights driven by Anthropic's Claude, it delivers institutional-grade financial analysis directly to your browser. From interactive candlestick charts to fully automated technical analysis, StockVision Pro equips you with the tools to make smarter, data-driven decisions.

---

## ✨ Core Capabilities

### 📊 Advanced Interactive Charting
- **Candlestick & Line Charts**: Fully interactive, time-series visualization using historical OHLC data.
- **Pattern Recognition**: Automated detection of Candlestick patterns (Doji, Hammer, Shooting Star, Bullish/Bearish Engulfing) directly annotated on the chart.
- **Technical Indicators**: Overlay RSI, MACD, Bollinger Bands, and SMA values dynamically.
- **Comparison Lab**: Normalize and compare multiple tickers on a single scale to analyze relative strength (e.g., AAPL vs MSFT).

### 🤖 AI-Powered Market Intelligence
- **AI Analyst Summaries**: Claude-driven narrative summaries breaking down complex technical setups into readable insights.
- **Sentiment Analysis**: Real-time financial news classification with an aggregated positive/negative/neutral sentiment gauge.
- **AI Screener**: Prompt the AI to find bullish setups across the NSE universe based on live technicals.
- **AI Chatbot Assistant**: Ask natural language questions about market trends or specific stock fundamentals.

### 💼 Portfolio Management & Backtesting
- **Paper Trading Simulator**: Execute Buy/Sell orders using live data and track performance in a mock portfolio.
- **Strategy Backtester**: Backtest technical strategies (e.g., SMA Crossovers, RSI Oversold/Overbought) with detailed metrics: Total Return, Win Rate, Max Drawdown, and Sharpe Ratio.
- **Live Watchlist**: Persisted watchlists with real-time 30-second polling and mini sparkline charts.

### ⚡ Real-Time Edge
- **Browser Push Notifications**: Set rule-based alerts (e.g., Price > X, RSI < 30) and get notified instantly.
- **Economic Calendar**: Keep track of High, Medium, and Low-impact macroeconomic events globally.
- **Dark Mode**: Flawless CSS-variable-based dark/light mode toggle to adapt to your trading environment.

---

## 🛠️ Architecture & Tech Stack

StockVision Pro is built for speed and reliability, decoupling the frontend presentation layer from the heavy-lifting backend data processing.

### **Frontend** (React + Vite)
- **Framework**: React 18 powered by Vite for lightning-fast HMR and optimized builds.
- **Styling**: Tailwind CSS combined with custom CSS properties for seamless thematic switching.
- **Charting**: Recharts for high-performance SVG-based data visualizations.
- **Icons**: Lucide React for crisp, scalable UI iconography.

### **Backend** (Python + FastAPI)
- **Framework**: FastAPI for async, high-performance API routing.
- **Market Data**: `yfinance` for reliable historical and live ticker data fetching.
- **AI Engine**: Anthropic Claude API (`claude-sonnet-4`) for sentiment analysis and technical summaries.
- **Database**: SQLite for lightweight, persistent portfolio and settings storage.

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

# Create an .env file and add your Anthropic API Key
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Run the API server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

#### 2. Configure the Frontend
Ensure you have Node.js 18+ installed.
```bash
cd frontend
npm install

# Run the Vite development server
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 📁 Repository Structure

```text
stock-vision-pro/
├── backend/               # FastAPI async Python backend
│   ├── main.py            # API Entry Point
│   ├── routers/           # Endpoint controllers (auth, data, ai)
│   ├── services/          # Business logic, backtesting, pattern detection
│   └── models/            # Pydantic schemas and DB definitions
├── frontend/              # Vite + React SPA
│   ├── src/               
│   │   ├── components/    # Reusable UI (Charts, Gauges, Cards)
│   │   ├── pages/         # Top-level views (Dashboard, Lab, Portfolio)
│   │   └── hooks/         # Custom React hooks for data fetching & state
│   ├── public/            # Static assets
│   └── vite.config.ts     # Vite configurations
├── AGENT_BRIEF.md         # Agent constraints and build directives
├── docker-compose.yml     # Orchestration
└── README.md              # Project documentation
```

---

## 👨‍💻 Author

> **Built by Harsh Jain**  
> *Full-Stack Developer | Innovator*

---

## ⚠️ Disclaimer
*StockVision Pro is a portfolio application built for educational and analytical purposes. The AI-generated insights and backtesting results do not constitute financial advice. Always consult a certified financial planner and conduct your own due diligence before making real investment decisions.*
