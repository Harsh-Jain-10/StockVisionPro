import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  History,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getForecastAccuracy } from "../api/client";

export default function ForecastAccuracy() {
  const accuracyQuery = useQuery({
    queryKey: ["forecast-accuracy-tracker"],
    queryFn: getForecastAccuracy,
    staleTime: 30000,
  });

  const data = accuracyQuery.data;

  // Compile history for Recharts comparison chart
  // Cap at 20 points to avoid chart clutter
  const chartData = React.useMemo(() => {
    if (!data || !data.history) return [];
    return [...data.history]
      .reverse()
      .slice(-20)
      .map((h: any) => ({
        date: h.date,
        predicted: h.predicted,
        actual: h.actual,
        symbol: h.symbol,
      }));
  }, [data]);

  return (
    <div className="page-grid">
      {/* 1. Header Card */}
      <motion.section
        className="glass-card hero-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <History size={14} /> Model Transparency Desk
        </span>
        <h2>Forecast Accuracy Tracker</h2>
        <p style={{ margin: "4px 0 0" }}>
          Track, audit, and compare past model predictions against real elapsed closing prices dynamically to assess precision.
        </p>
      </motion.section>

      {/* 2. Overview Cards */}
      {data ? (
        <div className="index-grid" style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <GlassCard className="metric-card">
            <small>Average Model Accuracy</small>
            <strong style={{ color: "#00c9a7" }}>{data.average_accuracy}%</strong>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Based on elapsed dates</span>
          </GlassCard>

          <GlassCard className="metric-card">
            <small>Total Evaluated Closes</small>
            <strong style={{ color: "var(--primary)" }}>{data.total_evaluated} Forecasts</strong>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Stored in SQL logs</span>
          </GlassCard>
        </div>
      ) : null}

      {/* 3. Comparison Chart */}
      <motion.section
        className="glass-card wide chart-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Activity size={18} style={{ color: "var(--primary)" }} />
          <h3>Predicted vs. Actual Closing Prices</h3>
        </div>

        {accuracyQuery.isFetching ? (
          <div className="empty-state" style={{ height: "280px" }}>
            <div>
              <div style={{ fontSize: "28px" }} className="animate-spin">🔄</div>
              <p style={{ marginTop: "12px" }}>Syncing elapsed forecast dates with historical actuals...</p>
            </div>
          </div>
        ) : accuracyQuery.isError ? (
          <div className="empty-state" style={{ height: "280px" }}>
            <div>
              <div style={{ fontSize: "36px", color: "var(--accent-rose)" }}>⚠️</div>
              <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>
                Failed to load accuracy tracker details. Verify backend services.
              </p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="empty-state" style={{ height: "280px" }}>
            <div>
              <div style={{ fontSize: "40px" }}>📊</div>
              <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>
                No elapsed forecast records available yet. Run a forecast in the Studio first!
              </p>
            </div>
          </div>
        ) : (
          <div style={{ width: "100%", height: "280px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ right: 10, left: 0, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 140, 220, 0.08)" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: "11px" }} stroke="var(--border)" />
                <YAxis domain={["dataMin - 10", "dataMax + 10"]} tick={{ fill: "var(--text-muted)", fontSize: "11px" }} stroke="var(--border)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-hover)",
                    borderRadius: "10px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Bar dataKey="predicted" fill="rgba(95, 125, 255, 0.3)" name="Predicted Close" barSize={20} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="actual" stroke="#00c9a7" strokeWidth={2.5} name="Actual Close" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.section>

      {/* 4. History Logs Table */}
      <motion.section
        className="glass-card wide"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <History size={18} style={{ color: "var(--primary)" }} />
          <h3>Accuracy Log Ledger</h3>
        </div>

        {data && data.history && data.history.length > 0 ? (
          <div className="table" style={{ background: "transparent", border: "none" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textTransform: "uppercase", fontSize: "11px", color: "var(--text-muted)" }}>
                  <th style={{ textAlign: "left", padding: "10px" }}>Symbol</th>
                  <th style={{ textAlign: "center", padding: "10px" }}>Target Date</th>
                  <th style={{ textAlign: "right", padding: "10px" }}>Predicted Close</th>
                  <th style={{ textAlign: "right", padding: "10px" }}>Actual Close</th>
                  <th style={{ textAlign: "right", padding: "10px" }}>Computed Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((h: any) => (
                  <tr key={h.id} style={{ borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                    <td style={{ padding: "10px", color: "var(--text-primary)" }}>
                      <strong>{h.symbol}</strong>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px", color: "var(--text-secondary)" }}>{h.date}</td>
                    <td style={{ textAlign: "right", padding: "10px", fontFamily: "monospace", color: "var(--text-primary)" }}>
                      ${h.predicted.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", fontFamily: "monospace", color: "var(--text-primary)" }}>
                      ${h.actual.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px", fontWeight: 700, color: h.accuracy >= 90 ? "#00c9a7" : h.accuracy >= 75 ? "#ffb347" : "#ff6b8a" }}>
                      {h.accuracy.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No historical evaluations recorded.</p>
        )}
      </motion.section>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      className={`glass-card ${className}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: "20px" }}
    >
      {children}
    </motion.section>
  );
}
