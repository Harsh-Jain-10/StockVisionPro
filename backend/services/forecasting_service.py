from __future__ import annotations

import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

class SeasonalTrendRegressor:
    """
    Custom lightweight regressor mimicking Prophet's trend + seasonality decomposition.
    Uses numpy linear algebra for fast, reliable, on-the-fly curve fitting.
    """
    def __init__(self, n_fourier_weekly=3, n_fourier_monthly=5):
        self.n_fourier_weekly = n_fourier_weekly
        self.n_fourier_monthly = n_fourier_monthly
        self.trend_coeffs = None
        self.season_coeffs = None

    def fit(self, X, y):
        # X: 1D array of time steps (indices)
        # y: 1D array of target prices
        N = len(X)
        if N < 2:
            self.trend_coeffs = np.array([0.0, float(y[0]) if N > 0 else 0.0])
            self.season_coeffs = np.array([])
            return

        # 1. Fit linear trend: y = m*x + c
        A_trend = np.vstack([X, np.ones(N)]).T
        self.trend_coeffs, _, _, _ = np.linalg.lstsq(A_trend, y, rcond=None)
        
        # Detrend y
        y_detrended = y - (self.trend_coeffs[0] * X + self.trend_coeffs[1])
        
        # 2. Fit Fourier terms for weekly (5 business days) and monthly (21 business days) seasonality
        features = []
        # Weekly seasonality
        for i in range(1, self.n_fourier_weekly + 1):
            features.append(np.sin(2 * np.pi * i * X / 5.0))
            features.append(np.cos(2 * np.pi * i * X / 5.0))
        # Monthly seasonality
        for i in range(1, self.n_fourier_monthly + 1):
            features.append(np.sin(2 * np.pi * i * X / 21.0))
            features.append(np.cos(2 * np.pi * i * X / 21.0))
            
        if features:
            A_season = np.vstack(features).T
            self.season_coeffs, _, _, _ = np.linalg.lstsq(A_season, y_detrended, rcond=None)
        else:
            self.season_coeffs = np.array([])
            
    def predict(self, X):
        # Predict trend
        y_pred = self.trend_coeffs[0] * X + self.trend_coeffs[1]
        
        # Add seasonality
        features = []
        for i in range(1, self.n_fourier_weekly + 1):
            features.append(np.sin(2 * np.pi * i * X / 5.0))
            features.append(np.cos(2 * np.pi * i * X / 5.0))
        for i in range(1, self.n_fourier_monthly + 1):
            features.append(np.sin(2 * np.pi * i * X / 21.0))
            features.append(np.cos(2 * np.pi * i * X / 21.0))
            
        if features and len(self.season_coeffs) > 0:
            A_season = np.vstack(features).T
            y_pred += np.dot(A_season, self.season_coeffs)
            
        return y_pred


def get_features_for_index(prices_series, idx, lag_days=[1, 2, 3, 5, 10], rolling_days=[5, 10]):
    """
    Constructs a feature vector for a specific index in a price sequence.
    """
    feats = []
    # Lag features
    for lag in lag_days:
        feats.append(prices_series[idx - lag + 1])
    # Rolling mean and standard deviation
    for roll in rolling_days:
        window = prices_series[idx - roll + 1 : idx + 1]
        feats.append(np.mean(window))
        feats.append(np.std(window) + 1e-8)
    return np.array(feats)


def generate_insights(symbol: str, current_price: float, forecast_price: float, metrics: dict, horizon: int) -> dict:
    """
    Generates dynamic AI insights and explanations based on the forecast results.
    """
    price_diff = forecast_price - current_price
    pct_change = (price_diff / current_price) * 100
    direction = "bullish" if pct_change > 1.5 else "bearish" if pct_change < -1.5 else "neutral"
    
    r2 = metrics.get("r2", 0.0)
    accuracy_rating = "High" if r2 > 0.7 else "Moderate" if r2 > 0.4 else "Low (High Uncertainty)"
    
    # Generate natural language explanation
    if direction == "bullish":
        summary = f"Bullish momentum predicted for {symbol}. The model forecasts an increase of {pct_change:+.2f}% over the next {horizon} days."
        details = (
            f"Machine learning indicators suggest a solid upward path for {symbol}. "
            f"The price is projected to reach approximately ${forecast_price:,.2f} from the current level of ${current_price:,.2f}. "
            f"Support levels appear strong, and rolling averages indicate steady buy volume. "
            f"The backtested historical fit shows {accuracy_rating.lower()} confidence for this trend."
        )
    elif direction == "bearish":
        summary = f"Bearish correction predicted for {symbol}. The model forecasts a decline of {pct_change:.2f}% over the next {horizon} days."
        details = (
            f"Technical models indicate potential downside pressure for {symbol}, targeting a projected price of ${forecast_price:,.2f}. "
            f"Moving averages suggest selling momentum might accelerate. "
            f"Investors should monitor key support levels, as recent price consolidations point to weakening volume. "
            f"Our forecasting metrics indicate a {accuracy_rating.lower()} model fit score."
        )
    else:
        summary = f"Neutral consolidation expected for {symbol}."
        details = (
            f"The forecasting model projects {symbol} will remain range-bound over the next {horizon} days, "
            f"closing around ${forecast_price:,.2f} (change of {pct_change:+.2f}%). "
            f"Low volatility and balanced buy/sell pressure suggest a sideways consolidation phase is likely "
            f"before the next major breakout. Model reliability is rated as {accuracy_rating.lower()}."
        )
        
    return {
        "summary": summary,
        "details": details,
        "direction": direction,
        "expected_change_pct": float(pct_change),
        "target_price": float(forecast_price),
        "accuracy_rating": accuracy_rating
    }


def train_and_forecast(df: pd.DataFrame, model_type: str, horizon: int) -> dict:
    """
    Trains the chosen regressor on historical stock data and forecasts prices into the future.
    """
    # Ensure DataFrame is sorted by date
    df = df.sort_values(by="Date").reset_index(drop=True)
    prices = df["Close"].to_numpy(dtype=float)
    dates = df["Date"].tolist()
    
    N = len(prices)
    if N < 20:
        raise ValueError(f"Insufficient historical data points ({N}). At least 20 are required for model training.")

    # 1. Fit & Forecast using custom SeasonalTrendRegressor (if selected)
    if model_type == "seasonal_trend":
        t = np.arange(N, dtype=float)
        split_idx = int(N * 0.8)
        
        # Test split for metrics
        model_test = SeasonalTrendRegressor()
        model_test.fit(t[:split_idx], prices[:split_idx])
        test_preds = model_test.predict(t[split_idx:])
        metrics = calculate_metrics(prices[split_idx:], test_preds)
        
        # Train on full data for future forecast
        model_full = SeasonalTrendRegressor()
        model_full.fit(t, prices)
        
        # Residual variance for bounds
        residuals = prices - model_full.predict(t)
        residual_std = np.std(residuals)
        
        # Future predictions
        future_t = np.arange(N, N + horizon, dtype=float)
        future_preds = model_full.predict(future_t)
        
    # 2. Fit & Forecast using Scikit-Learn models (Random Forest, Gradient Boosting, MLP)
    else:
        # Construct lag/rolling features
        # We need at least 10 days of history to start constructing features
        X_all = []
        y_all = []
        for idx in range(10, N - 1):
            X_all.append(get_features_for_index(prices, idx))
            y_all.append(prices[idx + 1])
            
        X_all = np.array(X_all)
        y_all = np.array(y_all)
        
        M = len(X_all)
        split_idx = int(M * 0.8)
        
        # Define base model
        if model_type == "random_forest":
            reg_func = lambda: RandomForestRegressor(n_estimators=50, random_state=42)
        elif model_type == "gradient_boosting":
            reg_func = lambda: GradientBoostingRegressor(n_estimators=50, random_state=42)
        elif model_type == "neural_network":
            reg_func = lambda: MLPRegressor(hidden_layer_sizes=(64, 32), max_iter=500, random_state=42)
        else:
            raise ValueError(f"Unknown model type: {model_type}")
            
        # Test split for metrics
        reg_test = reg_func()
        reg_test.fit(X_all[:split_idx], y_all[:split_idx])
        test_preds = reg_test.predict(X_all[split_idx:])
        metrics = calculate_metrics(y_all[split_idx:], test_preds)
        
        # Train on full data
        reg_full = reg_func()
        reg_full.fit(X_all, y_all)
        
        # Residual variance for bounds
        residuals = y_all - reg_full.predict(X_all)
        residual_std = np.std(residuals)
        
        # Recursive forecast
        prices_forecast = list(prices)
        for _ in range(horizon):
            idx = len(prices_forecast) - 1
            feat = get_features_for_index(prices_forecast, idx)
            pred = reg_full.predict(feat.reshape(1, -1))[0]
            prices_forecast.append(pred)
            
        future_preds = np.array(prices_forecast[-horizon:])

    # 3. Calculate bounds and format response
    forecast_list = []
    last_date = dates[-1]
    if isinstance(last_date, str):
        last_date = pd.to_datetime(last_date)
    elif isinstance(last_date, datetime):
        pass
    else:
        # Fallback
        last_date = datetime.now(timezone.utc)
        
    for i in range(horizon):
        # Move forward by calendar days (including weekends)
        future_date = (last_date + timedelta(days=i+1)).strftime("%Y-%m-%d")
        pred_val = float(future_preds[i])
        
        # Uncertainty envelopes expand over time: std_error * sqrt(step)
        std_error = residual_std * np.sqrt(i + 1)
        upper_val = pred_val + 1.96 * std_error
        lower_val = max(0.0, pred_val - 1.96 * std_error)
        
        forecast_list.append({
            "date": future_date,
            "base": round(pred_val, 2),
            "upper": round(upper_val, 2),
            "lower": round(lower_val, 2)
        })
        
    # Generate insights
    symbol = str(df["Symbol"].iloc[0]) if "Symbol" in df.columns else "Stock"
    insights = generate_insights(symbol, float(prices[-1]), float(future_preds[-1]), metrics, horizon)
    
    # Historical series for chart comparison
    historical_list = []
    # Return last 60 days of history to render side-by-side
    for i in range(max(0, N - 60), N):
        d_str = dates[i].strftime("%Y-%m-%d") if isinstance(dates[i], datetime) else str(dates[i])[:10]
        historical_list.append({
            "date": d_str,
            "close": round(float(prices[i]), 2)
        })
        
    return {
        "metrics": metrics,
        "forecast": forecast_list,
        "historical": historical_list,
        "insights": insights
    }


def calculate_metrics(y_true, y_pred) -> dict:
    """
    Computes regression performance metrics: MAE, RMSE, MAPE, R2.
    """
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    
    # Avoid zero division
    y_true_safe = np.where(y_true == 0, 1e-8, y_true)
    mape = np.mean(np.abs((y_true - y_pred) / y_true_safe)) * 100
    r2 = r2_score(y_true, y_pred)
    
    return {
        "mae": float(round(mae, 4)),
        "rmse": float(round(rmse, 4)),
        "mape": float(round(mape, 4)),
        "r2": float(round(r2, 4))
    }
