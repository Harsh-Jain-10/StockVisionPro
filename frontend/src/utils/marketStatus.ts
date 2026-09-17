import { useState, useEffect } from "react";

export type MarketSessionStatus = "open" | "closed" | "pre_market" | "after_hours";

export interface MarketStatus {
  status: MarketSessionStatus;
  isOpen: boolean;
  isPreMarket: boolean;
  isAfterHours: boolean;
  label: string;
  subtext: string;
  detail: string;
  nextSession: string;
  nyTime: string;
  localTime: string;
  regularHours: string;
  extendedHours: string;
  reason?: string;
}

function getNthDayOfMonth(year: number, month: number, dayOfWeek: number, n: number): number {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(Date.UTC(year, month - 1, d));
    if (dt.getUTCMonth() !== month - 1) break;
    if (dt.getUTCDay() === dayOfWeek) {
      count++;
      if (count === n) return d;
    }
  }
  return -1;
}

function getLastDayOfWeekOfMonth(year: number, month: number, dayOfWeek: number): number {
  let last = -1;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(Date.UTC(year, month - 1, d));
    if (dt.getUTCMonth() !== month - 1) break;
    if (dt.getUTCDay() === dayOfWeek) last = d;
  }
  return last;
}

function getGoodFriday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easterDate = new Date(Date.UTC(year, month - 1, day));
  easterDate.setUTCDate(easterDate.getUTCDate() - 2);
  return { month: easterDate.getUTCMonth() + 1, day: easterDate.getUTCDate() };
}

export function getUSMarketHoliday(year: number, month: number, day: number): string | null {
  // New Year's Day (or observed)
  if (month === 1 && day === 1) return "New Year's Day";
  if (month === 1 && day === 2 && new Date(Date.UTC(year, 0, 1)).getUTCDay() === 0) return "New Year's Day (Observed)";
  if (month === 12 && day === 31 && new Date(Date.UTC(year + 1, 0, 1)).getUTCDay() === 6) return "New Year's Day (Observed)";

  // Martin Luther King Jr. Day (3rd Monday in January)
  if (month === 1 && day === getNthDayOfMonth(year, 1, 1, 3)) return "Martin Luther King Jr. Day";

  // Presidents' Day (3rd Monday in February)
  if (month === 2 && day === getNthDayOfMonth(year, 2, 1, 3)) return "Presidents' Day";

  // Good Friday
  const goodFriday = getGoodFriday(year);
  if (month === goodFriday.month && day === goodFriday.day) return "Good Friday";

  // Memorial Day (Last Monday in May)
  if (month === 5 && day === getLastDayOfWeekOfMonth(year, 5, 1)) return "Memorial Day";

  // Juneteenth (June 19 or observed)
  if (month === 6 && day === 19) return "Juneteenth";
  if (month === 6 && day === 20 && new Date(Date.UTC(year, 5, 19)).getUTCDay() === 0) return "Juneteenth (Observed)";
  if (month === 6 && day === 18 && new Date(Date.UTC(year, 5, 19)).getUTCDay() === 6) return "Juneteenth (Observed)";

  // Independence Day (July 4 or observed)
  if (month === 7 && day === 4) return "Independence Day";
  if (month === 7 && day === 5 && new Date(Date.UTC(year, 6, 4)).getUTCDay() === 0) return "Independence Day (Observed)";
  if (month === 7 && day === 3 && new Date(Date.UTC(year, 6, 4)).getUTCDay() === 6) return "Independence Day (Observed)";

  // Labor Day (1st Monday in September)
  if (month === 9 && day === getNthDayOfMonth(year, 9, 1, 1)) return "Labor Day";

  // Thanksgiving Day (4th Thursday in November)
  if (month === 11 && day === getNthDayOfMonth(year, 11, 4, 4)) return "Thanksgiving Day";

  // Christmas Day (Dec 25 or observed)
  if (month === 12 && day === 25) return "Christmas Day";
  if (month === 12 && day === 26 && new Date(Date.UTC(year, 11, 25)).getUTCDay() === 0) return "Christmas Day (Observed)";
  if (month === 12 && day === 24 && new Date(Date.UTC(year, 11, 25)).getUTCDay() === 6) return "Christmas Eve / Observed";

  return null;
}

export function calculateMarketStatus(date: Date = new Date()): MarketStatus {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const p: Record<string, string> = {};
  for (const part of parts) {
    p[part.type] = part.value;
  }

  const weekday = p.weekday;
  const month = parseInt(p.month, 10);
  const day = parseInt(p.day, 10);
  const year = parseInt(p.year, 10);
  const hour = parseInt(p.hour, 10);
  const minute = parseInt(p.minute, 10);
  const minutes = hour * 60 + minute;

  const nyTimeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

  const localTimeFmt = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const regularHours = "Mon–Fri 9:30 AM – 4:00 PM ET";
  const extendedHours = "Pre: 4:00 AM – 9:30 AM | Post: 4:00 PM – 8:00 PM ET";

  // Weekend Check
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  if (isWeekend) {
    return {
      status: "closed",
      isOpen: false,
      isPreMarket: false,
      isAfterHours: false,
      label: "Markets Closed",
      subtext: "Weekend • Opens Mon 9:30 AM ET",
      detail: "NYSE & NASDAQ are closed for the weekend.",
      nextSession: "Opens Monday at 9:30 AM ET",
      nyTime: `${nyTimeFmt} ET`,
      localTime: localTimeFmt,
      regularHours,
      extendedHours,
      reason: "Weekend",
    };
  }

  // Holiday Check
  const holiday = getUSMarketHoliday(year, month, day);
  if (holiday) {
    const isFriday = weekday === "Fri";
    const nextText = isFriday ? "Opens Monday at 9:30 AM ET" : "Opens next trading day at 9:30 AM ET";
    return {
      status: "closed",
      isOpen: false,
      isPreMarket: false,
      isAfterHours: false,
      label: "Markets Closed",
      subtext: `Holiday (${holiday})`,
      detail: `NYSE & NASDAQ are closed for ${holiday}.`,
      nextSession: nextText,
      nyTime: `${nyTimeFmt} ET`,
      localTime: localTimeFmt,
      regularHours,
      extendedHours,
      reason: holiday,
    };
  }

  // Regular Trading Session: 9:30 AM to 4:00 PM ET (570m to 960m)
  if (minutes >= 570 && minutes < 960) {
    return {
      status: "open",
      isOpen: true,
      isPreMarket: false,
      isAfterHours: false,
      label: "Markets Open",
      subtext: "Regular Session • Closes 4:00 PM ET",
      detail: "NYSE & NASDAQ regular trading session is active.",
      nextSession: "Closes today at 4:00 PM ET",
      nyTime: `${nyTimeFmt} ET`,
      localTime: localTimeFmt,
      regularHours,
      extendedHours,
    };
  }

  // Pre-Market: 4:00 AM to 9:30 AM ET (240m to 570m)
  if (minutes >= 240 && minutes < 570) {
    return {
      status: "pre_market",
      isOpen: false,
      isPreMarket: true,
      isAfterHours: false,
      label: "Pre-Market",
      subtext: "Pre-Market • Regular Opens 9:30 AM ET",
      detail: "US pre-market trading session is currently active.",
      nextSession: "Regular trading opens at 9:30 AM ET",
      nyTime: `${nyTimeFmt} ET`,
      localTime: localTimeFmt,
      regularHours,
      extendedHours,
      reason: "Pre-Market Trading",
    };
  }

  // After-Hours: 4:00 PM to 8:00 PM ET (960m to 1200m)
  if (minutes >= 960 && minutes < 1200) {
    return {
      status: "after_hours",
      isOpen: false,
      isPreMarket: false,
      isAfterHours: true,
      label: "After-Hours",
      subtext: "After-Hours • Session Closes 8:00 PM ET",
      detail: "Extended after-hours trading session is active.",
      nextSession: "Extended trading closes at 8:00 PM ET",
      nyTime: `${nyTimeFmt} ET`,
      localTime: localTimeFmt,
      regularHours,
      extendedHours,
      reason: "After-Hours Trading",
    };
  }

  // Overnight / Closed
  const opensMon = weekday === "Fri" && minutes >= 1200;
  return {
    status: "closed",
    isOpen: false,
    isPreMarket: false,
    isAfterHours: false,
    label: "Markets Closed",
    subtext: opensMon ? "Closed • Opens Mon 9:30 AM ET" : "Closed • Pre-Market 4:00 AM ET",
    detail: "NYSE & NASDAQ extended sessions have ended.",
    nextSession: opensMon ? "Opens Monday at 9:30 AM ET" : "Pre-market starts at 4:00 AM ET",
    nyTime: `${nyTimeFmt} ET`,
    localTime: localTimeFmt,
    regularHours,
    extendedHours,
    reason: "Outside Trading Hours",
  };
}

export function useMarketStatus(): MarketStatus {
  const [status, setStatus] = useState<MarketStatus>(() => calculateMarketStatus(new Date()));

  useEffect(() => {
    const update = () => setStatus(calculateMarketStatus(new Date()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return status;
}
