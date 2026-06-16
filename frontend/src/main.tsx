import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, AlertCircle, Bell, Brain, Briefcase, CandlestickChart, Check, CheckCircle, Copy, ExternalLink, Eye, EyeOff, Gauge, History, LineChart as LineChartIcon, ListPlus, MessageCircle, Moon, Plus, Radar, Search, Send, Star, Sun, Table2, Trash2, Wifi, X, Newspaper, Flame, Settings as SettingsIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  addAlert,
  addWatchlist,
  askAssistant,
  compareSymbols,
  deleteWatchlist,
  getAiSummary,
  getAlerts,
  getCompareSummary,
  getForecast,
  getHistory,
  getMarketOverview,
  getNews,
  getQuote,
  getSentiment,
  getSignal,
  getTechnicals,
  getWatchlist,
  runScreener,
  runAiScreener,
  searchStocks,
  type Quote,
} from "./api/client";
import { createChart, ColorType } from "lightweight-charts";
import ForecastStudio from "./components/ForecastStudio";
import TechnicalSignals from "./components/TechnicalSignals";
import ForecastOpportunities from "./components/ForecastOpportunities";
import ForecastAccuracy from "./components/ForecastAccuracy";
import "./styles/globals.css";

// Apply saved theme before first render
(function initTheme() {
  const saved = localStorage.getItem("sv_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
})();

type View = "dashboard" | "stock" | "compare" | "screener" | "watchlist" | "alerts" | "calendar" | "forecast" | "signals" | "opportunities" | "accuracy" | "sentiment" | "settings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

function money(value?: number | null, currency = "") {
  if (value == null) return "N/A";
  return `${currency ? `${currency} ` : ""}${Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}`;
}

function pct(value?: number | null) {
  if (value == null) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function GlassCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <motion.section className={`glass-card ${className}`} style={style} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>{children}</motion.section>;
}

function PriceBadge({ value }: { value?: number | null }) {
  const positive = (value || 0) >= 0;
  return <span className={`price-badge ${positive ? "positive" : "negative"}`}>{pct(value)}</span>;
}

// LoginOverlay component removed in V2.



function AvatarDropdown({ email, role, onLogout }: { email: string; role: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sessions = [
    { device: "Chrome / Windows", status: "Active Now", current: true },
  ];

  const initials = email ? email.split("@")[0].substring(0, 2).toUpperCase() : "US";

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {/* Dropdown Menu */}
      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: 0,
          right: 0,
          background: "var(--bg-surface-hover)",
          backdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid var(--border-hover)",
          borderRadius: "16px",
          padding: "16px",
          boxShadow: "0 10px 30px rgba(10, 15, 30, 0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          zIndex: 1000,
        }}>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Active Session
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", wordBreak: "break-all" }}>
              {email}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              Logged Devices
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sessions.map((s, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{s.device}</span>
                  <span style={{ color: s.current ? "var(--accent-teal)" : "var(--text-muted)", fontWeight: s.current ? 700 : 400 }}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 12px",
          borderRadius: "14px",
          border: "1px solid var(--border)",
          background: "var(--bg-surface)",
          color: "var(--text-primary)",
          textAlign: "left",
          transition: "all 0.2s ease",
          boxShadow: open ? "var(--glow-primary)" : "none",
          cursor: "pointer",
        }}
      >
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent-violet), var(--primary))",
          color: "white",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          fontSize: "14px",
          boxShadow: "0 4px 10px rgba(79, 110, 247, 0.2)",
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {email.split("@")[0]}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>
            Local Workspace
          </div>
        </div>
        <div style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--text-muted)", fontSize: "10px" }}>
          ▼
        </div>
      </button>
    </div>
  );
}




function AppShell() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  const [view, setView] = useState<View>("dashboard");
  const [symbol, setSymbol] = useState("AAPL");
  const [userId, setUserId] = useState("local_user");
  const [userEmail, setUserEmail] = useState("local_user@stockvision.pro");
  const [userRole, setUserRole] = useState("user");

  const qc = useQueryClient();

  function handleLogin(uid: string, email: string, role: string) {
    setUserId(uid);
    setUserEmail(email);
    setUserRole(role);
    qc.invalidateQueries();
  }

  function handleLogout() {
    qc.invalidateQueries();
  }

  const overview = useQuery({ queryKey: ["overview"], queryFn: getMarketOverview });
  const fallbackTicker = (overview.data?.indices || []) as Quote[];
  const live = useLiveQuotes(["^GSPC", "^IXIC", "^DJI", "^NSEI", "^BSESN", "GLD", "BTC-USD", symbol]);
  const ticker = live.quotes.length ? live.quotes : fallbackTicker;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span>SV</span><div><strong>StockVision</strong><small>Real markets. Real edge.</small></div></div>
        <NavButton active={view === "dashboard"} onClick={() => setView("dashboard")} icon={<Gauge />} label="Dashboard" />
        <NavButton active={view === "forecast"} onClick={() => setView("forecast")} icon={<Brain />} label="Forecast Studio" />
        <NavButton active={view === "signals"} onClick={() => setView("signals")} icon={<Activity />} label="Technical Signals" />
        <NavButton active={view === "opportunities"} onClick={() => setView("opportunities")} icon={<Flame />} label="Market Opportunities" />
        <NavButton active={view === "accuracy"} onClick={() => setView("accuracy")} icon={<History />} label="Forecast Accuracy" />
        <NavButton active={view === "sentiment"} onClick={() => setView("sentiment")} icon={<Newspaper />} label="News Sentiment" />
        <NavButton active={view === "alerts"} onClick={() => setView("alerts")} icon={<Bell />} label="Alerts" />
        <NavButton active={view === "settings"} onClick={() => setView("settings")} icon={<SettingsIcon />} label="Settings" />
        
        <div style={{ flexGrow: 1 }} />
        <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
          <AvatarDropdown email={userEmail} role={userRole} onLogout={handleLogout} />
        </div>
      </aside>
      <main>
        <Topbar symbol={symbol} setSymbol={setSymbol} setView={setView} live={live} />
        <TickerTape quotes={ticker} />
        {view === "dashboard" && <Dashboard setSymbol={setSymbol} setView={setView} />}
        {view === "stock" && <StockLab symbol={symbol} setSymbol={setSymbol} />}
        {view === "forecast" && <ForecastStudio symbol={symbol} setSymbol={setSymbol} />}
        {view === "signals" && <TechnicalSignals symbol={symbol} />}
        {view === "opportunities" && <ForecastOpportunities setSymbol={setSymbol} setView={setView} />}
        {view === "accuracy" && <ForecastAccuracy />}
        {view === "sentiment" && <NewsSentiment symbol={symbol} />}
        {view === "alerts" && <Alerts symbol={symbol} />}
        {view === "settings" && <SettingsView />}

        {/* Backwards compatibility views */}
        {view === "compare" && <Compare />}
        {view === "screener" && <Screener setSymbol={setSymbol} setView={setView} />}
        {view === "watchlist" && <Watchlist setSymbol={setSymbol} setView={setView} />}
        {view === "calendar" && <EconomicCalendar />}
      </main>
      <AiChatbot symbol={symbol} setSymbol={setSymbol} setView={setView} />
    </div>
  );
}

type LiveState = {
  status: "connecting" | "live" | "delayed";
  quotes: Quote[];
  lastUpdate?: string;
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function useLiveQuotes(symbols: string[]): LiveState {
  const [state, setState] = useState<LiveState>({ status: "connecting", quotes: [] });
  const key = symbols.join(",");

  useEffect(() => {
    let socket: WebSocket | undefined;
    let staleTimer: number | undefined;
    let closed = false;

    const markDelayed = () => setState((current) => ({ ...current, status: "delayed" }));

    try {
      const wsBase = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api")
        .replace("https://", "wss://")
        .replace("http://", "ws://")
        .replace("/api", "");
      socket = new WebSocket(`${wsBase}/ws/prices`);
      socket.onopen = () => {
        socket?.send(JSON.stringify({ symbols }));
        staleTimer = window.setTimeout(markDelayed, 16000);
      };
      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as { data?: Quote[]; timestamp?: string };
        window.clearTimeout(staleTimer);
        staleTimer = window.setTimeout(markDelayed, 16000);
        setState({ status: "live", quotes: payload.data || [], lastUpdate: payload.timestamp });
      };
      socket.onerror = markDelayed;
      socket.onclose = () => {
        if (!closed) markDelayed();
      };
    } catch {
      markDelayed();
    }

    return () => {
      closed = true;
      window.clearTimeout(staleTimer);
      socket?.close();
    };
  }, [key]);

  return state;
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function Topbar({ symbol, setSymbol, setView, live }: { symbol: string; setSymbol: (s: string) => void; setView: (v: View) => void; live: LiveState }) {
  const [query, setQuery] = useState("");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("sv_theme") === "dark");
  const search = useQuery({ queryKey: ["search", query], queryFn: () => searchStocks(query), enabled: query.length > 1 });
  const now = useClock();
  const lastDate = live.lastUpdate ? new Date(live.lastUpdate) : undefined;
  const lagSeconds = lastDate ? Math.max(0, Math.floor((now.getTime() - lastDate.getTime()) / 1000)) : undefined;
  const effectiveStatus = live.status === "live" && lagSeconds !== undefined && lagSeconds <= 15 ? "live" : live.status === "connecting" ? "connecting" : "delayed";
  const liveText = effectiveStatus === "live" ? "LIVE" : effectiveStatus === "connecting" ? "CONNECTING" : "DELAYED";
  const clock = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const detail = lagSeconds === undefined ? "connecting..." : lagSeconds <= 15 ? "Prices live" : `lag ${lagSeconds}s`;

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("sv_theme", next ? "dark" : "light");
  }

  return (
    <header className="topbar">
      <div>
        <h1>StockVision Pro</h1>
        <p>AI-powered analytics desk for equities, indices, crypto, and NSE names.</p>
      </div>
      <div className="searchbox">
        <Search size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search stocks, e.g. ${symbol}`} />
        {search.data && query.length > 1 && (
          <div className="suggestions">
            {search.data.map((item) => (
              <button key={item.symbol} onClick={() => { setSymbol(item.symbol); setView("stock"); setQuery(""); }}>
                <strong>{item.symbol}</strong><span>{item.name}</span><small>{item.exchange}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="theme-btn" onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className={`live-pill ${effectiveStatus}`} title={`${detail}`}>
        <Wifi size={15} /> <span>{liveText}</span><small>{clock} · {detail}</small>
      </div>
    </header>
  );
}

function TickerTape({ quotes }: { quotes: Quote[] }) {
  return (
    <div className="ticker"><div className="ticker-track">
      {[...quotes, ...quotes].map((q, idx) => <span key={`${q.symbol}-${idx}`}><b>{q.symbol}</b> {money(q.price)} <em className={(q.change_pct || 0) >= 0 ? "up" : "down"}>{pct(q.change_pct)}</em></span>)}
    </div></div>
  );
}

function Dashboard({ setSymbol, setView }: { setSymbol: (s: string) => void; setView: (v: View) => void }) {
  const overview = useQuery({ queryKey: ["overview"], queryFn: getMarketOverview });
  const data = overview.data;
  return <div className="page-grid">
    <GlassCard className="hero-card">
      <span className="eyebrow">Market command center</span>
      <h2>Global signals, AI context, and watchlist workflow in one glass desk.</h2>
      <p>Phase-complete MVP with live backend data, cache-aware quotes, technicals, forecasts, sentiment, comparison, screener, watchlists, and alerts.</p>
    </GlassCard>
    <div className="index-grid">{(data?.indices || []).map((q: Quote) => <GlassCard key={q.symbol} className="metric-card"><small>{q.name || q.symbol}</small><strong>{money(q.price, q.currency || "")}</strong><PriceBadge value={q.change_pct} /></GlassCard>)}</div>
    <GlassCard className="wide"><SectionTitle icon={<Activity />} title="Top Movers" /><MoverTable rows={data?.top_gainers || []} onPick={(s) => { setSymbol(s); setView("stock"); }} /></GlassCard>
    <GlassCard><SectionTitle icon={<Gauge />} title="Fear & Greed" /><div className="gauge"><span style={{ "--score": `${data?.fear_greed || 58}%` } as React.CSSProperties}></span><b>{data?.fear_greed || 58}</b></div></GlassCard>
    <GlassCard><SectionTitle icon={<Radar />} title="Sector Heatmap" /><div className="heatmap">{(data?.sectors || []).map((s: any) => <div key={s.sector} className={(s.change_pct || 0) >= 0 ? "heat up-bg" : "heat down-bg"}><b>{s.sector}</b><span>{pct(s.change_pct)}</span></div>)}</div></GlassCard>
  </div>;
}

function StockLab({ symbol }: { symbol: string; setSymbol: (s: string) => void }) {
  const qc = useQueryClient();
  const quote = useQuery({ queryKey: ["quote", symbol], queryFn: () => getQuote(symbol) });
  const history = useQuery({ queryKey: ["history", symbol], queryFn: () => getHistory(symbol, "1y") });
  const technicals = useQuery({ queryKey: ["technicals", symbol], queryFn: () => getTechnicals(symbol) });
  const forecast = useQuery({ queryKey: ["forecast", symbol], queryFn: () => getForecast(symbol) });
  const signal = useQuery({ queryKey: ["signal", symbol], queryFn: () => getSignal(symbol) });
  const sentiment = useQuery({ queryKey: ["sentiment", symbol], queryFn: () => getSentiment(symbol) });
  const ai = useQuery({ queryKey: ["ai", symbol], queryFn: () => getAiSummary(symbol) });
  const news = useQuery({ queryKey: ["news", symbol], queryFn: () => getNews(symbol) });
  const watch = useMutation({
    mutationFn: () => addWatchlist(symbol),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      window.setTimeout(() => watch.reset(), 2200);
    },
  });

  const rows = (history.data?.rows || []).map((r) => ({ ...r, date: r.date.slice(0, 10) }));
  return <div className="page-grid">
    <GlassCard className="hero-card">
      <div className="stock-hero">
        <div><span className="eyebrow">{quote.data?.name || symbol}</span><h2>{symbol}</h2><p>{money(quote.data?.price, quote.data?.currency || "")}</p></div>
        <PriceBadge value={quote.data?.change_pct} />
        <button className="primary-btn" disabled={watch.isPending} onClick={() => watch.mutate()}>
          {watch.isSuccess ? <CheckCircle size={18} /> : <ListPlus size={18} />}
          {watch.isPending ? "Adding..." : watch.isSuccess ? "Added" : "Add to Watchlist"}
        </button>
      </div>
      {watch.isError && <p className="inline-error">Could not add {symbol}. Check that the backend is running.</p>}
    </GlassCard>
    <GlassCard className="wide chart-card"><SectionTitle icon={<CandlestickChart />} title="Interactive Chart" /><InteractiveChart symbol={symbol} /></GlassCard>
    <GlassCard><SectionTitle icon={<Brain />} title="AI Signal" /><div className={`signal ${signal.data?.signal?.toLowerCase() || "hold"}`}>{signal.data?.signal || "..."}</div><p>{signal.data?.strength || 0}/5 strength</p>{signal.data?.breakdown?.map((b: any) => <div className="check" key={b.name}><span>{b.name}</span><b>{b.state}</b></div>)}</GlassCard>
    <GlassCard><SectionTitle icon={<Activity />} title="Technicals" />{Object.entries(technicals.data?.summary || {}).slice(0, 10).map(([k, v]) => <div className="check" key={k}><span>{k.replaceAll("_", " ").toUpperCase()}</span><b>{typeof v === "number" ? v.toFixed(2) : "N/A"}</b></div>)}</GlassCard>
    <GlassCard className="wide"><SectionTitle icon={<Brain />} title="Forecast" /><ResponsiveContainer width="100%" height={270}><ComposedChart data={forecast.data?.forecast_30d || []}><CartesianGrid strokeDasharray="3 3" stroke="rgba(120,140,220,.18)" /><XAxis dataKey="date" minTickGap={36} /><YAxis domain={["dataMin", "dataMax"]} /><Tooltip /><Area dataKey="upper" stroke="#7b96ff" strokeOpacity={0.55} fill="rgba(123,150,255,0.22)" /><Area dataKey="lower" stroke="#00c9a7" strokeOpacity={0.45} fill="rgba(0,201,167,0.12)" /><Line dataKey="base" stroke="#5f7dff" strokeWidth={3} dot={false} /></ComposedChart></ResponsiveContainer></GlassCard>
    <GlassCard>
      <SectionTitle icon={<Gauge />} title="Sentiment" />
      <div style={{ position: "relative" }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={[
                { name: "Positive", value: sentiment.data?.positive_pct ?? 34 },
                { name: "Neutral",  value: sentiment.data?.neutral_pct  ?? 33 },
                { name: "Negative", value: sentiment.data?.negative_pct ?? 33 },
              ]}
              dataKey="value"
              innerRadius={52}
              outerRadius={80}
              startAngle={90}
              endAngle={-270}
            >
              {["#00c9a7", "#ffb347", "#ff6b8a"].map((c) => <Cell key={c} fill={c} />)}
            </Pie>
            <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#00c9a7" }}>
            {sentiment.data?.score != null ? sentiment.data.score.toFixed(2) : "0.00"}
          </div>
          <div style={{ fontSize: 11, color: "#8899aa", marginTop: 2 }}>Sentiment</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", fontSize: 12, marginTop: 4 }}>
        <span style={{ color: "#00c9a7" }}>● Positive {(sentiment.data?.positive_pct ?? 0).toFixed(0)}%</span>
        <span style={{ color: "#ffb347" }}>● Neutral {(sentiment.data?.neutral_pct ?? 0).toFixed(0)}%</span>
        <span style={{ color: "#ff6b8a" }}>● Negative {(sentiment.data?.negative_pct ?? 0).toFixed(0)}%</span>
      </div>
    </GlassCard>
    <GlassCard><SectionTitle icon={<Brain />} title="AI Analyst" /><p className="analyst">{ai.data?.summary || "Loading analyst report..."}</p><small>{ai.data?.disclaimer}</small></GlassCard>
    <GlassCard className="wide">
      <SectionTitle icon={<Table2 />} title="News" />
      <div className="news-list">
        {(news.data || []).length === 0 && <p style={{ color: "var(--text-secondary)", padding: "8px 0" }}>No news articles available for this symbol right now.</p>}
        {(news.data || []).map((item: any, i: number) => (
          <a key={item.url || item.title || i} href={item.url || "#"} target="_blank" rel="noopener noreferrer">
            <b>{item.title || "Untitled"}</b>
            <em className={item.sentiment === "positive" ? "positive" : item.sentiment === "negative" ? "negative" : ""}
              style={{ fontStyle: "normal", fontSize: 12, fontWeight: 700 }}>{item.sentiment || "neutral"}</em>
            <span className="news-meta">{item.source && item.source !== "Unknown" ? item.source : "Financial News"}
              {item.published_at ? " · " + new Date(item.published_at).toLocaleDateString() : ""}
            </span>
          </a>
        ))}
      </div>
    </GlassCard>
  </div>;
}

function Compare() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("3mo");
  const RANGES = ["1wk", "1mo", "3mo", "6mo", "1y"];
  const search = useQuery({ queryKey: ["compare-search", query], queryFn: () => searchStocks(query), enabled: query.length > 1 });
  const parsed = useMemo(() => symbols.slice(0, 5), [symbols]);
  const compare = useQuery({ queryKey: ["compare", parsed.join(","), period], queryFn: () => compareSymbols(parsed, period), enabled: parsed.length > 1 });
  const summary = useQuery({ queryKey: ["compare-summary", parsed.join(",")], queryFn: () => getCompareSummary(parsed), enabled: parsed.length > 1 });
  const chartData = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of compare.data?.normalized || []) {
      // Normalize date: strip time component if present (e.g. "2025-05-07 00:00:00+00:00" → "2025-05-07")
      const dateKey = String(p.date).slice(0, 10);
      map.set(dateKey, { ...(map.get(dateKey) || { date: dateKey }), [p.symbol]: p.value });
    }
    return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [compare.data]);
  const availableSeries = useMemo(
    () =>
      parsed.filter((symbol) => chartData.some((row: any) => typeof row[symbol] === "number")),
    [parsed, chartData]
  );
  const missingSeries = useMemo(
    () => parsed.filter((symbol) => !availableSeries.includes(symbol)),
    [parsed, availableSeries]
  );
  function addSymbol(symbol: string) {
    const clean = symbol.trim().toUpperCase();
    if (!clean || symbols.includes(clean) || symbols.length >= 5) return;
    setSymbols([...symbols, clean]);
    setQuery("");
  }

  return <div className="page-grid">
    <GlassCard className="wide">
      <SectionTitle icon={<Radar />} title="Comparison Lab" />
      <div className="compare-controls">
        <div className="searchbox compact">
          <Search size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search and add AAPL, RELIANCE.NS, BTC-USD..." onKeyDown={(e) => { if (e.key === "Enter") addSymbol(query); }} />
          <button className="icon-btn" onClick={() => addSymbol(query)} title="Add symbol"><Plus size={18} /></button>
          {search.data && query.length > 1 && (
            <div className="suggestions">
              {search.data.map((item) => (
                <button key={item.symbol} onClick={() => addSymbol(item.symbol)}>
                  <strong>{item.symbol}</strong><span>{item.name}</span><small>{item.exchange}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="compare-ranges">
          {["1wk", "1mo", "3mo", "6mo", "1y"].map((r) => (
            <button key={r} className={`range-btn${period === r ? " active" : ""}`} onClick={() => setPeriod(r)}>{r.toUpperCase()}</button>
          ))}
        </div>
        <div className="chip-row">
          {symbols.map((item) => <span className="chip" key={item}>{item}<button onClick={() => setSymbols(symbols.filter((s) => s !== item))}><X size={14} /></button></span>)}
        </div>
      </div>
      {parsed.length < 2 ?
        <div className="empty-state"><div><div style={{ fontSize: 40 }}>📊</div><p>Add at least two symbols to generate a normalized comparison chart.</p></div></div>
        : compare.isFetching ? <p style={{ color: "var(--text-muted)", padding: 20 }}>Loading chart data...</p>
        : <>
            {missingSeries.length > 0 && (
              <p style={{ color: "var(--text-muted)", margin: "0 0 10px" }}>
                Limited chart data for: {missingSeries.join(", ")}. Latest quote data is still shown in metrics below.
              </p>
            )}
            <ResponsiveContainer width="100%" height={360}><LineChart data={chartData} margin={{ right: 28, left: 6, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" minTickGap={40} /><YAxis /><Tooltip /><Legend />{availableSeries.map((s, i) => <Line key={s} dataKey={s} connectNulls dot={false} activeDot={{ r: 5 }} stroke={["var(--primary)","var(--accent-teal)","var(--accent-rose)","var(--accent-violet)","var(--accent-amber)"][i]} strokeWidth={3} />)}</LineChart></ResponsiveContainer>
          </>
      }
    </GlassCard>
    {parsed.length > 1 && <GlassCard className="wide ai-compare-card">
      <SectionTitle icon={<Brain />} title="AI Comparison Summary" />
      <p className="highlight-summary" dangerouslySetInnerHTML={{ __html: summary.data?.summary || "Generating comparison insight..." }} />
      <div className="highlight-grid">
        {(summary.data?.highlights || []).map((item: any) => <div className="highlight-tile" key={item.term}><b>{item.term}</b><span>{item.text}</span></div>)}
      </div>
      <h4>Key Events</h4>
      <div className="event-list">{(summary.data?.events || []).map((item: any) => <article key={`${item.title}-${item.published_at}`}><b>{item.title}</b><span>{item.sentiment} · {item.source}</span></article>)}</div>
    </GlassCard>}
    {parsed.length > 1 && <GlassCard className="wide"><MoverTable rows={compare.data?.metrics || []} /></GlassCard>}
  </div>;
}


type ChatMessage = { role: "user" | "assistant"; text: string };

const QUICK_REPLIES_DEFAULT = ["What is the signal?", "Show forecast", "Is it oversold?", "Show event calendar"];
const QUICK_REPLIES_AFTER = ["Explain the RSI", "What's the risk?", "Show bull scenario", "Upcoming macro events"];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button className="copy-btn" onClick={handleCopy} title="Copy response">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function TypingDots() {
  return (
    <div className="chat-bubble assistant typing-bubble">
      <span className="dot" /><span className="dot" /><span className="dot" />
    </div>
  );
}

function AiChatbot({ symbol, setSymbol, setView }: { symbol: string; setSymbol: (s: string) => void; setView: (v: View) => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initialized, setInitialized] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const quote = useQuery({ queryKey: ["quote", symbol], queryFn: () => getQuote(symbol), enabled: open });
  const signal = useQuery({ queryKey: ["signal", symbol], queryFn: () => getSignal(symbol), enabled: open });
  const forecast = useQuery({ queryKey: ["forecast", symbol], queryFn: () => getForecast(symbol), enabled: open });

  // Build greeting once stock data is available
  useEffect(() => {
    if (!open || initialized) return;
    if (quote.data && signal.data) {
      const price = quote.data.price != null ? `$${quote.data.price.toFixed(2)}` : "loading";
      const chg = quote.data.change_pct != null ? `${quote.data.change_pct >= 0 ? "+" : ""}${quote.data.change_pct.toFixed(2)}%` : "";
      const sig = signal.data.signal || "HOLD";
      const str = signal.data.strength || 3;
      const greeting = `Hey! I'm tracking ${symbol} right now, trading at ${price}${chg ? ` — {chg} today` : ""} with a ${sig} signal at ${str}/5 strength. What would you like to know?`;
      setMessages([{ role: "assistant", text: greeting }]);
      setInitialized(true);
    } else if (!initialized) {
      setMessages([{ role: "assistant", text: `Ask me about ${symbol} — signals, risk, forecasts, or how it compares with other stocks.` }]);
    }
  }, [open, quote.data, signal.data, initialized, symbol]);

  // Reset greeting when symbol changes
  useEffect(() => {
    setInitialized(false);
    setMessages([]);
  }, [symbol]);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chat = useMutation({
    mutationFn: (message: string) => {
      return askAssistant(message, [symbol]);
    },
    onSuccess: (data) => {
      setMessages((current) => [...current, { role: "assistant", text: data.answer + (data.disclaimer ? `\n\n*${data.disclaimer}*` : "") }]);
      if (data.symbols && data.symbols.length > 0) {
        const newSym = data.symbols[0];
        if (newSym !== symbol) {
          setSymbol(newSym);
          setView("stock");
        }
      }
    },
    onError: () => {
      setMessages((current) => [...current, { role: "assistant", text: "I could not reach the AI endpoint. Check that the backend is running on port 8000." }]);
    },
  });

  function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || chat.isPending) return;
    setMessages((current) => [...current, { role: "user", text: message }]);
    setInput("");
    chat.mutate(message);
  }

  const msgCount = messages.length;
  const quickReplies = msgCount <= 1 ? QUICK_REPLIES_DEFAULT : QUICK_REPLIES_AFTER;

  return <>
    <button className="chat-launcher" onClick={() => setOpen(!open)} title="Open AI Chatbot"><MessageCircle /></button>
    {open && <motion.aside className="chat-panel" initial={{ opacity: 0, y: 20, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
      <div className="chat-head">
        <div>
          <b>StockVision AI</b>
          <span className="ctx-badge">{symbol}</span>
        </div>
        <button onClick={() => setOpen(false)}><X size={17} /></button>
      </div>
      <div className="chat-messages">
        {messages.map((message, idx) => (
          <div className={`chat-bubble-wrap ${message.role}`} key={`${message.role}-${idx}`}>
            <div className={`chat-bubble ${message.role}`}>{message.text}</div>
            {message.role === "assistant" && <CopyButton text={message.text} />}
          </div>
        ))}
        {chat.isPending && <TypingDots />}
        <div ref={chatEndRef} />
      </div>
      <div className="quick-replies">
        {quickReplies.map((qr) => (
          <button key={qr} className="quick-reply-btn" onClick={() => send(qr)} disabled={chat.isPending}>{qr}</button>
        ))}
      </div>
      <div className="chat-input">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Ask about signals, forecasts, risk, or events..." />
        <button onClick={() => send()} disabled={chat.isPending || !input.trim()}><Send size={17} /></button>
      </div>
    </motion.aside>}
  </>;
}

function getDynamicEconEvents(today: Date): Array<{ date: string; event: string; impact: string; forecast: string; prev: string; url: string }> {
  const events: Array<{ date: string; event: string; impact: string; forecast: string; prev: string; url: string }> = [];
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  for (let mOffset = -6; mOffset <= 6; mOffset++) {
    const targetDate = new Date(currentYear, currentMonth + mOffset, 1);
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const mNum = m + 1;

    const fmt = (day: number) => {
      const dStr = String(day).padStart(2, '0');
      const mStr = String(mNum).padStart(2, '0');
      return `${y}-${mStr}-${dStr}`;
    };

    const getFirstFriday = () => {
      const first = new Date(y, m, 1);
      let day = first.getDay();
      let diff = 5 - day;
      if (diff < 0) diff += 7;
      return 1 + diff;
    };

    const getLastFriday = () => {
      const last = new Date(y, m + 1, 0);
      let day = last.getDay();
      let diff = day - 5;
      if (diff < 0) diff += 7;
      return last.getDate() - diff;
    };

    const getThirdTuesday = () => {
      const first = new Date(y, m, 1);
      let day = first.getDay();
      let diff = 2 - day;
      if (diff < 0) diff += 7;
      return 1 + diff + 14;
    };

    const getThirdThursday = () => {
      const first = new Date(y, m, 1);
      let day = first.getDay();
      let diff = 4 - day;
      if (diff < 0) diff += 7;
      return 1 + diff + 14;
    };

    const getFourthWednesday = () => {
      const first = new Date(y, m, 1);
      let day = first.getDay();
      let diff = 3 - day;
      if (diff < 0) diff += 7;
      return 1 + diff + 21;
    };

    events.push({ date: fmt(1), event: "ISM Manufacturing PMI", impact: "medium", forecast: "50.3", prev: "49.8", url: "https://tradingeconomics.com/united-states/manufacturing-pmi" });
    events.push({ date: fmt(getFirstFriday()), event: "US Non-Farm Payrolls", impact: "high", forecast: "165K", prev: "172K", url: "https://tradingeconomics.com/united-states/non-farm-payrolls" });
    events.push({ date: fmt(10), event: "US CPI YoY", impact: "high", forecast: "2.7%", prev: "2.9%", url: "https://tradingeconomics.com/united-states/inflation-cpi" });
    events.push({ date: fmt(11), event: "US PPI MoM", impact: "medium", forecast: "0.2%", prev: "0.3%", url: "https://tradingeconomics.com/united-states/producer-prices" });
    events.push({ date: fmt(14), event: "US Retail Sales MoM", impact: "medium", forecast: "0.3%", prev: "0.5%", url: "https://tradingeconomics.com/united-states/retail-sales" });
    events.push({ date: fmt(15), event: "India Trade Balance", impact: "medium", forecast: "—", prev: "-$18.7B", url: "https://tradingeconomics.com/india/balance-of-trade" });
    events.push({ date: fmt(getThirdTuesday()), event: "US Housing Starts", impact: "low", forecast: "1.41M", prev: "1.38M", url: "https://tradingeconomics.com/united-states/housing-starts" });
    events.push({ date: fmt(getThirdThursday()), event: "Eurozone CPI Final", impact: "medium", forecast: "2.1%", prev: "2.2%", url: "https://tradingeconomics.com/euro-area/inflation-rate" });
    events.push({ date: fmt(getFourthWednesday()), event: "US Durable Goods Orders", impact: "medium", forecast: "0.4%", prev: "-0.6%", url: "https://tradingeconomics.com/united-states/durable-goods-orders" });
    events.push({ date: fmt(getLastFriday()), event: "US Core PCE Deflator", impact: "high", forecast: "2.5%", prev: "2.6%", url: "https://tradingeconomics.com/united-states/core-pce-price-index" });

    if (m === 2 || m === 5 || m === 8 || m === 11) {
      events.push({ date: fmt(22), event: "US GDP Advance Estimate", impact: "high", forecast: "2.1%", prev: "1.8%", url: "https://tradingeconomics.com/united-states/gdp-growth-rate" });
    }
    if (m === 1 || m === 4 || m === 7 || m === 10) {
      events.push({ date: fmt(25), event: "India GDP Flash Estimate", impact: "high", forecast: "7.1%", prev: "6.9%", url: "https://tradingeconomics.com/india/gdp-growth-annual" });
    }
    if (m === 0 || m === 3 || m === 6 || m === 9) {
      events.push({ date: fmt(28), event: "Eurozone GDP Final", impact: "medium", forecast: "0.4%", prev: "0.3%", url: "https://tradingeconomics.com/euro-area/gdp-growth-rate" });
    }
    if (m % 2 === 1) {
      events.push({ date: fmt(6), event: "Fed Interest Rate Decision", impact: "high", forecast: "4.25%", prev: "4.50%", url: "https://tradingeconomics.com/united-states/interest-rate" });
      events.push({ date: fmt(8), event: "RBI Monetary Policy Decision", impact: "high", forecast: "5.75%", prev: "6.00%", url: "https://tradingeconomics.com/india/interest-rate" });
      events.push({ date: fmt(21), event: "FOMC Minutes Release", impact: "high", forecast: "—", prev: "—", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  const uniqueEvents: typeof events = [];
  const seenKeys = new Set<string>();
  for (const e of events) {
    const key = `${e.date}-${e.event}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueEvents.push(e);
    }
  }
  return uniqueEvents;
}


function EconomicCalendar() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const next7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [limit, setLimit] = useState(10);

  const allEvents = useMemo(() => getDynamicEconEvents(today), []);
  
  const todayIdx = useMemo(() => {
    const idx = allEvents.findIndex((e) => e.date >= todayStr);
    return idx === -1 ? allEvents.length - 1 : idx;
  }, [allEvents, todayStr]);

  const displayedEvents = useMemo(() => {
    const half = Math.floor(limit / 2);
    let start = todayIdx - half;
    let end = todayIdx + (limit - half);

    if (start < 0) {
      end = Math.min(allEvents.length, end - start);
      start = 0;
    }
    if (end > allEvents.length) {
      start = Math.max(0, start - (end - allEvents.length));
      end = allEvents.length;
    }
    return allEvents.slice(start, end);
  }, [allEvents, todayIdx, limit]);

  const firstUpcomingEvent = useMemo(() => {
    return displayedEvents.find((e) => e.date >= todayStr);
  }, [displayedEvents, todayStr]);

  return (
    <div className="page-grid">
      <style>{`
        .calendar-controls {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .calendar-controls label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .calendar-controls select {
          padding: 8px 12px;
          border-radius: 8px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          color: var(--text-primary);
          font-family: inherit;
        }
        tr.current-event {
          background: rgba(95, 125, 255, 0.12) !important;
          border-left: 3px solid var(--primary) !important;
        }
        tr.current-event td {
          font-weight: 600;
        }
        .event-link-anchor:hover {
          color: var(--primary) !important;
          text-decoration: underline !important;
        }
      `}</style>
      <GlassCard className="full-wide">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
          <SectionTitle icon={<Bell />} title="Economic Calendar" />
          <div className="calendar-controls">
            <label htmlFor="event-limit">Show events:</label>
            <select id="event-limit" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={10}>10 (5 Past, 5 Future)</option>
              <option value={20}>20 (10 Past, 10 Future)</option>
              <option value={30}>30 (15 Past, 15 Future)</option>
              <option value={40}>40 (20 Past, 20 Future)</option>
              <option value={50}>50 (25 Past, 25 Future)</option>
            </select>
          </div>
        </div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 14 }}>Upcoming macro events with market impact ratings. Current and future events are highlighted. Click an event to view detailed statistics.</p>
        <table className="calendar-table">
          <thead><tr><th>Date</th><th>Event</th><th>Impact</th><th>Forecast</th><th>Previous</th></tr></thead>
          <tbody>
            {displayedEvents.map((ev) => {
              const evDate = new Date(ev.date);
              const isUpcoming = evDate >= today && evDate <= next7;
              const isCurrent = ev === firstUpcomingEvent;
              return (
                <tr key={`${ev.date}-${ev.event}`} className={isCurrent ? "upcoming current-event" : isUpcoming ? "upcoming" : ""}>
                  <td>
                    <strong>{ev.date}</strong>
                    {isCurrent && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--accent-amber)" }}>◀ Current</span>}
                    {!isCurrent && isUpcoming && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--accent-amber)" }}>▶ Soon</span>}
                  </td>
                  <td>
                    <a 
                      href={ev.url || `https://www.google.com/search?q=${encodeURIComponent(ev.event + " economic event")}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="event-link-anchor"
                      style={{ 
                        color: "var(--text-primary)", 
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 500,
                        transition: "all 0.2s"
                      }}
                    >
                      {ev.event}
                      <ExternalLink size={13} style={{ opacity: 0.6 }} />
                    </a>
                  </td>
                  <td><span className={`impact-badge ${ev.impact}`}>{ev.impact.toUpperCase()}</span></td>
                  <td style={{ fontFamily: "DM Mono, monospace" }}>{ev.forecast}</td>
                  <td style={{ fontFamily: "DM Mono, monospace", color: "var(--text-muted)" }}>{ev.prev}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="calendar-note">* Data is indicative. Actual release times vary by exchange. Always verify with primary sources.</p>
      </GlassCard>
    </div>
  );
}

function Screener({ setSymbol, setView }: { setSymbol: (s: string) => void; setView: (v: View) => void }) {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [aiMode, setAiMode] = useState(false);
  
  const screen = useQuery({
    queryKey: ["screener", submitted],
    queryFn: () => runScreener(submitted),
    enabled: submitted.length > 0 && !aiMode,
  });
  
  const aiScreen = useQuery({
    queryKey: ["ai-screener", submitted],
    queryFn: () => runAiScreener(submitted),
    enabled: aiMode,
  });

  return (
    <div className="page-grid">
      <style>{`
        .ai-result-card {
          line-height: 1.6;
        }
        .ai-list {
          margin: 0;
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ai-list li {
          color: var(--text-primary);
        }
        .ai-list li strong {
          color: var(--primary);
        }
        .ai-disclaimer {
          margin-top: 16px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .positive {
          color: #00c9a7;
          font-weight: 600;
        }
        .negative {
          color: #ff6b8a;
          font-weight: 600;
        }
        code {
          font-family: var(--font-mono);
          background: var(--bg-hover);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
        }
      `}</style>
      <GlassCard className="wide">
        <SectionTitle icon={<Table2 />} title="Stock Screener" />
        <p style={{ color: "var(--text-secondary)", marginBottom: 10 }}>Filter stocks by symbol or company name. Click a result to open it in Stock Lab.</p>
        <div className="screener-filters">
          <input
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setAiMode(false); setSubmitted(q); } }}
            placeholder="Type symbol or company name (e.g. AAPL, Microsoft)..."
          />
          <button className="primary-btn" onClick={() => { setAiMode(false); setSubmitted(q); }} style={{ whiteSpace: "nowrap" }}>Search</button>
          <button className="primary-btn" style={{ background: "linear-gradient(135deg, var(--accent-violet), var(--primary))", whiteSpace: "nowrap" }}
            onClick={() => { setAiMode(true); setSubmitted(q); }} disabled={aiScreen.isFetching}>
            {aiScreen.isFetching ? "Scanning..." : "🤖 AI Screener"}
          </button>
        </div>
        {screen.isFetching && <p style={{ color: "var(--text-muted)" }}>Searching...</p>}
        {submitted && !screen.isFetching && !aiMode && (screen.data?.results || []).length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>No results found for "{submitted}".</p>
        )}
        {!aiMode && <MoverTable rows={screen.data?.results || []} onPick={(s) => { setSymbol(s); setView("stock"); }} />}
      </GlassCard>
      {aiMode && aiScreen.data && (
        <GlassCard className="wide">
          <SectionTitle icon={<Brain />} title="AI Screener Results" />
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {submitted ? `Analyzed matching stock for "${submitted}"` : `Scanned ${aiScreen.data.total_scanned} NSE stocks`} · Ranked by momentum + RSI + MACD signals
          </p>
          <div className="ai-result-card" dangerouslySetInnerHTML={{ __html: aiScreen.data.analysis }} />
          <div style={{ marginTop: 16 }}>
            <MoverTable rows={aiScreen.data.stocks || []} onPick={(s) => { setSymbol(s); setView("stock"); }} />
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function Watchlist({ setSymbol, setView }: { setSymbol: (s: string) => void; setView: (v: View) => void }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [countdown, setCountdown] = useState(30);
  const search = useQuery({ queryKey: ["wl-search", query], queryFn: () => searchStocks(query), enabled: query.length > 1 });
  const watch = useQuery({ queryKey: ["watchlist"], queryFn: getWatchlist, refetchInterval: 30000 });
  const add = useMutation({
    mutationFn: (symbol: string) => addWatchlist(symbol),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["watchlist"] }); setQuery(""); },
  });
  const remove = useMutation({
    mutationFn: (symbol: string) => deleteWatchlist(symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
  const rows = (watch.data || []).map((i: any) => ({ symbol: i.symbol, name: i.name, ...i.quote }));

  useEffect(() => {
    const timer = setInterval(() => setCountdown((c) => c > 0 ? c - 1 : 30), 1000);
    return () => clearInterval(timer);
  }, []);

  return <div className="page-grid">
    <GlassCard className="wide">
      <SectionTitle icon={<Star />} title="Watchlist" />
      <div className="searchbox compact" style={{ marginBottom: 14 }}>
        <Search size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search and add symbols (max 20)..." />
        {search.data && query.length > 1 && (
          <div className="suggestions">
            {search.data.slice(0, 6).map((item) => (
              <button key={item.symbol} disabled={rows.length >= 20} onClick={() => add.mutate(item.symbol)}>
                <strong>{item.symbol}</strong><span>{item.name}</span><small>{item.exchange}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="watch-refresh">↻ Auto-refreshes in {countdown}s · {rows.length}/20 symbols</p>
      {rows.length === 0
        ? <div className="empty-state"><div><div style={{ fontSize: 40 }}>⭐</div><p>Search and add symbols to track them here with live prices.</p></div></div>
        : <div className="watch-list">{rows.map((row: any) => (
          <div className="watch-row" key={row.symbol}>
            <button onClick={() => { setSymbol(row.symbol); setView("stock"); }}>
              <b>{row.symbol}</b><span>{row.name || ""}</span><strong>${money(row.price)}</strong><PriceBadge value={row.change_pct} />
              <span style={{ width: 80 }}></span>
            </button>
            <button className="icon-btn danger" onClick={() => remove.mutate(row.symbol)} title="Remove from watchlist"><Trash2 size={17} /></button>
          </div>
        ))}</div>}
    </GlassCard>
  </div>;
}

function Alerts({ symbol }: { symbol: string }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(0);
  const [type, setType] = useState("above");
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>("default");
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: getAlerts, refetchInterval: 60000 });
  const add = useMutation({ mutationFn: () => addAlert(symbol, type, Number(value)), onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }) });

  useEffect(() => {
    if ("Notification" in window) setNotifStatus(Notification.permission);
  }, []);

  async function requestNotif() {
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
    if (perm === "granted") new Notification("StockVision Pro", { body: "Price alerts are now active!", icon: "/favicon.ico" });
  }

  return <div className="page-grid">
    <GlassCard>
      <SectionTitle icon={<Bell />} title="New Alert" />
      {notifStatus === "default" && (
        <div className="notif-banner">
          <Bell size={18} />
          <span>Enable browser push notifications to get alerted when conditions are met.</span>
          <button className="primary-btn" style={{ fontSize: 13, padding: "8px 14px" }} onClick={requestNotif}>Enable</button>
        </div>
      )}
      {notifStatus === "denied" && <p className="notif-blocked">⚠️ Notifications blocked in browser settings. Allow them to receive price alerts.</p>}
      <p style={{ color: "var(--text-secondary)" }}>Set a technical condition for <strong>{symbol}</strong></p>
      <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="above">Price Above</option>
        <option value="below">Price Below</option>
        <option value="sma_crossover">SMA Crossover (Golden Cross)</option>
        <option value="rsi_oversold">RSI Oversold (&lt;30)</option>
        <option value="rsi_overbought">RSI Overbought (&gt;70)</option>
      </select>
      {(type === "above" || type === "below") && <input className="field" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} placeholder="Target Value" />}
      <button className="primary-btn" style={{ marginTop: 8 }} onClick={() => add.mutate()}>Create Alert</button>
    </GlassCard>
    <GlassCard className="wide">
      <SectionTitle icon={<Bell />} title="Alert History" />
      {(alerts.data || []).length === 0 && <p style={{ color: "var(--text-muted)" }}>No alerts created yet.</p>}
      {(alerts.data || []).filter((a: any) => !dismissed.includes(a.id)).map((a: any) => (
        <div className="alert-history-item" key={a.id}>
          <span className={a.is_active ? "positive" : "negative"} style={{ fontSize: 22 }}>●</span>
          <div>
            <strong>{a.symbol}</strong> — {a.alert_type.replaceAll("_", " ")}
            {(a.alert_type === "above" || a.alert_type === "below") && <span style={{ fontFamily: "DM Mono, monospace", marginLeft: 8 }}>${money(a.value)}</span>}
          </div>
          <button className="dismiss-btn" onClick={() => setDismissed((d) => [...d, a.id])}>Dismiss</button>
        </div>
      ))}
    </GlassCard>
  </div>;
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="section-title">{icon}<h3>{title}</h3></div>;
}

function MoverTable({ rows, onPick }: { rows: any[]; onPick?: (symbol: string) => void }) {
  return <div className="table">{rows.map((row) => <button key={row.symbol} onClick={() => onPick?.(row.symbol)}><b>{row.symbol}</b><span>{row.name || row.exchange || ""}</span><strong>{money(row.price)}</strong><PriceBadge value={row.change_pct} /></button>)}</div>;
}

function InteractiveChart({ symbol }: { symbol: string }) {
  const history = useQuery({ queryKey: ["history", symbol], queryFn: () => getHistory(symbol, "1y") });
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!chartContainerRef.current || !history.data?.rows) return;
    
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#b0b8c4',
      },
      grid: {
        vertLines: { color: 'rgba(120,140,220,.08)' },
        horzLines: { color: 'rgba(120,140,220,.08)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 330,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      }
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00c9a7',
      downColor: '#ff6b8a',
      borderVisible: false,
      wickUpColor: '#00c9a7',
      wickDownColor: '#ff6b8a',
    });

    const formattedData = history.data.rows
      .filter((r: any) => r.date && r.open && r.high && r.low && r.close)
      .map((r: any) => ({
        time: r.date.slice(0, 10),
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
      })).sort((a: any, b: any) => a.time.localeCompare(b.time));

    candlestickSeries.setData(formattedData);

    const handleResize = () => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [history.data]);

  return <div ref={chartContainerRef} style={{ width: "100%", height: "330px" }} />;
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return <div className={`toast ${type}`}>{type === "success" ? "✓" : "✗"} {msg}</div>;
}

function NewsSentiment({ symbol }: { symbol: string }) {
  const sentiment = useQuery({ queryKey: ["sentiment", symbol], queryFn: () => getSentiment(symbol) });
  const ai = useQuery({ queryKey: ["ai", symbol], queryFn: () => getAiSummary(symbol) });
  const news = useQuery({ queryKey: ["news", symbol], queryFn: () => getNews(symbol) });

  return (
    <div className="page-grid">
      <GlassCard className="hero-card">
        <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Newspaper size={14} /> AI Sentiment Center
        </span>
        <h2>Media Sentiment Analysis &amp; Quote Alignment</h2>
        <p style={{ margin: "4px 0 0" }}>
          Analyze active media coverage, compute aggregate market sentiment score, and generate contextual AI explanations for <strong>{symbol.toUpperCase()}</strong>.
        </p>
      </GlassCard>

      <GlassCard>
        <SectionTitle icon={<Gauge />} title="Sentiment Oscillator" />
        <div style={{ position: "relative" }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: "Positive", value: sentiment.data?.positive_pct ?? 34 },
                  { name: "Neutral",  value: sentiment.data?.neutral_pct  ?? 33 },
                  { name: "Negative", value: sentiment.data?.negative_pct ?? 33 },
                ]}
                dataKey="value"
                innerRadius={52}
                outerRadius={80}
                startAngle={90}
                endAngle={-270}
              >
                {["#00c9a7", "#ffb347", "#ff6b8a"].map((c) => <Cell key={c} fill={c} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#00c9a7" }}>
              {sentiment.data?.score != null ? sentiment.data.score.toFixed(2) : "0.00"}
            </div>
            <div style={{ fontSize: 11, color: "#8899aa", marginTop: 2 }}>Score</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", fontSize: 12, marginTop: 4 }}>
          <span style={{ color: "#00c9a7" }}>● Pos {(sentiment.data?.positive_pct ?? 0).toFixed(0)}%</span>
          <span style={{ color: "#ffb347" }}>● Neu {(sentiment.data?.neutral_pct ?? 0).toFixed(0)}%</span>
          <span style={{ color: "#ff6b8a" }}>● Neg {(sentiment.data?.negative_pct ?? 0).toFixed(0)}%</span>
        </div>
      </GlassCard>

      <GlassCard className="wide">
        <SectionTitle icon={<Brain />} title="AI Sentiment Summary" />
        <p className="analyst" style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
          {ai.data?.summary || "Analyzing news sentiment indicators..."}
        </p>
        <small style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "12px" }}>
          {ai.data?.disclaimer}
        </small>
      </GlassCard>

      <GlassCard className="full-wide">
        <SectionTitle icon={<Table2 />} title="Headline Articles Ledger" />
        <div className="news-list" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {(news.data || []).length === 0 && (
            <p style={{ color: "var(--text-secondary)", padding: "8px 0" }}>
              No recent news articles detected for this ticker.
            </p>
          )}
          {(news.data || []).map((item: any, i: number) => (
            <a key={item.url || item.title || i} href={item.url || "#"} target="_blank" rel="noopener noreferrer">
              <b>{item.title || "Untitled"}</b>
              <em className={item.sentiment === "positive" ? "positive" : item.sentiment === "negative" ? "negative" : ""}
                style={{ fontStyle: "normal", fontSize: 12, fontWeight: 700 }}>
                {item.sentiment || "neutral"}
              </em>
              <span className="news-meta">
                {item.source && item.source !== "Unknown" ? item.source : "Financial News"}
                {item.published_at ? " · " + new Date(item.published_at).toLocaleDateString() : ""}
              </span>
            </a>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function SettingsView() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("sv_theme") === "dark");

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("sv_theme", next ? "dark" : "light");
  }

  return (
    <div className="page-grid">
      <GlassCard className="hero-card">
        <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <SettingsIcon size={14} /> Control Panel
        </span>
        <h2>Settings &amp; Workspace Configuration</h2>
        <p style={{ margin: "4px 0 0" }}>
          Manage your interface preferences, review machine learning database statuses, and view workspace connection attributes.
        </p>
      </GlassCard>

      <GlassCard className="wide">
        <SectionTitle icon={<SettingsIcon />} title="Interface Preferences" />
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>Interface Theme</strong>
              <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                Toggle between light and dark glassmorphic color themes.
              </span>
            </div>
            <button className="theme-btn" onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>Precision Tooltips</strong>
              <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                Display detailed validation descriptions in the forecast metric grid.
              </span>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-teal)", background: "rgba(0, 201, 167, 0.08)", padding: "4px 10px", borderRadius: "12px" }}>
              Active
            </span>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle icon={<Wifi />} title="Backend Parameters" />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>API Server URL:</span>
            <strong style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>Local Host</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Database:</span>
            <strong style={{ color: "var(--accent-teal)" }}>Supabase + Atlas</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Model Refresh:</span>
            <strong style={{ color: "var(--text-primary)" }}>Every 6 Hours</strong>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppShell />
      <Analytics />
    </QueryClientProvider>
  </React.StrictMode>,
);
