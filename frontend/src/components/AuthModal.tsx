import React, { useState } from "react";
import { X, Lock, Mail, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { loginUser, registerUser, UserProfile } from "../api/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: "login" | "register";
}

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register" && !isPasswordValid) {
      setError("Password must meet security requirements: 8+ characters, letter and number.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const res = await loginUser(email, password);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await registerUser(email, password);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Authentication failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                StockVision Account
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
                {mode === "login" ? "Access saved strategies & alerts" : "Create personal trading workspace"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              mode === "login"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              mode === "register"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
            onClick={() => {
              setMode("register");
              setError(null);
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@stockvision.pro"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              />
            </div>

            {/* Password Validation checklist in register mode */}
            {mode === "register" && (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-1 text-[11px]">
                <div className="flex items-center gap-1.5 font-mono">
                  {hasMinLength ? (
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                  )}
                  <span className={hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  {hasLetter && hasNumber ? (
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                  )}
                  <span className={hasLetter && hasNumber ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400"}>
                    Includes letters & numbers
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (mode === "register" && !isPasswordValid)}
            className="mt-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{loading ? "Authenticating..." : mode === "login" ? "Sign In to Desk" : "Create Workspace Account"}</span>
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {mode === "login" ? "New to StockVision Pro? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              {mode === "login" ? "Create Account" : "Sign In"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
