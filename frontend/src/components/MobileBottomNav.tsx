import React from "react";
import { Gauge, Brain, Activity, Flame, Newspaper, Bell } from "lucide-react";

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

interface MobileBottomNavProps {
  currentView: View;
  setView: (view: any) => void;
}

export default function MobileBottomNav({ currentView, setView }: MobileBottomNavProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: <Gauge size={20} /> },
    { id: "forecast", label: "Forecast", icon: <Brain size={20} /> },
    { id: "signals", label: "Signals", icon: <Activity size={20} /> },
    { id: "opportunities", label: "Opportunities", icon: <Flame size={20} /> },
    { id: "sentiment", label: "Sentiment", icon: <Newspaper size={20} /> },
    { id: "alerts", label: "Alerts", icon: <Bell size={20} /> },
  ];

  return (
    <nav className="mobile-bottom-nav">
      <div className="mobile-bottom-nav-inner">
        {tabs.map((tab) => {
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              className={`mobile-nav-tab ${isActive ? "active" : ""}`}
              onClick={() => setView(tab.id)}
            >
              <div className="mobile-nav-icon">{tab.icon}</div>
              <span className="mobile-nav-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
