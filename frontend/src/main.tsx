import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, AlertCircle, Bell, Brain, Briefcase, CandlestickChart, Check, CheckCircle, Copy, ExternalLink, Eye, EyeOff, Gauge, History, LineChart as LineChartIcon, ListPlus, MessageCircle, Moon, Plus, Radar, Search, Send, Star, Sun, Table2, Trash2, Wifi, X } from "lucide-react";
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
  getPortfolio,
  getQuote,
  getSentiment,
  getSignal,
  getTechnicals,
  getTransactions,
  getWatchlist,
  executeTrade,
  runScreener,
  runAiScreener,
  searchStocks,
  sendOtp,
  verifyOtp,
  signIn,
  requestCredits,
  adminSignIn,
  adminVerifyOtp,
  getAdminRequests,
  approveRequest,
  rejectRequest,
  getUserCreditRequests,
  type Quote,
} from "./api/client";
import { createChart, ColorType } from "lightweight-charts";
import "./styles/globals.css";

// Apply saved theme before first render
(function initTheme() {
  const saved = localStorage.getItem("sv_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
})();

type View = "dashboard" | "stock" | "compare" | "screener" | "watchlist" | "alerts" | "portfolio" | "calendar";

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

function LoginOverlay({ onLogin, onAdminPortal }: { onLogin: (uid: string, email: string, role: string) => void; onAdminPortal: () => void }) {
  const [action, setAction] = useState<"signin" | "signup" | "reset_password">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // role is always "user" here — admin uses the separate Admin Portal
  const role = "user";
  const [code, setCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Focus the code input when entering step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  // Tick the resend timer down
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  function showLocalToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Clean OTP input to numeric
  function handleCodeChange(val: string) {
    const numeric = val.replace(/[^0-9]/g, "").slice(0, 6);
    setCode(numeric);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    // Regex email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address (e.g. name@domain.com).");
      showLocalToast("Invalid email address format.", "error");
      return;
    }

    if (action === "signin") {
      setLoading(true);
      setError("");
      try {
        const res = await signIn(trimmed, password);
        if (res.success) {
          if (res.token) {
            sessionStorage.setItem("svp_token", res.token);
          }
          // Always store "user" role for standard login — admin uses Admin Portal
          sessionStorage.setItem("svp_role", "user");
          showLocalToast("Logged in successfully!", "success");
          setTimeout(() => {
            onLogin(res.user_id, res.email, "user");
          }, 800);
        } else {
          const msg = res.message || "Failed to sign in.";
          setError(msg);
          showLocalToast(msg, "error");
        }
      } catch (err: any) {
        const msg = err?.response?.data?.detail || "Invalid email or password.";
        setError(msg);
        showLocalToast(msg, "error");
      } finally {
        setLoading(false);
      }
      return;
    }

    // action === "signup" || action === "reset_password"
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await sendOtp(trimmed, action, password, role);
      if (res.success) {
        setStep(2);
        setResendTimer(60);
        const codeSentMsg = action === "reset_password"
          ? `Password reset verification code sent to ${trimmed}`
          : `Verification code sent to ${trimmed}`;
        showLocalToast(codeSentMsg, "success");
      } else {
        const msg = res.message || "Failed to send verification code.";
        setError(msg);
        showLocalToast(msg, "error");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to send code. Check credentials or connection.";
      setError(msg);
      showLocalToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await verifyOtp(email.trim(), code, action);
      if (res.success) {
        if (res.token) {
          sessionStorage.setItem("svp_token", res.token);
        }
        // Always store "user" role for standard auth — admin uses Admin Portal
        sessionStorage.setItem("svp_role", "user");
        const successMsg = action === "reset_password"
          ? "Password reset and logged in successfully!"
          : "Account created and logged in successfully!";
        showLocalToast(successMsg, "success");
        setTimeout(() => {
          onLogin(res.user_id, res.email, "user");
        }, 800);
      } else {
        const msg = res.message || "Invalid OTP code.";
        setError(msg);
        showLocalToast(msg, "error");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Invalid code or verification error.";
      setError(msg);
      showLocalToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendTimer > 0 || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await sendOtp(email.trim(), action, password, role);
      if (res.success) {
        setResendTimer(60);
        showLocalToast("Verification code resent successfully!", "success");
      } else {
        const msg = res.message || "Failed to resend code.";
        setError(msg);
        showLocalToast(msg, "error");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to resend code.";
      setError(msg);
      showLocalToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  // 6-digit block render
  const codeArray = code.split("");
  const digitBoxes = Array.from({ length: 6 }).map((_, idx) => {
    const char = codeArray[idx] || "";
    const isFocused = idx === codeArray.length && !loading;
    return (
      <div 
        key={idx}
        style={{
          width: "clamp(34px, 9vw, 48px)",
          height: "clamp(42px, 11vw, 56px)",
          borderRadius: "10px",
          border: isFocused ? "2px solid var(--primary)" : "1px solid var(--border)",
          background: "var(--bg-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "clamp(16px, 4.5vw, 22px)",
          fontWeight: 700,
          color: "var(--text-primary)",
          boxShadow: isFocused ? "0 0 12px rgba(95, 125, 255, 0.25)" : "none",
          transition: "all 0.15s ease",
        }}
      >
        {char}
        {isFocused && (
          <motion.span 
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            style={{ width: "2px", height: "20px", background: "var(--primary)" }}
          />
        )}
      </div>
    );
  });

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(10, 15, 30, 0.72)",
      backdropFilter: "blur(20px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
      <motion.div 
        className="glass-card" 
        style={{ width: "100%", maxWidth: "420px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", padding: "12px", borderRadius: "16px", background: "linear-gradient(135deg, var(--accent-violet), var(--primary))", color: "white", marginBottom: "16px" }}>
            <Brain size={32} />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 8px 0" }}>StockVision Pro</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>AI-powered analytics desk for equities and index data.</p>
        </div>

        {step === 1 && action !== "reset_password" && (
          <div style={{
            display: "flex",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "4px",
            gap: "4px"
          }}>
            <button 
              type="button"
              disabled={loading}
              onClick={() => { setAction("signin"); setError(""); }}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: action === "signin" ? "linear-gradient(135deg, var(--accent-violet), var(--primary))" : "transparent",
                color: action === "signin" ? "white" : "var(--text-secondary)",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Sign In
            </button>
            <button 
              type="button"
              disabled={loading}
              onClick={() => { setAction("signup"); setError(""); }}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: action === "signup" ? "linear-gradient(135deg, var(--accent-violet), var(--primary))" : "transparent",
                color: action === "signup" ? "white" : "var(--text-secondary)",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {step === 1 && action === "reset_password" && (
          <div style={{ textAlign: "left" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0", color: "var(--text-primary)" }}>Reset Password</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
              Enter your registered email and a new password. We will email you a code to verify this change.
            </p>
          </div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              x: [0, -6, 6, -6, 6, 0]
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ 
              padding: "14px 16px", 
              borderRadius: "12px", 
              background: "rgba(255, 107, 138, 0.1)", 
              border: "1px solid rgba(255, 107, 138, 0.25)", 
              color: "#ff6b8a", 
              fontSize: "13.5px", 
              lineHeight: "1.45",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 4px 12px rgba(255, 107, 138, 0.08)",
              textAlign: "left"
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flexGrow: 1 }}>{error}</div>
          </motion.div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Email Address</label>
              <input 
                type="email" 
                className="field" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="you@example.com"
                required
                disabled={loading}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                {action === "reset_password" ? "New Password" : "Password"}
              </label>
              <input 
                type="password" 
                className="field" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder={action === "reset_password" ? "Enter new password (min. 6 chars)" : "Minimum 6 characters"}
                required
                disabled={loading}
              />
            </div>


            
            <button type="submit" className="primary-btn" disabled={loading} style={{ background: "linear-gradient(135deg, var(--accent-violet), var(--primary))", width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {loading ? (
                <span style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                  <svg className="animate-spin" style={{ width: 16, height: 16, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%" }} viewBox="0 0 24 24" />
                  {action === "signin" ? "Signing In..." : "Sending Code..."}
                </span>
              ) : (
                action === "signin" ? "Sign In with Password" : action === "reset_password" ? "Send Reset Code" : "Get Verification Code"
              )}
            </button>

            {action === "signin" && (
              <div style={{ textAlign: "right", marginTop: "-8px" }}>
                <button
                  type="button"
                  onClick={() => { setAction("reset_password"); setError(""); setPassword(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {action === "reset_password" && (
              <div style={{ textAlign: "center", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => { setAction("signin"); setError(""); setPassword(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            )}
            {/* Discreet Administrator Portal link — shown only on Sign In, never mixed with user controls */}
            {action === "signin" && (
              <div style={{ textAlign: "center", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={onAdminPortal}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    cursor: "pointer",
                    padding: 0,
                    opacity: 0.55,
                    textDecoration: "underline",
                    letterSpacing: "0.02em"
                  }}
                >
                  Administrator Portal
                </button>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textAlign: "center" }}>
                We sent a 6-digit code to <strong>{email}</strong>
              </label>
              
              {/* Digit Box Container */}
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: "clamp(4px, 1.5vw, 10px)", margin: "16px 0" }}>
                {digitBoxes}
                <input 
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  ref={codeInputRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0,
                    width: "100%",
                    cursor: "pointer",
                    zIndex: 10
                  }}
                  placeholder=""
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            
            <button type="submit" className="primary-btn" disabled={loading} style={{ background: "linear-gradient(135deg, var(--accent-violet), var(--primary))", width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {loading ? (
                <span style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                  <svg className="animate-spin" style={{ width: 16, height: 16, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%" }} viewBox="0 0 24 24" />
                  Verifying...
                </span>
              ) : (
                "Verify & Enter"
              )}
            </button>
            
            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Didn't receive the code? </span>
              <button 
                type="button" 
                disabled={resendTimer > 0 || loading} 
                onClick={handleResendOtp}
                style={{
                  background: "none",
                  border: "none",
                  color: resendTimer > 0 ? "var(--text-muted)" : "var(--primary)",
                  fontWeight: 600,
                  cursor: resendTimer > 0 ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  textDecoration: resendTimer > 0 ? "none" : "underline"
                }}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
              </button>
            </div>
            
            <button type="button" className="range-btn" onClick={() => { setStep(1); setError(""); }} style={{ width: "100%", height: "42px" }} disabled={loading}>
              ← Change Details
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}


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
    { device: "StockVision Mobile", status: "2 hours ago", current: false },
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

          <button
            onClick={onLogout}
            style={{
              marginTop: "4px",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 107, 138, 0.3)",
              background: "rgba(255, 107, 138, 0.1)",
              color: "var(--accent-rose)",
              fontWeight: 700,
              fontSize: "12px",
              textAlign: "center",
              transition: "all 0.2s",
              width: "100%",
              cursor: "pointer",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255, 107, 138, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255, 107, 138, 0.1)";
            }}
          >
            Log Out Session
          </button>
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
            {role === "admin" ? "Admin Account" : "Trader Account"}  {/* role comes from JWT via sessionStorage */}
          </div>
        </div>
        <div style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--text-muted)", fontSize: "10px" }}>
          ▼
        </div>
      </button>
    </div>
  );
}


function AdminLoginPortal({ onLogin, navigate }: { onLogin: (token: string, email: string) => void; navigate: (path: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showLocalToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSubmitStep1(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await adminSignIn(email, password);
      if (res.success) {
        setStep(2);
        showLocalToast(res.message || "OTP verification code sent to your admin email.", "success");
      } else {
        setError(res.message || "Invalid credentials.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await adminVerifyOtp(email, code);
      if (res.success) {
        showLocalToast("Admin authenticated successfully!", "success");
        setTimeout(() => {
          onLogin(res.token, res.email);
        }, 1000);
      } else {
        setError(res.message || "Invalid OTP code.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid code or verification error.");
    } finally {
      setLoading(false);
    }
  }

  const digitBoxes = Array.from({ length: 6 }).map((_, idx) => {
    const char = code[idx] || "";
    const isFocused = idx === code.length && !loading;
    return (
      <div 
        key={idx}
        style={{
          width: "clamp(34px, 9vw, 48px)",
          height: "clamp(42px, 11vw, 56px)",
          borderRadius: "10px",
          border: isFocused ? "2px solid var(--primary)" : "1px solid var(--border)",
          background: "var(--bg-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "clamp(16px, 4.5vw, 22px)",
          fontWeight: 700,
          color: "var(--text-primary)",
          boxShadow: isFocused ? "0 0 12px rgba(95, 125, 255, 0.25)" : "none",
          transition: "all 0.15s ease",
        }}
      >
        {char}
        {isFocused && (
          <motion.span 
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            style={{ width: "2px", height: "20px", background: "var(--primary)" }}
          />
        )}
      </div>
    );
  });

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(10, 15, 30, 0.72)",
      backdropFilter: "blur(20px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <motion.div 
        className="glass-card" 
        style={{ width: "100%", maxWidth: "420px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", padding: "12px", borderRadius: "16px", background: "linear-gradient(135deg, #ff1744, #ff5252)", color: "white", marginBottom: "16px" }}>
            <Activity size={32} />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 8px 0" }}>SV Admin Portal</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>Secure control desk for StockVision Pro system administration.</p>
        </div>

        {error && (
          <div className="inline-error" style={{ padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSubmitStep1} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Administrator Email</label>
              <input 
                type="email" 
                className="field" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="admin@stockvision.pro"
                required
                disabled={loading}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Master Password</label>
              <input 
                type="password" 
                className="field" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter admin password"
                required
                disabled={loading}
              />
            </div>
            
            <button type="submit" className="primary-btn" disabled={loading} style={{ background: "linear-gradient(135deg, #ff1744, #ff5252)", width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {loading ? "Verifying..." : "Sign In & Send OTP"}
            </button>
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <button type="button" className="range-btn" onClick={() => navigate("/")} style={{ width: "100%" }}>
                ← Go to User Terminal
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitStep2} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textAlign: "center" }}>
                Enter the 6-digit OTP code sent to <strong>{email}</strong>
              </label>
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: "6px", margin: "16px 0" }}>
                {digitBoxes}
                <input 
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                  style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    opacity: 0, width: "100%", cursor: "pointer", zIndex: 10
                  }}
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="primary-btn" disabled={loading || code.length < 6} style={{ background: "linear-gradient(135deg, #ff1744, #ff5252)", width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {loading ? "Authenticating..." : "Verify & Enter Portal"}
            </button>

            <button type="button" className="range-btn" onClick={() => setStep(1)} style={{ width: "100%" }} disabled={loading}>
              ← Change Details
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function AdminDashboard({ email, onLogout }: { email: string; onLogout: () => void }) {
  const qc = useQueryClient();
  const requests = useQuery({ queryKey: ["admin-all-requests"], queryFn: getAdminRequests });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-requests"] });
      showToast("Credit request successfully approved!", "success");
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.detail || "Approval failed.", "error");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectRequest(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-requests"] });
      showToast("Credit request successfully rejected.", "success");
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.detail || "Rejection failed.", "error");
    }
  });

  const reqs = (requests.data || []) as any[];
  
  const metrics = useMemo(() => {
    return {
      total: reqs.length,
      pending: reqs.filter((r: any) => r.status === "pending").length,
      approved: reqs.filter((r: any) => r.status === "approved").length,
      rejected: reqs.filter((r: any) => r.status === "rejected").length,
    };
  }, [reqs]);

  return (
    <div className="app" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg-primary)" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      
      <header className="topbar" style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "22px", margin: 0 }}>
            <span style={{ display: "inline-flex", padding: 6, borderRadius: 10, background: "linear-gradient(135deg, #ff1744, #ff5252)", color: "white" }}><Activity size={18} /></span>
            StockVision Pro Admin Panel
          </h1>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>Administrative controls and simulation credit approval desk.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: "13px", padding: "6px 12px", borderRadius: "12px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontWeight: 600 }}>
            🛡️ {email}
          </span>
          <button 
            onClick={onLogout} 
            className="primary-btn" 
            style={{ padding: "8px 16px", background: "linear-gradient(135deg, #ff1744, #ff5252)", border: "none", fontSize: "13px", cursor: "pointer", borderRadius: "10px" }}
          >
            Logout Session
          </button>
        </div>
      </header>

      <main style={{ flexGrow: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <GlassCard className="metric-card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <small>Total Request Submissions</small>
            <strong>{metrics.total}</strong>
          </GlassCard>
          <GlassCard className="metric-card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <small>Pending Verification</small>
            <strong style={{ color: "#ffb347" }}>{metrics.pending}</strong>
          </GlassCard>
          <GlassCard className="metric-card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <small>Total Approved Requests</small>
            <strong style={{ color: "var(--positive)" }}>{metrics.approved}</strong>
          </GlassCard>
          <GlassCard className="metric-card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <small>Total Rejected Requests</small>
            <strong style={{ color: "var(--negative)" }}>{metrics.rejected}</strong>
          </GlassCard>
        </div>

        <GlassCard className="wide" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionTitle icon={<Table2 />} title="Credit Approvals Registry" />
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>Review all submitted paper trading funding requests from users. Approve mock credits directly or reject with a formal note.</p>
          
          {requests.isLoading ? (
            <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>Retrieving requests history...</p>
          ) : reqs.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>No credit request submissions found in the database.</p>
          ) : (
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>User ID / Email</th>
                  <th>Requested Amount</th>
                  <th>Reason Given</th>
                  <th>Created Date</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions / Audit Trail</th>
                </tr>
              </thead>
              <tbody>
                {reqs.map((req: any) => (
                  <tr key={req.id}>
                    <td><strong>#{req.id}</strong></td>
                    <td>{req.user_email || req.user_id}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>${money(req.amount)}</td>
                    <td>{req.reason || "None"}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{new Date(req.created_at).toLocaleString()}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{new Date(req.updated_at).toLocaleString()}</td>
                    <td>
                      <span className={`price-badge ${req.status === "approved" ? "positive" : req.status === "pending" ? "warning" : "negative"}`}>{req.status}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {req.status === "pending" ? (
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          <button 
                            className="primary-btn" 
                            style={{ padding: "6px 12px", fontSize: "12px", background: "#00c9a7", cursor: "pointer", border: "none", borderRadius: "6px" }} 
                            onClick={() => approveMutation.mutate(req.id)} 
                            disabled={approveMutation.isPending}
                          >
                            Approve
                          </button>
                          <button 
                            className="primary-btn" 
                            style={{ padding: "6px 12px", fontSize: "12px", background: "#ff6b8a", cursor: "pointer", border: "none", borderRadius: "6px" }} 
                            onClick={() => {
                              const reason = prompt("Enter a brief reason for rejecting this credit request (mandatory):");
                              if (reason === null) return;
                              if (!reason.trim()) {
                                alert("A rejection reason is mandatory!");
                                return;
                              }
                              rejectMutation.mutate({ id: req.id, reason: reason.trim() });
                            }} 
                            disabled={rejectMutation.isPending}
                          >
                            Reject
                          </button>
                        </div>
                      ) : req.status === "approved" ? (
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          ✓ Approved {req.approved_at && `on ${new Date(req.approved_at).toLocaleString()}`} {req.approved_by && `by ${req.approved_by}`}
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span>✗ Rejected</span>
                          {req.admin_note && <small style={{ color: "var(--accent-rose)", fontStyle: "italic" }}>"{req.admin_note}"</small>}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>
      </main>
    </div>
  );
}

function AppShell() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  // Safety: on mount, ensure no stale admin role leaks into user session
  // User sessions must only ever have role="user"
  useEffect(() => {
    const storedRole = sessionStorage.getItem("svp_role");
    if (storedRole === "admin") {
      // This means a stale admin role ended up in user session — clear it
      sessionStorage.setItem("svp_role", "user");
    }
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const [view, setView] = useState<View>("dashboard");
  const [symbol, setSymbol] = useState("AAPL");
  const [userId, setUserId] = useState(() => sessionStorage.getItem("svp_user_id") || "");
  const [userEmail, setUserEmail] = useState(() => sessionStorage.getItem("svp_user_email") || "");
  // User role is always "user" for standard accounts — "admin" only valid in admin session
  const [userRole, setUserRole] = useState(() => {
    const r = sessionStorage.getItem("svp_role") || "user";
    return r === "admin" ? "user" : r;  // Guard: never allow admin role in user session
  });

  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem("svp_admin_token") || "");
  const [adminEmail, setAdminEmail] = useState(() => sessionStorage.getItem("svp_admin_email") || "");

  const qc = useQueryClient();

  function handleLogin(uid: string, email: string, role: string) {
    sessionStorage.setItem("svp_user_id", uid);
    sessionStorage.setItem("svp_user_email", email);
    sessionStorage.setItem("svp_role", role);
    setUserId(uid);
    setUserEmail(email);
    setUserRole(role);
    qc.invalidateQueries();
  }

  function handleLogout() {
    sessionStorage.removeItem("svp_user_id");
    sessionStorage.removeItem("svp_user_email");
    sessionStorage.removeItem("svp_role");
    sessionStorage.removeItem("svp_token");
    setUserId("");
    setUserEmail("");
    setUserRole("user");
    qc.invalidateQueries();
  }

  function handleAdminLogin(token: string, email: string) {
    sessionStorage.setItem("svp_admin_token", token);
    sessionStorage.setItem("svp_admin_email", email);
    sessionStorage.setItem("svp_admin_role", "admin");
    setAdminToken(token);
    setAdminEmail(email);
    qc.invalidateQueries();
    navigate("/admin/dashboard");
  }

  function handleAdminLogout() {
    sessionStorage.removeItem("svp_admin_token");
    sessionStorage.removeItem("svp_admin_email");
    sessionStorage.removeItem("svp_admin_role");
    setAdminToken("");
    setAdminEmail("");
    qc.invalidateQueries();
    navigate("/admin/login");
  }

  // Auto logout on inactivity (10 minutes)
  useEffect(() => {
    if (!userId) return;
    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    let timerId: any;

    const resetTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        handleLogout();
        alert("You have been automatically logged out due to inactivity.");
      }, INACTIVITY_TIMEOUT);
    };

    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    activityEvents.forEach((event) => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer();

    return () => {
      if (timerId) clearTimeout(timerId);
      activityEvents.forEach((event) => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [userId]);

  // Enforce secure routing for admin pages (Rule of Hooks compliant)
  useEffect(() => {
    const isAdPath = currentPath.startsWith("/admin");
    if (isAdPath) {
      if (currentPath === "/admin/login") {
        if (adminToken) {
          navigate("/admin/dashboard");
        }
      } else {
        if (!adminToken) {
          navigate("/admin/login");
        }
      }
    }
  }, [currentPath, adminToken]);

  const isAdminPath = currentPath.startsWith("/admin");

  // These hooks MUST be called unconditionally (Rules of Hooks).
  // We disable them on admin paths using the `enabled` flag.
  const overview = useQuery({ queryKey: ["overview"], queryFn: getMarketOverview, enabled: !!userId && !isAdminPath });
  const fallbackTicker = (overview.data?.indices || []) as Quote[];
  const live = useLiveQuotes(!isAdminPath && !!userId ? ["^GSPC", "^IXIC", "^DJI", "^NSEI", "^BSESN", "GLD", "BTC-USD", symbol] : []);
  const ticker = live.quotes.length ? live.quotes : fallbackTicker;

  // ── Admin Portal routing ──────────────────────────────────────────────────
  if (isAdminPath) {
    if (currentPath === "/admin/login") {
      if (adminToken) {
        return <div style={{ color: "var(--text-secondary)", padding: 20 }}>Loading admin workspace...</div>;
      }
      return <AdminLoginPortal onLogin={handleAdminLogin} navigate={navigate} />;
    }

    // Route Guard for secure Admin dashboard view
    if (!adminToken) {
      return <div style={{ color: "var(--text-secondary)", padding: 20 }}>Redirecting to secure login...</div>;
    }

    return <AdminDashboard email={adminEmail} onLogout={handleAdminLogout} />;
  }

  // ── User Portal routing ───────────────────────────────────────────────────
  if (!userId) {
    return <LoginOverlay onLogin={handleLogin} onAdminPortal={() => navigate("/admin/login")} />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span>SV</span><div><strong>StockVision</strong><small>Real markets. Real edge.</small></div></div>
        <NavButton active={view === "dashboard"} onClick={() => setView("dashboard")} icon={<Gauge />} label="Dashboard" />
        <NavButton active={view === "stock"} onClick={() => setView("stock")} icon={<CandlestickChart />} label="Stock Lab" />
        <NavButton active={view === "compare"} onClick={() => setView("compare")} icon={<Radar />} label="Compare" />
        <NavButton active={view === "screener"} onClick={() => setView("screener")} icon={<Table2 />} label="Screener" />
        <NavButton active={view === "watchlist"} onClick={() => setView("watchlist")} icon={<Star />} label="Watchlist" />
        <NavButton active={view === "portfolio"} onClick={() => setView("portfolio")} icon={<Briefcase />} label="Portfolio" />

        <NavButton active={view === "alerts"} onClick={() => setView("alerts")} icon={<Bell />} label="Alerts" />
        <NavButton active={view === "calendar"} onClick={() => setView("calendar")} icon={<Activity />} label="Econ Calendar" />
        
        <div style={{ flexGrow: 1 }} />
        <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
          <AvatarDropdown email={userEmail} role={userRole} onLogout={handleLogout} />
        </div>
      </aside>
      <main>
        <Topbar symbol={symbol} setSymbol={setSymbol} setView={setView} live={live} />
        <TickerTape quotes={ticker} />
        {view === "dashboard" && <Dashboard setSymbol={setSymbol} setView={setView} />}
        {view === "portfolio" && <Portfolio setSymbol={setSymbol} setView={setView} />}
        {view === "stock" && <StockLab symbol={symbol} setSymbol={setSymbol} />}

        {view === "compare" && <Compare />}
        {view === "screener" && <Screener setSymbol={setSymbol} setView={setView} />}
        {view === "watchlist" && <Watchlist setSymbol={setSymbol} setView={setView} />}
        {view === "alerts" && <Alerts symbol={symbol} />}
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
      socket = new WebSocket("ws://127.0.0.1:8000/ws/prices");
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

function Portfolio({ setSymbol, setView }: { setSymbol: (s: string) => void; setView: (v: View) => void }) {
  const qc = useQueryClient();
  const portfolio = useQuery({ queryKey: ["portfolio"], queryFn: getPortfolio });
  const transactions = useQuery({ queryKey: ["transactions"], queryFn: getTransactions });
  const userRequests = useQuery({ queryKey: ["user-credit-requests"], queryFn: getUserCreditRequests });

  const [tradeSymbol, setTradeSymbol] = useState("");
  const [shares, setShares] = useState(1);
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [tradeError, setTradeError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const trade = useMutation({
    mutationFn: () => executeTrade(tradeSymbol, shares, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setTradeSymbol("");
      setShares(1);
      setTradeError("");
      showToast(`${action === "buy" ? "Bought" : "Sold"} ${shares} share(s) of ${tradeSymbol}`, "success");
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      const msg = detail ?? (action === "sell" ? "Sell failed: insufficient shares." : "Trade failed. Check symbol and try again.");
      setTradeError(msg);
      showToast(msg, "error");
    },
    onSettled: () => {
      // Always reset mutation state so button becomes clickable again
    },
  });

  const [requestAmount, setRequestAmount] = useState(10000);
  const [requestReason, setRequestReason] = useState("");

  const creditRequestMutation = useMutation({
    mutationFn: () => requestCredits(requestAmount, requestReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-credit-requests"] });
      showToast(`Requested $${requestAmount} credits successfully!`, "success");
      setRequestAmount(10000);
      setRequestReason("");
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.detail || "Failed to submit credit request.", "error");
    }
  });

  const pData = portfolio.data;

  return <div className="page-grid">
    {toast && <Toast msg={toast.msg} type={toast.type} />}
    <GlassCard className="wide">
      <SectionTitle icon={<Briefcase />} title="Paper Trading Portfolio" />
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>Virtual portfolio starting at $100,000. All prices are real-time from Yahoo Finance.</p>
      <div className="portfolio-summary">
        <div><small>Cash Balance</small><strong style={{ color: "var(--accent-teal)" }}>${money(pData?.cash_balance)}</strong></div>
        <div><small>Total Value</small><strong>${money(pData?.total_value)}</strong></div>
        <div><small>Overall Return</small><PriceBadge value={pData?.total_return_pct} /></div>
      </div>
    </GlassCard>

    <GlassCard>
      <SectionTitle icon={<Activity />} title="Execute Trade" />
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>Enter a symbol, choose quantity and side. Prices are fetched live from market data.</p>
      <div className="trade-form">
        <input className="field" value={tradeSymbol} onChange={(e) => { setTradeSymbol(e.target.value.toUpperCase()); setTradeError(""); }} placeholder="Symbol (e.g. AAPL)" />
        <input className="field" type="number" min="1" value={shares} onChange={(e) => setShares(Number(e.target.value))} placeholder="Shares" />
        <select className="field" value={action} onChange={(e) => { setAction(e.target.value as "buy" | "sell"); setTradeError(""); }}>
          <option value="buy">🟢 Buy</option>
          <option value="sell">🔴 Sell</option>
        </select>
        <button className="primary-btn" onClick={() => trade.mutate()} disabled={trade.isPending || !tradeSymbol || shares <= 0}>
          {trade.isPending ? "Executing..." : `Submit ${action === "buy" ? "Buy" : "Sell"} Order`}
        </button>
        {tradeError && <p className="inline-error">{tradeError}</p>}
      </div>
    </GlassCard>

    <GlassCard className="wide">
      <SectionTitle icon={<ListPlus />} title="Current Holdings" />
      {pData?.positions?.length ? (
        <table className="holdings-table">
          <thead><tr><th>Symbol</th><th>Shares</th><th>Avg Cost</th><th>Mkt Price</th><th>Market Value</th><th>P&L</th><th>Return %</th></tr></thead>
          <tbody>
            {(pData.positions || []).map((pos: any) => (
              <tr key={pos.symbol} style={{ cursor: "pointer" }} onClick={() => { setSymbol(pos.symbol); setView("stock"); }}>
                <td><strong>{pos.symbol}</strong></td>
                <td className="mono">{pos.shares}</td>
                <td className="mono">${money(pos.average_cost)}</td>
                <td className="mono">${money(pos.current_price)}</td>
                <td className="mono">${money((pos.current_price ?? 0) * pos.shares)}</td>
                <td className={`mono ${(pos.unrealized_pl ?? 0) >= 0 ? "positive" : "negative"}`}>${money(pos.unrealized_pl)}</td>
                <td><PriceBadge value={pos.unrealized_pl_pct} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ color: "var(--text-muted)" }}>No open positions. Use the form above to place your first paper trade.</p>}
    </GlassCard>

    <GlassCard>
      <SectionTitle icon={<Plus />} title="Request Simulation Credits" />
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>Need more credits? Submit a request for mock funding approval.</p>
      <div className="trade-form">
        <input className="field" type="number" min="1" value={requestAmount} onChange={(e) => setRequestAmount(Number(e.target.value))} placeholder="Amount ($)" />
        <input className="field" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} placeholder="Reason" />
        <button className="primary-btn" onClick={() => creditRequestMutation.mutate()} disabled={creditRequestMutation.isPending || requestAmount <= 0} style={{ background: "linear-gradient(135deg, var(--accent-violet), var(--primary))" }}>
          {creditRequestMutation.isPending ? "Submitting..." : "Request Credits"}
        </button>
      </div>
    </GlassCard>

    <GlassCard className="wide">
      <SectionTitle icon={<History />} title="Recent Transactions" />
      <div className="table">
        {(transactions.data || []).slice(0, 10).map((t: any) => (
           <div className="check" key={t.id}>
             <span>{new Date(t.timestamp).toLocaleString()}</span>
             <b>{t.action} {t.shares} {t.symbol} @ {money(t.price)}</b>
           </div>
        ))}
      </div>
    </GlassCard>

    <GlassCard className="wide">
      <SectionTitle icon={<CheckCircle />} title="My Credit Requests" />
      {userRequests.isLoading ? (
        <p style={{ color: "var(--text-muted)", padding: "10px 0" }}>Loading credit requests...</p>
      ) : ((userRequests.data || []) as any[]).length === 0 ? (
        <p style={{ color: "var(--text-muted)", padding: "10px 0" }}>No requests submitted yet.</p>
      ) : (
        <table className="holdings-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Details / Action Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {((userRequests.data || []) as any[]).map((req: any) => (
              <tr key={req.id}>
                <td><strong>#{req.id}</strong></td>
                <td className="mono">${money(req.amount)}</td>
                <td>{req.reason || "None"}</td>
                <td>
                  <span className={`price-badge ${req.status === "approved" ? "positive" : req.status === "pending" ? "warning" : "negative"}`}>{req.status}</span>
                </td>
                <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  {req.status === "rejected" && req.admin_note && `Reason: ${req.admin_note}`}
                  {req.status === "approved" && (
                    <>Approved on {new Date(req.approved_at || req.updated_at).toLocaleString()}{req.approved_by && ` by ${req.approved_by}`}</>
                  )}
                  {req.status === "pending" && "Pending administrative approval"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </GlassCard>
  </div>;
}



createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  </React.StrictMode>,
);
