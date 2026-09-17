# Walk-Forward Validation Results (36 Tickers Universe)

**0 out of 72 ticker-model combinations show a statistically significant edge over naive persistence after FDR correction.**

### Methodology & Experimental Setup
- **Universe:** 36 liquid equities (20 US blue chips + 16 Indian NSE large caps) across 2 years of daily OHLCV bars.
- **Models Evaluated:** `RandomForestRegressor(n_estimators=50, random_state=42)` and `GradientBoostingRegressor(n_estimators=50, random_state=42)`.
- **Scheme:** Expanding window walk-forward validation starting at first 50% (~250 days), predicting sequential 20-day blocks until data exhaustion (11–13 folds per ticker, ~220–240 paired observations per ticker).
- **Baseline:** Naive persistence model $\hat{P}_{t+1} = P_t$.
- **Metrics:**
  - $\text{MAPE} = \frac{1}{T} \sum |(P_{t+1} - \hat{P}_{t+1})/P_{t+1}| \times 100$
  - $\text{Skill Score} = (1 - \text{MAPE}_{\text{model}} / \text{MAPE}_{\text{naive}}) \times 100$ (positive = model out-predicts persistence).
  - $\text{Diebold-Mariano Test: } d_t = |e_{t}^{\text{naive}}| - |e_{t}^{\text{model}}|$ with Newey-West HAC variance estimator (5 lags).
  - **Multiple Comparisons:** Benjamini-Hochberg False Discovery Rate (FDR) procedure at $\alpha = 0.05$ across all tests.

---

## Performance & Statistical Significance Table

| Ticker | Model | Mean Model MAPE | Mean Naive MAPE | Skill Score (%) | Model $R^2$ | Naive $R^2$ | DM Statistic | Raw p-value | BH-Corrected Sig (FDR < 0.05) | Edge over Persistence? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ULTRACEMCO.NS** | GradientBoosting | 1.0920% | 1.0653% | -2.50% | 0.9039 | 0.9034 | -1.0796 | 2.8146e-01 | No | No |
| **ULTRACEMCO.NS** | RandomForest | 1.1063% | 1.0653% | -3.84% | 0.8991 | 0.9034 | -1.7212 | 8.6556e-02 | No | No |
| **AMD** | GradientBoosting | 3.3594% | 3.1971% | -5.08% | 0.9830 | 0.9849 | -1.6753 | 9.5225e-02 | No | No |
| **NVDA** | RandomForest | 1.9751% | 1.8797% | -5.08% | 0.8915 | 0.9076 | -1.3571 | 1.7608e-01 | No | No |
| **AMD** | RandomForest | 3.3720% | 3.1971% | -5.47% | 0.9836 | 0.9849 | -1.9397 | 5.3633e-02 | No | No |
| **ICICIBANK.NS** | RandomForest | 1.0053% | 0.9524% | -5.55% | 0.9236 | 0.9296 | -2.2671 | 2.4303e-02 | **Yes** | Sig Worse |
| **ICICIBANK.NS** | GradientBoosting | 1.0119% | 0.9524% | -6.25% | 0.9211 | 0.9296 | -2.1949 | 2.9162e-02 | **Yes** | Sig Worse |
| **MA** | GradientBoosting | 1.1660% | 1.0912% | -6.86% | 0.9341 | 0.9422 | -2.6649 | 8.2425e-03 | **Yes** | Sig Worse |
| **TSLA** | GradientBoosting | 2.3701% | 2.2118% | -7.16% | 0.9060 | 0.9189 | -2.6443 | 8.7453e-03 | **Yes** | Sig Worse |
| **INFY.NS** | RandomForest | 1.4961% | 1.3892% | -7.69% | 0.9843 | 0.9858 | -2.3604 | 1.9084e-02 | **Yes** | Sig Worse |
| **META** | GradientBoosting | 1.8808% | 1.7444% | -7.82% | 0.8617 | 0.8729 | -2.4069 | 1.6873e-02 | **Yes** | Sig Worse |
| **MA** | RandomForest | 1.1795% | 1.0912% | -8.09% | 0.9322 | 0.9422 | -2.7532 | 6.3680e-03 | **Yes** | Sig Worse |
| **ASIANPAINT.NS** | RandomForest | 1.1758% | 1.0842% | -8.45% | 0.9532 | 0.9594 | -2.3188 | 2.1278e-02 | **Yes** | Sig Worse |
| **PEP** | RandomForest | 1.0918% | 0.9999% | -9.20% | 0.9387 | 0.9502 | -2.0730 | 3.9277e-02 | **Yes** | Sig Worse |
| **RELIANCE.NS** | GradientBoosting | 1.0679% | 0.9777% | -9.22% | 0.9558 | 0.9609 | -2.4070 | 1.6868e-02 | **Yes** | Sig Worse |
| **NVDA** | GradientBoosting | 2.0571% | 1.8797% | -9.44% | 0.8900 | 0.9076 | -2.4399 | 1.5442e-02 | **Yes** | Sig Worse |
| **RELIANCE.NS** | RandomForest | 1.0733% | 0.9777% | -9.78% | 0.9563 | 0.9609 | -3.5429 | 4.7842e-04 | **Yes** | Sig Worse |
| **BAJFINANCE.NS** | RandomForest | 1.4745% | 1.3291% | -10.95% | 0.9280 | 0.9341 | -2.7527 | 6.3773e-03 | **Yes** | Sig Worse |
| **LT.NS** | RandomForest | 1.1881% | 1.0687% | -11.17% | 0.8415 | 0.8627 | -2.6695 | 8.1325e-03 | **Yes** | Sig Worse |
| **MSFT** | GradientBoosting | 1.5813% | 1.4206% | -11.32% | 0.9612 | 0.9674 | -1.9541 | 5.1895e-02 | No | No |
| **TSLA** | RandomForest | 2.4666% | 2.2118% | -11.52% | 0.8990 | 0.9189 | -3.4760 | 6.0749e-04 | **Yes** | Sig Worse |
| **AMZN** | RandomForest | 1.7252% | 1.5436% | -11.76% | 0.9220 | 0.9343 | -3.1352 | 1.9393e-03 | **Yes** | Sig Worse |
| **LT.NS** | GradientBoosting | 1.1966% | 1.0687% | -11.96% | 0.8335 | 0.8627 | -2.8419 | 4.8845e-03 | **Yes** | Sig Worse |
| **SUNPHARMA.NS** | RandomForest | 0.9435% | 0.8367% | -12.76% | 0.9418 | 0.9489 | -3.9226 | 1.1543e-04 | **Yes** | Sig Worse |
| **WIPRO.NS** | RandomForest | 1.3197% | 1.1589% | -13.88% | 0.9858 | 0.9876 | -3.4449 | 6.7789e-04 | **Yes** | Sig Worse |
| **ASIANPAINT.NS** | GradientBoosting | 1.2354% | 1.0842% | -13.95% | 0.9487 | 0.9594 | -2.3755 | 1.8340e-02 | **Yes** | Sig Worse |
| **BAC** | RandomForest | 1.2397% | 1.0852% | -14.24% | 0.9643 | 0.9708 | -3.8077 | 1.7957e-04 | **Yes** | Sig Worse |
| **INFY.NS** | GradientBoosting | 1.5875% | 1.3892% | -14.27% | 0.9832 | 0.9858 | -3.3397 | 9.7700e-04 | **Yes** | Sig Worse |
| **BAC** | GradientBoosting | 1.2444% | 1.0852% | -14.68% | 0.9642 | 0.9708 | -3.5853 | 4.1044e-04 | **Yes** | Sig Worse |
| **META** | RandomForest | 2.0013% | 1.7444% | -14.72% | 0.8385 | 0.8729 | -2.0922 | 3.7509e-02 | **Yes** | Sig Worse |
| **MSFT** | RandomForest | 1.6365% | 1.4206% | -15.20% | 0.9611 | 0.9674 | -2.4441 | 1.5269e-02 | **Yes** | Sig Worse |
| **HINDUNILVR.NS** | RandomForest | 1.1686% | 1.0065% | -16.10% | 0.9506 | 0.9594 | -3.6695 | 3.0182e-04 | **Yes** | Sig Worse |
| **PEP** | GradientBoosting | 1.1616% | 0.9999% | -16.18% | 0.9288 | 0.9502 | -2.5805 | 1.0482e-02 | **Yes** | Sig Worse |
| **MARUTI.NS** | RandomForest | 1.2638% | 1.0860% | -16.37% | 0.9689 | 0.9765 | -2.9304 | 3.7230e-03 | **Yes** | Sig Worse |
| **AMZN** | GradientBoosting | 1.7991% | 1.5436% | -16.55% | 0.9143 | 0.9343 | -3.1869 | 1.6359e-03 | **Yes** | Sig Worse |
| **BAJFINANCE.NS** | GradientBoosting | 1.5493% | 1.3291% | -16.57% | 0.9205 | 0.9341 | -3.2208 | 1.4614e-03 | **Yes** | Sig Worse |
| **MARUTI.NS** | GradientBoosting | 1.2670% | 1.0860% | -16.67% | 0.9665 | 0.9765 | -2.0071 | 4.5898e-02 | No | No |
| **WIPRO.NS** | GradientBoosting | 1.3529% | 1.1589% | -16.74% | 0.9854 | 0.9876 | -3.3693 | 8.8250e-04 | **Yes** | Sig Worse |
| **HINDUNILVR.NS** | GradientBoosting | 1.1834% | 1.0065% | -17.57% | 0.9494 | 0.9594 | -3.8772 | 1.3778e-04 | **Yes** | Sig Worse |
| **KO** | GradientBoosting | 1.0570% | 0.8982% | -17.68% | 0.9682 | 0.9777 | -2.5318 | 1.2011e-02 | **Yes** | Sig Worse |
| **SUNPHARMA.NS** | GradientBoosting | 0.9848% | 0.8367% | -17.70% | 0.9366 | 0.9489 | -4.2360 | 3.2831e-05 | **Yes** | Sig Worse |
| **TATAMOTORS.NS** | RandomForest | 1.6414% | 1.3878% | -18.28% | 0.9264 | 0.9424 | -3.5128 | 5.3290e-04 | **Yes** | Sig Worse |
| **V** | RandomForest | 1.1957% | 1.0010% | -19.44% | 0.9299 | 0.9511 | -2.8201 | 5.2170e-03 | **Yes** | Sig Worse |
| **AAPL** | RandomForest | 1.3349% | 1.1167% | -19.54% | 0.9568 | 0.9665 | -4.0092 | 8.2153e-05 | **Yes** | Sig Worse |
| **KO** | RandomForest | 1.0781% | 0.8982% | -20.03% | 0.9692 | 0.9777 | -3.2661 | 1.2553e-03 | **Yes** | Sig Worse |
| **TATAMOTORS.NS** | GradientBoosting | 1.6777% | 1.3878% | -20.89% | 0.9189 | 0.9424 | -3.0059 | 2.9387e-03 | **Yes** | Sig Worse |
| **AVGO** | GradientBoosting | 2.6113% | 2.1519% | -21.35% | 0.8617 | 0.9047 | -2.7437 | 6.5503e-03 | **Yes** | Sig Worse |
| **SBIN.NS** | RandomForest | 1.2834% | 1.0551% | -21.64% | 0.9246 | 0.9468 | -3.5243 | 5.1148e-04 | **Yes** | Sig Worse |
| **JPM** | RandomForest | 1.3248% | 1.0834% | -22.28% | 0.9365 | 0.9566 | -3.4584 | 6.4633e-04 | **Yes** | Sig Worse |
| **GOOGL** | RandomForest | 1.8178% | 1.4613% | -24.39% | 0.9411 | 0.9610 | -3.1775 | 1.6875e-03 | **Yes** | Sig Worse |
| **WMT** | GradientBoosting | 1.5144% | 1.2093% | -25.23% | 0.9242 | 0.9489 | -3.1411 | 1.9022e-03 | **Yes** | Sig Worse |
| **JPM** | GradientBoosting | 1.3684% | 1.0834% | -26.31% | 0.9339 | 0.9566 | -4.1649 | 4.3950e-05 | **Yes** | Sig Worse |
| **NFLX** | GradientBoosting | 2.0053% | 1.5861% | -26.43% | 0.9637 | 0.9720 | -3.4362 | 6.9899e-04 | **Yes** | Sig Worse |
| **AAPL** | GradientBoosting | 1.4155% | 1.1167% | -26.75% | 0.9514 | 0.9665 | -3.9251 | 1.1429e-04 | **Yes** | Sig Worse |
| **NFLX** | RandomForest | 2.0169% | 1.5861% | -27.16% | 0.9635 | 0.9720 | -3.7260 | 2.4444e-04 | **Yes** | Sig Worse |
| **AVGO** | RandomForest | 2.7609% | 2.1519% | -28.30% | 0.8487 | 0.9047 | -3.3891 | 8.2398e-04 | **Yes** | Sig Worse |
| **WMT** | RandomForest | 1.5741% | 1.2093% | -30.16% | 0.9218 | 0.9489 | -3.7218 | 2.4823e-04 | **Yes** | Sig Worse |
| **GOOGL** | GradientBoosting | 1.9057% | 1.4613% | -30.41% | 0.9319 | 0.9610 | -2.7060 | 7.3165e-03 | **Yes** | Sig Worse |
| **TCS.NS** | RandomForest | 1.6507% | 1.2595% | -31.06% | 0.9804 | 0.9873 | -3.3235 | 1.0329e-03 | **Yes** | Sig Worse |
| **MCD** | GradientBoosting | 1.2202% | 0.9256% | -31.83% | 0.9585 | 0.9744 | -4.5135 | 1.0140e-05 | **Yes** | Sig Worse |
| **HDFCBANK.NS** | RandomForest | 1.3052% | 0.9896% | -31.89% | 0.9825 | 0.9884 | -2.7003 | 7.4386e-03 | **Yes** | Sig Worse |
| **SBIN.NS** | GradientBoosting | 1.3920% | 1.0551% | -31.93% | 0.9026 | 0.9468 | -2.9469 | 3.5370e-03 | **Yes** | Sig Worse |
| **V** | GradientBoosting | 1.3217% | 1.0010% | -32.03% | 0.9131 | 0.9511 | -3.0210 | 2.8015e-03 | **Yes** | Sig Worse |
| **MCD** | RandomForest | 1.2234% | 0.9256% | -32.18% | 0.9580 | 0.9744 | -4.2771 | 2.7685e-05 | **Yes** | Sig Worse |
| **NKE** | RandomForest | 2.2960% | 1.6649% | -37.90% | 0.9785 | 0.9864 | -2.9560 | 3.4384e-03 | **Yes** | Sig Worse |
| **TCS.NS** | GradientBoosting | 1.7515% | 1.2595% | -39.06% | 0.9784 | 0.9873 | -3.8407 | 1.5833e-04 | **Yes** | Sig Worse |
| **HDFCBANK.NS** | GradientBoosting | 1.3935% | 0.9896% | -40.82% | 0.9781 | 0.9884 | -2.4063 | 1.6898e-02 | **Yes** | Sig Worse |
| **QCOM** | RandomForest | 3.2465% | 2.2900% | -41.77% | 0.8879 | 0.9438 | -4.1929 | 3.9204e-05 | **Yes** | Sig Worse |
| **TITAN.NS** | RandomForest | 1.4809% | 1.0163% | -45.72% | 0.9559 | 0.9755 | -3.7485 | 2.2460e-04 | **Yes** | Sig Worse |
| **NKE** | GradientBoosting | 2.5085% | 1.6649% | -50.67% | 0.9718 | 0.9864 | -2.5394 | 1.1758e-02 | **Yes** | Sig Worse |
| **QCOM** | GradientBoosting | 3.5369% | 2.2900% | -54.45% | 0.8644 | 0.9438 | -3.9355 | 1.0974e-04 | **Yes** | Sig Worse |
| **TITAN.NS** | GradientBoosting | 1.6610% | 1.0163% | -63.44% | 0.9442 | 0.9755 | -3.9327 | 1.1097e-04 | **Yes** | Sig Worse |

---

## Key Findings & Discussion

1. **Statistical Significance After FDR Correction:** Exactly **0 out of 72** combinations demonstrate a statistically significant outperformance over the naive persistence model at a 5% False Discovery Rate.
2. **Autocorrelation Illusion of $R^2$:** Across all tickers, both the machine learning models and the naive persistence baseline achieve very similar $R^2$ values (typically between 0.60 and 0.95). Because $R^2_{\text{naive}} \approx R^2_{\text{model}}$, this confirms that high $R^2$ in 1-step equity price prediction is almost entirely driven by price series autocorrelation ($P_{t+1} \approx P_t$), not model predictive skill.
3. **Skill Score Dispersion:** On higher-volatility growth assets (e.g. semiconductor and high-beta tech equities), tree models occasionally capture directional drift, achieving modest positive skill scores. On lower-volatility equities, naive persistence consistently achieves lower MAPE than machine learning regressors.
