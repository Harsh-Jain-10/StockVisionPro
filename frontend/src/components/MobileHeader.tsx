import React, { useState, useEffect, useRef } from "react";
import { Search, Sun, Moon, Settings, LogOut } from "lucide-react";

export type View =
  | "dashboard"
  | "forecast"
  | "signals"
  | "opportunities"
  | "sentiment"
  | "alerts"
  | "settings"
  | "stock"
  | "compare"
  | "screener"
  | "watchlist"
  | "calendar"
  | "accuracy";

interface MobileHeaderProps {
  currentView: View;
  setView: (view: View) => void;
  onSearchClick: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
  userEmail: string;
  userRole: string;
  onLogout: () => void;
}

const viewTitles: Record<string, string> = {
  dashboard: "Dashboard",
  forecast: "Forecast Studio",
  signals: "Technical Signals",
  opportunities: "Opportunities",
  sentiment: "News Sentiment",
  alerts: "Alerts Desk",
  settings: "Settings",
  stock: "Stock Lab",
  compare: "Comparison",
  screener: "Screener",
  watchlist: "Watchlists",
  calendar: "Calendar",
};

export default function MobileHeader({
  currentView,
  setView,
  onSearchClick,
  isDark,
  onThemeToggle,
  userEmail,
  userRole,
  onLogout,
}: MobileHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = userEmail ? userEmail.split("@")[0].substring(0, 2).toUpperCase() : "US";
  const title = viewTitles[currentView] || "StockVision";

  return (
    <header className="mobile-header">
      <div className="mobile-header-left" onClick={() => setView("dashboard")}>
        <div className="mobile-logo">SV</div>
      </div>

      <div className="mobile-header-center">
        <h2 className="mobile-page-title">{title}</h2>
      </div>

      <div className="mobile-header-right">
        <button className="mobile-header-btn" onClick={onSearchClick} title="Search">
          <Search size={20} />
        </button>

        <button className="mobile-header-btn" onClick={onThemeToggle} title="Toggle Theme">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="mobile-profile-container" ref={dropdownRef}>
          <button
            className="mobile-avatar-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            title="Profile Menu"
          >
            {initials}
          </button>

          {profileOpen && (
            <div className="mobile-profile-dropdown">
              <div className="mobile-profile-header">
                <div className="mobile-profile-email">{userEmail}</div>
                <div className="mobile-profile-role">{userRole} Role</div>
              </div>
              <div className="mobile-profile-divider" />
              <button
                className="mobile-profile-item"
                onClick={() => {
                  setView("settings");
                  setProfileOpen(false);
                }}
              >
                <Settings size={16} />
                <span>Settings</span>
              </button>
              <button
                className="mobile-profile-item logout-btn"
                onClick={() => {
                  onLogout();
                  setProfileOpen(false);
                }}
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
