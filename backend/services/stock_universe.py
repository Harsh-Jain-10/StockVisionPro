from __future__ import annotations


STOCK_UNIVERSE: dict[str, str] = {
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft",
    "GOOGL": "Alphabet",
    "AMZN": "Amazon",
    "NVDA": "NVIDIA",
    "META": "Meta Platforms",
    "TSLA": "Tesla",
    "NFLX": "Netflix",
    "AMD": "AMD",
    "INTC": "Intel",
    "CRM": "Salesforce",
    "ORCL": "Oracle",
    "ADBE": "Adobe",
    "QCOM": "Qualcomm",
    "AVGO": "Broadcom",
    "JPM": "JPMorgan Chase",
    "BAC": "Bank of America",
    "GS": "Goldman Sachs",
    "MS": "Morgan Stanley",
    "BRK-B": "Berkshire Hathaway",
    "V": "Visa",
    "MA": "Mastercard",
    "JNJ": "Johnson & Johnson",
    "PFE": "Pfizer",
    "UNH": "UnitedHealth",
    "LLY": "Eli Lilly",
    "ABBV": "AbbVie",
    "WMT": "Walmart",
    "MCD": "McDonald's",
    "KO": "Coca-Cola",
    "PEP": "PepsiCo",
    "NKE": "Nike",
    "RELIANCE.NS": "Reliance Industries",
    "TCS.NS": "TCS",
    "INFY.NS": "Infosys",
    "HDFCBANK.NS": "HDFC Bank",
    "ICICIBANK.NS": "ICICI Bank",
    "SBIN.NS": "SBI",
    "WIPRO.NS": "Wipro",
    "HINDUNILVR.NS": "HUL",
    "BAJFINANCE.NS": "Bajaj Finance",
    "MARUTI.NS": "Maruti Suzuki",
    "TITAN.NS": "Titan",
    "ADANIENT.NS": "Adani Enterprises",
    "LT.NS": "L&T",
    "SUNPHARMA.NS": "Sun Pharma",
    "ULTRACEMCO.NS": "UltraTech Cement",
    "ASIANPAINT.NS": "Asian Paints",
    "NESTLEIND.NS": "Nestle India",
    "ONGC.NS": "ONGC",
    "POWERGRID.NS": "Power Grid",
    "TATAMOTORS.NS": "Tata Motors",
    "BTC-USD": "Bitcoin",
    "ETH-USD": "Ethereum",
    "SOL-USD": "Solana",
    "BNB-USD": "Binance Coin",
    "XRP-USD": "XRP",
    "ADA-USD": "Cardano",
    "SPY": "S&P 500 ETF",
    "QQQ": "NASDAQ ETF",
    "IWM": "Russell 2000 ETF",
    "GLD": "Gold ETF",
    "SLV": "Silver ETF",
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ",
    "^DJI": "Dow Jones",
    "^NSEI": "Nifty 50",
    "^BSESN": "BSE Sensex",
}

SECTOR_HINTS: dict[str, str] = {
    "AAPL": "Technology",
    "MSFT": "Technology",
    "GOOGL": "Communication Services",
    "AMZN": "Consumer Cyclical",
    "NVDA": "Technology",
    "META": "Communication Services",
    "TSLA": "Consumer Cyclical",
    "JPM": "Financial Services",
    "BAC": "Financial Services",
    "JNJ": "Healthcare",
    "PFE": "Healthcare",
    "RELIANCE.NS": "Energy",
    "TCS.NS": "Technology",
    "INFY.NS": "Technology",
    "HDFCBANK.NS": "Financial Services",
}


def infer_exchange(symbol: str) -> str:
    if symbol.endswith(".NS"):
        return "NSE"
    if symbol.endswith(".BO"):
        return "BSE"
    if symbol.endswith("-USD"):
        return "Crypto"
    if symbol.startswith("^"):
        return "Index"
    return "US"


def infer_asset_type(symbol: str) -> str:
    if symbol.endswith("-USD"):
        return "crypto"
    if symbol.startswith("^"):
        return "index"
    if symbol in {"SPY", "QQQ", "IWM", "GLD", "SLV"}:
        return "etf"
    return "stock"
