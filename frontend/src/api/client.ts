import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  timeout: 30000,
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

export async function runAiScreener() {
  return (await api.get("/ai/screener")).data as {
    stocks: any[];
    analysis: string;
    total_scanned: number;
  };
}

export async function runScreener(q: string) {
  return (await api.get("/market/screener", { params: { q } })).data;
}

const userId = localStorage.getItem("svp_user_id") || crypto.randomUUID();
localStorage.setItem("svp_user_id", userId);

export async function getWatchlist() {
  return (await api.get(`/watchlist/${userId}`)).data;
}

export async function addWatchlist(symbol: string) {
  return (await api.post("/watchlist/add", { user_id: userId, symbol })).data;
}

export async function deleteWatchlist(symbol: string) {
  return (await api.delete(`/watchlist/${userId}/${encodeURIComponent(symbol)}`)).data;
}

export async function getAlerts() {
  return (await api.get(`/alerts/${userId}`)).data;
}

export async function addAlert(symbol: string, type: string, value: number) {
  return (await api.post("/alerts/add", { user_id: userId, symbol, type, value })).data;
}

export async function getPortfolio() {
  return (await api.get(`/portfolio/${userId}`)).data;
}

export async function getTransactions() {
  return (await api.get(`/portfolio/${userId}/transactions`)).data;
}

export async function executeTrade(symbol: string, shares: number, action: "buy" | "sell") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await api.post("/portfolio/trade", { user_id: userId, symbol, shares, action }, { signal: controller.signal });
    return res.data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runBacktest(symbol: string, strategy: string, params: Record<string, any>) {
  return (await api.post("/backtest/run", { symbol, strategy, params, period: "2y" })).data;
}
