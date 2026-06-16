import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const isAdminRequest = config.url && config.url.includes("/admin");
  const token = isAdminRequest
    ? (sessionStorage.getItem("svp_admin_token") || sessionStorage.getItem("svp_token"))
    : sessionStorage.getItem("svp_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type Quote = {
  symbol: string;
  name?: string | null;
  price?: number | null;
  change_pct?: number | null;
  change?: number | null;
  volume?: number | null;
  currency?: string | null;
};

export type HistoryRow = {
  date: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
};

export async function getMarketOverview() {
  return (await api.get("/market/overview")).data;
}

export async function searchStocks(q: string) {
  return (await api.get("/search", { params: { q } })).data as Array<{ symbol: string; name: string; exchange: string; sector?: string }>;
}

export async function getQuote(symbol: string) {
  return (await api.get(`/stock/${encodeURIComponent(symbol)}/quote`)).data as Quote;
}

export async function getHistory(symbol: string, period = "1y") {
  return (await api.get(`/stock/${encodeURIComponent(symbol)}/history`, { params: { period } })).data as { rows: HistoryRow[] };
}

export async function getTechnicals(symbol: string) {
  return (await api.get(`/stock/${encodeURIComponent(symbol)}/technicals`)).data;
}

export async function getForecast(symbol: string) {
  return (await api.get(`/stock/${encodeURIComponent(symbol)}/forecast`)).data;
}

export async function getSignal(symbol: string) {
  return (await api.get(`/stock/${encodeURIComponent(symbol)}/signal`)).data;
}

export async function getSentiment(symbol: string) {
  return (await api.get(`/stock/${encodeURIComponent(symbol)}/sentiment`)).data;
}

export async function getAiSummary(symbol: string) {
  return (await api.get(`/stock/${encodeURIComponent(symbol)}/ai-summary`)).data;
}

export async function getNews(symbol: string) {
  return (await api.get(`/stock/${encodeURIComponent(symbol)}/news`)).data;
}

export async function compareSymbols(symbols: string[], period = "3mo") {
  return (await api.get("/compare", { params: { symbols: symbols.join(","), period } })).data;
}

export async function getCompareSummary(symbols: string[]) {
  return (await api.get("/compare/summary", { params: { symbols: symbols.join(",") } })).data;
}

export async function askAssistant(message: string, symbols: string[]) {
  return (await api.post("/ai/chat", { message, symbols })).data as {
    answer: string;
    symbols: string[];
    context: string[];
    disclaimer: string;
  };
}

export async function runAiScreener(q?: string) {
  return (await api.get("/ai/screener", { params: { q } })).data as {
    stocks: any[];
    analysis: string;
    total_scanned: number;
  };
}

export async function runScreener(q: string) {
  return (await api.get("/market/screener", { params: { q } })).data;
}

export async function getWatchlist() {
  const userId = sessionStorage.getItem("svp_user_id") || "local_user";
  return (await api.get(`/watchlist/${userId}`)).data;
}

export async function addWatchlist(symbol: string) {
  const userId = sessionStorage.getItem("svp_user_id") || "local_user";
  return (await api.post("/watchlist/add", { user_id: userId, symbol })).data;
}

export async function deleteWatchlist(symbol: string) {
  const userId = sessionStorage.getItem("svp_user_id") || "local_user";
  return (await api.delete(`/watchlist/${userId}/${encodeURIComponent(symbol)}`)).data;
}

export async function getAlerts() {
  const userId = sessionStorage.getItem("svp_user_id") || "local_user";
  return (await api.get(`/alerts/${userId}`)).data;
}

export async function addAlert(symbol: string, type: string, value: number) {
  const userId = sessionStorage.getItem("svp_user_id") || "local_user";
  return (await api.post("/alerts/add", { user_id: userId, symbol, type, value })).data;
}

export async function runBacktest(symbol: string, strategy: string, params: Record<string, any>) {
  return (await api.post("/backtest/run", { symbol, strategy, params, period: "2y" })).data;
}

export async function runForecast(symbol: string, model: string, horizon: number) {
  return (await api.post("/forecast/run", { symbol, model, horizon })).data;
}

export async function compareForecasts(symbol: string, model: string) {
  return (await api.get("/forecast/compare", { params: { symbol, model } })).data;
}

export async function getTechnicalSignal(symbol: string) {
  return (await api.get("/forecast/signal-card", { params: { symbol } })).data;
}

export async function getForecastOpportunities() {
  return (await api.get("/forecast/opportunities")).data;
}

export async function getForecastAccuracy() {
  return (await api.get("/forecast/accuracy")).data;
}

