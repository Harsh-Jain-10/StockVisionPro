import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  TrendingUp as TrendUpIcon,
} from "lucide-react";
import { getForecastOpportunities } from "../api/client";

interface ForecastOpportunitiesProps {
  setSymbol: (s: string) => void;
  setView: (v: any) => void;
}

export default function ForecastOpportunities({ setSymbol, setView }: ForecastOpportunitiesProps) {
  const oppQuery = useQuery({
    queryKey: ["forecast-opportunities-universe"],
    queryFn: getForecastOpportunities,
    staleTime: 60000,
  });

  const data = oppQuery.data;

  const handleInspect = (symbol: string) => {
    setSymbol(symbol);
    setView("forecast"); // Navigate back to Forecast Studio with this symbol
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
          <Flame size={14} /> Intelligence Scanner
        </span>
        <h2>Top Market Opportunities</h2>
        <p style={{ margin: "4px 0 0" }}>
          Automated 30-day forecast scanner scanning large-cap equities to surface top bullish and bearish opportunities.
        </p>
      </motion.section>

      {oppQuery.isFetching ? (
        <div className="glass-card wide empty-state" style={{ height: "300px" }}>
          <div>
            <div style={{ fontSize: "32px" }} className="animate-spin">🔄</div>
            <p style={{ marginTop: "12px" }}>Running prediction simulations across stock universes. This may take a few seconds...</p>
          </div>
        </div>
      ) : oppQuery.isError ? (
        <div className="glass-card wide empty-state" style={{ height: "300px" }}>
          <div>
            <div style={{ fontSize: "36px", color: "var(--accent-rose)" }}>⚠️</div>
            <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>
              Failed to scan market opportunities. Verify backend database connections.
              Cached scanner data will automatically reload.
            </p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* 2. Top Bullish Forecasts */}
          <motion.section
            className="glass-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <TrendingUp style={{ color: "#00c9a7" }} size={20} />
              <h3>Top Bullish Projections</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {data.bullish.map((opp: any) => (
                <div
                  key={opp.symbol}
                  onClick={() => handleInspect(opp.symbol)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--bg-surface)",
                    padding: "14px 18px",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  className="opp-row-interactive"
                >
                  <div>
                    <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>{opp.symbol}</strong>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Current: ${opp.current_price.toFixed(2)} → Target: ${opp.expected_price.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        background: "rgba(0, 201, 167, 0.08)",
                        color: "#00c9a7",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      +{opp.expected_change_pct.toFixed(2)}%
                    </span>
                    <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* 3. Top Bearish Projections */}
          <motion.section
            className="glass-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <TrendingDown style={{ color: "#ff6b8a" }} size={20} />
              <h3>Top Bearish Projections</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {data.bearish.map((opp: any) => (
                <div
                  key={opp.symbol}
                  onClick={() => handleInspect(opp.symbol)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--bg-surface)",
                    padding: "14px 18px",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  className="opp-row-interactive"
                >
                  <div>
                    <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>{opp.symbol}</strong>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Current: ${opp.current_price.toFixed(2)} → Target: ${opp.expected_price.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        background: "rgba(255, 107, 138, 0.08)",
                        color: "#ff6b8a",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {opp.expected_change_pct.toFixed(2)}%
                    </span>
                    <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </>
      ) : null}
    </div>
  );
}
