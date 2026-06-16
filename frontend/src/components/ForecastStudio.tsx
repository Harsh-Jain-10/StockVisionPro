import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Brain,
  Search,
  Download,
  Printer,
  Table2,
  TrendingUp,
  Info,
  LineChart as LineIcon,
  HelpCircle,
  AlertTriangle,
  CheckCircle,
  Newspaper,
  ShieldAlert,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { runForecast, searchStocks } from "../api/client";

interface ForecastStudioProps {
  symbol: string;
  setSymbol: (s: string) => void;
}

export default function ForecastStudio({ symbol, setSymbol }: ForecastStudioProps) {
  const [model, setModel] = useState<string>("seasonal_trend");
  const [horizon, setHorizon] = useState<number>(30);
  const [query, setQuery] = useState<string>("");
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const search = useQuery({
    queryKey: ["forecast-search", query],
    queryFn: () => searchStocks(query),
    enabled: query.length > 1,
  });

  const forecastQuery = useQuery({
    queryKey: ["run-forecast", symbol, model, horizon],
    queryFn: () => runForecast(symbol, model, horizon),
    staleTime: 60000,
  });

  const forecastData = forecastQuery.data;

  // Combine historical and future forecasts into a single array for rendering
  const chartData = useMemo(() => {
    if (!forecastData) return [];
    const hist = (forecastData.historical || []).map((h: any) => ({
      date: h.date,
      close: h.close,
    }));
    const scens = (forecastData.scenarios || []).map((s: any) => ({
      date: s.date,
      neutral: s.neutral,
      bull: s.bull,
      bear: s.bear,
    }));

    if (hist.length > 0 && scens.length > 0) {
      const lastHist = hist[hist.length - 1];
      const transitionPoint = {
        date: lastHist.date,
        close: lastHist.close,
        neutral: lastHist.close,
        bull: lastHist.close,
        bear: lastHist.close,
      };
      const histSlice = hist.slice(0, -1);
      return [...histSlice, transitionPoint, ...scens];
    }

    return [...hist, ...scens];
  }, [forecastData]);

  // Find split point for historical vs forecast
  const splitDate = useMemo(() => {
    if (!forecastData || !forecastData.historical || forecastData.historical.length === 0) return "";
    return forecastData.historical[forecastData.historical.length - 1].date;
  }, [forecastData]);

  // Model Descriptions
  const MODEL_INFOS: Record<string, { name: string; desc: string; math: string }> = {
    seasonal_trend: {
      name: "Seasonal Trend Decomposition",
      desc: "Curve fitting algorithm mimicking Prophet. Uses linear trend regression combined with Fourier series to capture weekly and monthly market seasonality.",
      math: "y(t) = g(t) + s(t) + ε",
    },
    random_forest: {
      name: "Random Forest Regressor",
      desc: "Ensemble learning model using decision trees on stock lags and moving averages. Excellent for non-linear correlations and robust against outliers.",
      math: "y_t = Mean(Tree_1, ..., Tree_N)",
    },
    gradient_boosting: {
      name: "Gradient Boosting Regressor",
      desc: "Sequential boosting regressor optimizing feature lags step-by-step. Models short-term momentum and price drift patterns with high precision.",
      math: "y_t = Sum(f_i(x)) via gradient descent",
    },
    neural_network: {
      name: "Neural Network (MLP)",
      desc: "Multi-layer Perceptron (MLP) mapping pricing features through non-linear hidden layers. Captures complex, deep mathematical relationships in time series.",
      math: "y_t = σ(W_2 * σ(W_1 * X + b_1) + b_2)",
    },
  };

  const METRIC_INFOS: Record<string, string> = {
    mae: "Mean Absolute Error: Average absolute difference between model forecasts and actual closes in validation. Lower is better.",
    rmse: "Root Mean Squared Error: Standard deviation of residuals. penalizes larger errors. Lower is better.",
    mape: "Mean Absolute Percentage Error: Average percentage error relative to actual stock price. Lower is better.",
    r2: "R² Score (Coefficient of Determination): Explains variance fraction captured by features. 1.0 is perfect; negative indicates model is worse than simple mean.",
  };

  // CSV Export
  const exportCSV = () => {
    if (!forecastData) return;
    const { forecast, historical } = forecastData;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Date,Close/Predicted,Lower Bound,Upper Bound\n";

    historical.forEach((h: any) => {
      csvContent += `Historical,${h.date},${h.close},,\n`;
    });

    forecast.forEach((f: any) => {
      csvContent += `Forecast,${f.date},${f.base},${f.lower},${f.upper}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${symbol.toUpperCase()}_forecast_${horizon}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Chart Export
  const exportChartSVG = () => {
    const container = document.querySelector(".forecast-chart-container");
    if (!container) return;
    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${symbol.toUpperCase()}_forecast_chart.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print report
  const printReport = () => {
    if (!forecastData) return;
    const { metrics, insights, forecast: points } = forecastData;

    const rows = points
      .map(
        (f: any) => `
      <tr>
        <td>${f.date}</td>
        <td>$${f.base.toFixed(2)}</td>
        <td>$${f.lower.toFixed(2)}</td>
        <td>$${f.upper.toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>AI Forecast Report - ${symbol.toUpperCase()}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #4f6ef7; font-size: 28px; }
            .header p { margin: 5px 0 0; color: #64748b; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
            .card h3 { margin-top: 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; color: #334155; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; text-transform: uppercase; }
            .badge.bullish { background: #dcfce7; color: #15803d; }
            .badge.bearish { background: #fee2e2; color: #b91c1c; }
            .badge.neutral { background: #f1f5f9; color: #475569; }
            .metric-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .metric-row span:first-child { color: #64748b; }
            .metric-row span:last-child { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; }
            th { background: #f8fafc; color: #475569; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>StockVision Pro AI Forecast Report</h1>
            <p>Symbol: <strong>${symbol.toUpperCase()}</strong> | Model: <strong>${MODEL_INFOS[model]?.name}</strong> | Horizon: <strong>${horizon} Days</strong> | Date Generated: ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="grid">
            <div class="card">
              <h3>AI Trend Insights</h3>
              <p><strong>Direction:</strong> <span class="badge ${insights.direction}">${insights.direction}</span></p>
              <p><strong>Expected Change:</strong> ${insights.expected_change_pct >= 0 ? "+" : ""}${insights.expected_change_pct.toFixed(2)}%</p>
              <p><strong>Target Price:</strong> $${insights.target_price.toFixed(2)}</p>
              <p><strong>Model Confidence:</strong> ${insights.accuracy_rating}</p>
              <p style="font-size: 14px; color: #475569; margin-top: 15px;">${insights.details}</p>
            </div>
            <div class="card">
              <h3>Backtested Evaluation Metrics</h3>
              <div class="metric-row"><span>Mean Absolute Error (MAE)</span><span>${metrics.mae}</span></div>
              <div class="metric-row"><span>Root Mean Squared Error (RMSE)</span><span>${metrics.rmse}</span></div>
              <div class="metric-row"><span>Mean Absolute Percentage Error (MAPE)</span><span>${metrics.mape}%</span></div>
              <div class="metric-row"><span>R² Score (Coefficient of Determination)</span><span>${metrics.r2}</span></div>
            </div>
          </div>
          <h3>Projected Price Directory</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Base Prediction</th>
                <th>Lower Bound (95% CI)</th>
                <th>Upper Bound (95% CI)</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const activeModelInfo = MODEL_INFOS[model];

  return (
    <div className="page-grid">
      {/* 1. Header and Search */}
      <motion.section
        className="glass-card hero-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
          <div>
            <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Brain size={14} /> AI Predictive Studio
            </span>
            <h2>Stock Analytics &amp; Machine Learning Forecasting</h2>
            <p style={{ margin: "4px 0 0" }}>
              Simulate price predictions on-the-fly using advanced mathematical models and neural networks.
            </p>
          </div>
          <div className="searchbox compact" style={{ width: "260px" }}>
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search stock, e.g. ${symbol}`}
            />
            {search.data && query.length > 1 && (
              <div className="suggestions">
                {search.data.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => {
                      setSymbol(item.symbol);
                      setQuery("");
                    }}
                  >
                    <strong>{item.symbol}</strong>
                    <span>{item.name}</span>
                    <small>{item.exchange}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* 2. Control Desk */}
      <motion.section
        className="glass-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
          {/* Symbol Indicator */}
          <div>
            <label style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
              Target Asset
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-surface)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)" }}>
              <TrendingUp size={20} style={{ color: "var(--primary)" }} />
              <div>
                <strong style={{ fontSize: "18px", display: "block", color: "var(--text-primary)" }}>{symbol.toUpperCase()}</strong>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Equities / Time Series</span>
              </div>
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <label style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
              Forecasting Model
            </label>
            <select
              className="field"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            >
              <option value="seasonal_trend">Seasonal Trend Decomposition (Prophet mimic)</option>
              <option value="random_forest">Random Forest Regressor</option>
              <option value="gradient_boosting">Gradient Boosting Regressor</option>
              <option value="neural_network">Neural Network (MLP)</option>
            </select>
          </div>

          {/* Horizon Selector */}
          <div>
            <label style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
              Prediction Horizon
            </label>
            <div className="compare-ranges" style={{ display: "flex", gap: "4px", background: "var(--bg-surface)", padding: "4px", borderRadius: "10px", border: "1px solid var(--border)" }}>
              {[1, 7, 14, 30, 90].map((h) => (
                <button
                  key={h}
                  className={`range-btn ${horizon === h ? "active" : ""}`}
                  onClick={() => setHorizon(h)}
                  style={{ flex: 1, padding: "8px 0", fontSize: "12px", border: "none", cursor: "pointer" }}
                >
                  {h}D
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Model Math explanation */}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: "20px", paddingTop: "16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <Info size={16} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
              <strong>{activeModelInfo?.name}:</strong> {activeModelInfo?.desc}
            </p>
            <code style={{ display: "inline-block", marginTop: "6px", padding: "2px 6px", borderRadius: "4px", background: "var(--bg-surface)", fontSize: "11px", color: "var(--accent-teal)", fontFamily: "monospace" }}>
              Formula: {activeModelInfo?.math}
            </code>
          </div>
        </div>
      </motion.section>

      {/* 3. Main Chart Card */}
      <motion.section
        className="glass-card wide chart-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <LineIcon size={18} style={{ color: "var(--primary)" }} />
            <h3>Dual-Line Forecast Chart</h3>
          </div>
          {forecastData && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="icon-btn compact-export" onClick={exportCSV} title="Export data to CSV">
                <Download size={14} /> <span>CSV</span>
              </button>
              <button className="icon-btn compact-export" onClick={exportChartSVG} title="Download vector image (SVG)">
                <Download size={14} /> <span>SVG</span>
              </button>
              <button className="icon-btn compact-export" onClick={printReport} title="Print report PDF">
                <Printer size={14} /> <span>PDF</span>
              </button>
            </div>
          )}
        </div>

        {forecastQuery.isFetching ? (
          <div className="empty-state" style={{ height: "300px" }}>
            <div>
              <div style={{ fontSize: "28px" }} className="animate-spin">🔄</div>
              <p style={{ marginTop: "12px" }}>Running mathematical models. Training parameters on-the-fly...</p>
            </div>
          </div>
        ) : forecastQuery.isError ? (
          <div className="empty-state" style={{ height: "300px" }}>
            <div>
              <div style={{ fontSize: "36px", color: "var(--accent-rose)" }}>⚠️</div>
              <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>
                Failed to run forecast. Make sure yfinance has data for {symbol.toUpperCase()}.
              </p>
            </div>
          </div>
        ) : (
          <div className="forecast-chart-container" style={{ width: "100%", height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ right: 10, left: 0, top: 10, bottom: 5 }}>
                <defs>
                  {/* Forecast area gradient */}
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5f7dff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#5f7dff" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 140, 220, 0.08)" />
                <XAxis dataKey="date" minTickGap={40} tick={{ fill: "var(--text-muted)", fontSize: "11px" }} stroke="var(--border)" />
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} tick={{ fill: "var(--text-muted)", fontSize: "11px" }} stroke="var(--border)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-hover)",
                    borderRadius: "10px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                
                {/* Historical closes */}
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="#00c9a7"
                  strokeWidth={2.5}
                  fill="none"
                  dot={false}
                  name="Historical Close"
                />

                {/* Neutral forecast line */}
                <Area
                  type="monotone"
                  dataKey="neutral"
                  stroke="#5f7dff"
                  strokeWidth={3}
                  fill="url(#colorForecast)"
                  dot={false}
                  name="Neutral Forecast"
                />

                {/* Bull forecast line */}
                <Area
                  type="monotone"
                  dataKey="bull"
                  stroke="#00c9a7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="none"
                  dot={false}
                  name="Bull Scenario"
                />

                {/* Bear forecast line */}
                <Area
                  type="monotone"
                  dataKey="bear"
                  stroke="#ff6b8a"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="none"
                  dot={false}
                  name="Bear Scenario"
                />

                {/* vertical line at split point */}
                {splitDate && (
                  <ReferenceLine
                    x={splitDate}
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeDasharray="3 3"
                    label={{ value: "Forecast Start", position: "top", fill: "var(--text-muted)", fontSize: "10px" }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.section>

      {/* 4. AI Insights & Sentiment Correlation Card (wide) */}
      <motion.section
        className="glass-card wide"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Brain size={18} style={{ color: "var(--primary)" }} />
          <h3>AI Analytics &amp; News Correlation</h3>
        </div>

        {forecastData ? (
          <div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
              {/* Direction Badge */}
              <div
                style={{
                  background:
                    forecastData.insights.direction === "bullish"
                      ? "rgba(0, 201, 167, 0.1)"
                      : forecastData.insights.direction === "bearish"
                      ? "rgba(255, 107, 138, 0.1)"
                      : "rgba(120, 140, 220, 0.1)",
                  color:
                    forecastData.insights.direction === "bullish"
                      ? "#00c9a7"
                      : forecastData.insights.direction === "bearish"
                      ? "#ff6b8a"
                      : "var(--text-secondary)",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  border: `1px solid ${
                    forecastData.insights.direction === "bullish"
                      ? "rgba(0, 201, 167, 0.2)"
                      : forecastData.insights.direction === "bearish"
                      ? "rgba(255, 107, 138, 0.2)"
                      : "var(--border)"
                  }`,
                }}
              >
                Direction: {forecastData.insights.direction}
              </div>

              {/* Target Price */}
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                Expected Price: ${forecastData.insights.target_price.toFixed(2)}
              </div>

              {/* expected change percentage */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: forecastData.insights.expected_change_pct >= 0 ? "#00c9a7" : "#ff6b8a",
                }}
              >
                Change: {forecastData.insights.expected_change_pct >= 0 ? "+" : ""}
                {forecastData.insights.expected_change_pct.toFixed(2)}%
              </div>
            </div>

            <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px", lineHeight: "1.4" }}>
              {forecastData.insights.summary}
            </p>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "20px" }}>
              {forecastData.insights.details}
            </p>

            {/* News Correlation Engine */}
            {forecastData.news_correlation && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <Newspaper size={16} style={{ color: "var(--primary)" }} />
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                    AI News Sentiment Correlation
                  </h4>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background:
                        forecastData.news_correlation.sentiment === "positive"
                          ? "rgba(0, 201, 167, 0.12)"
                          : forecastData.news_correlation.sentiment === "negative"
                          ? "rgba(255, 107, 138, 0.14)"
                          : "rgba(120, 140, 220, 0.12)",
                      color:
                        forecastData.news_correlation.sentiment === "positive"
                          ? "#00c9a7"
                          : forecastData.news_correlation.sentiment === "negative"
                          ? "#ff6b8a"
                          : "var(--text-secondary)",
                    }}
                  >
                    Sentiment: {forecastData.news_correlation.sentiment} ({forecastData.news_correlation.score > 0 ? "+" : ""}{forecastData.news_correlation.score.toFixed(2)})
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 10px 0" }}>
                  {forecastData.news_correlation.summary}
                </p>
                {forecastData.news_correlation.reasons && forecastData.news_correlation.reasons.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {forecastData.news_correlation.reasons.map((reason: string, idx: number) => (
                      <div key={idx} style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", gap: "6px", alignItems: "center" }}>
                        <span style={{ color: "var(--accent-violet)" }}>•</span>
                        <span>"{reason}"</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Awaiting model computation...</p>
        )}
      </motion.section>

      {/* 5. Multi-Factor Analyst Desk (regular) */}
      <motion.section
        className="glass-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <ShieldAlert size={18} style={{ color: "var(--primary)" }} />
          <h3>Multi-Factor Stability</h3>
        </div>

        {forecastData && forecastData.multifactor ? (
          <div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius: "50%",
                  border: "4px solid var(--primary)",
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(79, 110, 247, 0.08)",
                  boxShadow: "0 0 15px rgba(79, 110, 247, 0.15)",
                  marginBottom: "8px"
                }}
              >
                <div>
                  <strong style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>
                    {forecastData.multifactor.confidence}%
                  </strong>
                  <span style={{ display: "block", fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Confidence
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Data Quality */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Data Quality:</span>
                <span
                  className="price-badge positive"
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    background:
                      forecastData.multifactor.data_quality === "Excellent"
                        ? "rgba(0, 201, 167, 0.12)"
                        : "rgba(255, 179, 71, 0.12)",
                    color:
                      forecastData.multifactor.data_quality === "Excellent"
                        ? "#00c9a7"
                        : "var(--accent-amber)"
                  }}
                >
                  {forecastData.multifactor.data_quality}
                </span>
              </div>

              {/* Trend Stability */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Trend Stability:</span>
                <span
                  className="price-badge positive"
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    background:
                      forecastData.multifactor.trend_stability === "High"
                        ? "rgba(0, 201, 167, 0.12)"
                        : forecastData.multifactor.trend_stability === "Moderate"
                        ? "rgba(79, 110, 247, 0.12)"
                        : "rgba(255, 107, 138, 0.12)",
                    color:
                      forecastData.multifactor.trend_stability === "High"
                        ? "#00c9a7"
                        : forecastData.multifactor.trend_stability === "Moderate"
                        ? "var(--primary)"
                        : "#ff6b8a"
                  }}
                >
                  {forecastData.multifactor.trend_stability}
                </span>
              </div>

              {/* Volatility Risk */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Volatility Risk:</span>
                <span
                  className="price-badge negative"
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    background:
                      forecastData.multifactor.volatility_risk === "High"
                        ? "rgba(255, 107, 138, 0.14)"
                        : forecastData.multifactor.volatility_risk === "Medium"
                        ? "rgba(255, 179, 71, 0.12)"
                        : "rgba(0, 201, 167, 0.12)",
                    color:
                      forecastData.multifactor.volatility_risk === "High"
                        ? "#ff6b8a"
                        : forecastData.multifactor.volatility_risk === "Medium"
                        ? "var(--accent-amber)"
                        : "#00c9a7"
                  }}
                >
                  {forecastData.multifactor.volatility_risk}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Awaiting model computation...</p>
        )}
      </motion.section>

      {/* 6. Backtested Evaluation Metrics (regular) */}
      <motion.section
        className="glass-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Table2 size={18} style={{ color: "var(--primary)" }} />
            <h3>Evaluation Metrics</h3>
          </div>
        </div>

        {forecastData ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              {Object.entries(forecastData.metrics).map(([key, val]) => (
                <div
                  key={key}
                  onMouseEnter={() => setHoveredMetric(key)}
                  onMouseLeave={() => setHoveredMetric(null)}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "12px",
                    position: "relative",
                    cursor: "help",
                    transition: "all 0.2s ease",
                  }}
                  className="metric-tile-interactive"
                >
                  <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    {key} <HelpCircle size={10} />
                  </span>
                  <strong style={{ fontSize: "18px", color: "var(--text-primary)", display: "block", marginTop: "4px" }}>
                    {typeof val === "number" ? (val as number).toFixed(4) : String(val)}
                    {key === "mape" ? "%" : ""}
                  </strong>
                </div>
              ))}
            </div>

            {/* Hover explanation */}
            <div
              style={{
                minHeight: "42px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border)",
                fontSize: "12px",
                color: "var(--text-secondary)",
                transition: "opacity 0.2s",
              }}
            >
              {hoveredMetric ? (
                METRIC_INFOS[hoveredMetric]
              ) : (
                <span style={{ color: "var(--text-muted)" }}>
                  Hover over any metric tile to view its interpretation.
                </span>
              )}
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Awaiting model metrics...</p>
        )}
      </motion.section>

      {/* 7. Forecast Explanation Engine (full-wide) */}
      <motion.section
        className="glass-card full-wide"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <TrendingUp size={18} style={{ color: "var(--primary)" }} />
          <h3>Forecast Explanations &amp; Market Drivers</h3>
        </div>

        {forecastData && forecastData.explanations ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="screener-filters">
            {/* Drivers Column */}
            <div style={{ background: "rgba(0, 201, 167, 0.04)", border: "1px solid rgba(0, 201, 167, 0.15)", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <CheckCircle size={16} style={{ color: "#00c9a7" }} />
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#00c9a7" }}>
                  Primary Support Drivers
                </h4>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {forecastData.explanations.primary_drivers.map((driver: string, idx: number) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "13px", color: "var(--text-secondary)" }}>
                    <span style={{ color: "#00c9a7", fontWeight: "bold" }}>✓</span>
                    <span>{driver}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risks Column */}
            <div style={{ background: "rgba(255, 107, 138, 0.04)", border: "1px solid rgba(255, 107, 138, 0.15)", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <AlertTriangle size={16} style={{ color: "#ff6b8a" }} />
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#ff6b8a" }}>
                  Overhead Risk Factors
                </h4>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {forecastData.explanations.risk_factors.map((risk: string, idx: number) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "13px", color: "var(--text-secondary)" }}>
                    <span style={{ color: "#ff6b8a", fontWeight: "bold" }}>!</span>
                    <span>{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Awaiting explanation breakdown...</p>
        )}
      </motion.section>
    </div>
  );
}
