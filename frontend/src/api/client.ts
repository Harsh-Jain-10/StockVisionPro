import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
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

export async function sendOtp(email: string, action: "signin" | "signup" | "reset_password", password?: string, role?: "user" | "admin") {
  return (await api.post("/auth/send-otp", { email, action, password, role })).data as {
    success: boolean;
    message: string;
    code_preview_for_testing?: string;
  };
}

export async function verifyOtp(email: string, code: string, action: "signin" | "signup" | "reset_password") {
  return (await api.post("/auth/verify-otp", { email, code, action })).data as {
    success: boolean;
    user_id: string;
    email: string;
    token?: string;
    role?: string;
    message: string;
  };
}

export async function signIn(email: string, password: string) {
  return (await api.post("/auth/signin", { email, password })).data as {
    success: boolean;
    user_id: string;
    email: string;
    token: string;
    role: string;
    message: string;
  };
}

export async function getWatchlist() {
  const userId = sessionStorage.getItem("svp_user_id");
  return (await api.get(`/watchlist/${userId}`)).data;
}

export async function addWatchlist(symbol: string) {
  const userId = sessionStorage.getItem("svp_user_id");
  return (await api.post("/watchlist/add", { user_id: userId, symbol })).data;
}

export async function deleteWatchlist(symbol: string) {
  const userId = sessionStorage.getItem("svp_user_id");
  return (await api.delete(`/watchlist/${userId}/${encodeURIComponent(symbol)}`)).data;
}

export async function getAlerts() {
  const userId = sessionStorage.getItem("svp_user_id");
  return (await api.get(`/alerts/${userId}`)).data;
}

export async function addAlert(symbol: string, type: string, value: number) {
  const userId = sessionStorage.getItem("svp_user_id");
  return (await api.post("/alerts/add", { user_id: userId, symbol, type, value })).data;
}

export async function getPortfolio() {
  const userId = sessionStorage.getItem("svp_user_id");
  return (await api.get(`/portfolio/${userId}`)).data;
}

export async function getTransactions() {
  const userId = sessionStorage.getItem("svp_user_id");
  return (await api.get(`/portfolio/${userId}/transactions`)).data;
}

export async function executeTrade(symbol: string, shares: number, action: "buy" | "sell") {
  const userId = sessionStorage.getItem("svp_user_id");
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

export async function requestCredits(amount: number, reason: string | null) {
  return (await api.post("/portfolio/request-credits", { amount, reason })).data;
}

export async function adminSignIn(email: string, password: string) {
  return (await api.post("/admin/signin", { email, password })).data as {
    success: boolean;
    message: string;
  };
}

export async function adminVerifyOtp(email: string, code: string) {
  return (await api.post("/admin/verify-otp", { email, code })).data as {
    success: boolean;
    user_id: string;
    email: string;
    token: string;
    role: string;
    message: string;
  };
}

export async function getAdminRequests() {
  return (await api.get("/admin/requests")).data;
}

export async function approveRequest(id: number) {
  return (await api.post(`/admin/approve/${id}`)).data;
}

export async function rejectRequest(id: number, reason: string) {
  return (await api.post(`/admin/reject/${id}`, { reason })).data;
}

export async function getUserCreditRequests() {
  return (await api.get("/portfolio/requests")).data;
}
