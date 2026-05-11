<div align="center">

<img src="https://img.shields.io/badge/version-1.0.0-brightgreen?style=flat-square" alt="Version" />
<img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="Status" />
<img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
<img src="https://img.shields.io/badge/PRs-welcome-orange?style=flat-square" alt="PRs Welcome" />

<br/><br/>

```
 _____ _             _     _   _ _     _               ____            
/ ____| |           | |   | | | (_)   (_)             |  _ \           
| (___ | |_ ___   ___| | __ | | | |_ ___ _  ___  _ __ | |_) |_ __ ___ 
 \___ \| __/ _ \ / __| |/ / | | | | / __| |/ _ \| '_ \|  __/| '__/ _ \
 ____) | || (_) | (__|   <  \ \_/ / \__ \ | (_) | | | | |   | | | (_) |
|_____/ \__\___/ \___|_|\_\  \___/|_|___/_|\___/|_| |_|_|   |_|  \___/ 
```

# 📈 StockVision Pro

### *Real markets. Real intelligence. Real edge.*

<br/>

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Claude AI](https://img.shields.io/badge/Claude_Sonnet_4-CC785C?style=for-the-badge&logo=anthropic&logoColor=white)](https://www.anthropic.com/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

<br/>

<p align="center">
  <strong>StockVision Pro</strong> is a full-stack, AI-powered stock analytics platform that brings institutional-grade market intelligence to individual investors — combining real-time data, advanced technical analysis, and Anthropic's Claude AI into a single, polished interface.
</p>

<br/>

[🚀 Quick Start](#-getting-started) · [✨ Features](#-core-capabilities) · [🏗️ Architecture](#️-architecture--tech-stack) · [📁 Project Structure](#-repository-structure) · [🤝 Contributing](#-contributing)

---

</div>

<br/>

## 🖼️ Platform Overview

> StockVision Pro is more than a charting tool. It's an **analyst, portfolio manager, and market scanner** — all in one browser tab. Built with a glassmorphism UI, full dark/light mode, and a real-time data backbone, it gives you the kind of edge that was previously reserved for institutional desks.

<br/>

## ✨ Core Capabilities

### 📊 Advanced Interactive Charting

| Feature | Description |
|---|---|
| **Candlestick & Line Charts** | Fully interactive OHLC time-series charts with zoom, pan, and hover-detail overlays |
| **Pattern Recognition** | Automated detection of Doji, Hammer, Shooting Star, Bullish/Bearish Engulfing — annotated directly on the chart |
| **Technical Indicators** | Overlay RSI, MACD, Bollinger Bands, and SMA values with a single toggle |
| **Comparison Lab** | Normalize and plot multiple tickers on one scale to analyze relative strength (e.g., AAPL vs MSFT vs GOOGL) |

---

### 🤖 AI-Powered Market Intelligence

All AI features are powered by **Anthropic's Claude Sonnet 4** — one of the world's most advanced language models — giving you a real analyst's perspective on the market.

- **🧠 AI Analyst Summaries** — Claude reads your chart's technical setup and writes a plain-English breakdown of what's happening and what to watch.
- **📰 Sentiment Analysis** — Real-time financial news classification with an aggregated positive/negative/neutral sentiment gauge per ticker.
- **🔍 AI Screener** — Prompt the AI to scan the NSE universe for bullish/bearish setups using live technical data.
- **💬 AI Chatbot Assistant** — Ask natural language questions about any stock, macro trend, or strategy. Get answers, not data dumps.

---

### 💼 Portfolio Management & Backtesting

Paper trade with live data. Backtest strategies with real historical returns.

- **📋 Paper Trading Simulator** — Execute mock Buy/Sell orders on any ticker at live market prices and track your performance over time.
- **📉 Strategy Backtester** — Backtest SMA Crossovers, RSI Oversold/Overbought strategies, and more. Returns detailed metrics:
  - ✅ Total Return %
  - ✅ Win Rate
  - ✅ Max Drawdown
  - ✅ Sharpe Ratio
- **⭐ Live Watchlist** — Persistent watchlists with 30-second real-time polling and inline sparkline charts per ticker.

---

### ⚡ Real-Time Edge

- **🔔 Browser Push Notifications** — Set rule-based price/RSI alerts and get notified in real time — even when the tab is in the background.
- **📅 Economic Calendar** — Track High, Medium, and Low-impact global macro events that move markets.
- **🌙 Dark/Light Mode** — Full CSS-variable-based theme switching. No glitches, no flash, no compromise.

---

<br/>

## 🏗️ Architecture & Tech Stack

StockVision Pro follows a **decoupled, microservice-friendly architecture** — the frontend and backend are completely independent and communicate via a typed REST API.

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            FRONTEND  (React 18 + Vite + TS)              │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌────────────┐  ┌──────────────────┐  │   │
│  │  │  Dashboard  │  │ Portfolio  │  │  Comparison Lab  │  │   │
│  │  └─────────────┘  └────────────┘  └──────────────────┘  │   │
│  │                                                          │   │
│  │  Tailwind CSS │ Recharts │ Lucide React │ Framer Motion  │   │
│  └───────────────────────┬──────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────────┘
                           │  REST API (JSON over HTTP)
┌──────────────────────────┼──────────────────────────────────────┐
│                     BACKEND (FastAPI)                           │
│                           │                                     │
│  ┌─────────────┐  ┌───────┴──────┐  ┌──────────────────────┐   │
│  │  /ai routes │  │  /data routes│  │   /portfolio routes  │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                │                      │               │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌──────────▼───────────┐   │
│  │ Claude API  │  │   yfinance   │  │  SQLite (portfolio)  │   │
│  │ (Sonnet 4)  │  │  (live data) │  │                      │   │
│  └─────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

<br/>

### Frontend Stack

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18 | Component-based UI framework |
| **TypeScript** | 5+ | End-to-end type safety |
| **Vite** | 5 | Lightning-fast dev server + optimized builds |
| **Tailwind CSS** | 3 | Utility-first styling + glassmorphism theme |
| **Framer Motion** | Latest | Smooth animations and transitions |
| **Recharts** | Latest | SVG-based high-performance data visualization |
| **Lucide React** | Latest | Crisp, scalable icon library |

### Backend Stack

| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | 0.100+ | Async Python API framework with auto-docs |
| **Python** | 3.10+ | Core language |
| **yfinance** | Latest | Real-time + historical market data |
| **Anthropic SDK** | Latest | Claude Sonnet 4 AI integration |
| **SQLite** | — | Lightweight persistent storage for portfolio |
| **Uvicorn** | Latest | ASGI server for FastAPI |

### Infrastructure

| Tool | Purpose |
|---|---|
| **Docker + Docker Compose** | One-command full-stack deployment |
| **Vite Proxy** | Dev-mode API proxying (no CORS headaches) |

---

<br/>

## 📁 Repository Structure

```
stock-vision-pro/
│
├── 📂 backend/                        # FastAPI Python backend
│   ├── main.py                        # Application entry point + CORS + router registration
│   ├── requirements.txt               # Python dependencies
│   ├── .env.example                   # Environment variable template
│   │
│   ├── 📂 routers/                    # Endpoint controllers
│   │   ├── data.py                    # Market data routes (/ticker, /history, /watchlist)
│   │   ├── ai.py                      # AI routes (/sentiment, /summary, /chat, /screener)
│   │   └── portfolio.py               # Portfolio CRUD routes
│   │
│   ├── 📂 services/                   # Business logic layer
│   │   ├── market_data.py             # yfinance wrapper + caching
│   │   ├── ai_engine.py               # Claude API calls + prompt templates
│   │   ├── backtester.py              # Strategy simulation engine
│   │   ├── pattern_detector.py        # Candlestick pattern recognition logic
│   │   └── alert_manager.py           # Price/RSI alert evaluation
│   │
│   └── 📂 models/                     # Pydantic schemas + DB models
│       ├── schemas.py                 # Request/response type definitions
│       └── database.py                # SQLite table setup + connection pool
│
├── 📂 frontend/                       # Vite + React + TypeScript SPA
│   ├── index.html                     # App shell
│   ├── vite.config.ts                 # Vite config + dev proxy
│   ├── tailwind.config.js             # Tailwind + custom theme tokens
│   ├── tsconfig.json                  # TypeScript config
│   │
│   └── 📂 src/
│       ├── main.tsx                   # React entry point
│       ├── App.tsx                    # Root component + router
│       │
│       ├── 📂 pages/                  # Top-level route views
│       │   ├── Dashboard.tsx          # Main chart + AI summary view
│       │   ├── ComparisonLab.tsx      # Multi-ticker comparison view
│       │   ├── Portfolio.tsx          # Paper trading + backtester view
│       │   └── Calendar.tsx           # Economic events calendar view
│       │
│       ├── 📂 components/             # Reusable UI components
│       │   ├── CandlestickChart.tsx   # Recharts OHLC chart wrapper
│       │   ├── SentimentGauge.tsx     # Animated sentiment arc gauge
│       │   ├── WatchlistCard.tsx      # Mini sparkline ticker card
│       │   ├── AIChat.tsx             # Chat interface for AI assistant
│       │   └── Navbar.tsx             # Top navigation + dark mode toggle
│       │
│       └── 📂 hooks/                  # Custom React hooks
│           ├── useMarketData.ts       # Ticker data fetching + polling
│           ├── usePortfolio.ts        # Portfolio state management
│           └── useAlerts.ts           # Push notification + alert logic
│
├── 📄 docker-compose.yml              # Orchestrates frontend + backend containers
├── 📄 AGENT_BRIEF.md                  # AI agent constraints and build directives
└── 📄 README.md                       # You are here
```

---

<br/>

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Option 1) **or**
- [Python 3.10+](https://www.python.org/downloads/) and [Node.js 18+](https://nodejs.org/) (for Option 2)
- An [Anthropic API Key](https://console.anthropic.com/) (required for all AI features)

---

### Option 1: Docker (Recommended) 🐳

The fastest way to spin up the entire stack with a single command.

```bash
# 1. Clone the repository
git clone https://github.com/Harsh-Jain-10/stock-vision-pro.git
cd stock-vision-pro

# 2. Create your .env file and add your Anthropic API key
echo "ANTHROPIC_API_KEY=your_key_here" > backend/.env

# 3. Build and start both services
docker-compose up --build
```

**That's it.** Access the platform at:

| Service | URL |
|---|---|
| 🖥️ Web Interface | `http://localhost:5173` |
| 📡 Backend API Docs | `http://localhost:8000/docs` |
| 📡 Backend ReDoc | `http://localhost:8000/redoc` |

---

### Option 2: Local Development Setup 🛠️

Run the frontend and backend independently for a faster dev feedback loop.

#### Step 1 — Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your environment file
cp .env.example .env
# → Open .env and add: ANTHROPIC_API_KEY=your_key_here

# Start the API server (with hot-reload)
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

✅ Backend running at: `http://127.0.0.1:8000`  
📖 Auto-generated API docs at: `http://127.0.0.1:8000/docs`

#### Step 2 — Frontend Setup

```bash
# Open a new terminal, navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Vite dev server
npm run dev
```

✅ Frontend running at: `http://localhost:5173`

> **Note:** The frontend's Vite dev proxy is pre-configured to forward `/api` requests to `http://127.0.0.1:8000` — no extra configuration needed.

---

### Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | Your Anthropic API key — powers all Claude AI features |
| `PORT` | ❌ Optional | Backend port override (default: `8000`) |
| `ALLOWED_ORIGINS` | ❌ Optional | CORS origins (default: `http://localhost:5173`) |

---

<br/>

## 🎨 UI & Design System

StockVision Pro uses a custom **glassmorphism design system** built on top of Tailwind CSS with CSS custom properties.

- **Base palette:** Light lavender-white with deep violet accents
- **Glass effect:** `backdrop-filter: blur()` + semi-transparent backgrounds for cards
- **Dark mode:** Full CSS-variable swap — no Tailwind `dark:` prefix chaos
- **Motion:** Framer Motion entrance animations, micro-interactions on all interactive elements
- **Charts:** Recharts with custom tooltip renderers, gradient fills, and pattern annotation overlays

---

<br/>

## 🤝 Contributing

Contributions are welcome. Here's how to get involved:

```bash
# 1. Fork the repository
# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Commit your changes with a descriptive message
git commit -m "feat: add XYZ indicator to chart overlay"

# 4. Push and open a Pull Request
git push origin feature/your-feature-name
```

Please follow the existing code style and include tests where applicable.

---

<br/>

## 👨‍💻 About the Author

<div align="center">

**Built by [Harsh Jain](https://github.com/Harsh-Jain-10)**

*B.Tech CSE (Data Science & AI) · SRM University Delhi-NCR*  
*Full-Stack Developer · AI Automation Engineer*

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Harsh-Jain-10)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:harsh.jainm1003@gmail.com)

</div>

---

<br/>

## ⚠️ Disclaimer

> StockVision Pro is a portfolio project built for **educational and analytical purposes only**. The AI-generated insights, technical summaries, and backtesting results **do not constitute financial advice**. Past performance is not indicative of future results. Always conduct your own due diligence and consult a SEBI-registered financial advisor before making real investment decisions.

---

<div align="center">

<br/>

Made with ☕ and a lot of market data

⭐ **Star this repo if you found it useful** ⭐

</div>
