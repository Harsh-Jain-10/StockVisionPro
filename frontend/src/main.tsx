import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, AlertCircle, Bell, Brain, Briefcase, CandlestickChart, Check, CheckCircle, Copy, ExternalLink, Eye, EyeOff, Gauge, History, LineChart as LineChartIcon, ListPlus, MessageCircle, Moon, Plus, Radar, Search, Send, Star, Sun, Table2, Trash2, Wifi, X, Newspaper, Flame, Settings as SettingsIcon, TrendingUp, TrendingDown, Filter, Download, User, ChevronsUpDown, MoreVertical, SlidersHorizontal, Layers, LayoutGrid, CheckCircle2, Sparkles, Bookmark, Zap, Globe, RefreshCw, ArrowUpRight, ArrowDownRight, ShieldAlert, Volume2, VolumeX, ShieldCheck, Crosshair, Target } from "lucide-react";
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
  deleteAlert,
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
  getMarketNewsSentiment,
  type MarketNewsArticle,
  type ImpactedAsset,
  type MarketNewsSentimentResponse,
  runScreener,
  runAiScreener,
  searchStocks,
  type Quote,
  logoutUser,
  getCurrentUser,
  refreshUserToken,
  type UserProfile,
  getTriggeredAlerts,
  type ThresholdAlert,
} from "./api/client";
import { createChart, ColorType } from "lightweight-charts";
import ForecastStudio from "./components/ForecastStudio";
import ForecastOpportunities from "./components/ForecastOpportunities";
import ForecastAccuracy from "./components/ForecastAccuracy";
import BacktestingStudio from "./components/BacktestingStudio";
import { AuthModal } from "./components/AuthModal";
import MobileHeader from "./components/MobileHeader";
import MobileBottomNav from "./components/MobileBottomNav";
import MobileSearchModal from "./components/MobileSearchModal";
import { useMarketStatus } from "./utils/marketStatus";
import "./styles/globals.css";

// Apply saved theme before first render
(function initTheme() {
  const saved = localStorage.getItem("sv_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
})();

type View = "dashboard" | "stock" | "compare" | "screener" | "watchlist" | "alerts" | "calendar" | "forecast" | "opportunities" | "accuracy" | "sentiment" | "settings" | "backtest";

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

function formatNumberCompact(num?: number | null) {
  if (num == null) return "N/A";
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toLocaleString();
}

function GlassCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <motion.section className={`glass-card ${className}`} style={style} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>{children}</motion.section>;
}

function PriceBadge({ value }: { value?: number | null }) {
  const positive = (value || 0) >= 0;
  return <span className={`price-badge ${positive ? "positive" : "negative"}`}>{pct(value)}</span>;
}

// LoginOverlay component removed in V2.



function AvatarDropdown({
  email,
  role,
  onLogout,
  setView,
  isCollapsed,
}: {
  email: string;
  role: string;
  onLogout: () => void;
  setView?: (v: View) => void;
  isCollapsed?: boolean;
}) {
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
    <div ref={ref} style={{ position: "relative", width: "100%", display: "grid", placeItems: "center" }}>
      {/* Dropdown Menu */}
      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: isCollapsed ? "0" : "0",
          right: isCollapsed ? "auto" : "0",
          width: isCollapsed ? "220px" : "100%",
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

          {setView && (
            <button
              onClick={() => {
                setView("settings");
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <span>⚙️ Settings</span>
            </button>
          )}

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
          <button
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 107, 138, 0.3)",
              background: "rgba(255, 107, 138, 0.1)",
              color: "var(--accent-rose)",
              fontSize: "13px",
              cursor: "pointer",
              marginTop: "4px",
            }}
          >
            Log Out
          </button>
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: isCollapsed ? "40px" : "100%",
          height: isCollapsed ? "40px" : "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          gap: isCollapsed ? "0" : "12px",
          padding: isCollapsed ? "0" : "10px 12px",
          borderRadius: isCollapsed ? "50%" : "14px",
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
        {!isCollapsed && (
          <>
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
          </>
        )}
      </button>
    </div>
  );
}




function useWindowWidth() {
  const [width, setWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1024));
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
}

function AppShell() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  const [view, setView] = useState<View>("dashboard");
  const [symbol, setSymbol] = useState("AAPL");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const [isDark, setIsDark] = useState(() => localStorage.getItem("sv_theme") === "dark");
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("sv_theme", next ? "dark" : "light");
  };

  const width = useWindowWidth();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const qc = useQueryClient();

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u))
      .catch(() => {
        refreshUserToken()
          .then((r) => setCurrentUser(r.user))
          .catch(() => setCurrentUser(null));
      });

    const onLogoutEv = () => setCurrentUser(null);
    const onAuthReq = () => setAuthModalOpen(true);
    window.addEventListener("svp_auth_logout", onLogoutEv);
    window.addEventListener("svp_auth_required", onAuthReq);
    return () => {
      window.removeEventListener("svp_auth_logout", onLogoutEv);
      window.removeEventListener("svp_auth_required", onAuthReq);
    };
  }, []);

  async function handleLogout() {
    await logoutUser();
    setCurrentUser(null);
    qc.invalidateQueries();
  }

  const overview = useQuery({ queryKey: ["overview"], queryFn: getMarketOverview });
  const fallbackTicker = (overview.data?.indices || []) as Quote[];
  const live = useLiveQuotes(["^GSPC", "^IXIC", "^DJI", "^NSEI", "^BSESN", "GLD", "BTC-USD", symbol]);
  const ticker = live.quotes.length ? live.quotes : fallbackTicker;
  
  const alertsQuery = useQuery({ queryKey: ["alerts"], queryFn: getAlerts, refetchInterval: 30000 });
  const activeAlertsCount = (alertsQuery.data || []).filter((a: any) => a.is_active || !a.is_triggered).length;

  const triggeredAlertsQuery = useQuery({
    queryKey: ["alerts-triggered"],
    queryFn: getTriggeredAlerts,
    refetchInterval: 20000,
  });
  const triggeredCount = (triggeredAlertsQuery.data || []).length;

  return (
    <div className="app">
      {isMobile && (
        <MobileHeader
          currentView={view}
          setView={setView}
          onSearchClick={() => setSearchOpen(true)}
          isDark={isDark}
          onThemeToggle={toggleTheme}
          userEmail={currentUser?.email || "Guest"}
          userRole={currentUser?.role || "guest"}
          onLogout={handleLogout}
        />
      )}

      {isMobile && (
        <MobileBottomNav currentView={view} setView={setView} />
      )}

      {isMobile && searchOpen && (
        <MobileSearchModal onClose={() => setSearchOpen(false)} onSelectSymbol={(sym) => { setSymbol(sym); setView("stock"); }} />
      )}

      <aside className="sidebar">
        <div className="desk-brand">
          <div className="desk-brand-left">
            <div className="desk-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <div className="desk-brand-titles">
              <span className="desk-brand-name">StockVision</span>
              <span className="desk-brand-sub">PRO DESK</span>
            </div>
          </div>
          <span className="desk-version-pill">v2.4</span>
        </div>

        <div className="desk-workspace-box">
          <div className="desk-workspace-left">
            <LayoutGrid size={13} style={{ color: "var(--text-muted)" }} />
            <span>{currentUser ? `${currentUser.email.split("@")[0]}'s Desk` : "Guest Session"}</span>
          </div>
          <span className="desk-prod-badge">{currentUser ? "PRO" : "DEMO"}</span>
        </div>

        <NavButton active={view === "dashboard"} onClick={() => setView("dashboard")} icon={<LayoutGrid />} label="Dashboard" />
        <NavButton active={view === "stock"} onClick={() => setView("stock")} icon={<CandlestickChart />} label="Stock Lab" />
        <NavButton active={view === "forecast"} onClick={() => setView("forecast")} icon={<Sparkles />} label="Forecast Studio" />
        <NavButton active={view === "watchlist"} onClick={() => setView("watchlist")} icon={<Star />} label="Watchlist" />
        <NavButton active={view === "backtest"} onClick={() => setView("backtest")} icon={<History />} label="Backtest & Strategies" />
        <NavButton active={view === "opportunities"} onClick={() => setView("opportunities")} icon={<Radar />} label="Market Opportunities" />
        <NavButton active={view === "accuracy"} onClick={() => setView("accuracy")} icon={<CheckCircle2 />} label="Forecast Accuracy" />
        <NavButton active={view === "sentiment"} onClick={() => setView("sentiment")} icon={<Newspaper />} label="News Sentiment" />
        <NavButton
          active={view === "alerts"}
          onClick={() => setView("alerts")}
          icon={<Bell />}
          label="Alerts"
          badge={triggeredCount > 0 ? `⚡ ${triggeredCount}` : activeAlertsCount > 0 ? String(activeAlertsCount) : undefined}
        />
        <NavButton active={view === "settings"} onClick={() => setView("settings")} icon={<SettingsIcon />} label="Settings" />
        
        <div style={{ flexGrow: 1 }} />
        <DeskUserPill user={currentUser} onLogout={handleLogout} onOpenAuth={() => setAuthModalOpen(true)} setView={setView} />
      </aside>
      <main>
        <Topbar
          symbol={symbol}
          setSymbol={setSymbol}
          setView={setView}
          live={live}
          isDark={isDark}
          onThemeToggle={toggleTheme}
          alertsCount={activeAlertsCount}
          triggeredCount={triggeredCount}
          user={currentUser}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
        <TickerTape quotes={ticker} />
        {view === "dashboard" && <Dashboard setSymbol={setSymbol} setView={setView} />}
        {view === "stock" && <StockLab symbol={symbol} setSymbol={setSymbol} setView={setView} isDark={isDark} />}
        {view === "forecast" && <ForecastStudio symbol={symbol} setSymbol={setSymbol} />}
        {view === "watchlist" && <Watchlist setSymbol={setSymbol} setView={setView} currentUser={currentUser} onOpenAuth={() => setAuthModalOpen(true)} />}
        {view === "backtest" && <BacktestingStudio symbol={symbol} setSymbol={setSymbol} setView={setView} user={currentUser} onOpenAuth={() => setAuthModalOpen(true)} isDark={isDark} />}
        {view === "opportunities" && <ForecastOpportunities setSymbol={setSymbol} setView={setView} />}
        {view === "accuracy" && <ForecastAccuracy />}
        {view === "sentiment" && <NewsSentiment symbol={symbol} setSymbol={setSymbol} setView={setView} />}
        {view === "alerts" && <Alerts symbol={symbol} currentUser={currentUser} onOpenAuth={() => setAuthModalOpen(true)} />}
        {view === "settings" && <SettingsView isDark={isDark} onThemeToggle={toggleTheme} />}

        {/* Backwards compatibility views */}
        {view === "compare" && <Compare />}
        {view === "screener" && <Screener setSymbol={setSymbol} setView={setView} />}
        {view === "calendar" && <EconomicCalendar />}
      </main>
      <AiChatbot symbol={symbol} setSymbol={setSymbol} setView={setView} />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          setCurrentUser(u);
          qc.invalidateQueries();
        }}
      />
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

function NavButton({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: string | number }) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {badge && <span className="alert-count-pill">{badge}</span>}
    </button>
  );
}

function DeskUserPill({
  user,
  onLogout,
  onOpenAuth,
  setView,
}: {
  user: UserProfile | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  setView?: (v: View) => void;
}) {
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

  if (!user) {
    return (
      <div style={{ width: "100%", padding: "4px 0" }}>
        <button
          className="desk-user-pill guest"
          onClick={onOpenAuth}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(99,102,241,0.12))",
            border: "1px solid rgba(59,130,246,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 12px",
            borderRadius: "12px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <User size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>Sign In / Register</div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Sync Strategies &amp; Watchlist</div>
          </div>
        </button>
      </div>
    );
  }

  const username = user.email ? user.email.split("@")[0] : "Desk User";

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: 0,
          right: 0,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "14px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 1000,
        }}>
          <div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
              Active Desk Seat
            </div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", wordBreak: "break-all" }}>
              {user.email}
            </div>
          </div>
          {setView && (
            <button
              onClick={() => {
                setView("settings");
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-deep)",
                color: "var(--text-primary)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <SettingsIcon size={14} /> Settings
            </button>
          )}
          <button
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.08)",
              color: "#dc2626",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Log Out
          </button>
        </div>
      )}

      <button className="desk-user-pill" onClick={() => setOpen(!open)}>
        <div className="desk-user-avatar">
          <User size={16} />
        </div>
        <div className="desk-user-details">
          <div className="desk-user-name">{username}</div>
          <div className="desk-user-status">
            <span className="desk-status-dot"></span> Pro Seat Active
          </div>
        </div>
        <div className="desk-user-arrows">
          <ChevronsUpDown size={14} />
        </div>
      </button>
    </div>
  );
}

function Topbar({
  symbol,
  setSymbol,
  setView,
  live,
  isDark,
  onThemeToggle,
  alertsCount,
  triggeredCount,
  user,
  onOpenAuth,
}: {
  symbol: string;
  setSymbol: (s: string) => void;
  setView: (v: View) => void;
  live: LiveState;
  isDark?: boolean;
  onThemeToggle?: () => void;
  alertsCount?: number;
  triggeredCount?: number;
  user?: UserProfile | null;
  onOpenAuth?: () => void;
}) {
  const [query, setQuery] = useState("");
  const search = useQuery({ queryKey: ["search", query], queryFn: () => searchStocks(query), enabled: query.length > 1 });
  const market = useMarketStatus();
  const [showSchedule, setShowSchedule] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target as Node)) {
        setShowSchedule(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [localIsDark, setLocalIsDark] = useState(() => localStorage.getItem("sv_theme") === "dark");
  const activeIsDark = isDark !== undefined ? isDark : localIsDark;

  function handleThemeToggle() {
    if (onThemeToggle) {
      onThemeToggle();
    } else {
      const next = !localIsDark;
      setLocalIsDark(next);
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      localStorage.setItem("sv_theme", next ? "dark" : "light");
    }
  }

  return (
    <header className="desk-topbar">
      <div className="desk-market-pill-container" ref={scheduleRef}>
        <button
          className={`desk-live-pill ${market.status}`}
          onClick={() => setShowSchedule((prev) => !prev)}
          title="Click to view US Market Operating Hours & Schedule"
          type="button"
        >
          <span className={`pulse-beacon-dot ${market.status}`}></span>
          <span className="desk-live-main">LIVE {market.localTime}</span>
          <span className="desk-live-sep">•</span>
          <span className="desk-live-label">{market.label}</span>
          <span className="desk-live-subtext">({market.subtext})</span>
        </button>

        {showSchedule && (
          <div className="desk-market-modal">
            <div className="desk-market-modal-header">
              <div className="desk-market-modal-title">
                <span className={`desk-market-status-dot ${market.status}`}></span>
                <div>
                  <h4>US Equity Markets</h4>
                  <small>NYSE • NASDAQ • CBOE</small>
                </div>
              </div>
              <span className={`desk-market-status-tag ${market.status}`}>
                {market.label}
              </span>
            </div>

            <div className="desk-market-modal-body">
              <div className="desk-market-info-banner">
                <strong>{market.detail}</strong>
                <span>Next Session: {market.nextSession}</span>
              </div>

              <div className="desk-market-clocks-grid">
                <div className="desk-clock-card">
                  <small>New York Time (ET)</small>
                  <strong>{market.nyTime}</strong>
                </div>
                <div className="desk-clock-card">
                  <small>Local System Time</small>
                  <strong>{market.localTime}</strong>
                </div>
              </div>

              <div className="desk-market-schedule-list">
                <h5>Standard Trading Schedule (Eastern Time)</h5>
                <div className="desk-schedule-row">
                  <span>Regular Trading Session</span>
                  <strong>9:30 AM – 4:00 PM ET</strong>
                </div>
                <div className="desk-schedule-row">
                  <span>Pre-Market Trading</span>
                  <strong>4:00 AM – 9:30 AM ET</strong>
                </div>
                <div className="desk-schedule-row">
                  <span>After-Hours Extended</span>
                  <strong>4:00 PM – 8:00 PM ET</strong>
                </div>
                <div className="desk-schedule-row">
                  <span>Weekends & Holidays</span>
                  <strong style={{ color: "#ef4444" }}>Closed</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="desk-searchbox">
        <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks, tickers, crypto e.g., NVDA..."
        />
        {search.data && query.length > 1 && (
          <div className="desk-search-suggestions">
            {search.data.map((item) => (
              <button key={item.symbol} onClick={() => { setSymbol(item.symbol); setView("stock"); setQuery(""); }}>
                <strong>{item.symbol}</strong><span>{item.name}</span><small>{item.exchange}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="desk-topbar-actions">
        <div className="desk-ws-pill" onClick={() => (user ? setView("settings") : onOpenAuth?.())}>
          <LayoutGrid size={13} style={{ color: "var(--primary-blue)" }} />
          <span>{user ? `${user.email.split("@")[0]} • Pro Seat` : "Guest Session"}</span>
        </div>
        <button className="desk-icon-btn" onClick={handleThemeToggle} title={activeIsDark ? "Switch to light mode" : "Switch to dark mode"}>
          {activeIsDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="desk-icon-btn" onClick={() => setView("alerts")} title="Alerts">
          <Bell size={16} />
          {(triggeredCount || 0) > 0 ? (
            <span className="red-dot animate-ping" style={{ backgroundColor: "#ef4444" }}></span>
          ) : (alertsCount || 0) > 0 ? (
            <span className="red-dot"></span>
          ) : null}
        </button>
        {user ? (
          <button className="desk-profile-btn" onClick={() => setView("settings")} title={user.email}>
            <User size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <User size={13} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}

function TickerTape({ quotes }: { quotes: Quote[] }) {
  const defaultTickers = [
    { symbol: "^GSPC", price: 7656.98, change_pct: 0.86 },
    { symbol: "^IXIC", price: 26333.04, change_pct: 0.96 },
    { symbol: "^DJI", price: 52573.29, change_pct: 0.98 },
    { symbol: "^NSEI", price: 23398.10, change_pct: -0.34 },
    { symbol: "^BSESN", price: 74781.76, change_pct: -0.16 },
    { symbol: "GLD", price: 398.77, change_pct: 0.61 },
    { symbol: "BTC-USD", price: 77040.61, change_pct: -0.30 },
    { symbol: "NVDA", price: 879.44, change_pct: 3.41 },
    { symbol: "AAPL", price: 181.72, change_pct: -0.45 },
    { symbol: "MSFT", price: 485.63, change_pct: 0.65 },
    { symbol: "AMZN", price: 256.78, change_pct: 1.94 },
    { symbol: "TSLA", price: 365.44, change_pct: 0.52 },
  ];

  const baseItems = quotes && quotes.length >= 4 ? quotes : defaultTickers;
  const displayItems = [...baseItems, ...baseItems];

  return (
    <div className="desk-ticker-strip">
      <div className="desk-ticker-track">
        {displayItems.map((q, idx) => {
          const isUp = (q.change_pct || 0) >= 0;
          return (
            <div className="desk-ticker-item" key={`${q.symbol}-${idx}`}>
              <span className="desk-ticker-sym">{q.symbol}</span>
              <span className="desk-ticker-price">{money(q.price)}</span>
              <span className={`desk-ticker-pct ${isUp ? "pct-up" : "pct-down"}`}>
                {pct(q.change_pct)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dashboard({ setSymbol, setView }: { setSymbol: (s: string) => void; setView: (v: View) => void }) {
  const [moversTab, setMoversTab] = useState<"all" | "gainers" | "ai">("all");
  const overview = useQuery({ queryKey: ["overview"], queryFn: getMarketOverview });

  // 6 Indices Data matching reference screenshot exactly
  const indicesList = [
    {
      name: "S&P 500",
      price: "7,656.98",
      currency: "USD",
      changePct: "+0.85%",
      low: "7,598.1",
      high: "7,689.4",
      isPositive: true,
      hasBlueDot: false,
    },
    {
      name: "NASDAQ Comp",
      price: "26,333.04",
      currency: "USD",
      changePct: "+0.96%",
      low: "26,081",
      high: "26,380",
      isPositive: true,
      hasBlueDot: false,
    },
    {
      name: "Dow Jones",
      price: "52,573.29",
      currency: "USD",
      changePct: "+0.80%",
      low: "52,110",
      high: "52,640",
      isPositive: true,
      hasBlueDot: false,
    },
    {
      name: "NIFTY 50",
      price: "23,398.10",
      currency: "INR",
      changePct: "-0.34%",
      low: "23,312",
      high: "23,540",
      isPositive: false,
      hasBlueDot: false,
    },
    {
      name: "BSE SENSEX",
      price: "74,781.76",
      currency: "INR",
      changePct: "-0.16%",
      low: "74,490",
      high: "75,020",
      isPositive: false,
      hasBlueDot: false,
    },
    {
      name: "BTC/USD",
      price: "77,154.18",
      currency: "USD",
      changePct: "+2.14%",
      low: "75,200",
      high: "77,490",
      isPositive: true,
      hasBlueDot: true,
    },
  ];

  // Top Movers & AI Forecast Vectors list matching reference screenshot
  const moversList = [
    { monogram: "NV", symbol: "NVDA", name: "NVIDIA Corp.", price: "$138.45", change: "+4.20%", positive: true },
    { monogram: "AM", symbol: "AMZN", name: "Amazon.com", price: "$256.78", change: "+1.94%", positive: true },
    { monogram: "AP", symbol: "AAPL", name: "Apple Inc.", price: "$332.27", change: "+1.75%", positive: true },
    { monogram: "MS", symbol: "MSFT", name: "Microsoft", price: "$485.63", change: "+0.65%", positive: true },
    { monogram: "ME", symbol: "META", name: "Meta Platforms", price: "$648.03", change: "+0.57%", positive: true },
    { monogram: "TS", symbol: "TSLA", name: "Tesla Inc.", price: "$365.44", change: "+0.52%", positive: true },
    { monogram: "PL", symbol: "PLTR", name: "Palantir Tech", price: "$46.80", change: "+5.12%", positive: true },
  ];

  // Sectors list matching reference screenshot
  const sectorsList = [
    { name: "Technology", pct: "+2.40%", pos: true, fillWidth: "82%" },
    { name: "Crypto/Fintech", pct: "+2.14%", pos: true, fillWidth: "74%" },
    { name: "Energy", pct: "+1.10%", pos: true, fillWidth: "48%" },
    { name: "Consumer Disc", pct: "+0.50%", pos: true, fillWidth: "28%" },
    { name: "Healthcare", pct: "-0.10%", pos: false, fillWidth: "16%" },
    { name: "Financials", pct: "-0.30%", pos: false, fillWidth: "26%" },
    { name: "Utilities", pct: "-0.40%", pos: false, fillWidth: "34%" },
    { name: "Real Estate", pct: "+0.22%", pos: true, fillWidth: "20%" },
  ];

  // Institutional Watchlist list matching reference screenshot
  const watchlistItems = [
    { name: "SPDR Gold (GLD)", subtitle: "USD 398.77", pct: "+0.61%", pos: true, bellActive: false },
    { name: "ARM Holdings (ARM)", subtitle: "USD 142.10", pct: "+3.84%", pos: true, bellActive: true },
    { name: "Crude Oil (WTI)", subtitle: "USD 71.30", pct: "-1.12%", pos: false, bellActive: false },
  ];

  return (
    <div className="desk-dashboard-container">
      {/* 6 Market Indices Row */}
      <div className="desk-indices-grid">
        {indicesList.map((idxItem) => (
          <div className="desk-index-card" key={idxItem.name}>
            <div className="index-card-head">
              <span className="index-name">
                {idxItem.hasBlueDot && <span className="index-blue-dot"></span>}
                {idxItem.name}
              </span>
              <span className={`index-badge ${idxItem.isPositive ? "pct-up" : "pct-down"}`}>
                {idxItem.changePct}
              </span>
            </div>

            <div className="index-price-row">
              <span>{idxItem.price}</span>
              <span className="index-currency">{idxItem.currency}</span>
            </div>

            <svg className="index-sparkline-svg" viewBox="0 0 120 34" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`grad-${idxItem.name.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={idxItem.isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={idxItem.isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {idxItem.isPositive ? (
                <>
                  <path d="M 0 26 Q 30 28 50 18 T 90 14 T 120 4 L 120 34 L 0 34 Z" fill={`url(#grad-${idxItem.name.replace(/[^a-zA-Z0-9]/g, '')})`} />
                  <path d="M 0 26 Q 30 28 50 18 T 90 14 T 120 4" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M 0 6 Q 30 5 55 16 T 90 20 T 120 28 L 120 34 L 0 34 Z" fill={`url(#grad-${idxItem.name.replace(/[^a-zA-Z0-9]/g, '')})`} />
                  <path d="M 0 6 Q 30 5 55 16 T 90 20 T 120 28" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>

            <div className="index-range-row">
              <span>L: <b>{idxItem.low}</b></span>
              <span>H: <b>{idxItem.high}</b></span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Two-Column Grid */}
      <div className="desk-main-grid">
        {/* Left Column */}
        <div>
          {/* Top Movers & AI Forecast Vectors */}
          <div className="desk-card">
            <div className="desk-card-header">
              <div className="desk-header-left">
                <div className="desk-card-icon-box icon-box-blue">
                  <Activity size={17} />
                </div>
                <div className="desk-title-group">
                  <h3>Top Movers &amp; AI Forecast Vectors</h3>
                  <p>Real-time predictive scoring across institutional flow</p>
                </div>
              </div>

              <div className="desk-segmented-pills">
                <button
                  className={`desk-seg-btn ${moversTab === "all" ? "active" : ""}`}
                  onClick={() => setMoversTab("all")}
                >
                  All Movers
                </button>
                <button
                  className={`desk-seg-btn ${moversTab === "gainers" ? "active" : ""}`}
                  onClick={() => setMoversTab("gainers")}
                >
                  Gainers
                </button>
                <button
                  className={`desk-seg-btn ${moversTab === "ai" ? "active" : ""}`}
                  onClick={() => setMoversTab("ai")}
                >
                  High AI
                </button>
              </div>
            </div>

            <div className="desk-table-head">
              <span>ASSET / ENTITY</span>
              <span>PRICE</span>
              <span>24H CHG</span>
              <span>TREND</span>
              <span></span>
            </div>

            {moversList.map((row) => (
              <div
                key={row.symbol}
                className="desk-table-row"
                style={{ cursor: "pointer" }}
                onClick={() => { setSymbol(row.symbol); setView("stock"); }}
              >
                <div className="desk-entity-cell">
                  <div className="desk-entity-monogram">{row.monogram}</div>
                  <div className="desk-entity-info">
                    <span className="desk-entity-sym">{row.symbol}</span>
                    <span className="desk-entity-name">{row.name}</span>
                  </div>
                </div>
                <span className="desk-price-cell">{row.price}</span>
                <span className="desk-chg-pill pct-up">{row.change}</span>
                <div>
                  <svg width="58" height="18" viewBox="0 0 58 18" fill="none">
                    <path d="M 2 15 Q 18 13 28 8 T 46 6 T 56 2" stroke="#10b981" strokeWidth="2" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <div className="desk-row-dots" onClick={(e) => { e.stopPropagation(); setSymbol(row.symbol); setView("forecast"); }}>
                  <MoreVertical size={15} />
                </div>
              </div>
            ))}
          </div>

          {/* Sector Heat & Market Breadth */}
          <div className="desk-card">
            <div className="desk-card-header">
              <div className="desk-header-left">
                <div className="desk-card-icon-box icon-box-indigo">
                  <Layers size={17} />
                </div>
                <div className="desk-title-group">
                  <h3>Sector Heat &amp; Market Breadth</h3>
                  <p>Real-time capital flows across key S&amp;P industry sectors</p>
                </div>
              </div>

              <div className="breadth-status-pill">
                <span><span className="breadth-adv-dot"></span><b>342</b> Advancing</span>
                <span style={{ color: "var(--border-hover)" }}>/</span>
                <span><span className="breadth-dec-dot"></span><b>158</b> Declining</span>
              </div>
            </div>

            <div className="breadth-ratio-labels">
              <span>Advancing Volume (68.4%)</span>
              <span>Declining Volume (31.6%)</span>
            </div>

            <div className="breadth-dual-bar">
              <div className="dual-bar-adv" style={{ width: "68.4%" }} />
              <div className="dual-bar-dec" style={{ width: "31.6%" }} />
            </div>

            <div className="sectors-grid-4x2">
              {sectorsList.map((sec) => (
                <div className="sector-tile-desk" key={sec.name}>
                  <div className="sector-tile-top">
                    <span className="sector-name-txt">{sec.name}</span>
                    <span className={`sector-pct-txt ${sec.pos ? "pos" : "neg"}`}>{sec.pct}</span>
                  </div>
                  <div className="sector-mini-track">
                    <div
                      className={`sector-mini-fill ${sec.pos ? "pos" : "neg"}`}
                      style={{ width: sec.fillWidth }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Fear & Greed Index */}
          <div className="desk-card">
            <div className="desk-card-header">
              <div className="desk-header-left">
                <div className="desk-card-icon-box icon-box-green">
                  <Gauge size={17} />
                </div>
                <div className="desk-title-group">
                  <h3>Fear &amp; Greed Index</h3>
                  <p>Multivariate Sentiment Tracker</p>
                </div>
              </div>
              <span className="fg-greed-pill">GREED ZONE</span>
            </div>

            <div className="fg-gauge-center-wrap">
              <svg width="220" height="110" viewBox="0 0 200 105">
                <path
                  d="M 24 100 A 76 76 0 0 1 176 100"
                  stroke="var(--bg-deep)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 24 100 A 76 76 0 0 1 176 100"
                  stroke="#059669"
                  strokeWidth="18"
                  strokeDasharray={`${238.76 * 0.58} 238.76`}
                  strokeLinecap="round"
                  fill="none"
                />
                <text x="100" y="74" textAnchor="middle" fontSize="38" fontWeight="800" fill="var(--text-primary)" fontFamily="Plus Jakarta Sans, sans-serif">
                  58
                </text>
                <text x="100" y="93" textAnchor="middle" fontSize="11" fontWeight="700" fill="#059669" letterSpacing="0.6px" fontFamily="Plus Jakarta Sans, sans-serif">
                  MODERATE GREED
                </text>
              </svg>
            </div>

            <div className="fg-history-grid">
              <div className="fg-hist-col">
                <span className="fg-hist-label">Yesterday</span>
                <span className="fg-hist-val">54 (Neutral)</span>
              </div>
              <div className="fg-hist-col" style={{ borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
                <span className="fg-hist-label">Last Week</span>
                <span className="fg-hist-val">42 (Fear)</span>
              </div>
              <div className="fg-hist-col">
                <span className="fg-hist-label">Last Month</span>
                <span className="fg-hist-val danger">38 (Extreme)</span>
              </div>
            </div>
          </div>

          {/* AI Alpha Insights */}
          <div className="desk-card" style={{ position: "relative" }}>
            <div className="desk-card-header">
              <div className="desk-header-left">
                <div className="desk-card-icon-box icon-box-indigo">
                  <Brain size={17} />
                </div>
                <div className="desk-title-group">
                  <h3>AI Alpha Insights</h3>
                  <p>Real-time NLP synthesis from earnings &amp; macro prints</p>
                </div>
              </div>
              <span className="signals-new-pill">
                <span className="signals-green-dot"></span>
                3 NEW Signals
              </span>
            </div>

            <div className="alpha-feed-item">
              <div className="alpha-item-head">
                <span className="alpha-tag tag-purple">MACRO VECTOR</span>
                <span className="alpha-time">2m ago</span>
              </div>
              <p className="alpha-body-txt">
                Semiconductor order backlog expanded <b>+18% MoM</b>; institutional dark pool flows indicate substantial accumulation in NVDA and AVGO.
              </p>
              <div className="alpha-item-foot">
                <span className="alpha-conf-txt">● Confidence: 92% • Bullish</span>
                <span className="alpha-deep-link" onClick={() => setView("sentiment")}>Deep Dive &gt;</span>
              </div>
            </div>

            <div className="alpha-feed-item">
              <div className="alpha-item-head">
                <span className="alpha-tag tag-mint">FED POLICY</span>
                <span className="alpha-time">18m ago</span>
              </div>
              <p className="alpha-body-txt">
                PCE print aligned with 25bps rate cut projection. 2Y/10Y yield curve inversion dampening, risk assets gaining sustained liquidity elasticity.
              </p>
              <div className="alpha-item-foot">
                <span className="alpha-conf-txt">● Confidence: 87% • Risk-On</span>
                <span className="alpha-deep-link" onClick={() => setView("sentiment")}>Deep Dive &gt;</span>
              </div>
            </div>

            <div className="alpha-feed-item">
              <div className="alpha-item-head">
                <span className="alpha-tag tag-orange">VOLATILITY ALERT</span>
                <span className="alpha-time">44m ago</span>
              </div>
              <p className="alpha-body-txt">
                VIX compressed to <b>13.75 (-4.18%)</b>. Options skew indicates heavy call-side open interest into Friday tech triple witching session.
              </p>
              <div className="alpha-item-foot">
                <span className="alpha-conf-txt">● Confidence: 79% • Low Vol</span>
                <span className="alpha-deep-link" onClick={() => setView("forecast")}>Deep Dive &gt;</span>
              </div>
            </div>
          </div>

          {/* Institutional Watchlist */}
          <div className="desk-card">
            <div className="desk-card-header">
              <div className="desk-header-left">
                <div className="desk-card-icon-box icon-box-blue">
                  <Bookmark size={17} />
                </div>
                <div className="desk-title-group">
                  <h3>Institutional Watchlist</h3>
                  <p>Prioritized desk assets with instant price targets</p>
                </div>
              </div>
              <span className="watchlist-active-pill">5 ACTIVE</span>
            </div>

            {watchlistItems.map((item) => (
              <div className="watchlist-item-desk" key={item.name}>
                <div className="wl-left-group">
                  <div className={`wl-icon-box ${item.pos ? "wl-icon-green" : "wl-icon-red"}`}>
                    {item.pos ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div className="wl-titles">
                    <span className="wl-sym-title">{item.name}</span>
                    <span className="wl-price-sub">{item.subtitle}</span>
                  </div>
                </div>

                <div className="wl-right-group">
                  <span className={`wl-pct-badge ${item.pos ? "pct-up" : "pct-down"}`}>
                    {item.pct}
                  </span>
                  <button className={`wl-bell-btn ${item.bellActive ? "active" : ""}`} title="Set price alert">
                    <Bell size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StockLab({
  symbol,
  setSymbol,
  setView,
  isDark = false,
}: {
  symbol: string;
  setSymbol: (s: string) => void;
  setView?: (v: View) => void;
  isDark?: boolean;
}) {
  const qc = useQueryClient();
  const [chartPeriod, setChartPeriod] = useState<string>("1y");
  const quote = useQuery({ queryKey: ["quote", symbol], queryFn: () => getQuote(symbol) });
  const history = useQuery({ queryKey: ["history", symbol, chartPeriod], queryFn: () => getHistory(symbol, chartPeriod) });
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

  const isPos = (quote.data?.change_pct ?? 0) >= 0;
  const currency = quote.data?.currency || "USD";
  const rawSignal = signal.data?.signal || "Hold";
  const signalLower = rawSignal.toLowerCase();
  const isBuy = signalLower.includes("buy");
  const isSell = signalLower.includes("sell");

  const rows = history.data?.rows || [];
  const latestRow = rows[rows.length - 1];
  const prevRow = rows[rows.length - 2];

  const dayHigh = quote.data?.day_high ?? latestRow?.high;
  const dayLow = quote.data?.day_low ?? latestRow?.low;
  const dayOpen = quote.data?.open ?? latestRow?.open;
  const prevClose = quote.data?.previous_close ?? prevRow?.close;

  const posPct = Number(sentiment.data?.positive_pct ?? 34);
  const neuPct = Number(sentiment.data?.neutral_pct ?? 33);
  const negPct = Number(sentiment.data?.negative_pct ?? 33);

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 select-none">
      {/* 1. TOP ASSET HERO & KEY STATS BENTO */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-5">
        {/* Top bar: Asset details and actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold font-mono text-xl shadow-sm">
              {symbol.slice(0, 2)}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100">
                  {symbol}
                </h1>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs text-slate-600 dark:text-slate-300 font-semibold border border-slate-200/70 dark:border-slate-700">
                  {quote.data?.exchange || "US"}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  • {quote.data?.name || symbol}
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">
                  {money(quote.data?.price, currency)}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full font-mono text-xs font-bold flex items-center gap-1 border ${
                    isPos
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                      : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isPos ? "bg-emerald-500" : "bg-rose-500"} animate-pulse`} />
                  {quote.data?.change != null ? (isPos ? `+${quote.data.change.toFixed(2)}` : quote.data.change.toFixed(2)) : ""}
                  {" "}({pct(quote.data?.change_pct)})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
                watch.isSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
              disabled={watch.isPending}
              onClick={() => watch.mutate()}
            >
              {watch.isSuccess ? <CheckCircle size={15} /> : <ListPlus size={15} />}
              <span>{watch.isPending ? "Adding..." : watch.isSuccess ? "In Watchlist" : "Add to Watchlist"}</span>
            </button>

            {setView && (
              <>
                <button
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200/70 dark:border-slate-700 transition-all cursor-pointer"
                  onClick={() => setView("forecast")}
                >
                  <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Forecast Studio</span>
                </button>
                <button
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200/70 dark:border-slate-700 transition-all cursor-pointer"
                  onClick={() => setView("backtest")}
                >
                  <History size={14} className="text-amber-500" />
                  <span>Backtest Strategy</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Key Statistics Strip (Full Width, Zero Left/Right Dead Space) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Day High</span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
              {money(dayHigh, currency)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Day Low</span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
              {money(dayLow, currency)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Open</span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
              {money(dayOpen, currency)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Prev Close</span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
              {money(prevClose, currency)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Volume</span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
              {formatNumberCompact(quote.data?.volume)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Market Cap</span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
              {formatNumberCompact(quote.data?.market_cap)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSTATION 12-COL BALANCED GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8 COLS) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Card A: Interactive Candlestick Chart */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <CandlestickChart size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Interactive Candlestick Chart</h2>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Daily OHLCV • Real-time Data</span>
                </div>
              </div>

              {/* Range Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-[#1e293b] p-1 rounded-xl gap-1 border border-slate-200/60 dark:border-[#334155]">
                {[
                  { label: "1M", value: "1mo" },
                  { label: "3M", value: "3mo" },
                  { label: "6M", value: "6mo" },
                  { label: "1Y", value: "1y" },
                ].map((item) => (
                  <button
                    key={item.value}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                      chartPeriod === item.value
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                    onClick={() => setChartPeriod(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <InteractiveChart symbol={symbol} period={chartPeriod} isDark={isDark} />
          </div>

          {/* Card B: 30-Day Predictive Trajectory (Forecast) */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Brain size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">30-Day Predictive Trajectory</h2>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Ensemble Multi-Factor Monte Carlo</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-mono text-xs font-semibold border border-blue-100 dark:border-blue-900/50">
                  Median Baseline
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-semibold border border-emerald-100 dark:border-emerald-900/50">
                  Confidence Band
                </span>
              </div>
            </div>

            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecast.data?.forecast_30d || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                  <XAxis dataKey="date" minTickGap={36} stroke={isDark ? "#334155" : "#cbd5e1"} tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                  <YAxis domain={["dataMin", "dataMax"]} stroke={isDark ? "#334155" : "#cbd5e1"} tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0f172a" : "#ffffff",
                      borderColor: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: "10px",
                      color: isDark ? "#f8fafc" : "#0f172a",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Area dataKey="upper" stroke="#7b96ff" strokeOpacity={0.6} fill={isDark ? "rgba(123,150,255,0.15)" : "rgba(123,150,255,0.2)"} name="Upper Corridor" />
                  <Area dataKey="lower" stroke="#10b981" strokeOpacity={0.5} fill={isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.15)"} name="Lower Corridor" />
                  <Line dataKey="base" stroke="#2563eb" strokeWidth={3} dot={false} name="Expected Baseline" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card C: Real-Time Financial News Stream */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Newspaper size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Financial News &amp; Market Catalyst Feed</h2>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Curated Financial Coverage</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-semibold">
                {(news.data || []).length} stories
              </span>
            </div>

            {(news.data || []).length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">
                No recent financial news articles found for {symbol}.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {(news.data || []).slice(0, 6).map((item: any, i: number) => {
                  const sent = item.sentiment || "neutral";
                  return (
                    <a
                      key={item.url || item.title || i}
                      href={item.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/60 bg-slate-50/60 dark:bg-[#1e293b]/40 transition-all flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          {item.source || "Financial Media"}
                          {item.published_at ? " • " + new Date(item.published_at).toLocaleDateString() : ""}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            sent === "positive"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                              : sent === "negative"
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                              : "bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {sent}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 leading-snug">
                        {item.title || "Market Update"}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        <span>Read article</span>
                        <ExternalLink size={12} />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (4 COLS) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Card 1: AI Consensus Signal & Conviction */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Consensus Signal</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono text-xs font-semibold">
                Consensus
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-[#1e293b]/40 border border-slate-100 dark:border-slate-800/80 text-center gap-2">
              <span
                className={`text-2xl font-black font-mono tracking-wider uppercase px-4 py-1.5 rounded-xl border ${
                  isBuy
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : isSell
                    ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                    : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                }`}
              >
                {rawSignal}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {[1, 2, 3, 4, 5].map((st) => (
                  <span
                    key={st}
                    className={`w-5 h-1.5 rounded-full ${
                      st <= (signal.data?.strength || 3)
                        ? isBuy
                          ? "bg-emerald-500"
                          : isSell
                          ? "bg-rose-500"
                          : "bg-amber-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                ))}
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-1">
                  {signal.data?.strength || 3}/5 Conviction
                </span>
              </div>
            </div>

            {/* Breakdown checks */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Key Factor Signals
              </span>
              {(signal.data?.breakdown || []).map((b: any) => (
                <div
                  key={b.name}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-[#1e293b]/30 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">{b.name}</span>
                  <span
                    className={`font-mono font-bold uppercase text-[10px] px-2 py-0.5 rounded ${
                      b.state?.toLowerCase().includes("bull") || b.state?.toLowerCase().includes("buy")
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        : b.state?.toLowerCase().includes("bear") || b.state?.toLowerCase().includes("sell")
                        ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {b.state}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Key Technical Indicators Matrix */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Technical Indicators</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-xs font-semibold">
                Daily
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(technicals.data?.summary || {}).slice(0, 8).map(([k, v]) => (
                <div
                  key={k}
                  className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-[#1e293b]/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between"
                >
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold truncate">
                    {k.replaceAll("_", " ").toUpperCase()}
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
                    {typeof v === "number" ? v.toFixed(2) : "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Media Sentiment Analysis */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Gauge size={18} className="text-teal-600 dark:text-teal-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Sentiment Distribution</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-mono text-xs font-semibold">
                Score: {sentiment.data?.score != null ? sentiment.data.score.toFixed(2) : "0.00"}
              </span>
            </div>

            <div style={{ position: "relative", width: "100%", height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Positive", value: posPct },
                      { name: "Neutral", value: neuPct },
                      { name: "Negative", value: negPct },
                    ]}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={70}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={3}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <div className="text-xl font-bold font-mono text-teal-600 dark:text-teal-400">
                  {posPct.toFixed(0)}%
                </div>
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">Bullish</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono font-medium px-1">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Pos {posPct.toFixed(0)}%
              </span>
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Neu {neuPct.toFixed(0)}%
              </span>
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Neg {negPct.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Card 4: AI Analyst Executive Briefing */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Analyst Synthesis</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-mono text-xs font-semibold">
                Briefing
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1e293b]/50 border-l-4 border-blue-500 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {ai.data?.summary || "Compiling algorithmic equity report from financial feeds..."}
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal italic">
              {ai.data?.disclaimer || "Disclaimer: Quantitative modeling algorithms are for analytical reference only."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
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
    <button className="chat-launcher" onClick={() => setOpen(!open)} title="Open AI Market Assistant" aria-label="Open AI Chatbot">
      <MessageCircle size={20} />
      <span className="chat-launcher-badge" />
    </button>
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

function Watchlist({
  setSymbol,
  setView,
  currentUser,
  onOpenAuth,
}: {
  setSymbol: (s: string) => void;
  setView: (v: View) => void;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
}) {
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

  const popularTickers = ["NVDA", "AAPL", "MSFT", "TSLA", "SPY", "AMZN", "META", "GOOGL"];

  useEffect(() => {
    const timer = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 30)), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Bento */}
      <div className="glass-card flex flex-col md:flex-row md:items-center md:justify-between gap-5 p-6 border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider mb-1.5">
            <span className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-500">
              <Star size={13} />
            </span>
            <span>Personal Watchlist Desk</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Monitored Universe &amp; Quick Actions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Live prices, one-click access to neural forecast models and quantitative backtesting.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Auto-Refresh:</span>
            <span className="font-mono font-black text-blue-600 dark:text-blue-400">{countdown}s</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Tracking:</span>
            <span className="font-mono font-black text-amber-500">{rows.length} Tickers</span>
          </div>
        </div>
      </div>

      {/* Guest Sync Banner */}
      {!currentUser && (
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              <User size={16} />
            </div>
            <div>
              <strong className="text-xs text-slate-900 dark:text-white block">
                Browsing with local guest session
              </strong>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Sign in to back up your watchlist to your cloud profile and access it from any workstation.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex-shrink-0"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {/* Search & Quick-Add Bar */}
      <div className="glass-card p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stock ticker to add (e.g. MSFT, GOOGL)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          {search.data && query.length > 1 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden">
              {search.data.slice(0, 5).map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => add.mutate(item.symbol)}
                  className="w-full p-2.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <strong className="font-mono text-blue-600 dark:text-blue-400">{item.symbol}</strong>
                    <span className="text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{item.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Ticker Add Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-semibold mr-1">Popular:</span>
          {popularTickers.map((t) => {
            const alreadyIn = rows.some((r: any) => r.symbol === t);
            return (
              <button
                key={t}
                type="button"
                disabled={alreadyIn || add.isPending}
                onClick={() => add.mutate(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  alreadyIn
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/60 cursor-pointer"
                }`}
              >
                {alreadyIn ? `✓ ${t}` : `+ ${t}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Watchlist Cards Grid / Empty State */}
      {rows.length === 0 ? (
        <div className="glass-card p-12 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827] shadow-sm text-center flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-500">
            <Star size={24} />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white m-0">Your Watchlist is Empty</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm m-0">
            Search for stocks above or click any popular ticker like NVDA or AAPL to start tracking live prices and forecasts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((row: any) => {
            const isPos = (row.change_pct || 0) >= 0;
            return (
              <div
                key={row.symbol}
                className="glass-card p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827] shadow-sm hover:border-blue-400 dark:hover:border-blue-600/60 transition-all flex flex-col justify-between gap-4 group"
              >
                {/* Card Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 font-bold font-mono text-sm flex items-center justify-center flex-shrink-0">
                      {row.symbol.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-base font-black text-slate-900 dark:text-white font-mono">
                          {row.symbol}
                        </strong>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                        {row.name || "Asset"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                      ${money(row.price)}
                    </div>
                    <span
                      className={`text-xs font-mono font-bold flex items-center justify-end gap-0.5 ${
                        isPos ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {isPos ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {isPos ? "+" : ""}{(row.change_pct || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Day Range */}
                {(row.day_low != null || row.day_high != null) && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                    <span>Day Low: ${money(row.day_low)}</span>
                    <span>Day High: ${money(row.day_high)}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSymbol(row.symbol);
                        setView("forecast");
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Sparkles size={12} />
                      <span>Forecast</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSymbol(row.symbol);
                        setView("backtest");
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <History size={12} />
                      <span>Backtest</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSymbol(row.symbol);
                        setView("stock");
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <CandlestickChart size={12} />
                      <span>Lab</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove.mutate(row.symbol)}
                    title="Remove from Watchlist"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Elegant Web Audio Synthesizer Chime for Live Market Alerts
function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.32);

    // Harmonic Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.22, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.warn("Audio chime disabled or not allowed", e);
  }
}

function Alerts({
  symbol: initialSymbol,
  currentUser,
  onOpenAuth,
}: {
  symbol: string;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
}) {
  const qc = useQueryClient();
  const [targetSymbol, setTargetSymbol] = useState(initialSymbol || "NVDA");
  const [value, setValue] = useState<number | "">("");
  const [type, setType] = useState("above");
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("svp_sound_alerts") !== "false";
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("svp_sound_alerts", String(next));
    if (next) {
      playAlertChime();
      showToast("🔊 Audio chimes enabled!");
    } else {
      showToast("🔇 Audio chimes muted");
    }
  };

  const handleTestChime = () => {
    playAlertChime();
    showToast("🔔 Audio chime preview played!");
  };

  // Keep targetSymbol aligned with active symbol
  useEffect(() => {
    if (initialSymbol) setTargetSymbol(initialSymbol);
  }, [initialSymbol]);

  // Fetch live quote for the active ticker
  const quoteQuery = useQuery({
    queryKey: ["quote", targetSymbol],
    queryFn: () => getQuote(targetSymbol),
    enabled: !!targetSymbol.trim(),
    staleTime: 15000,
  });
  const currentQuote = quoteQuery.data;
  const currentPrice = currentQuote?.price ?? null;
  const isUp = (currentQuote?.change ?? 0) >= 0;

  const alertsQuery = useQuery({
    queryKey: ["alerts"],
    queryFn: getAlerts,
    refetchInterval: 30000,
  });
  const alertsList = alertsQuery.data || [];

  const triggeredQuery = useQuery({
    queryKey: ["alerts-triggered"],
    queryFn: getTriggeredAlerts,
    refetchInterval: 15000,
  });
  const triggeredList = triggeredQuery.data || [];

  const add = useMutation({
    mutationFn: (customData?: { sym: string; typ: string; val: number } | void) => {
      if (!currentUser && onOpenAuth) {
        onOpenAuth();
        throw new Error("Authentication required");
      }
      const sym = (customData && customData.sym ? customData.sym : targetSymbol).toUpperCase().trim();
      const typ = customData && customData.typ ? customData.typ : type;
      const val = customData && customData.val !== undefined ? customData.val : (Number(value) || 0);
      return addAlert(sym, typ, val);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      setValue("");
      if (soundEnabled) playAlertChime();
      const s = (vars && vars.sym) || targetSymbol;
      showToast(`✓ Alert armed for ${s}!`);
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-triggered"] });
      showToast("Alert trigger removed.");
    },
  });

  const conditionOptions = [
    {
      id: "above",
      label: "Breakout Above Target",
      desc: "Trigger when price punches through resistance level",
      icon: <TrendingUp size={16} className="text-emerald-500" />,
      badge: "BULLISH ↗",
      badgeColor: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    },
    {
      id: "below",
      label: "Dip / Stop-Loss Below Target",
      desc: "Trigger when price drops to key buy zone or safety stop",
      icon: <TrendingDown size={16} className="text-rose-500" />,
      badge: "PULLBACK ↘",
      badgeColor: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    },
    {
      id: "sma_crossover",
      label: "Golden Cross (50/200 SMA)",
      desc: "Institutional bullish momentum trend reversal confirmation",
      icon: <Zap size={16} className="text-amber-500" />,
      badge: "SIGNAL ⚡",
      badgeColor: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    },
    {
      id: "rsi_oversold",
      label: "RSI Oversold (< 30)",
      desc: "Extreme selling exhaustion; swing dip bounce opportunity",
      icon: <Crosshair size={16} className="text-blue-500" />,
      badge: "REVERSAL 🟢",
      badgeColor: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    },
    {
      id: "rsi_overbought",
      label: "RSI Overbought (> 70)",
      desc: "High momentum exhaustion warning; lock in profit target",
      icon: <ShieldAlert size={16} className="text-purple-500" />,
      badge: "CAUTION 🔴",
      badgeColor: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    },
  ];

  const quickTickers = ["NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "SPY", "QQQ"];

  // Quick percent targets based on current live price
  const percentPresets = [
    { label: "+2% Bounce", pct: 0.02, targetType: "above" },
    { label: "+5% Breakout", pct: 0.05, targetType: "above" },
    { label: "+10% Surge", pct: 0.10, targetType: "above" },
    { label: "-3% Dip Buy", pct: -0.03, targetType: "below" },
    { label: "-5% Stop Loss", pct: -0.05, targetType: "below" },
  ];

  // Quick starter templates for zero-state
  const starterTemplates = [
    {
      symbol: "NVDA",
      name: "NVIDIA Corp.",
      type: "above",
      targetCalc: (p: number) => Number((p * 1.05).toFixed(2)),
      defaultVal: 135.0,
      title: "Breakout Target (+5%)",
      desc: "Alerts when NVDA punches above near-term resistance into all-time highs",
      badge: "PROFIT TARGET 🚀",
      badgeClass: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    },
    {
      symbol: "SPY",
      name: "S&P 500 ETF",
      type: "below",
      targetCalc: (p: number) => Number((p * 0.97).toFixed(2)),
      defaultVal: 575.0,
      title: "Market Dip Shield (-3%)",
      desc: "Instant notification if the benchmark index pulls back to support levels",
      badge: "DIP BUY SHIELD 🛡️",
      badgeClass: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    },
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      type: "sma_crossover",
      targetCalc: () => 0,
      defaultVal: 0,
      title: "Golden Cross (50/200 SMA)",
      desc: "Alerts when 50-day moving average crosses above 200-day moving average",
      badge: "MOMENTUM ⚡",
      badgeClass: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    },
  ];

  // Computed delta between target price and current live price
  const priceDelta = useMemo(() => {
    if (!currentPrice || typeof value !== "number" || !value) return null;
    const diff = value - currentPrice;
    const pct = (diff / currentPrice) * 100;
    return {
      diff,
      pct,
      isHigher: diff > 0,
      diffFormatted: (diff > 0 ? "+" : "") + diff.toFixed(2),
      pctFormatted: (pct > 0 ? "+" : "") + pct.toFixed(2) + "%",
    };
  }, [currentPrice, value]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast feedback banner */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Top Header Bento ─────────────────────────────────── */}
      <div className="glass-card flex flex-col md:flex-row md:items-center md:justify-between gap-5 p-6 border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5">
            <span className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Bell size={13} />
            </span>
            <span>Real-Time Market Alert Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Price & Technical Alerts
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Set intelligent price breakouts, dip-buy targets, and moving average crossovers with instant visual and audio chimes.
          </p>
        </div>

        {/* Live Controls & Status Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Active Count */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Armed Alerts:</span>
            <span className="font-mono font-black text-blue-600 dark:text-blue-400">{alertsList.length}</span>
          </div>

          {/* Engine Status */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>24/7 Monitor Active</span>
          </div>

          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            title={soundEnabled ? "Mute audio notifications" : "Enable audio notifications"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              soundEnabled
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{soundEnabled ? "Chime On" : "Chime Muted"}</span>
          </button>

          {/* Test Sound Button */}
          <button
            type="button"
            onClick={handleTestChime}
            title="Preview the high-pitch alert chime sound"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          >
            <Bell size={13} className="text-amber-500" />
            <span>Test Chime</span>
          </button>
        </div>
      </div>

      {/* ── Triggered Alerts Live Notification Banner ──────────── */}
      {triggeredList.length > 0 && (
        <div className="p-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 backdrop-blur-xl shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>⚡ {triggeredList.length} Alert Trigger Condition{triggeredList.length > 1 ? "s" : ""} Met!</span>
            </div>
            <span className="text-[11px] font-mono text-rose-500">Live Threshold Notification</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {triggeredList.map((tr) => (
              <div
                key={tr.id}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/80 flex items-center justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-mono font-black text-slate-900 dark:text-white">
                      {tr.ticker || tr.symbol}
                    </strong>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      TRIGGERED
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5 block">
                    {(tr.condition_type || tr.alert_type)?.replaceAll("_", " ")}
                    {tr.threshold_value ? ` @ $${tr.threshold_value.toFixed(2)}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(tr.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 hover:bg-rose-200 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Configure Trigger (5 cols) */}
        <div className="xl:col-span-5">
          <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827] shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white m-0">Arm New Alert</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">Define market condition and target</p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                STEP 1 & 2
              </span>
            </div>

            {/* Asset Symbol & Live Quote Card */}
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Select Asset / Ticker</span>
                {quoteQuery.isFetching && <span className="text-[10px] text-blue-500 font-normal animate-pulse">Fetching quote...</span>}
              </label>

              <div className="relative">
                <input
                  type="text"
                  className="field uppercase font-mono font-bold text-base pl-3 pr-20 py-2.5"
                  value={targetSymbol}
                  onChange={(e) => setTargetSymbol(e.target.value.toUpperCase().trim())}
                  placeholder="e.g. NVDA"
                />
                <button
                  type="button"
                  onClick={() => setTargetSymbol("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  CLEAR
                </button>
              </div>

              {/* Quick Select Ticker Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] text-slate-400 mr-1">Popular:</span>
                {quickTickers.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTargetSymbol(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      targetSymbol === t
                        ? "bg-blue-600 text-white shadow-sm scale-105"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Live Quote Snippet */}
              {currentPrice != null && (
                <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {currentQuote?.name || targetSymbol}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      Range: ${money(currentQuote?.day_low)} - ${money(currentQuote?.day_high)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                      ${money(currentPrice)}
                    </div>
                    <div className={`text-[11px] font-mono font-bold flex items-center justify-end gap-0.5 ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
                      {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      <span>{isUp ? "+" : ""}{(currentQuote?.change_pct ?? 0).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Condition Type with Visual Radio Cards */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Trigger Strategy Condition
              </label>

              <div className="flex flex-col gap-2">
                {conditionOptions.map((opt) => {
                  const isSelected = type === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setType(opt.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}>
                          {opt.icon}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {opt.label}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {opt.desc}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex-shrink-0 ${opt.badgeColor}`}>
                        {opt.badge}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Value Input (for above/below) with Dynamic Calculation Presets */}
            {(type === "above" || type === "below") && (
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Target Price ($ USD)
                  </label>
                  {currentPrice != null && (
                    <span className="text-[11px] font-mono text-slate-500">
                      Live Price: <strong className="text-slate-800 dark:text-slate-200">${money(currentPrice)}</strong>
                    </span>
                  )}
                </div>

                {/* 1-Click Target Calculation Presets */}
                {currentPrice != null && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {percentPresets.map((preset) => {
                      const calculatedTarget = Number((currentPrice * (1 + preset.pct)).toFixed(2));
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setValue(calculatedTarget);
                            setType(preset.targetType);
                          }}
                          className="px-2 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 hover:text-blue-600 border border-slate-200 dark:border-slate-700/80 transition-all"
                        >
                          {preset.label} (${money(calculatedTarget)})
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 font-mono font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="field pl-8 font-mono font-bold text-base"
                    value={value}
                    onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder={currentPrice ? (currentPrice * 1.05).toFixed(2) : "185.00"}
                  />
                </div>

                {/* Live Delta feedback */}
                {priceDelta && (
                  <div className={`p-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 ${
                    priceDelta.isHigher
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"
                      : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40"
                  }`}>
                    <Target size={13} />
                    <span>
                      Target is {priceDelta.diffFormatted} ({priceDelta.pctFormatted}) from current market price of ${money(currentPrice)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              className="primary-btn flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold mt-1 text-sm shadow-md cursor-pointer"
              onClick={() => add.mutate()}
              disabled={add.isPending || !targetSymbol.trim() || ((type === "above" || type === "below") && !value)}
            >
              <Bell size={17} />
              <span>{add.isPending ? "Arming Trigger Engine..." : `Arm Alert Trigger for ${targetSymbol}`}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Configured Alerts Ledger & Starter Presets (7 cols) */}
        <div className="xl:col-span-7">
          <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white m-0">Active Trigger Monitor</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">Live triggers monitored 24/7</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {alertsList.length} Active
              </span>
            </div>

            {/* Zero State: Show 1-Click Starter Presets */}
            {alertsList.length === 0 ? (
              <div className="py-6 flex flex-col gap-5">
                <div className="text-center flex flex-col items-center justify-center gap-2 pt-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Bell size={22} />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base m-0">No active alerts configured yet</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md m-0">
                    Use the panel on the left to set custom triggers, or launch any of our popular smart templates with a single click below:
                  </p>
                </div>

                {/* 1-Click Starter Cards */}
                <div className="flex flex-col gap-3 pt-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Quick-Arm Starter Templates
                  </div>
                  {starterTemplates.map((item) => (
                    <div
                      key={item.symbol}
                      className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-400 dark:hover:border-blue-600 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-black text-sm flex items-center justify-center flex-shrink-0">
                          {item.symbol}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.title}
                            </strong>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${item.badgeClass}`}>
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          add.mutate({
                            sym: item.symbol,
                            typ: item.type,
                            val: item.defaultVal,
                          });
                        }}
                        disabled={add.isPending}
                        className="flex-shrink-0 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Arm 1-Click</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Active Trigger Cards */
              <div className="flex flex-col gap-3">
                {alertsList.map((a: any) => {
                  const conditionObj = conditionOptions.find((c) => c.id === a.alert_type);
                  const isPriceType = a.alert_type === "above" || a.alert_type === "below";

                  return (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-blue-400 dark:hover:border-blue-600/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600/10 to-indigo-600/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold font-mono text-sm flex items-center justify-center flex-shrink-0">
                          {a.symbol?.substring(0, 4)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-base font-black text-slate-900 dark:text-white font-mono">
                              {a.symbol}
                            </strong>
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${conditionObj?.badgeColor || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                              {conditionObj?.label || a.alert_type.replaceAll("_", " ")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 flex-wrap">
                            {isPriceType && (
                              <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                                Target: ${money(a.value)}
                              </span>
                            )}
                            <span>•</span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              Active 24/7 Monitor
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            playAlertChime();
                            showToast(`Previewing sound trigger for ${a.symbol}`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 transition-all"
                          title="Preview alert chime sound"
                        >
                          <Volume2 size={13} className="text-blue-500" />
                          <span>Test</span>
                        </button>

                        <button
                          type="button"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Remove alert trigger"
                          onClick={() => remove.mutate(a.id)}
                          disabled={remove.isPending}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="section-title">{icon}<h3>{title}</h3></div>;
}

function MoverTable({ rows, onPick }: { rows: any[]; onPick?: (symbol: string) => void }) {
  return <div className="table">{rows.map((row) => <button key={row.symbol} onClick={() => onPick?.(row.symbol)}><b>{row.symbol}</b><span>{row.name || row.exchange || ""}</span><strong>{money(row.price)}</strong><PriceBadge value={row.change_pct} /></button>)}</div>;
}

function InteractiveChart({
  symbol,
  period = "1y",
  isDark = false,
}: {
  symbol: string;
  period?: string;
  isDark?: boolean;
}) {
  const history = useQuery({ queryKey: ["history", symbol, period], queryFn: () => getHistory(symbol, period) });
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!chartContainerRef.current || !history.data?.rows) return;
    
    // Clear previous canvas elements if any
    chartContainerRef.current.innerHTML = "";

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#94a3b8' : '#64748b',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(226, 232, 240, 0.7)' },
        horzLines: { color: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(226, 232, 240, 0.7)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: window.innerWidth < 768 ? 240 : 360,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      }
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    const formattedData = history.data.rows
      .filter((r: any) => r.date && r.open != null && r.high != null && r.low != null && r.close != null)
      .map((r: any) => ({
        time: typeof r.date === 'string' ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10),
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
      }))
      .sort((a: any, b: any) => a.time.localeCompare(b.time));

    candlestickSeries.setData(formattedData);

    const handleResize = () => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [history.data, isDark]);

  return <div ref={chartContainerRef} style={{ width: "100%", height: "360px" }} />;
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return <div className={`toast ${type}`}>{type === "success" ? "✓" : "✗"} {msg}</div>;
}

function NewsSentiment({
  symbol,
  setSymbol,
  setView,
}: {
  symbol: string;
  setSymbol?: (s: string) => void;
  setView?: (v: View) => void;
}) {
  const [viewMode, setViewMode] = useState<"macro" | "single">("macro");
  const [filter, setFilter] = useState<"all" | "profit" | "loss" | "neutral">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Macro Market News Sentiment Query (Top 20 daily global catalysts)
  const marketNewsQuery = useQuery({
    queryKey: ["marketNewsSentiment"],
    queryFn: getMarketNewsSentiment,
    refetchInterval: 120000,
  });

  // Single Stock Specific Queries (for Single Stock Deep Dive mode)
  const quote = useQuery({ queryKey: ["quote", symbol], queryFn: () => getQuote(symbol) });
  const sentiment = useQuery({ queryKey: ["sentiment", symbol], queryFn: () => getSentiment(symbol) });
  const ai = useQuery({ queryKey: ["ai", symbol], queryFn: () => getAiSummary(symbol) });
  const singleNews = useQuery({ queryKey: ["news", symbol], queryFn: () => getNews(symbol) });

  const macroData = marketNewsQuery.data;
  const articles: MarketNewsArticle[] = macroData?.articles || (macroData as any)?.items || [];
  const beneficiaries: ImpactedAsset[] = ((macroData?.beneficiaries || []) as any[]).map((b) => ({
    ...b,
    estimated_impact: b.estimated_impact || b.projected_move || "+2.0%",
    catalysts: b.catalysts || b.catalyst || "Macro sentiment tailwinds",
    sector: b.sector || "Equities & Macro",
  }));
  const atRisk: ImpactedAsset[] = ((macroData?.at_risk || []) as any[]).map((r) => ({
    ...r,
    estimated_impact: r.estimated_impact || r.projected_move || "-2.0%",
    catalysts: r.catalysts || r.catalyst || "Downside headline volatility",
    sector: r.sector || "Equities & Macro",
  }));
  const overall = macroData?.overall_distribution || {
    positive: (macroData as any)?.positive_pct ?? 45,
    neutral: (macroData as any)?.neutral_pct ?? 35,
    negative: (macroData as any)?.negative_pct ?? 20,
    avg_compound: (macroData as any)?.overall_score ?? 0.18,
  };
  const netScore = overall.avg_compound ?? 0;
  const isMarketBullish = netScore > 0.1;
  const isMarketBearish = netScore < -0.1;
  const marketSentimentLabel = isMarketBullish
    ? "Bullish Momentum"
    : isMarketBearish
    ? "Bearish Risk Off"
    : "Neutral Equilibrium";

  const categories = [
    { label: "All Sectors", value: "all" },
    { label: "🌐 Geopolitics & Trade", value: "Geopolitics & Global Trade" },
    { label: "⚡ Tech & AI Infrastructure", value: "Tech & AI Infrastructure" },
    { label: "🛢️ Energy & Commodities", value: "Energy & Commodities" },
    { label: "🏛️ Rates & Macro", value: "Monetary Policy & Rates" },
    { label: "📈 Earnings & Strategy", value: "Corporate Strategy & Earnings" },
  ];

  // Filtered Macro News Catalysts
  const filteredArticles = useMemo(() => {
    return articles.filter((item) => {
      if (filter === "profit" && item.impact_type !== "profit") return false;
      if (filter === "loss" && item.impact_type !== "loss") return false;
      if (filter === "neutral" && item.impact_type !== "neutral") return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSource = item.source.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        const matchSymbols = item.impacted_symbols?.some((s) => s.toLowerCase().includes(q));
        if (!matchTitle && !matchSource && !matchCategory && !matchSymbols) return false;
      }
      return true;
    });
  }, [articles, filter, categoryFilter, searchQuery]);

  // Single stock filtered news
  const rawSingleNews: any[] = singleNews.data || [];
  const filteredSingleNews = rawSingleNews.filter((item: any) => {
    if (filter === "profit" && item.sentiment !== "positive") return false;
    if (filter === "loss" && item.sentiment !== "negative") return false;
    if (filter === "neutral" && item.sentiment !== "neutral") return false;
    return true;
  });

  const popularTickers = ["NVDA", "AAPL", "MSFT", "AMZN", "META", "TSLA", "GLD", "SPY"];
  const isPos = (quote.data?.change_pct ?? 0) >= 0;
  const currency = quote.data?.currency || "USD";

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 select-none">
      {/* 1. TOP BENTO HEADER: GLOBAL RADAR / SINGLE DEEP DIVE */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shadow-sm">
              <Globe size={24} className={marketNewsQuery.isFetching ? "animate-spin" : ""} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100">
                  Global Catalyst Radar &amp; Market News
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold border border-blue-200/70 dark:border-blue-800">
                  TOP 20 DAILY INTEL
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  • Refreshes Daily &amp; Auto-Syncs Real-Time Headlines
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time scanning of major global events (BRICS, Fed rate cuts, geopolitics, AI capex) with algorithmic stock impact mapping.
              </p>
            </div>
          </div>

          {/* Mode Switcher & Auto-Refresh Button */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-slate-100 dark:bg-[#1e293b] p-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
              <button
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === "macro"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                onClick={() => setViewMode("macro")}
              >
                <Globe size={14} />
                <span>Global Macro Top 20</span>
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === "single"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                onClick={() => setViewMode("single")}
              >
                <CandlestickChart size={14} />
                <span>Single Stock Deep Dive ({symbol})</span>
              </button>
            </div>

            <button
              onClick={() => marketNewsQuery.refetch()}
              disabled={marketNewsQuery.isFetching}
              className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/60 bg-slate-50 dark:bg-[#1e293b]/60 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-1.5 text-xs font-mono font-semibold"
              title="Refresh Daily News & Analysis"
            >
              <RefreshCw size={14} className={marketNewsQuery.isFetching ? "animate-spin text-blue-600" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* 6-Column Key Metrics Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Market Sentiment Bias
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isMarketBullish ? "bg-emerald-500" : isMarketBearish ? "bg-rose-500" : "bg-amber-500"
                } animate-pulse`}
              />
              <span className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">
                {netScore > 0 ? `+${netScore.toFixed(2)}` : netScore.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Bullish Catalysts
            </span>
            <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {overall.positive.toFixed(0)}%
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              Downside Risk
            </span>
            <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
              {overall.negative.toFixed(0)}%
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Neutral Flow
            </span>
            <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
              {overall.neutral.toFixed(0)}%
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Scanned Headlines
            </span>
            <span className="text-base font-black font-mono text-slate-900 dark:text-slate-100 mt-0.5 block">
              {articles.length > 0 ? `${articles.length} Top Stories` : "20 Stories"}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
              Active Tailwinds
            </span>
            <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5 block">
              {beneficiaries.length} Sectors
            </span>
          </div>
        </div>
      </div>

      {/* 2. CREATIVE DATA VISUALIZATIONS & MARKET IMPACT MATRIX (3 BENTO CARDS) */}
      {viewMode === "macro" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Bento Card 1: Catalyst Sentiment Donut Chart (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Gauge size={18} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Macro Catalyst Donut</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-xs font-semibold">
                  Top 20 Polarity
                </span>
              </div>

              {/* Donut Chart */}
              <div style={{ position: "relative", width: "100%", height: 180 }} className="mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Bullish Tailwinds", value: overall.positive },
                        { name: "Neutral Baseline", value: overall.neutral },
                        { name: "Downside Risks", value: overall.negative },
                      ]}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={78}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={3}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    className={`text-2xl font-black font-mono ${
                      isMarketBullish
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isMarketBearish
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {netScore > 0 ? `+${netScore.toFixed(2)}` : netScore.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {marketSentimentLabel}
                  </div>
                </div>
              </div>

              {/* Progress bars */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Bullish Tailwinds
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {overall.positive.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${overall.positive}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Neutral Flow
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {overall.neutral.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${overall.neutral}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Downside Risks
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {overall.negative.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${overall.negative}%` }} />
                </div>
              </div>
            </div>

            {/* AI Macro Synthesis snippet */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e293b]/40 border-l-4 border-blue-500 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <span className="font-bold font-mono text-[11px] text-blue-600 dark:text-blue-400 block mb-1">
                AI Macro Synthesis:
              </span>
              {macroData?.macro_synthesis ||
                "Synthesizing active geopolitical alignments (BRICS), central bank liquidity signals, and enterprise AI capex..."}
            </div>
          </div>

          {/* Bento Card 2: High-Probability Beneficiaries (Profit Opportunities 🟢) (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#111827] rounded-2xl p-6 border border-emerald-200/80 dark:border-emerald-900/40 shadow-sm flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-950/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Beneficiaries (Profit Tailwinds)
                    </h3>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                      Expected Upside from Today's News
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                  UPSIDE 🟢
                </span>
              </div>

              {/* List of Beneficiaries */}
              <div className="flex flex-col gap-3 mt-4">
                {beneficiaries.slice(0, 4).map((b, i) => (
                  <div
                    key={b.symbol || i}
                    className="p-3 rounded-xl border border-emerald-100/80 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col gap-1.5 hover:border-emerald-400 dark:hover:border-emerald-600/60 transition-all cursor-pointer group"
                    onClick={() => {
                      if (setSymbol) setSymbol(b.symbol);
                      if (setView) setView("stock");
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {b.symbol}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {b.name}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 flex items-center gap-0.5">
                        <ArrowUpRight size={12} />
                        {b.estimated_impact}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                      {b.catalysts}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      <span>Sector: {b.sector}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:underline flex items-center gap-0.5">
                        Inspect Stock Lab &gt;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 italic">
              *Algorithmic sentiment projection based on commodity flows, AI capex, and macro accords.
            </div>
          </div>

          {/* Bento Card 3: Downside Exposure & Risk Headwinds (Loss Warnings 🔴) (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#111827] rounded-2xl p-6 border border-rose-200/80 dark:border-rose-900/40 shadow-sm flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-rose-950/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Downside Exposure &amp; Headwinds
                    </h3>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                      Expected Risk &amp; Drag from Headlines
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono text-xs font-bold border border-rose-200 dark:border-rose-800">
                  CAUTION 🔴
                </span>
              </div>

              {/* List of Downside Assets */}
              <div className="flex flex-col gap-3 mt-4">
                {atRisk.slice(0, 4).map((r, i) => (
                  <div
                    key={r.symbol || i}
                    className="p-3 rounded-xl border border-rose-100/80 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col gap-1.5 hover:border-rose-400 dark:hover:border-rose-600/60 transition-all cursor-pointer group"
                    onClick={() => {
                      if (setSymbol) setSymbol(r.symbol);
                      if (setView) setView("stock");
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400">
                          {r.symbol}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {r.name}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 flex items-center gap-0.5">
                        <ArrowDownRight size={12} />
                        {r.estimated_impact}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                      {r.catalysts}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      <span>Sector: {r.sector}</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold group-hover:underline flex items-center gap-0.5">
                        View Risk Profile &gt;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 italic">
              *Headline risk factors identify regulatory drag, tariff threats, and yield curve pressure.
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN TOP 20 NEWS LEDGER & ARTICLES GRID */}
      {viewMode === "macro" && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-5">
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Table2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Daily Top 20 Catalyst News Feed
                </h2>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  Showing {filteredArticles.length} of {articles.length} verified news catalysts (All titles redirect to full original articles)
                </span>
              </div>
            </div>

            {/* Live Search Input */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search BRICS, Fed, AI, Oil..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-7 py-1.5 rounded-xl text-xs font-mono bg-slate-50 dark:bg-[#1e293b] border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filter Pills: Category & Sentiment */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                    categoryFilter === cat.value
                      ? "bg-blue-600 text-white shadow-sm font-semibold"
                      : "bg-slate-100 dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/60 dark:border-slate-700"
                  }`}
                  onClick={() => setCategoryFilter(cat.value)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sentiment Impact Filter Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-[#1e293b] p-1 rounded-xl gap-1 border border-slate-200/60 dark:border-[#334155]">
              {[
                { label: "All Catalysts", value: "all" },
                { label: "🟢 Bullish Tailwinds", value: "profit" },
                { label: "🔴 Downside Risks", value: "loss" },
                { label: "⚪ Neutral", value: "neutral" },
              ].map((item) => (
                <button
                  key={item.value}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    filter === item.value
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  onClick={() => setFilter(item.value as any)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* News Article Grid */}
          {filteredArticles.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
              <Newspaper size={32} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No news catalysts found matching your filters.
              </p>
              <button
                onClick={() => {
                  setFilter("all");
                  setCategoryFilter("all");
                  setSearchQuery("");
                }}
                className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline mt-1"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArticles.map((item, i) => {
                const isProfit = item.impact_type === "profit";
                const isLoss = item.impact_type === "loss";
                return (
                  <div
                    key={item.url || item.title || i}
                    className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1e293b]/40 hover:border-blue-400 dark:hover:border-blue-500/70 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                  >
                    {/* Top Metadata Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {item.source || "Market Media"}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          {item.published_at ? new Date(item.published_at).toLocaleDateString() : "Today"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-mono text-[10px] font-medium border border-blue-100 dark:border-blue-900/50">
                          {item.category}
                        </span>
                      </div>

                      {/* Sentiment / Impact Pill */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          isProfit
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80"
                            : isLoss
                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {isProfit ? `🟢 Bullish (+${item.score.toFixed(2)})` : isLoss ? `🔴 Downside (${item.score.toFixed(2)})` : "⚪ Neutral"}
                      </span>
                    </div>

                    {/* Clickable Headline */}
                    <a
                      href={item.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group/link cursor-pointer"
                    >
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                    </a>

                    {/* Impact Analysis & Impacted Stock Chips */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {item.impact_desc}
                        </span>
                        {item.impacted_symbols && item.impacted_symbols.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono text-slate-400 uppercase">Impacts:</span>
                            {item.impacted_symbols.map((sym) => (
                              <button
                                key={sym}
                                onClick={() => {
                                  if (setSymbol) setSymbol(sym);
                                  if (setView) setView("stock");
                                }}
                                className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-200/80 hover:bg-blue-600 hover:text-white dark:bg-slate-700 dark:hover:bg-blue-600 text-slate-800 dark:text-slate-200 transition-all"
                                title={`Inspect ${sym} in Stock Lab`}
                              >
                                {sym}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Direct Read Article Button */}
                      <a
                        href={item.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-end gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline mt-0.5"
                      >
                        <span>Read original article</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. SINGLE STOCK DEEP DIVE (WHEN SELECTED) */}
      {viewMode === "single" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: AI Synopsis & Single Stock News Feed (8 cols) */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            {/* AI Sentiment Intelligence */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Brain size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {symbol} Sentiment Synopsis &amp; AI Intelligence
                    </h2>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                      Real-time natural language synthesis of {symbol} financial coverage
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-semibold border border-indigo-100 dark:border-indigo-900/50">
                  Institutional Analysis
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1e293b]/40 border-l-4 border-indigo-500 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {ai.data?.summary || `Analyzing news sentiment indicators and synthesizing financial coverage for ${symbol}...`}
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal italic">
                {ai.data?.disclaimer || "Disclaimer: Quantitative natural language modeling algorithms are for analytical reference only."}
              </p>
            </div>

            {/* Single Stock News Ledger */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Table2 size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {symbol} Headline Articles Ledger
                    </h2>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                      Showing {filteredSingleNews.length} of {rawSingleNews.length} verified news articles
                    </span>
                  </div>
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-[#1e293b] p-1 rounded-xl gap-1 border border-slate-200/60 dark:border-[#334155]">
                  {[
                    { label: "All", value: "all" },
                    { label: "Bullish", value: "profit" },
                    { label: "Neutral", value: "neutral" },
                    { label: "Bearish", value: "loss" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                        filter === item.value
                          ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                      onClick={() => setFilter(item.value as any)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredSingleNews.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-8 text-center">
                  No articles found matching the selected sentiment filter for {symbol}.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredSingleNews.map((item: any, i: number) => {
                    const sent = item.sentiment || "neutral";
                    return (
                      <a
                        key={item.url || item.title || i}
                        href={item.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/60 bg-slate-50/60 dark:bg-[#1e293b]/40 transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            {item.source || "Financial Media"}
                            {item.published_at ? " • " + new Date(item.published_at).toLocaleDateString() : ""}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                              sent === "positive"
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                                : sent === "negative"
                                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                                : "bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {sent}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 leading-snug">
                          {item.title || "Market Catalyst Report"}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          <span>Read full coverage</span>
                          <ExternalLink size={12} />
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Ticker Switcher & Single Stock Gauge (4 cols) */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-[#1f2937] shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Select Asset Ticker</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-xs font-semibold">
                  Quick Select
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {popularTickers.map((t) => (
                  <button
                    key={t}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border ${
                      symbol.toUpperCase() === t
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-50 dark:bg-[#1e293b]/60 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-700 hover:border-blue-400"
                    }`}
                    onClick={() => setSymbol?.(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {setView && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <button
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    onClick={() => setView("stock")}
                  >
                    <CandlestickChart size={14} />
                    <span>Stock Lab</span>
                  </button>
                  <button
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    onClick={() => setView("forecast")}
                  >
                    <Sparkles size={14} />
                    <span>Forecast</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function SettingsView({ isDark, onThemeToggle }: { isDark?: boolean; onThemeToggle?: () => void }) {
  const [localIsDark, setLocalIsDark] = useState(() => localStorage.getItem("sv_theme") === "dark");
  const activeIsDark = isDark !== undefined ? isDark : localIsDark;

  function handleThemeToggle() {
    if (onThemeToggle) {
      onThemeToggle();
    } else {
      const next = !localIsDark;
      setLocalIsDark(next);
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      localStorage.setItem("sv_theme", next ? "dark" : "light");
    }
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
            <button className="theme-btn" onClick={handleThemeToggle} title={activeIsDark ? "Switch to light mode" : "Switch to dark mode"}>
              {activeIsDark ? <Sun size={18} /> : <Moon size={18} />}
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
