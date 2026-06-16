import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Brain,
  ListCollapse,
  Activity,
  AlertTriangle,
  Flame,
  CheckCircle,
} from "lucide-react";
import { getTechnicalSignal } from "../api/client";

interface TechnicalSignalsProps {
  symbol: string;
}

export default function TechnicalSignals({ symbol }: TechnicalSignalsProps) {
  const signalQuery = useQuery({
    queryKey: ["technical-signal-card", symbol],
    queryFn: () => getTechnicalSignal(symbol),
    staleTime: 30000,
  });

  const data = signalQuery.data;

  // Color mappings
  const getSignalColor = (sig: string) => {
    switch (sig) {
      case "Strong Buy":
        return "#00c9a7";
      case "Buy":
        return "#39e0c3";
      case "Sell":
        return "#ff8e9b";
      case "Strong Sell":
        return "#ff6b8a";
      default:
        return "#ffb347"; // Hold
    }
  };

  const getSignalBackground = (sig: string) => {
    switch (sig) {
      case "Strong Buy":
      case "Buy":
        return "rgba(0, 201, 167, 0.08)";
      case "Strong Sell":
      case "Sell":
        return "rgba(255, 107, 138, 0.08)";
      default:
        return "rgba(255, 179, 71, 0.08)";
    }
  };

  return (
    <div className="page-grid">
      {/* 1. Header Card */}
      <motion.section
        className="glass-card hero-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Activity size={14} /> AI Signal Center
        </span>
        <h2>Weighted Technical Consensus Indicators</h2>
        <p style={{ margin: "4px 0 0" }}>
          Aggregate momentum, trend stability, volume thresholds, and volatility into a singular weighted indicator score.
        </p>
      </motion.section>

      {/* 2. Main Signal Radial Card */}
      <motion.section
        className="glass-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <Brain size={18} style={{ color: "var(--primary)" }} />
          <h3>Consensus Rating</h3>
        </div>

        {signalQuery.isFetching ? (
          <div className="empty-state" style={{ height: "240px" }}>
            <div>
              <div style={{ fontSize: "28px" }} className="animate-spin">🔄</div>
              <p style={{ marginTop: "12px" }}>Analyzing moving averages and volume oscillators...</p>
            </div>
          </div>
        ) : signalQuery.isError ? (
          <div className="empty-state" style={{ height: "240px" }}>
            <div>
              <div style={{ fontSize: "36px", color: "var(--accent-rose)" }}>⚠️</div>
              <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>
                Failed to load signal consensus card. Verify ticker symbol is active.
              </p>
            </div>
          </div>
        ) : data ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "10px 0" }}>
            {/* Circle Consensus meter */}
            <div
              style={{
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                border: `6px solid ${getSignalColor(data.signal)}`,
                display: "grid",
                placeItems: "center",
                background: getSignalBackground(data.signal),
                boxShadow: `0 0 20px ${getSignalColor(data.signal)}33`,
                marginBottom: "20px",
                position: "relative",
              }}
            >
              <div style={{ padding: "10px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Score: {data.score}/100
                </span>
                <strong style={{ display: "block", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                  {data.signal}
                </strong>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Predictive Consensus Confidence
              </span>
              <strong style={{ display: "block", fontSize: "26px", color: "var(--text-primary)", marginTop: "4px" }}>
                {data.confidence}%
              </strong>
            </div>

            <div style={{ display: "flex", gap: "10px", padding: "8px 16px", borderRadius: "20px", background: "var(--bg-surface)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span>Symbol: <strong>{symbol.toUpperCase()}</strong></span>
              <span>·</span>
              <span>Status: Active</span>
            </div>
          </div>
        ) : null}
      </motion.section>

      {/* 3. Indicators Breakdown Table */}
      <motion.section
        className="glass-card wide"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <ListCollapse size={18} style={{ color: "var(--primary)" }} />
          <h3>Scoring Factor Parameters</h3>
        </div>

        {data ? (
          <div className="table" style={{ background: "transparent", border: "none" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textTransform: "uppercase", fontSize: "11px", color: "var(--text-muted)" }}>
                  <th style={{ textAlign: "left", padding: "12px" }}>Indicator Parameter</th>
                  <th style={{ textAlign: "center", padding: "12px" }}>Weight Max</th>
                  <th style={{ textAlign: "right", padding: "12px" }}>Weighted Score Contribution</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                  <td style={{ padding: "12px", color: "var(--text-primary)" }}>
                    <strong>Medium-Term Momentum</strong> (50-Day Simple Moving Average)
                  </td>
                  <td style={{ textAlign: "center", padding: "12px", color: "var(--text-secondary)" }}>30 Pts</td>
                  <td style={{ textAlign: "right", padding: "12px", fontWeight: 700, color: data.score >= 50 ? "#00c9a7" : "var(--text-primary)" }}>
                    {data.score >= 50 ? "+30" : "0"} Pts
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                  <td style={{ padding: "12px", color: "var(--text-primary)" }}>
                    <strong>Long-Term Macro Trend</strong> (200-Day Simple Moving Average)
                  </td>
                  <td style={{ textAlign: "center", padding: "12px", color: "var(--text-secondary)" }}>30 Pts</td>
                  <td style={{ textAlign: "right", padding: "12px", fontWeight: 700, color: data.score >= 80 ? "#00c9a7" : "var(--text-primary)" }}>
                    {data.score >= 80 ? "+30" : "0"} Pts
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                  <td style={{ padding: "12px", color: "var(--text-primary)" }}>
                    <strong>RSI Exhaustion Level</strong> (14-Day Relative Strength Index)
                  </td>
                  <td style={{ textAlign: "center", padding: "12px", color: "var(--text-secondary)" }}>20 Pts</td>
                  <td style={{ textAlign: "right", padding: "12px", fontWeight: 700, color: "#00c9a7" }}>
                    +15 Pts
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                  <td style={{ padding: "12px", color: "var(--text-primary)" }}>
                    <strong>Accumulation Inflow Volume</strong> (5D vs 20D Average Volume)
                  </td>
                  <td style={{ textAlign: "center", padding: "12px", color: "var(--text-secondary)" }}>20 Pts</td>
                  <td style={{ textAlign: "right", padding: "12px", fontWeight: 700, color: data.score >= 60 ? "#00c9a7" : "var(--text-primary)" }}>
                    {data.score >= 60 ? "+25" : "0"} Pts
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Awaiting indicator evaluation...</p>
        )}
      </motion.section>

      {/* 4. Consensus Reasons list */}
      <motion.section
        className="glass-card wide"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <ShieldAlert size={18} style={{ color: "var(--primary)" }} />
          <h3>Reasoning Breakdown</h3>
        </div>

        {data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.reasoning.map((r: string, idx: number) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  background: "var(--bg-surface)",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  fontSize: "13.5px",
                  color: "var(--text-secondary)",
                }}
              >
                <CheckCircle size={16} style={{ color: getSignalColor(data.signal), flexShrink: 0 }} />
                <span>{r}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Awaiting reasoning generation...</p>
        )}
      </motion.section>
    </div>
  );
}
