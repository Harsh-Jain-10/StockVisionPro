# StockVision Pro — AI Agent Build Brief
> **Version:** 2.0 | **Date:** May 2026 | **Stack:** React + Vite | **Port:** 5173

---

## ⚡ Agent Instructions — Read This First

You are an AI coding agent working on **StockVision Pro**, a live financial analytics dashboard built with React + Vite. Your job is to:

1. **Fix all broken features** listed in Section 3 — in order, one by one
2. **Build all new features** listed in Section 4 — after all bugs are resolved
3. **Follow all technical rules** in Section 5 at all times
4. **Verify every item** in the final checklist in Section 7 before stopping

> Do NOT start new features until all bugs are fixed. Do NOT skip steps. Do NOT leave silent failures.

---

## 1. Project Context

| Property | Value |
|---|---|
| Framework | React + Vite |
| Dev Server | `127.0.0.1:5173` |
| Charts | Recharts (or existing chart lib — do not add a second one) |
| AI API | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Market Data | Yahoo Finance / Alpha Vantage or existing API in project |
| State | React `useState` + `useEffect` only (no Redux/Zustand unless already present) |
| Styling | CSS custom properties — all colours must be variables, no hardcoded hex values in components |
| Env Vars | All API keys via `import.meta.env.VITE_*` — never hardcode keys |

---

## 2. Current Feature Audit

### ✅ Working — Keep As-Is

These features are confirmed working. Do not modify them unless a new feature requires it.

- **Live Ticker Marquee** — scrolling real-time prices in the header
- **Dashboard Index Cards** — S&P 500, NASDAQ, Dow Jones, Nifty 50, Sensex, Gold, BTC
- **Top Movers** — live % change list
- **Sector Heatmap** — color-coded green/red sectors
- **Fear & Greed Meter** — donut gauge with value
- **Stock Lab — Candlestick Chart** — renders historical OHLC data
- **Stock Lab — AI Signal Card** — BUY/HOLD/SELL with strength rating
- **Stock Lab — Technicals Panel** — RSI, MACD, Bollinger Bands, SMA values
- **Stock Lab — AI Analyst Summary** — text block with Claude-generated analysis
- **Stock Lab — 30-Day Forecast Chart** — line chart with bull/bear range
- **AI Chatbot** — StockVision AI responding to user queries

### ❌ Broken — Must Fix (Section 3)

| Feature | Symptom | Fix Section |
|---|---|---|
| Comparison Chart | Chart area is completely blank | 3.1 |
| Backtesting Engine | Returns "Failed to run backtest." | 3.2 |
| News Titles | All cards show "Untitled" | 3.3 |
| Sentiment Gauge | Stuck at 0.00 / Neutral 100% | 3.4 |
| Portfolio Submit Button | Freezes/spins indefinitely after click | 3.5 |

---

## 3. Bug Fixes

### 3.1 Comparison Chart — Blank Chart Area

**Symptom:** Comparison Lab page accepts tickers (e.g. `RELIANCE.NS`, `TATAMOTORS.NS`) but chart renders blank.

**Root Cause:** Data is likely fetched but not normalised to a common base, so Y-axis scale collapses. Or the chart component receives undefined/empty arrays. Or series colour mapping is missing.

**Fix — implement every step below:**

1. Fetch **90 days of historical close prices** for each ticker in the comparison list.

2. **Normalise each series to base 100:**
   ```js
   const normalised = prices.map(p => (p / prices[0]) * 100);
   ```
   This puts all stocks on the same Y-axis regardless of absolute price.

3. **Validate before render** — log arrays to console, confirm non-empty:
   ```js
   console.log('[CompareChart] series data:', normalisedSeries);
   if (!normalisedSeries || normalisedSeries.length === 0) {
     // show fallback UI, do not render chart
   }
   ```

4. Assign a **distinct colour per ticker** from this palette:
   ```js
   const COLOURS = ['#4361ee', '#f72585', '#7209b7', '#3a0ca3', '#4cc9f0'];
   ```

5. Add a **fallback message** inside the chart area when data is empty:
   ```
   Unable to load comparison data. Check ticker symbols or try again.
   ```

6. Add **time-range selector buttons** above the chart: `1W` `1M` `3M` `6M` — each refetches and re-normalises for that range.

7. **Test with:** `RELIANCE.NS` vs `TATAMOTORS.NS`, `AAPL` vs `MSFT`, `BTC-USD` vs `ETH-USD`.

---

### 3.2 Backtesting Engine — "Failed to run backtest."

**Symptom:** SMA Crossover (20/50) on AAPL shows "Failed to run backtest." with no output.

**Root Cause:** Historical data array is shorter than the slow SMA period (50 days), causing `NaN` values. The engine throws silently and shows the generic error string.

**Fix — implement every step below:**

1. Add a **data length guard** before any strategy runs:
   ```js
   if (historicalData.length < slowPeriod + 10) {
     setError(`Not enough data. Need at least ${slowPeriod + 10} trading days.`);
     return;
   }
   ```

2. Ensure the backtest fetches a **minimum of 252 trading days** (1 year) of daily OHLCV data. Do not use weekly or monthly candles.

3. Wrap all backtest logic in **try-catch** and surface the real error:
   ```js
   try {
     const result = runStrategy(data, params);
     setResult(result);
   } catch (err) {
     console.error('[Backtest] error:', err);
     setError(`Backtest failed: ${err.message}`);
   }
   ```

4. After a successful run, display these **result metrics** in a card below the Run button:
   - Total Return %
   - Number of Trades
   - Win Rate %
   - Max Drawdown %
   - Sharpe Ratio
   - Equity Curve line chart (portfolio value over the test period)

5. Add a second strategy to the dropdown: **RSI Oversold/Overbought** (buy when RSI < 30, sell when RSI > 70).

---

### 3.3 News Section — All Titles Show "Untitled"

**Symptom:** Every news card in Stock Lab displays "Untitled · Financial News · neutral".

**Root Cause:** Field accessor mismatch. Code reads `article.title` but API may return `article.headline`, `article.name`, or a nested field.

**Fix — implement every step below:**

1. **Log the raw API response** to console and check actual field names:
   ```js
   console.log('[News] raw article:', article);
   ```

2. Use a **fallback chain** for the title:
   ```js
   const title = article.title || article.headline || article.name 
                 || article.content?.title || 'No title available';
   ```

3. Make each news card **clickable** — open the original article URL in a new tab:
   ```jsx
   <a href={article.url || article.link} target="_blank" rel="noopener noreferrer">
   ```

4. Display **source name + publication date** below the title.

5. If the news API returns no results or is rate-limited, show:
   ```
   News unavailable. API limit may have been reached. Try again later.
   ```
   Do not render empty "Untitled" cards.

---

### 3.4 Sentiment Gauge — Stuck at 0.00 / Neutral 100%

**Symptom:** Sentiment donut chart always shows 0.00 with Neutral 100% regardless of stock.

**Root Cause:** No sentiment computation is happening. Likely blocked by the broken news titles (Section 3.3 — no text to analyse).

**Fix — implement every step below:**

1. **Fix Section 3.3 first.** Sentiment requires real headline text.

2. For each news headline, call the Claude API:
   ```js
   const prompt = `Classify the sentiment of this financial news headline as exactly one of: positive, negative, or neutral. Respond with only the single word. Headline: "${headline}"`;
   ```

3. **Aggregate results:**
   ```js
   const score = (positiveCount - negativeCount) / totalArticles; // range: -1 to +1
   ```

4. Update the donut chart with real `positive %`, `negative %`, `neutral %` values.

5. Display the score rounded to 2 decimal places.

6. If no news available, show: `"Sentiment data unavailable"` — not a 0.00 gauge.

---

### 3.5 Paper Trading — Submit Button Freezes

**Symptom:** "Submit Buy Order" button shows loading spinner indefinitely. Order never completes. Button cannot be clicked again.

**Root Cause:** Async handler never resolves (missing `await`, unhandled promise, or API timeout). Loading state is never reset in the error path.

**Fix — implement every step below:**

1. **Always reset loading state** using `finally`:
   ```js
   try {
     setLoading(true);
     const price = await fetchLivePrice(symbol);
     executeOrder(symbol, qty, price, side);
     showToast('success', `Trade executed: ${side} ${qty} ${symbol} at $${price}`);
   } catch (err) {
     showToast('error', `Order failed: ${err.message}`);
   } finally {
     setLoading(false); // ALWAYS runs, even on error
   }
   ```

2. Add a **10-second fetch timeout**:
   ```js
   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), 10000);
   const res = await fetch(url, { signal: controller.signal });
   clearTimeout(timeout);
   ```

3. **After successful BUY:** deduct cost from Cash Balance, add to Current Holdings table, log to Recent Transactions with: timestamp, symbol, quantity, price, order type.

4. **After successful SELL:** remove/reduce holding, return cash, log transaction.

5. Show **toast notifications:**
   - Green: `"Trade executed: Bought 1 AAPL at $277.10"`
   - Red: `"Order failed: [reason]"`

6. Add a **Portfolio Value Over Time** line chart that updates after each trade showing: `cash + (holdings × current price)` as a running total.

7. Add a **Holdings Table** with columns: Symbol | Shares | Avg Buy Price | Current Price | P&L ($) | P&L (%). Refresh current prices every 30 seconds.

---

## 4. New Features to Build

> Only start these after all Section 3 bugs are confirmed fixed and tested.

---

### 4.1 Watchlist with Live Prices and Sparklines

**Page:** Existing Watchlist page in left sidebar nav.

**Build the following:**

- Search bar at top — user types a ticker, presses Add → ticker appears in list
- Each row shows:
  - Ticker symbol (bold)
  - Company name
  - Current live price
  - Daily change: amount + % (green if positive, red if negative)
  - 7-day mini sparkline (line chart, no axes, trend shape only — use Recharts `<Sparkline>` or a `<LineChart>` with all axes hidden)
  - Remove ✕ button
- **Auto-refresh every 30 seconds.** Show `"Last updated: Xs ago"` counter.
- Clicking any row → navigate to that stock's Stock Lab page
- **Persist watchlist in `localStorage`** — survives page refresh
- Empty state: `"Your watchlist is empty. Search for a stock above to add it."`
- Max 20 tickers. On overflow: `"Watchlist limit reached (20 stocks)."`

```js
// localStorage pattern
const saveWatchlist = (tickers) => {
  try {
    localStorage.setItem('sv_watchlist', JSON.stringify(tickers));
  } catch (e) {
    console.error('[Watchlist] localStorage write failed:', e);
  }
};

const loadWatchlist = () => {
  try {
    return JSON.parse(localStorage.getItem('sv_watchlist') || '[]');
  } catch (e) {
    return [];
  }
};
```

---

### 4.2 Browser Push Notifications for Price Alerts

**Page:** Existing Alerts page.

**Build the following:**

- On page load, check `Notification.permission`. If `'default'`, show button: **"Enable Notifications"** that calls `Notification.requestPermission()`.
- If permission is `'denied'`, show: `"Browser notifications blocked. Alerts will appear in history only."`
- **Every 60 seconds**, check all saved alerts against the latest live price of each ticker:
  ```js
  useEffect(() => {
    const interval = setInterval(checkAlerts, 60000);
    return () => clearInterval(interval);
  }, [alerts]);
  ```
- When condition is triggered, fire:
  ```js
  new Notification('StockVision Alert', {
    body: `${symbol} crossed ${condition} ${threshold} — Current: ${currentPrice}`,
    icon: '/favicon.ico'
  });
  ```
- Also log to Alert History panel with: timestamp, symbol, trigger condition, trigger price.
- Add **Dismiss** button per alert in history.
- **Alert types in dropdown:**
  - Price Above
  - Price Below
  - RSI Above 70 (overbought)
  - RSI Below 30 (oversold)

---

### 4.3 Economic Calendar Widget

**Page:** Dashboard — add below the Sector Heatmap section.

**Build the following:**

- Table with columns: Date | Event | Region | Impact
- Impact badges: `High` (red), `Medium` (orange), `Low` (grey)
- Highlight rows within the next 7 days with a **yellow left border**
- **Hardcoded data (minimum 15 events):**

```js
const ECONOMIC_EVENTS = [
  { date: '2026-05-07', event: 'Federal Reserve Interest Rate Decision', region: 'US', impact: 'High' },
  { date: '2026-05-09', event: 'US Non-Farm Payrolls', region: 'US', impact: 'High' },
  { date: '2026-05-13', event: 'US CPI Inflation Release', region: 'US', impact: 'High' },
  { date: '2026-05-14', event: 'RBI Monetary Policy Committee Decision', region: 'India', impact: 'High' },
  { date: '2026-05-15', event: 'US Retail Sales Data', region: 'US', impact: 'Medium' },
  { date: '2026-05-20', event: 'FOMC Meeting Minutes Release', region: 'US', impact: 'High' },
  { date: '2026-05-22', event: 'India GDP Quarterly Release', region: 'India', impact: 'High' },
  { date: '2026-05-28', event: 'ECB Interest Rate Decision', region: 'EU', impact: 'High' },
  { date: '2026-06-01', event: 'US ISM Manufacturing PMI', region: 'US', impact: 'Medium' },
  { date: '2026-06-04', event: 'US Unemployment Rate', region: 'US', impact: 'High' },
  { date: '2026-06-06', event: 'India Industrial Production (IIP)', region: 'India', impact: 'Medium' },
  { date: '2026-06-10', event: 'US PPI Inflation Data', region: 'US', impact: 'Medium' },
  { date: '2026-06-15', event: 'US Federal Reserve Meeting', region: 'US', impact: 'High' },
  { date: '2026-06-18', event: 'Bank of Japan Policy Decision', region: 'Japan', impact: 'High' },
  { date: '2026-06-25', event: 'US Q2 GDP Advance Estimate', region: 'US', impact: 'High' },
];
```

- If a free API is available (Alpha Vantage earnings calendar etc.), fetch live data and replace hardcoded. Always fall back to hardcoded if API fails.
- Show note below table: `"Data is for informational purposes only. Verify dates with official sources."`

---

### 4.4 Dark Mode Toggle

**Scope:** Global — affects every component in the application.

**Build the following:**

1. Add a 🌙 / ☀️ icon toggle button in the **header bar**, right side, next to the LIVE badge.

2. Implement using **CSS custom properties**. In `index.css` or `App.css`:
   ```css
   :root {
     --bg-primary: #f0f2ff;
     --bg-card: #ffffff;
     --text-primary: #1a1a2e;
     --text-secondary: #555577;
     --accent: #4361ee;
     --accent-teal: #4cc9f0;
     --positive: #00c853;
     --negative: #ff1744;
     --border: #e0e4ff;
   }

   [data-theme='dark'] {
     --bg-primary: #0d0d1a;
     --bg-card: #1a1a2e;
     --text-primary: #e0e0ff;
     --text-secondary: #9090bb;
     --accent: #4361ee;
     --accent-teal: #4cc9f0;
     --positive: #00e676;
     --negative: #ff1744;
     --border: #2a2a4a;
   }
   ```

3. Apply theme on `<body>` or `<div id="root">`:
   ```js
   document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
   ```

4. **Persist in localStorage:**
   ```js
   // On toggle
   localStorage.setItem('sv_theme', isDark ? 'dark' : 'light');

   // On app load (before first render to avoid flash)
   const savedTheme = localStorage.getItem('sv_theme') || 'light';
   document.documentElement.setAttribute('data-theme', savedTheme);
   ```

5. All components — sidebar, header, ticker, cards, tables, charts, modals — must use `var(--bg-card)`, `var(--text-primary)` etc. **Zero hardcoded hex values** in component styles.

6. Chart series colours and candlestick colours must also switch in dark mode.

---

### 4.5 AI-Powered Screener with Bullish Stock Suggestions

**Page:** Existing Screener page.

**Build the following:**

1. Add a prominent button at the top: **"🤖 Ask AI: Find Bullish NSE Stocks Today"**

2. When clicked:
   - Fetch current `price`, `daily % change`, `RSI`, `MACD signal` for this hardcoded NSE universe:
     ```js
     const NSE_UNIVERSE = [
       'RELIANCE.NS','TCS.NS','INFY.NS','HDFCBANK.NS','ICICIBANK.NS',
       'WIPRO.NS','BAJFINANCE.NS','TATAMOTORS.NS','SUNPHARMA.NS','MARUTI.NS',
       'LTIM.NS','HINDUNILVR.NS','ONGC.NS','NTPC.NS','POWERGRID.NS',
       'COALINDIA.NS','SBIN.NS','AXISBANK.NS','NESTLEIND.NS','TITAN.NS'
     ];
     ```
   - Send all data in **one Claude API call:**
     ```js
     const prompt = `You are a stock screener AI. Based on the following technical data for NSE stocks, identify the top 3-5 most bullish candidates and explain why each looks promising. Format your response as a ranked numbered list with 2-3 sentences of reasoning per stock. Data: ${JSON.stringify(stockData)}`;
     ```
   - Show **loading spinner** while API call is in progress
   - Display Claude's response in a styled card below the button

3. Keep **manual screener filters** alongside the AI button:
   - RSI range (e.g. 30–50 for potential recovery)
   - Daily % change threshold (e.g. > +1%)
   - Market filter: NSE / US / Crypto
   - Results in a sortable table

4. Every AI output must end with: `"AI-generated analysis for research purposes only. Not financial advice."`

---

### 4.6 Candlestick Pattern Recognition on Chart

**Page:** Stock Lab — add labels directly on the interactive candlestick chart.

**Build the following:**

**Pattern detection logic** (run on last 30 candles of OHLC data):

```js
// Doji — open and close within 0.1% of each other
const isDoji = (c) => Math.abs(c.close - c.open) / c.open < 0.001;

// Hammer — lower shadow >= 2x body, tiny upper shadow, after downtrend
const isHammer = (c, prev) => {
  const body = Math.abs(c.close - c.open);
  const lowerShadow = Math.min(c.open, c.close) - c.low;
  const upperShadow = c.high - Math.max(c.open, c.close);
  return lowerShadow >= 2 * body && upperShadow <= 0.1 * body && prev.close > c.close;
};

// Shooting Star — upper shadow >= 2x body, tiny lower shadow, after uptrend
const isShootingStar = (c, prev) => {
  const body = Math.abs(c.close - c.open);
  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;
  return upperShadow >= 2 * body && lowerShadow <= 0.1 * body && prev.close < c.close;
};

// Bullish Engulfing — green candle body fully wraps previous red candle body
const isBullishEngulfing = (c, prev) =>
  c.close > c.open && prev.close < prev.open &&
  c.open < prev.close && c.close > prev.open;

// Bearish Engulfing — red candle body fully wraps previous green candle body
const isBearishEngulfing = (c, prev) =>
  c.close < c.open && prev.close > prev.open &&
  c.open > prev.close && c.close < prev.open;
```

**Rendering:**
- Bullish pattern → upward green arrow ↑ below that candle
- Bearish pattern → downward red arrow ↓ above that candle
- Hover tooltip on each arrow showing pattern name + date

**Controls:**
- Toggle switch above chart: `"Show Pattern Labels"` — default ON

**Pattern Summary Panel** below chart:
- List all detected patterns in current view: Date | Pattern Name | Bullish/Bearish

---

## 5. Technical Rules

Follow these rules across every fix and every new feature:

| Rule | Detail |
|---|---|
| **Error Handling** | Every API call needs `try-catch`. Every error must show a visible UI message. Zero silent failures. |
| **Loading States** | Every async operation shows a spinner or skeleton. No blank white areas while loading. |
| **API Caching** | Cache all market data for minimum 60 seconds. No duplicate calls within the cache window. |
| **AI Disclaimer** | Every Claude API response must end with: `"AI-generated analysis for research purposes only. Not financial advice."` |
| **localStorage** | Always wrap `JSON.parse` in try-catch. Keys to use: `sv_watchlist`, `sv_theme`, `sv_portfolio`. |
| **No hardcoded keys** | All API keys via `import.meta.env.VITE_*` only. |
| **No hardcoded colours** | All colours via CSS custom properties only. Use `var(--bg-card)` etc. |
| **Responsive** | All components must work from 1024px to 1920px. Mobile not priority but must not break. |
| **Console hygiene** | No `console.error` without a corresponding user-visible error message. |
| **Chart lib** | Use the existing charting library. Do not add a second one. |

---

## 6. Delivery Order

Complete work in this exact sequence. Test each item before moving to the next.

```
[1] Fix Paper Trading submit button freeze         (Section 3.5)
[2] Fix News titles                                (Section 3.3)
[3] Fix Sentiment gauge                            (Section 3.4) ← needs 3.3 done first
[4] Fix Comparison Chart                           (Section 3.1)
[5] Fix Backtesting Engine                         (Section 3.2)
[6] Build Dark Mode Toggle                         (Section 4.4) ← do before new UI components
[7] Build Watchlist with Sparklines                (Section 4.1)
[8] Build Price Alert Push Notifications           (Section 4.2)
[9] Build Economic Calendar Widget                 (Section 4.3)
[10] Build Candlestick Pattern Recognition         (Section 4.6)
[11] Build AI-Powered Screener Suggestions         (Section 4.5)
```

---

## 7. Final Acceptance Checklist

Before stopping, verify every item below. All must pass.

- [ ] Comparison chart renders normalised % lines for any two valid tickers — no blank area
- [ ] Backtest runs on AAPL SMA Crossover 20/50 and shows Return %, Win Rate, Drawdown, Sharpe + equity curve
- [ ] News cards in Stock Lab show real article headlines and are clickable links
- [ ] Sentiment gauge reflects actual news sentiment — not a static 0.00
- [ ] Paper Trading buy and sell orders complete, update holdings table, and do not freeze
- [ ] Watchlist shows live prices with sparklines and auto-refreshes every 30 seconds
- [ ] Price alert for AAPL fires a browser push notification when threshold is crossed
- [ ] Economic Calendar shows minimum 10 upcoming events with dates and impact badges
- [ ] Dark mode toggle switches all components cleanly — zero hardcoded colour overrides remaining
- [ ] Candlestick pattern arrows appear on chart for stocks with detectable patterns in recent data
- [ ] AI Screener button returns ranked list of bullish NSE stocks with Claude reasoning
- [ ] Zero unhandled console errors across all features
- [ ] All errors are caught and show a visible message in the UI

---

> **StockVision Pro v2.0 — Build this in order. Test each step. Ship a complete product.**
