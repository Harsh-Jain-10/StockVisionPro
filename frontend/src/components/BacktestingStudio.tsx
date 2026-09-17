import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  History,
  Play,
  Bookmark,
  RefreshCw,
  Trash2,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Zap,
  DollarSign,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  runBacktest,
  getSavedBacktests,
  saveBacktest,
  deleteSavedBacktest,
  rerunSavedBacktest,
  getQuote,
  type SavedBacktestItem,
  type UserProfile,
} from "../api/client";

interface BacktestingStudioProps {
  symbol: string;
  setSymbol: (s: string) => void;
  setView: (v: any) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  isDark?: boolean;
}

export default function BacktestingStudio({
  symbol: initialSymbol,
  setSymbol,
  setView,
  user,
  onOpenAuth,
  isDark = false,
}: BacktestingStudioProps) {
  const qc = useQueryClient();
  const [targetSymbol, setTargetSymbol] = useState(initialSymbol || "NVDA");
  const [strategy, setStrategy] = useState<"sma_crossover" | "rsi_oversold">("sma_crossover");
  const [period, setPeriod] = useState("2y");

  // SMA parameters
  const [shortWindow, setShortWindow] = useState(20);
  const [longWindow, setLongWindow] = useState(50);

  // RSI parameters
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [oversold, setOversold] = useState(30);
  const [overbought, setOverbought] = useState(70);

  // Strategy naming for save
  const [strategyName, setStrategyName] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [rerunningId, setRerunningId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Live quote query
  const quoteQuery = useQuery({
    queryKey: ["quote", targetSymbol],
    queryFn: () => getQuote(targetSymbol),
    enabled: !!targetSymbol.trim(),
    staleTime: 15000,
  });
  const currentQuote = quoteQuery.data;

  // Saved backtests query
  const savedQuery = useQuery({
    queryKey: ["saved-backtests"],
    queryFn: getSavedBacktests,
    enabled: !!user,
    staleTime: 10000,
  });
  const savedList = savedQuery.data || [];

  // Run backtest mutation
  const runMutation = useMutation({
    mutationFn: async () => {
      const params =
        strategy === "sma_crossover"
          ? { short_window: Number(shortWindow), long_window: Number(longWindow) }
          : { rsi_period: Number(rsiPeriod), oversold: Number(oversold), overbought: Number(overbought) };
      return await runBacktest(targetSymbol.toUpperCase().trim(), strategy, params);
    },
  });

  const backtestResult = runMutation.data;

  // Save backtest mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        onOpenAuth();
        throw new Error("Authentication required");
      }
      const params =
        strategy === "sma_crossover"
          ? {
              short_window: Number(shortWindow),
              long_window: Number(longWindow),
              name: strategyName || `${targetSymbol} SMA (${shortWindow}/${longWindow})`,
            }
          : {
              rsi_period: Number(rsiPeriod),
              oversold: Number(oversold),
              overbought: Number(overbought),
              name: strategyName || `${targetSymbol} RSI (${oversold}/${overbought})`,
            };

      return await saveBacktest(
        targetSymbol.toUpperCase().trim(),
        strategy,
        params,
        backtestResult || undefined
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-backtests"] });
      setSaveSuccessMsg("Strategy saved to your account!");
      showToast("✓ Strategy saved to My Strategies!");
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    },
  });

  // Delete saved backtest mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSavedBacktest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-backtests"] });
      showToast("Strategy removed.");
    },
  });

  // Rerun saved backtest mutation
  const handleRerun = async (item: SavedBacktestItem) => {
    try {
      setRerunningId(item.id);
      const res = await rerunSavedBacktest(item.id);
      qc.invalidateQueries({ queryKey: ["saved-backtests"] });
      const ret = res.last_run_result?.total_return_pct ?? res.total_return_pct;
      showToast(`✓ Refreshed ${item.ticker}: ${ret != null ? ret.toFixed(1) : 0}% return`);
    } catch (err: any) {
      showToast("Failed to rerun strategy: " + (err.message || "Network error"));
    } finally {
      setRerunningId(null);
    }
  };

  // Popular tickers
  const popularTickers = ["NVDA", "AAPL", "MSFT", "TSLA", "SPY", "AMZN", "META", "GOOGL"];

  const handleLoadStrategy = (item: SavedBacktestItem) => {
    setTargetSymbol(item.ticker);
    setSymbol(item.ticker);
    if (item.strategy_type === "sma_crossover" || item.strategy_type === "rsi_oversold") {
      setStrategy(item.strategy_type);
    }
    if (item.parameters) {
      if (item.parameters.short_window) setShortWindow(item.parameters.short_window);
      if (item.parameters.long_window) setLongWindow(item.parameters.long_window);
      if (item.parameters.rsi_period) setRsiPeriod(item.parameters.rsi_period);
      if (item.parameters.oversold) setOversold(item.parameters.oversold);
      if (item.parameters.overbought) setOverbought(item.parameters.overbought);
    }
    showToast(`Loaded ${item.ticker} strategy settings into Studio!`);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Bento */}
      <div className="glass-card flex flex-col md:flex-row md:items-center md:justify-between gap-5 p-6 border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5">
            <span className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <History size={13} />
            </span>
            <span>Algorithmic Backtesting Lab</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Quantitative Strategy Backtester
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Simulate moving average crossovers and RSI mean reversion algorithms against historical daily data. Save custom strategies to your account and track forward returns.
          </p>
        </div>

        {/* User Status / Action */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <ShieldCheck size={15} />
              <span>Workspace Connected: {user.email.split("@")[0]}</span>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Bookmark size={14} />
              <span>Sign In to Save Strategies</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Studio Controls (5 cols) & Results/Manager (7 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Strategy Configuration (5 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827] shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white m-0">Strategy Parameters</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">Choose rule parameters &amp; timeframe</p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                CONFIG
              </span>
            </div>

            {/* Symbol Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Target Ticker / Asset
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="field uppercase font-mono font-bold text-base pl-3 pr-20 py-2.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white"
                  value={targetSymbol}
                  onChange={(e) => {
                    const s = e.target.value.toUpperCase().trim();
                    setTargetSymbol(s);
                    setSymbol(s);
                  }}
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

              {/* Popular Tickers */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] text-slate-400 mr-1">Popular:</span>
                {popularTickers.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTargetSymbol(t);
                      setSymbol(t);
                    }}
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

              {/* Live quote preview */}
              {currentQuote && (
                <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between mt-1">
                  <div>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block">
                      {currentQuote.name || targetSymbol}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {currentQuote.exchange || "US"} • {currentQuote.currency || "USD"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white block">
                      ${currentQuote.price?.toFixed(2)}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        (currentQuote.change_pct || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {(currentQuote.change_pct || 0) >= 0 ? "+" : ""}
                      {(currentQuote.change_pct || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Strategy Model Toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Algorithm Strategy Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStrategy("sma_crossover")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    strategy === "sma_crossover"
                      ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/40 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Zap size={15} className="text-blue-500" />
                    <strong className="text-xs text-slate-900 dark:text-white">SMA Crossover</strong>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Trend-following Golden / Death cross
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStrategy("rsi_oversold")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    strategy === "rsi_oversold"
                      ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/40 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Target size={15} className="text-purple-500" />
                    <strong className="text-xs text-slate-900 dark:text-white">RSI Reversal</strong>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Oversold dip-buy &amp; overbought exit
                  </span>
                </button>
              </div>
            </div>

            {/* Dynamic Parameter Sliders / Inputs */}
            {strategy === "sma_crossover" ? (
              <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Fast SMA Window (Days)
                  </label>
                  <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                    {shortWindow}d
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={1}
                  value={shortWindow}
                  onChange={(e) => setShortWindow(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />

                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Slow SMA Window (Days)
                  </label>
                  <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                    {longWindow}d
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={300}
                  step={5}
                  value={longWindow}
                  onChange={(e) => setLongWindow(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            ) : (
              <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    RSI Period (Lookback)
                  </label>
                  <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                    {rsiPeriod}d
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={rsiPeriod}
                  onChange={(e) => setRsiPeriod(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />

                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Oversold Buy Threshold
                  </label>
                  <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    &lt; {oversold}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={45}
                  value={oversold}
                  onChange={(e) => setOversold(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />

                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Overbought Sell Threshold
                  </label>
                  <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                    &gt; {overbought}
                  </span>
                </div>
                <input
                  type="range"
                  min={55}
                  max={90}
                  value={overbought}
                  onChange={(e) => setOverbought(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>
            )}

            {/* Timeframe Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Historical Simulation Window
              </label>
              <div className="flex items-center gap-2">
                {["1y", "2y", "5y"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                      period === p
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Execute Button */}
            <button
              type="button"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || !targetSymbol.trim()}
              className="py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {runMutation.isPending ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Computing Simulation...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Execute Backtest for {targetSymbol}</span>
                </>
              )}
            </button>

            {runMutation.isError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>
                  {(runMutation.error as any)?.response?.data?.detail ||
                    (runMutation.error as any)?.message ||
                    "Backtest execution failed. Ensure symbol has historical data."}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Simulation Results & Saved Strategies Manager (7 cols) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          {/* Results Bento */}
          {backtestResult ? (
            <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827] shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white m-0">
                      Simulation Results ({backtestResult.symbol})
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
                      Starting capital: ${backtestResult.initial_capital?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full font-mono font-bold text-xs border ${
                      (backtestResult.total_return_pct || 0) >= 0
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                        : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    {(backtestResult.total_return_pct || 0) >= 0 ? "+" : ""}
                    {(backtestResult.total_return_pct || 0).toFixed(2)}% Strategy Return
                  </span>
                </div>
              </div>

              {/* KPI Cards Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                    Buy &amp; Hold
                  </span>
                  <span
                    className={`text-base font-bold font-mono mt-0.5 block ${
                      (backtestResult.buy_and_hold_return_pct || 0) >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {(backtestResult.buy_and_hold_return_pct || 0) >= 0 ? "+" : ""}
                    {(backtestResult.buy_and_hold_return_pct || 0).toFixed(2)}%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                    Alpha vs Benchmark
                  </span>
                  {(() => {
                    const alpha =
                      (backtestResult.total_return_pct || 0) -
                      (backtestResult.buy_and_hold_return_pct || 0);
                    const isPositive = alpha >= 0;
                    return (
                      <span
                        className={`text-base font-bold font-mono mt-0.5 block ${
                          isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {alpha.toFixed(2)}%
                      </span>
                    );
                  })()}
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                    Win Rate
                  </span>
                  <span className="text-base font-bold font-mono mt-0.5 block text-slate-900 dark:text-white">
                    {(backtestResult.win_rate_pct || 0).toFixed(1)}%
                    <small className="text-slate-400 font-normal text-[10px] ml-1">
                      ({backtestResult.winning_trades || 0}W / {backtestResult.losing_trades || 0}L)
                    </small>
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                    Max Drawdown
                  </span>
                  <span className="text-base font-bold font-mono mt-0.5 block text-rose-500">
                    {(backtestResult.max_drawdown_pct || 0).toFixed(2)}%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                    Sharpe Ratio
                  </span>
                  <span className="text-base font-bold font-mono mt-0.5 block text-slate-900 dark:text-white">
                    {backtestResult.sharpe_ratio != null ? backtestResult.sharpe_ratio.toFixed(2) : "N/A"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                    Ending Equity
                  </span>
                  <span className="text-base font-bold font-mono mt-0.5 block text-blue-600 dark:text-blue-400">
                    ${(backtestResult.final_capital || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Save This Strategy Action */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900 dark:text-blue-200">
                    <Bookmark size={14} className="text-blue-600 dark:text-blue-400" />
                    <span>Save This Strategy Configuration</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                    Store this backtest to rerun against live market updates with one click.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
                >
                  <Bookmark size={14} />
                  <span>{saveMutation.isPending ? "Saving..." : "Save Strategy"}</span>
                </button>
              </div>

              {saveSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Recent Trade History Log */}
              {backtestResult.trades && backtestResult.trades.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Simulated Trade Log ({backtestResult.trades.length} Executions)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Latest 6 Trades Shown</span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Action</th>
                          <th className="p-2.5">Price</th>
                          <th className="p-2.5">Shares</th>
                          <th className="p-2.5 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {backtestResult.trades.slice(-6).map((t: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 text-slate-600 dark:text-slate-300">{t.date}</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.type === "buy"
                                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                    : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                                }`}
                              >
                                {t.type?.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-800 dark:text-slate-200">${t.price?.toFixed(2)}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400">
                              {t.shares?.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                              ${t.value?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-8 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827] shadow-sm flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Play size={24} />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white m-0">
                Simulation Engine Ready
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm m-0">
                Select your parameters on the left and click "Execute Backtest" to generate total return, Sharpe ratio, win rate, and simulated execution logs.
              </p>
            </div>
          )}

          {/* "My Strategies" Manager Bento */}
          <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Bookmark size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white m-0">
                    My Saved Strategies
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
                    Your personal quantitative strategy library
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {savedList.length} Saved
              </span>
            </div>

            {!user ? (
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-center flex flex-col items-center justify-center gap-3">
                <Bookmark size={22} className="text-slate-400" />
                <div className="max-w-md">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 m-0">
                    Sign in to save and monitor strategies
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0">
                    Create an account to store backtest setups, track institutional performance over time, and rerun them against live updates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Sign In / Create Free Account
                </button>
              </div>
            ) : savedList.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                  No strategies saved yet. Run any backtest above and click "Save Strategy" to track it here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {savedList.map((item) => {
                  const lastRet = item.last_run_result?.total_return_pct ?? null;
                  const isPos = (lastRet || 0) >= 0;
                  const isRerunning = rerunningId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-blue-400 dark:hover:border-blue-600/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-base font-black text-slate-900 dark:text-white font-mono">
                            {item.ticker}
                          </strong>
                          <span className="text-[11px] px-2 py-0.5 rounded font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                            {item.strategy_type === "sma_crossover" ? "SMA Cross" : "RSI Reversal"}
                          </span>
                          {lastRet != null && (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                                isPos
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                  : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                              }`}
                            >
                              {isPos ? "+" : ""}
                              {lastRet.toFixed(1)}% Return
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 flex-wrap">
                          {item.parameters && (
                            <span>
                              {item.strategy_type === "sma_crossover"
                                ? `Fast: ${item.parameters.short_window || 20}d • Slow: ${item.parameters.long_window || 50}d`
                                : `RSI: ${item.parameters.rsi_period || 14}d • Buy: <${item.parameters.oversold || 30}`}
                            </span>
                          )}
                          <span>•</span>
                          <span className="text-[11px] text-slate-400">
                            Saved {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Rerun Button */}
                        <button
                          type="button"
                          onClick={() => handleRerun(item)}
                          disabled={isRerunning}
                          title="Rerun against live market data"
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <RefreshCw size={13} className={isRerunning ? "animate-spin text-blue-500" : ""} />
                          <span>{isRerunning ? "Rerunning..." : "Rerun"}</span>
                        </button>

                        {/* Load Settings Button */}
                        <button
                          type="button"
                          onClick={() => handleLoadStrategy(item)}
                          title="Load into configuration panel"
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer"
                        >
                          Load
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(item.id)}
                          title="Delete saved strategy"
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
        </div>
      </div>
    </div>
  );
}
