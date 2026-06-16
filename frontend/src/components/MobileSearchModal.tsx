import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, TrendingUp, History } from "lucide-react";
import { searchStocks } from "../api/client";

interface MobileSearchModalProps {
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
}

const TRENDING_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "RELIANCE.NS", "TCS.NS"];

export default function MobileSearchModal({ onClose, onSelectSymbol }: MobileSearchModalProps) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sv_recent_searches");
      if (saved) {
        setRecent(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const search = useQuery({
    queryKey: ["mobile-search", query],
    queryFn: () => searchStocks(query),
    enabled: query.length > 1,
  });

  const saveRecent = (symbol: string) => {
    const next = [symbol, ...recent.filter((s) => s !== symbol)].slice(0, 5);
    setRecent(next);
    localStorage.setItem("sv_recent_searches", JSON.stringify(next));
  };

  const handleSelect = (symbol: string) => {
    saveRecent(symbol);
    onSelectSymbol(symbol);
    onClose();
  };

  return (
    <div className="mobile-search-modal">
      <div className="mobile-search-header">
        <Search size={18} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symbols, e.g. AAPL"
          className="mobile-search-input"
        />
        <button className="mobile-search-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="mobile-search-body">
        {query.length > 1 ? (
          <div className="mobile-search-results">
            {search.isFetching && <p className="search-status">Searching...</p>}
            {search.data && search.data.length > 0 ? (
              search.data.map((item) => (
                <button
                  key={item.symbol}
                  className="mobile-search-result-item"
                  onClick={() => handleSelect(item.symbol)}
                >
                  <div className="result-symbol-box">
                    <strong>{item.symbol}</strong>
                    <span>{item.name}</span>
                  </div>
                  <small className="result-exchange">{item.exchange}</small>
                </button>
              ))
            ) : (
              !search.isFetching && <p className="search-status">No results found for "{query}"</p>
            )}
          </div>
        ) : (
          <div className="mobile-search-suggestions">
            {recent.length > 0 && (
              <div className="suggestion-section">
                <div className="suggestion-title">
                  <History size={12} />
                  <span>Recent Searches</span>
                </div>
                <div className="suggestion-list">
                  {recent.map((symbol) => (
                    <button
                      key={symbol}
                      className="suggestion-chip"
                      onClick={() => handleSelect(symbol)}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="suggestion-section">
              <div className="suggestion-title">
                <TrendingUp size={12} />
                <span>Trending Symbols</span>
              </div>
              <div className="suggestion-list">
                {TRENDING_SYMBOLS.map((symbol) => (
                  <button
                    key={symbol}
                    className="suggestion-chip"
                    onClick={() => handleSelect(symbol)}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
