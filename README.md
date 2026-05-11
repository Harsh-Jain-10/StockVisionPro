<div align="center">

<!-- HEADER BANNER -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,20&height=200&section=header&text=StockVision%20Pro&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=Real%20markets.%20Real%20intelligence.%20Real%20edge.&descAlignY=58&descSize=18&animation=fadeIn" alt="StockVision Pro" width="100%"/>

<!-- STATUS BADGES -->
<p>
  <img src="https://img.shields.io/badge/version-1.0.0-brightgreen?style=flat-square&logo=semver" alt="Version"/>
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="Status"/>
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/PRs-welcome-orange?style=flat-square" alt="PRs Welcome"/>
  <img src="https://img.shields.io/badge/maintained-yes-green?style=flat-square" alt="Maintained"/>
</p>

<!-- TECH STACK BADGES -->
<p>
  <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS"/>
</p>
<p>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/Claude_Sonnet_4-CC785C?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude AI"/>
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/nginx-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx"/>
</p>

<br/>

<p>
  <b>StockVision Pro</b> is a full-stack, AI-powered stock analytics platform built for modern investors.<br/>
  It fuses real-time market data, institutional-grade technical analysis, and Anthropic's Claude AI<br/>
  into a single, polished interface — giving you the edge that was once reserved for trading desks.
</p>

<br/>

**[🚀 Quick Start](#-getting-started)** &nbsp;·&nbsp; **[✨ Features](#-core-capabilities)** &nbsp;·&nbsp; **[🏗️ Architecture](#️-system-architecture)** &nbsp;·&nbsp; **[📁 File Structure](#-repository-structure)** &nbsp;·&nbsp; **[🤝 Contributing](#-contributing)**

<br/>

---

</div>

## 🖼️ What Is StockVision Pro?

StockVision Pro is **not just a charting tool**. It's a fully integrated platform combining:

- 📊 **Interactive OHLC charting** with pattern annotations and indicator overlays
- 🤖 **Claude-powered AI analysis** — plain-English summaries of any technical setup
- 💼 **Paper trading + strategy backtesting** with real historical data
- 🔔 **Rule-based push alerts** for price and RSI thresholds
- 📅 **Economic calendar** tracking high/medium/low impact macro events

All wrapped in a **glassmorphism UI** with seamless dark/light mode switching.

---

<br/>

## ✨ Core Capabilities

### 📊 Advanced Interactive Charting

| Feature | Description |
|---|---|
| **Candlestick & Line Charts** | Fully interactive OHLC time-series with zoom, pan, and hover-detail overlays |
| **Pattern Recognition** | Auto-detects Doji, Hammer, Shooting Star, Bullish/Bearish Engulfing — annotated on-chart |
| **Technical Indicators** | Toggle RSI, MACD, Bollinger Bands, and SMA overlays dynamically |
| **Comparison Lab** | Normalize and plot multiple tickers on one scale — analyze relative strength side by side |

<br/>

### 🤖 AI-Powered Market Intelligence

Powered by **Claude Sonnet 4** — one of the most capable language models available today.

| Feature | What It Does |
|---|---|
| **AI Analyst Summaries** | Claude reads your chart and writes a plain-English breakdown of the technical setup |
| **Sentiment Analysis** | Classifies real-time news into positive/negative/neutral — shown as an animated gauge |
| **AI Screener** | Prompt the AI to find bullish/bearish setups across the NSE universe using live data |
| **AI Chatbot** | Ask natural language questions about any stock, sector, or macro trend |

<br/>

### 💼 Portfolio Management & Backtesting

| Feature | Details |
|---|---|
| **Paper Trading** | Execute mock Buy/Sell orders at live prices — track P&L without risking real money |
| **Strategy Backtester** | Test SMA Crossover, RSI Oversold/Overbought strategies on historical OHLC data |
| **Backtest Metrics** | Total Return %, Win Rate, Max Drawdown, Sharpe Ratio |
| **Live Watchlist** | Persistent watchlist with 30-second polling and mini sparkline charts per ticker |

<br/>

### ⚡ Real-Time Edge

| Feature | Details |
|---|---|
| **Push Notifications** | Browser alerts fire when Price > X or RSI < Y — even when the tab is in the background |
| **Economic Calendar** | Track High / Medium / Low impact global macro events that move markets |
| **Dark / Light Mode** | Full CSS-variable-based theme swap — zero flicker, zero compromise |

---

<br/>

## 🏗️ System Architecture

StockVision Pro is fully **decoupled** — the React SPA and the FastAPI backend are independent services communicating over a typed REST API, with Nginx handling routing in production Docker deployments.

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER  (React 18 + Vite + TS)          │
│                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │   Dashboard     │ │    Portfolio    │ │ Comparison   │  │
│  │  Charts · AI    │ │  Paper trading  │ │     Lab      │  │
│  └─────────────────┘ └─────────────────┘ └──────────────┘  │
│                                                             │
│        Tailwind CSS · Recharts · api/client.ts              │
└─────────────────────────────┬───────────────────────────────┘
                              │  REST / JSON
                    ┌─────────▼─────────┐
                    │       Nginx       │
                    │  /api/* → backend │
                    │  static → browser │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│               BACKEND  (FastAPI · main.py)                  │
│                                                             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │  ai.py    │ │ stock.py  │ │backtest.py│ │portfolio  │   │
│  │           │ │           │ │           │ │watchlist  │   │
│  │ Summaries │ │ OHLC data │ │ Strategy  │ │ alerts    │   │
│  │ Screener  │ │ Patterns  │ │  engine   │ │ compare   │   │
│  │ Chatbot   │ │ Indicators│ │           │ │ market    │   │
│  └─────┬─────┘ └─────┬─────┘ └───────────┘ └─────┬─────┘   │
│        │             │                            │         │
│           services/  ·  models/schemas.py  ·  models/db     │
└──────────┬────────────────────┬────────────────────┬────────┘
           │                    │                    │
  ┌────────▼───────┐  ┌─────────▼──────┐  ┌─────────▼──────┐
  │  Claude Sonnet │  │    yfinance    │  │     SQLite     │
  │    Anthropic   │  │  Live market   │  │ stockvision.db │
  └────────────────┘  └────────────────┘  └────────────────┘
```

<br/>

### Request Flow — AI Summary

```
User selects ticker in Dashboard
        │
        ▼
api/client.ts  →  GET /api/ai/summary?ticker=RELIANCE.NS
        │
        ▼
ai.py router  →  fetches OHLC + indicator data via yfinance
        │
        ▼
Constructs structured prompt  →  sends to Claude Sonnet 4
        │
        ▼
Claude returns narrative market analysis
        │
        ▼
JSON response streamed back  →  React renders AI summary card
```

---

<br/>

## 📁 Repository Structure

Accurate to the actual codebase:

```
stock-vision-pro/
│
├── 📂 frontend/
│   ├── 📂 src/
│   │   ├── 📂 api/
│   │   │   └── client.ts              # Typed API client — all fetch calls centralized here
│   │   ├── 📂 styles/
│   │   │   └── globals.css            # CSS variables, glassmorphism tokens, dark/light mode
│   │   └── main.tsx                   # React entry point
│   │
│   ├── index.html                     # App shell
│   ├── vite.config.ts                 # Vite config + dev proxy  (/api → localhost:8000)
│   ├── tsconfig.json                  # TypeScript compiler config
│   ├── tsconfig.tsbuildinfo           # TS incremental build cache (auto-generated)
│   ├── package.json                   # Node dependencies + scripts
│   ├── package-lock.json              # Dependency lockfile
│   ├── nginx.conf                     # Nginx routing config for production Docker build
│   └── Dockerfile                     # Frontend container — builds React, serves via Nginx
│
├── 📂 backend/
│   ├── 📂 models/                     # Data layer
│   │   ├── __init__.py
│   │   ├── database.py                # SQLite connection pool + table initialization
│   │   └── schemas.py                 # Pydantic request/response type definitions
│   │
│   ├── 📂 routers/                    # FastAPI route controllers (one file per domain)
│   │   ├── __init__.py
│   │   ├── ai.py                      # /ai — summaries, sentiment, screener, chatbot
│   │   ├── alerts.py                  # /alerts — create, list, delete price/RSI alerts
│   │   ├── backtest.py                # /backtest — strategy simulation endpoint
│   │   ├── compare.py                 # /compare — multi-ticker normalization & correlation
│   │   ├── market.py                  # /market — economic calendar, macro event data
│   │   ├── portfolio.py               # /portfolio — paper trading positions & P&L
│   │   ├── stock.py                   # /stock — OHLC, indicators, pattern detection
│   │   └── watchlist.py               # /watchlist — persistent watchlist CRUD
│   │
│   ├── 📂 services/                   # Business logic layer (imported by routers)
│   │   └── ...                        # AI engine, backtester, pattern detector, etc.
│   │
│   ├── main.py                        # FastAPI app init, CORS middleware, router mounts
│   ├── requirements.txt               # Python dependencies
│   ├── stockvision.db                 # SQLite DB file (auto-created on first run)
│   └── Dockerfile                     # Backend container — runs Uvicorn
│
├── docker-compose.yml                 # Orchestrates frontend + backend as linked containers
└── README.md                          # This file
```

---

<br/>

## 🛠️ Tech Stack — Full Reference

### Frontend

| Technology | Version | Role |
|---|---|---|
| **React** | 18 | Component framework |
| **TypeScript** | 5+ | End-to-end type safety |
| **Vite** | 5 | Dev server with HMR + optimized production builds |
| **Tailwind CSS** | 3 | Utility-first styling with custom glassmorphism design tokens |
| **Recharts** | Latest | SVG-based candlestick, line, and sparkline charts |
| **Lucide React** | Latest | Crisp, scalable icon library |
| **Nginx** | Stable | Production static file serving + API proxy routing |

### Backend

| Technology | Version | Role |
|---|---|---|
| **FastAPI** | 0.100+ | Async REST framework with auto-generated Swagger/ReDoc |
| **Python** | 3.10+ | Core language |
| **yfinance** | Latest | Historical + live market data fetching (NSE/BSE/NYSE) |
| **Anthropic SDK** | Latest | Claude Sonnet 4 API integration |
| **SQLite** | — | Persistent storage for portfolio, watchlist, and alerts |
| **Uvicorn** | Latest | ASGI server for FastAPI |

### Infrastructure

| Tool | Role |
|---|---|
| **Docker** | Reproducible containerized environments |
| **Docker Compose** | Orchestrates frontend + backend as linked services |
| **Nginx** | Routes `/api/*` to backend, serves React bundle for all other paths |

---

<br/>

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for Option 1
- [Python 3.10+](https://www.python.org/) and [Node.js 18+](https://nodejs.org/) — for Option 2
- [Anthropic API Key](https://console.anthropic.com/) — **required** for all AI features

---

### Option 1 — Docker (Recommended) 🐳

```bash
# Clone the repo
git clone https://github.com/Harsh-Jain-10/stock-vision-pro.git
cd stock-vision-pro

# Add your API key
echo "ANTHROPIC_API_KEY=your_key_here" > backend/.env

# Build and start everything
docker-compose up --build
```

| Service | URL |
|---|---|
| 🖥️ Web App | `http://localhost:5173` |
| 📡 API Docs (Swagger) | `http://localhost:8000/docs` |
| 📖 API Docs (ReDoc) | `http://localhost:8000/redoc` |

---

### Option 2 — Local Dev Setup 🛠️

#### 1. Backend

```bash
cd backend
python -m venv venv

# Activate — Windows
venv\Scripts\activate
# Activate — macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Open .env and set: ANTHROPIC_API_KEY=your_key_here

# Start API server with hot-reload
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

#### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

> **Note:** Vite's dev proxy is pre-configured to forward all `/api` requests to `http://127.0.0.1:8000` — no extra config needed.

---

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Powers all Claude AI features — get one at [console.anthropic.com](https://console.anthropic.com) |
| `PORT` | ❌ | Backend port override (default: `8000`) |
| `ALLOWED_ORIGINS` | ❌ | CORS allowed origins (default: `http://localhost:5173`) |

---

<br/>

## 🎨 Design System

StockVision Pro uses a custom design language built on **CSS custom properties + Tailwind CSS**:

- **Theme:** Glassmorphism — `backdrop-filter: blur()` with semi-transparent card surfaces
- **Palette:** Light lavender-white base with deep violet accents, cleanly inverted for dark mode
- **Dark Mode:** Full CSS variable swap defined in `globals.css` — no Tailwind `dark:` prefix inconsistencies
- **Charts:** Recharts with gradient fills, custom tooltip renderers, and candlestick pattern annotation overlays
- **Typography:** System font stack for performance; monospace for all numerical data values

---

<br/>

## 🤝 Contributing

```bash
# 1. Fork and clone
git clone https://github.com/Harsh-Jain-10/stock-vision-pro.git

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Commit with a descriptive message
git commit -m "feat: add VWAP indicator overlay"

# 4. Push and open a Pull Request
git push origin feature/your-feature-name
```

Please keep PRs focused — one feature or fix per PR.

---

<br/>

## 👨‍💻 Author

<div align="center">

**Harsh Jain**

*B.Tech CSE (Data Science & AI) · SRM University Delhi-NCR*

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Harsh-Jain-10)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:harsh.jainm1003@gmail.com)

</div>

---

<br/>

## ⚠️ Disclaimer

> StockVision Pro is a portfolio project built for **educational and analytical purposes only**. AI-generated insights, technical summaries, and backtesting results **do not constitute financial advice**. Past performance is not indicative of future results. Always consult a SEBI-registered financial advisor before making real investment decisions.

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,20&height=100&section=footer" alt="footer" width="100%"/>

*Made with ☕ and a lot of market data*

⭐ **Star this repo if you found it useful** ⭐

</div>
