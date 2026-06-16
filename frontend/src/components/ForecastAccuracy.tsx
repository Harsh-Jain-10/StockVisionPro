import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  History,
  Activity,
  Clock,
  CheckCircle2,
  BarChart2,
  TrendingUp,
  Info,
  RefreshCw,
  Hourglass,
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

/* ── helpers ─────────────────────────────────────────── */
function AccuracyColor(acc: number | null) {
  if (acc === null) return "var(--text-muted)";
  if (acc >= 90) return "#00c9a7";
  if (acc >= 75) return "#ffb347";
  return "#ff6b8a";
}

function AccuracyLabel(acc: number | null) {
  if (acc === null) return "—";
  if (acc >= 90) return "Excellent";
  if (acc >= 75) return "Good";
  if (acc >= 60) return "Fair";
  return "Poor";
}

/* ── Info Banner ─────────────────────────────────────── */
function HowItWorksBanner() {
  return (
    <div className="acc-how-banner">
      <Info size={15} className="acc-info-icon" />
      <div className="acc-how-text">
        <strong>How accuracy tracking works</strong>
        <span>
          Each time you run a forecast in the Studio, predictions are saved to the database.
          When the forecast date arrives, the system automatically fetches the real closing price
          and computes the model's accuracy. Results appear here once market dates have elapsed.
        </span>
      </div>
    </div>
  );
}

/* ── Pending State ───────────────────────────────────── */
function PendingState({ pendingCount }: { pendingCount: number }) {
  return (
    <div className="acc-pending-state glass-card">
      <div className="acc-pending-icon">
        <Hourglass size={36} className="acc-hourglass" />
      </div>
      <h3 className="acc-pending-title">Forecasts Waiting to Mature</h3>
      <p className="acc-pending-body">
        You have <strong style={{ color: "var(--primary)" }}>{pendingCount} forecast{pendingCount !== 1 ? "s" : ""}</strong>{" "}
        saved and waiting. Accuracy data will appear automatically once those future dates arrive
        and real market prices become available.
      </p>
      <div className="acc-pending-steps">
        <div className="acc-step">
          <div className="acc-step-num">1</div>
          <span>Run a forecast in Forecast Studio</span>
        </div>
        <div className="acc-step-arrow">→</div>
        <div className="acc-step">
          <div className="acc-step-num">2</div>
          <span>Predictions saved to database</span>
        </div>
        <div className="acc-step-arrow">→</div>
        <div className="acc-step">
          <div className="acc-step-num">3</div>
          <span>Target date arrives, actuals fetched</span>
        </div>
        <div className="acc-step-arrow">→</div>
        <div className="acc-step">
          <div className="acc-step-num">4</div>
          <span>Accuracy metrics appear here</span>
        </div>
      </div>
    </div>
  );
}

/* ── Empty / No Forecasts Run Yet ────────────────────── */
function EmptyState() {
  return (
    <div className="acc-pending-state glass-card">
      <div className="acc-pending-icon">
        <BarChart2 size={36} style={{ color: "var(--primary)", opacity: 0.6 }} />
      </div>
      <h3 className="acc-pending-title">No Completed Forecasts Yet</h3>
      <p className="acc-pending-body">
        Run your first forecast in the <strong>Forecast Studio</strong> to start tracking accuracy.
        Predictions will be automatically saved and evaluated once their target dates have elapsed.
      </p>
      <div className="acc-pending-steps">
        <div className="acc-step">
          <div className="acc-step-num">1</div>
          <span>Open Forecast Studio</span>
        </div>
        <div className="acc-step-arrow">→</div>
        <div className="acc-step">
          <div className="acc-step-num">2</div>
          <span>Search any stock and run forecast</span>
        </div>
        <div className="acc-step-arrow">→</div>
        <div className="acc-step">
          <div className="acc-step-num">3</div>
          <span>Return here after forecast dates elapse</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */
export default function ForecastAccuracy() {
  const accuracyQuery = useQuery({
    queryKey: ["forecast-accuracy-tracker"],
    queryFn: getForecastAccuracy,
    staleTime: 30_000,
    refetchInterval: 120_000,
  });

  const data = accuracyQuery.data;

  const chartData = React.useMemo(() => {
    if (!data?.history?.length) return [];
    return [...data.history]
      .reverse()
      .slice(-20)
      .map((h: any) => ({
        date: h.date?.slice(5) ?? h.date, // show MM-DD only
        predicted: h.predicted,
        actual: h.actual,
        symbol: h.symbol,
        accuracy: h.accuracy,
      }));
  }, [data]);

  const hasEvaluated = data && data.total_evaluated > 0;
  const hasPending   = data && data.pending_count > 0;
  const avgAcc       = data?.average_accuracy ?? null;

  return (
    <div className="acc-page">

      {/* ── Page Header ─────────────────────────────── */}
      <motion.div
        className="acc-header glass-card"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="acc-header-left">
          <div className="acc-eyebrow">
            <History size={13} />
            Model Transparency Desk
          </div>
          <h2 className="acc-title">Forecast Accuracy Tracker</h2>
          <p className="acc-subtitle">
            Track, audit, and compare past model predictions against real elapsed closing prices dynamically to assess precision.
          </p>
        </div>
        <button
          className="opp-refresh-btn"
          onClick={() => accuracyQuery.refetch()}
          disabled={accuracyQuery.isFetching}
        >
          <RefreshCw size={14} className={accuracyQuery.isFetching ? "spin" : ""} />
          {accuracyQuery.isFetching ? "Syncing…" : "Refresh"}
        </button>
      </motion.div>

      {/* ── How It Works Banner ──────────────────────── */}
      <HowItWorksBanner />

      {/* ── Loading ──────────────────────────────────── */}
      {accuracyQuery.isFetching && !data && (
        <div className="glass-card opp-loading">
          <div className="opp-loading-inner">
            <div className="opp-spinner" />
            <p>Syncing elapsed forecast dates with historical actuals…</p>
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────── */}
      {accuracyQuery.isError && (
        <div className="glass-card opp-error">
          <BarChart2 size={36} />
          <p>Failed to load accuracy tracker. Verify backend services are running.</p>
          <button className="opp-refresh-btn" onClick={() => accuracyQuery.refetch()}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {data && (
        <>
          {/* ── Stats Row ───────────────────────────── */}
          <div className="acc-stats-row">
            {/* Accuracy tile */}
            <motion.div
              className="glass-card acc-stat-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <TrendingUp size={18} style={{ color: "var(--accent-teal)" }} />
              <small>Average Accuracy</small>
              {avgAcc !== null ? (
                <>
                  <strong style={{ color: AccuracyColor(avgAcc), fontSize: "32px" }}>
                    {avgAcc}%
                  </strong>
                  <span className="acc-label" style={{ color: AccuracyColor(avgAcc) }}>
                    {AccuracyLabel(avgAcc)}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Based on {data.total_evaluated} elapsed forecast{data.total_evaluated !== 1 ? "s" : ""}
                  </span>
                </>
              ) : (
                <>
                  <strong style={{ color: "var(--text-muted)", fontSize: "28px" }}>—</strong>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    No elapsed forecasts yet
                  </span>
                </>
              )}
            </motion.div>

            {/* Evaluated tile */}
            <motion.div
              className="glass-card acc-stat-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              <CheckCircle2 size={18} style={{ color: "var(--primary)" }} />
              <small>Evaluated Forecasts</small>
              <strong style={{ color: "var(--primary)", fontSize: "32px" }}>
                {data.total_evaluated}
              </strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Compared against real close prices
              </span>
            </motion.div>

            {/* Pending tile */}
            <motion.div
              className="glass-card acc-stat-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.11 }}
            >
              <Clock size={18} style={{ color: "var(--accent-amber)" }} />
              <small>Awaiting Evaluation</small>
              <strong style={{ color: "var(--accent-amber)", fontSize: "32px" }}>
                {data.pending_count}
              </strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {data.pending_count > 0
                  ? "Future dates not yet elapsed"
                  : "Run forecasts in the Studio"}
              </span>
            </motion.div>
          </div>

          {/* ── Empty / Pending State ────────────────── */}
          {!hasEvaluated && hasPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <PendingState pendingCount={data.pending_count} />
            </motion.div>
          )}

          {!hasEvaluated && !hasPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <EmptyState />
            </motion.div>
          )}

          {/* ── Prediction vs Actual Chart ───────────── */}
          {hasEvaluated && (
            <motion.div
              className="glass-card acc-chart-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
            >
              <div className="acc-section-head">
                <Activity size={17} style={{ color: "var(--primary)" }} />
                <h3>Predicted vs. Actual Closing Prices</h3>
                <span className="acc-section-sub">{chartData.length} data points</span>
              </div>
              <div style={{ width: "100%", height: "280px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ right: 10, left: 0, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,140,220,0.08)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "var(--text-muted)", fontSize: "11px" }}
                      stroke="var(--border)"
                    />
                    <YAxis
                      domain={["dataMin - 5", "dataMax + 5"]}
                      tick={{ fill: "var(--text-muted)", fontSize: "11px" }}
                      stroke="var(--border)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-surface)",
                        borderColor: "var(--border-hover)",
                        borderRadius: "10px",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                      }}
                      formatter={(val: any, name: string) => [`$${Number(val).toFixed(2)}`, name]}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.symbol ? `${payload[0].payload.symbol} · ${label}` : label
                      }
                    />
                    <Legend />
                    <Bar
                      dataKey="predicted"
                      fill="rgba(95,125,255,0.28)"
                      name="Predicted Close"
                      barSize={20}
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#00c9a7"
                      strokeWidth={2.5}
                      name="Actual Close"
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* ── History Log Table ────────────────────── */}
          {hasEvaluated && (
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              <div className="acc-section-head">
                <History size={17} style={{ color: "var(--primary)" }} />
                <h3>Accuracy Log Ledger</h3>
                <span className="acc-section-sub">Last 100 evaluated forecasts</span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Model</th>
                      <th>Target Date</th>
                      <th style={{ textAlign: "right" }}>Predicted</th>
                      <th style={{ textAlign: "right" }}>Actual</th>
                      <th style={{ textAlign: "right" }}>Delta</th>
                      <th style={{ textAlign: "right" }}>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((h: any) => {
                      const delta = h.actual - h.predicted;
                      const deltaColor = delta >= 0 ? "#00c9a7" : "#ff6b8a";
                      return (
                        <tr key={h.id}>
                          <td>
                            <strong style={{ fontFamily: "DM Mono, monospace" }}>{h.symbol}</strong>
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{h.model}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{h.date}</td>
                          <td style={{ textAlign: "right", fontFamily: "DM Mono, monospace" }}>
                            ${h.predicted.toFixed(2)}
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "DM Mono, monospace" }}>
                            ${h.actual.toFixed(2)}
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "DM Mono, monospace", color: deltaColor }}>
                            {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span
                              className="acc-badge"
                              style={{
                                background: h.accuracy >= 90
                                  ? "rgba(0,201,167,.12)"
                                  : h.accuracy >= 75
                                  ? "rgba(255,179,71,.12)"
                                  : "rgba(255,107,138,.12)",
                                color: AccuracyColor(h.accuracy),
                              }}
                            >
                              {h.accuracy.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
