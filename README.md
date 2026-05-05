# 📈 StockVision Pro

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-yellow.svg)](https://www.python.org/)

**Real markets. Real intelligence. Real edge.**

StockVision Pro is a full-stack, AI-powered stock analytics platform designed for modern investors. It provides real-time market data, technical indicators, interactive financial charts, sentiment-style news summaries, and powerful portfolio management tools.

---

## ✨ Features

- **📊 Interactive Charts:** Real-time stock charting with advanced technical indicators (RSI, MACD, Bollinger Bands).
- **🤖 AI Insights & Forecasts:** Automated, narrative-driven summaries based on technicals and sentiment analysis.
- **🔍 Global Market Screener:** Filter and discover stocks globally based on specific financial criteria.
- **💼 Portfolio Management:** Track holdings, analyze performance, and view backtested trading strategies.
- **⚡ Live WebSockets:** Real-time price streaming for lightning-fast updates.
- **🔔 Custom Alerts:** Set rule-based price signals and market alerts.

---

## 🛠️ Tech Stack

### Frontend
- **React.js** & **Vite** for blazing fast performance
- **Tailwind CSS** for modern, responsive UI design
- **Lucide React** for beautiful icons
- **Recharts** for financial data visualization

### Backend
- **Python & FastAPI** for high-performance API routing
- **yfinance** for reliable, cached market data fetching
- **SQLite** for lightweight, persistent data storage
- **WebSockets** for real-time client-server communication

---

## 🚀 Getting Started

### Option 1: Docker (Recommended)
The easiest way to run the entire application locally is using Docker Compose.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Run the following command from the root of the repository:
   ```bash
   docker-compose up --build
   ```
3. Access the app:
   - **Frontend:** http://localhost
   - **Backend API Docs:** http://localhost:8000/docs

### Option 2: Local Development

#### 1. Start the Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

#### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## 📁 Repository Structure

```text
stock-vision-pro/
├── backend/               # FastAPI backend application
│   ├── main.py            # Application entry point
│   ├── routers/           # API route handlers
│   ├── services/          # Business logic & data fetching
│   └── models/            # Database schemas
├── frontend/              # React application
│   ├── src/               # React components and hooks
│   ├── public/            # Static assets
│   └── vite.config.ts     # Vite configuration
├── docker-compose.yml     # Docker orchestration config
└── README.md              # Project documentation
```

---

## 👨‍💻 Author

> **Built by Harsh Jain**  
> *Full-Stack Developer | Innovator*

---

## ⚠️ Disclaimer
*StockVision Pro is a portfolio MVP built for educational and analytical purposes. It does not constitute financial advice. Always do your own research before making investment decisions.*
