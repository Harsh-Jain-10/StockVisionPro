import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Token Management (Protects against XSS / LocalStorage exploits)
// ─────────────────────────────────────────────────────────────────────────────
let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  timeout: 30000,
  withCredentials: true, // Transmits httpOnly refresh token cookie across origins
});

// ─────────────────────────────────────────────────────────────────────────────
// Axios Request Interceptor: Attach in-memory Bearer token
// ─────────────────────────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

// ─────────────────────────────────────────────────────────────────────────────
// Axios Response Interceptor: Seamless Auto-Refresh on 401
// ─────────────────────────────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await api.post("/auth/refresh");
        const newToken = res.data.access_token;
        setAuthToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAuthToken(null);
        window.dispatchEvent(new CustomEvent("svp_auth_logout"));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Data Types
// ─────────────────────────────────────────────────────────────────────────────
export type Quote = {
  symbol: string;
  name?: string | null;
  price?: number | null;
  change_pct?: number | null;
  change?: number | null;
  volume?: number | null;
  currency?: string | null;
  open?: number | null;
  day_high?: number | null;
  day_low?: number | null;
  previous_close?: number | null;
  market_cap?: number | null;
  exchange?: string | null;
};

export type HistoryRow = {
  date: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
};

export type UserProfile = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

export type SavedBacktestItem = {
  id: number;
  user_id: string;
  ticker: string;
  strategy_type: string;
  parameters: Record<string, any>;
  last_run_result: Record<string, any> | null;
  created_at: string;
};

export type ThresholdAlert = {
  id: number;
  user_id: string;
  ticker: string;
  symbol?: string;
  condition_type: string;
  alert_type?: string;
  threshold_value: number;
  value?: number;
  is_triggered: boolean;
  is_active?: boolean;
  triggered_at?: string | null;
  created_at: string;
};

export type ModelConfidenceData = {
  symbol: string;
  model: string;
  model_mape: number | null;
  naive_mape: number | null;
  skill_score: number | null;
  label: string;
  is_statistically_significant: boolean;
  is_benchmarked: boolean;
  explanation: string;
  model_r2?: number | null;
  naive_r2?: number | null;
  dm_statistic?: number | null;
  p_value?: number | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Authentication API
// ─────────────────────────────────────────────────────────────────────────────
export async function registerUser(email: string, password: string): Promise<{ access_token: string; user: UserProfile }> {
  const res = await api.post("/auth/register", { email, password });
  setAuthToken(res.data.access_token);
  return res.data;
}

export async function loginUser(email: string, password: string): Promise<{ access_token: string; user: UserProfile }> {
  const res = await api.post("/auth/login", { email, password });
  setAuthToken(res.data.access_token);
  return res.data;
}

export async function refreshUserToken(): Promise<{ access_token: string; user: UserProfile }> {
  const res = await api.post("/auth/refresh");
  setAuthToken(res.data.access_token);
  return res.data;
}

export async function logoutUser(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    setAuthToken(null);
    window.dispatchEvent(new CustomEvent("svp_auth_logout"));
  }
}

export async function getCurrentUser(): Promise<UserProfile> {
  return (await api.get("/auth/me")).data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-User Scoped Watchlists
// ─────────────────────────────────────────────────────────────────────────────
export async function getWatchlist(): Promise<any[]> {
  try {
    return (await api.get("/watchlist")).data;
  } catch (err: any) {
    // Fallback to legacy path if unauthenticated or guest
    const userId = sessionStorage.getItem("svp_user_id") || "local_user";
    return (await api.get(`/watchlist/${userId}`)).data;
  }
}

export async function addWatchlist(ticker: string): Promise<any> {
  try {
    return (await api.post("/watchlist", { ticker })).data;
  } catch (err: any) {
    const userId = sessionStorage.getItem("svp_user_id") || "local_user";
    return (await api.post("/watchlist/add", { user_id: userId, symbol: ticker })).data;
  }
}

export async function deleteWatchlist(ticker: string): Promise<any> {
  try {
    return (await api.delete(`/watchlist/${encodeURIComponent(ticker)}`)).data;
  } catch (err: any) {
    const userId = sessionStorage.getItem("svp_user_id") || "local_user";
    return (await api.delete(`/watchlist/${userId}/${encodeURIComponent(ticker)}`)).data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-User Saved Backtests
// ─────────────────────────────────────────────────────────────────────────────
export async function getSavedBacktests(): Promise<SavedBacktestItem[]> {
  return (await api.get("/saved-backtests")).data;
}

export async function saveBacktest(
  ticker: string,
  strategy_type: string,
  parameters: Record<string, any>,
  last_run_result?: Record<string, any>
): Promise<any> {
  return (await api.post("/saved-backtests", {
    ticker,
    strategy_type,
    parameters,
    last_run_result,
  })).data;
}

export async function deleteSavedBacktest(id: number): Promise<any> {
  return (await api.delete(`/saved-backtests/${id}`)).data;
}

export async function rerunSavedBacktest(id: number): Promise<any> {
  return (await api.post(`/saved-backtests/${id}/rerun`)).data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Threshold Alerts
// ─────────────────────────────────────────────────────────────────────────────
export async function getAlerts(): Promise<ThresholdAlert[]> {
  try {
    return (await api.get("/alerts")).data;
  } catch (err: any) {
    const userId = sessionStorage.getItem("svp_user_id") || "local_user";
    return (await api.get(`/alerts/${userId}`)).data;
  }
}

export async function createAlert(
  ticker: string,
  condition_type: string,
  threshold_value: number
): Promise<any> {
  try {
    return (await api.post("/alerts", {
      ticker,
      condition_type,
      threshold_value,
    })).data;
  } catch (err: any) {
    const userId = sessionStorage.getItem("svp_user_id") || "local_user";
    return (await api.post("/alerts/add", {
      user_id: userId,
      symbol: ticker,
      type: condition_type,
      value: threshold_value,
    })).data;
  }
}

export const addAlert = createAlert;

export async function deleteAlert(alertId: number): Promise<any> {
  return (await api.delete(`/alerts/${alertId}`)).data;
}

export async function getTriggeredAlerts(): Promise<ThresholdAlert[]> {
  try {
    return (await api.get("/alerts/triggered")).data;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Honest Model Confidence Endpoint
// ─────────────────────────────────────────────────────────────────────────────
export async function getForecastConfidence(symbol: string, model?: string): Promise<ModelConfidenceData> {
  return (await api.get(`/forecast/${encodeURIComponent(symbol)}/confidence`, {
    params: model ? { model } : undefined,
  })).data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Market & Forecasting Endpoints
// ─────────────────────────────────────────────────────────────────────────────
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

export async function runBacktest(symbol: string, strategy: string, params: Record<string, any>) {
  return (await api.post("/backtest/run", { symbol, strategy, params, period: "2y" })).data;
}

export async function runForecast(symbol: string, model: string | undefined, horizon: number) {
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

export type MarketNewsArticle = {
  title: string;
  source: string;
  url: string;
  published_at: string;
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  category: string;
  impacted_symbols: string[];
  impact_type: "profit" | "loss" | "neutral";
  impact_desc: string;
  origin_symbol: string;
};

export type ImpactedAsset = {
  symbol: string;
  name: string;
  expected_direction: "BULLISH" | "BEARISH";
  estimated_impact: string;
  catalysts: string;
  sector: string;
  price?: number;
};

export type MarketNewsSentimentResponse = {
  total_articles: number;
  overall_distribution: {
    positive: number;
    neutral: number;
    negative: number;
    avg_compound: number;
  };
  articles: MarketNewsArticle[];
  beneficiaries: ImpactedAsset[];
  at_risk: ImpactedAsset[];
  sector_breakdown: Record<string, { positive: number; neutral: number; negative: number; count: number }>;
  macro_synthesis: string;
  last_refreshed: string;
};

export async function getMarketNewsSentiment(): Promise<MarketNewsSentimentResponse> {
  return (await api.get("/market/news-sentiment")).data;
}
