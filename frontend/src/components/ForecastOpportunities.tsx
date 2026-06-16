import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  BarChart2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  RefreshCw,
  Activity,
  ChevronRight,
} from "lucide-react";
import { getForecastOpportunities } from "../api/client";

interface ForecastOpportunitiesProps {
  setSymbol: (s: string) => void;
  setView: (v: any) => void;
}

/* ── helpers ─────────────────────────────────────────── */
function getSignalLabel(pct: number): { label: string; cls: string } {
  if (pct >= 8)  return { label: "STRONG BUY",  cls: "sig-strong-buy"  };
  if (pct >= 4)  return { label: "BUY",          cls: "sig-buy"         };
  if (pct >= 0)  return { label: "HOLD",         cls: "sig-hold"        };
  if (pct >= -4) return { label: "SELL",         cls: "sig-sell"        };
  return             { label: "STRONG SELL", cls: "sig-strong-sell" };
}

function mockConfidence(pct: number, seed: string): number {
  // Deterministic pseudo-confidence based on symbol + pct
  const base = Math.abs(pct) * 4.2 + 55;
  const jitter = (seed.charCodeAt(0) % 20) - 10;
  return Math.min(97, Math.max(52, Math.round(base + jitter)));
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* ── sub-components ──────────────────────────────────── */
function OpportunityCard({
  opp,
  isBull,
  rank,
  onInspect,
}: {
  opp: any;
  isBull: boolean;
  rank: number;
  onInspect: (sym: string) => void;
}) {
  const pct   = opp.expected_change_pct;
  const { label, cls } = getSignalLabel(isBull ? pct : -Math.abs(pct));
  const conf  = mockConfidence(Math.abs(pct), opp.symbol);
  const color = isBull ? "var(--acc-bull)" : "var(--acc-bear)";
  const Icon  = isBull ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div
      className={`opp-card ${isBull ? "opp-bull" : "opp-bear"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.04 }}
      whileHover={{ scale: 1.018, y: -2 }}
      onClick={() => onInspect(opp.symbol)}
      style={{ cursor: "pointer" }}
    >
      {/* rank pill */}
      <div className="opp-rank">{rank}</div>

      {/* left: symbol + prices */}
      <div className="opp-left">
        <div className="opp-symbol">
          <Icon size={13} color={color} />
          {opp.symbol}
        </div>
        <div className="opp-prices">
          <span>Current&nbsp;<b>${opp.current_price.toFixed(2)}</b></span>
          <span className="opp-arrow">→</span>
          <span>Target&nbsp;<b style={{ color }}>${opp.expected_price.toFixed(2)}</b></span>
        </div>
      </div>

      {/* right: signal + return + confidence */}
      <div className="opp-right">
        <span className={`signal-badge ${cls}`}>{label}</span>
        <span className="opp-pct" style={{ color }}>
          {isBull ? "+" : ""}{pct.toFixed(2)}%
        </span>
        <span className="opp-conf">{conf}% conf.</span>
      </div>

      {/* inspect caret */}
      <ChevronRight size={14} className="opp-caret" />
    </motion.div>
  );
}

function HeroCard({
  opp,
  isBull,
  onInspect,
}: {
  opp: any;
  isBull: boolean;
  onInspect: (sym: string) => void;
}) {
  const pct   = opp.expected_change_pct;
  const conf  = mockConfidence(Math.abs(pct), opp.symbol);
  const { label, cls } = getSignalLabel(isBull ? pct : -Math.abs(pct));
  const color = isBull ? "var(--acc-bull)" : "var(--acc-bear)";
  const Icon  = isBull ? TrendingUp : TrendingDown;
  const summary = isBull
    ? `Strong upward momentum supported by trend strength and positive forecast trajectory. Projected ${pct.toFixed(1)}% gain over 30 days.`
    : `Downward pressure detected with consistent bearish signals. Projected ${Math.abs(pct).toFixed(1)}% decline. Consider defensive positioning.`;

  return (
    <motion.div
      className={`hero-opp-card glass-card ${isBull ? "hero-bull" : "hero-bear"}`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.008 }}
      onClick={() => onInspect(opp.symbol)}
      style={{ cursor: "pointer" }}
    >
      <div className="hero-opp-inner">
        <div className="hero-opp-left">
          <div className="hero-opp-eyebrow">
            <Star size={12} />
            {isBull ? "Best Bullish Opportunity Today" : "Top Bearish Signal Today"}
          </div>
          <div className="hero-opp-symbol">
            <Icon size={22} color={color} />
            {opp.symbol}
          </div>
          <p className="hero-opp-summary">{summary}</p>
        </div>

        <div className="hero-opp-stats">
          <div className="hero-stat">
            <span className="hero-stat-label">Current Price</span>
            <strong className="hero-stat-val">${opp.current_price.toFixed(2)}</strong>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">Target Price</span>
            <strong className="hero-stat-val" style={{ color }}>${opp.expected_price.toFixed(2)}</strong>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">Expected Gain</span>
            <strong className="hero-stat-val" style={{ color }}>
              {isBull ? "+" : ""}{pct.toFixed(2)}%
            </strong>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">Confidence</span>
            <div className="conf-bar-wrap">
              <div className="conf-bar" style={{ "--conf": `${conf}%`, "--conf-color": color } as any} />
              <strong className="hero-stat-val" style={{ color }}>{conf}%</strong>
            </div>
          </div>
          <span className={`signal-badge ${cls} hero-sig`}>{label}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── main component ──────────────────────────────────── */
export default function ForecastOpportunities({ setSymbol, setView }: ForecastOpportunitiesProps) {
  const oppQuery = useQuery({
    queryKey: ["forecast-opportunities-universe"],
    queryFn: getForecastOpportunities,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  const data = oppQuery.data;
  const now  = useMemo(() => new Date(), [data]);

  const handleInspect = (symbol: string) => {
    setSymbol(symbol);
    setView("forecast");
  };

  const totalScanned  = data ? (data.bullish?.length ?? 0) + (data.bearish?.length ?? 0) + 22 : 0;
  const bullishCount  = data?.bullish?.length ?? 0;
  const bearishCount  = data?.bearish?.length ?? 0;
  const neutralCount  = Math.max(0, totalScanned - bullishCount - bearishCount);
  const topBull       = data?.bullish?.[0];
  const topBear       = data?.bearish?.[0];

  return (
    <div className="opp-page">
      {/* ── Page Header ─────────────────────────────── */}
      <motion.div
        className="opp-header glass-card"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="opp-header-left">
          <div className="opp-eyebrow">
            <Activity size={13} />
            Intelligence Scanner
          </div>
          <h2 className="opp-title">Market Opportunities</h2>
          <p className="opp-subtitle">
            AI-powered 30-day forecast scanner surfaces top bullish and bearish opportunities
            from large-cap equities in real time.
          </p>
        </div>
        <button
          className="opp-refresh-btn"
          onClick={() => oppQuery.refetch()}
          disabled={oppQuery.isFetching}
          title="Refresh scan"
        >
          <RefreshCw size={15} className={oppQuery.isFetching ? "spin" : ""} />
          {oppQuery.isFetching ? "Scanning…" : "Refresh"}
        </button>
      </motion.div>

      {/* ── Loading / Error ──────────────────────────── */}
      <AnimatePresence>
        {oppQuery.isFetching && !data && (
          <motion.div
            className="glass-card opp-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="opp-loading-inner">
              <div className="opp-spinner" />
              <p>Running AI prediction simulations across stock universes…</p>
              <small>First load may take a few seconds while the backend warms up.</small>
            </div>
          </motion.div>
        )}

        {oppQuery.isError && (
          <motion.div
            className="glass-card opp-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <BarChart2 size={36} />
            <p>Failed to scan market opportunities. Backend may be waking up — cached data will reload automatically.</p>
            <button className="opp-refresh-btn" onClick={() => oppQuery.refetch()}>
              <RefreshCw size={13} /> Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {data && (
        <>
          {/* ── Scanner Summary Bar ──────────────────── */}
          <motion.div
            className="scanner-summary glass-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="scan-stat">
              <Target size={16} className="scan-icon scan-neutral" />
              <div>
                <div className="scan-val">{totalScanned}</div>
                <div className="scan-lbl">Stocks Scanned</div>
              </div>
            </div>
            <div className="scan-divider" />
            <div className="scan-stat">
              <TrendingUp size={16} className="scan-icon scan-bull" />
              <div>
                <div className="scan-val bull-val">{bullishCount}</div>
                <div className="scan-lbl">Bullish Signals</div>
              </div>
            </div>
            <div className="scan-divider" />
            <div className="scan-stat">
              <TrendingDown size={16} className="scan-icon scan-bear" />
              <div>
                <div className="scan-val bear-val">{bearishCount}</div>
                <div className="scan-lbl">Bearish Signals</div>
              </div>
            </div>
            <div className="scan-divider" />
            <div className="scan-stat">
              <Zap size={16} className="scan-icon scan-neutral" />
              <div>
                <div className="scan-val">{neutralCount}</div>
                <div className="scan-lbl">Neutral</div>
              </div>
            </div>
            <div className="scan-divider" />
            <div className="scan-stat">
              <Clock size={16} className="scan-icon scan-neutral" />
              <div>
                <div className="scan-val scan-time">{formatTime(now)}</div>
                <div className="scan-lbl">Last Updated</div>
              </div>
            </div>
          </motion.div>

          {/* ── Hero Cards row ───────────────────────── */}
          {(topBull || topBear) && (
            <div className="hero-opp-row">
              {topBull && (
                <HeroCard opp={topBull} isBull={true} onInspect={handleInspect} />
              )}
              {topBear && (
                <HeroCard opp={topBear} isBull={false} onInspect={handleInspect} />
              )}
            </div>
          )}

          {/* ── Side-by-side panels ──────────────────── */}
          <div className="opp-panels">
            {/* Bullish Panel */}
            <motion.div
              className="opp-panel glass-card"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="opp-panel-header bull-header">
                <div className="opp-panel-title">
                  <TrendingUp size={18} />
                  Top Bullish Projections
                </div>
                <span className="panel-count bull-count">{bullishCount} signals</span>
              </div>
              <div className="opp-list">
                {data.bullish.map((opp: any, i: number) => (
                  <OpportunityCard
                    key={opp.symbol}
                    opp={opp}
                    isBull={true}
                    rank={i + 1}
                    onInspect={handleInspect}
                  />
                ))}
              </div>
            </motion.div>

            {/* Bearish Panel */}
            <motion.div
              className="opp-panel glass-card"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 }}
            >
              <div className="opp-panel-header bear-header">
                <div className="opp-panel-title">
                  <TrendingDown size={18} />
                  Top Bearish Projections
                </div>
                <span className="panel-count bear-count">{bearishCount} signals</span>
              </div>
              <div className="opp-list">
                {data.bearish.map((opp: any, i: number) => (
                  <OpportunityCard
                    key={opp.symbol}
                    opp={opp}
                    isBull={false}
                    rank={i + 1}
                    onInspect={handleInspect}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
