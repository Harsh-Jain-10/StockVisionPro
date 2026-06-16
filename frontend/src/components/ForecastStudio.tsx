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
    const fore = (forecastData.forecast || []).map((f: any) => ({
      date: f.date,
      base: f.base,
      upper: f.upper,
      lower: f.lower,
    }));

    // To connect the line smoothly, we overlap the last historical point in the forecast line
    if (hist.length > 0 && fore.length > 0) {
      fore[0].base_connected = hist[hist.length - 1].close;
    }

    return [...hist, ...fore];
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
                  {/* Confidence bounds area gradient */}
                  <linearGradient id="colorBounds" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7b96ff" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#7b96ff" stopOpacity={0.0} />
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

                {/* Shaded confidence interval band */}
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="rgba(95, 125, 255, 0.15)"
                  strokeWidth={0.5}
                  fill="url(#colorBounds)"
                  name="95% Upper Bound"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="rgba(95, 125, 255, 0.15)"
                  strokeWidth={0.5}
                  fill="none"
                  name="95% Lower Bound"
                />

                {/* Connect historical to base prediction */}
                <Area
                  type="monotone"
                  dataKey="base_connected"
                  stroke="#5f7dff"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  fill="none"
                  dot={false}
                  name="Forecast Trigger"
                />

                {/* Future forecast line */}
                <Area
                  type="monotone"
                  dataKey="base"
                  stroke="#5f7dff"
                  strokeWidth={3}
                  fill="url(#colorForecast)"
                  dot={false}
                  name="Base Forecast"
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

      {/* 4. AI Insights Panel */}
      <motion.section
        className="glass-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Brain size={18} style={{ color: "var(--primary)" }} />
          <h3>AI Predictive Insights</h3>
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
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.6", margin: 0 }}>
              {forecastData.insights.details}
            </p>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Awaiting model computation...</p>
        )}
      </motion.section>

      {/* 5. Metrics Panel */}
      <motion.section
        className="glass-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Table2 size={18} style={{ color: "var(--primary)" }} />
            <h3>Backtested Evaluation Metrics</h3>
          </div>
          {forecastData && (
            <span
              style={{
                fontSize: "12px",
                color: "var(--accent-teal)",
                fontWeight: 700,
                background: "rgba(0, 201, 167, 0.08)",
                padding: "4px 10px",
                borderRadius: "12px",
              }}
            >
              Fit Confidence: {forecastData.insights.accuracy_rating}
            </span>
          )}
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
                  Hover over any metric tile to view its mathematical explanation and standard interpretation.
                </span>
              )}
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Awaiting model computation...</p>
        )}
      </motion.section>
    </div>
  );
}
