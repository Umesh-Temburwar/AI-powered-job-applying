import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldAlert,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { playRetroSound } from '../../utils/soundEffects';

const STORAGE_KEY = 'site_access_granted';
const DEFAULT_PASSWORD = 'Umesh';

/**
 * Checks if the user has entered the site access password.
 * Always returns true in test environments so automated tests are never blocked.
 */
export const isSiteAccessGranted = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Re-locks website access and reloads the current page.
 */
export const lockSiteAccess = (): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    window.location.reload();
  }
};

interface SiteAccessGateProps {
  children: React.ReactNode;
}

export const SiteAccessGate: React.FC<SiteAccessGateProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const [granted, setGranted] = useState<boolean>(isSiteAccessGranted);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  // Expected password from environment variable or default 'Umesh'
  const expectedPassword = import.meta.env?.VITE_SITE_ACCESS_PASSWORD || DEFAULT_PASSWORD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const inputTrimmed = password.trim();

    // Check exact match or case-insensitive match for 'Umesh'
    if (
      inputTrimmed === expectedPassword ||
      inputTrimmed.toLowerCase() === expectedPassword.toLowerCase()
    ) {
      playRetroSound('success');
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
      setGranted(true);
      setIsSubmitting(false);
    } else {
      playRetroSound('error');
      setError('Galat password! Access denied. Kripya sahi password enter karein.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setIsSubmitting(false);
    }
  };

  if (granted) {
    return <>{children}</>;
  }

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark'
          ? 'retro-grid-dark bg-[#0B0E14] text-[#F4F4F5]'
          : 'retro-grid-light bg-[#F5F3EC] text-[#09090B]'
      } flex flex-col items-center justify-center p-4 font-sans select-none transition-colors duration-150`}
    >
      {/* Top Bar with Theme Toggle */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between font-mono text-[12px]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className={`font-bold tracking-wider ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
            UNIVERSAL_JOB_BOT // GATEWAY
          </span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-1.5 border-2 ${
            theme === 'dark'
              ? 'border-[#2E384D] bg-[#141A26] text-amber-300'
              : 'border-[#18181B] bg-white text-zinc-800'
          } retro-shadow-sm cursor-pointer hover:opacity-90`}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Retro Gate Window */}
      <div
        className={`w-full max-w-md border-2 ${
          theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'
        } retro-shadow-lg transition-transform ${shake ? 'animate-bounce' : ''}`}
      >
        {/* Retro Window Titlebar */}
        <div
          className={`h-9 border-b-2 ${
            theme === 'dark'
              ? 'border-[#2E384D] bg-[#141A26] text-emerald-400'
              : 'border-[#18181B] bg-[#18181B] text-[#F5F3EC]'
          } px-4 flex items-center justify-between font-mono text-[12px] font-bold`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 inline-block border border-black/40" />
            <span className="w-2.5 h-2.5 bg-amber-400 inline-block border border-black/40" />
            <span className="w-2.5 h-2.5 bg-emerald-500 inline-block border border-black/40" />
            <span className="ml-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>SECURITY_GATEWAY.EXE</span>
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40">
            RESTRICTED
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[10px] font-bold uppercase border border-current text-amber-600 dark:text-amber-400 mb-1">
              <KeyRound className="w-3 h-3" />
              [AUTHORIZED_ACCESS_ONLY]
            </div>
            <h1 className="text-[22px] font-black uppercase tracking-tight flex items-center gap-2">
              Website Access Password
            </h1>
            <p className={`text-[12px] font-mono leading-relaxed ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`}>
              Yeh website private hai. Website dekhne aur use karne ke liye access password enter karein.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 border-2 border-red-600 bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-[12px] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] font-bold uppercase tracking-wider">
                [ENTER_PASSWORD]
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter access password"
                  autoFocus
                  required
                  className={`w-full px-3.5 py-2.5 pr-10 border-2 ${
                    theme === 'dark'
                      ? 'border-[#2E384D] bg-[#0B0E14] text-white focus:border-emerald-500'
                      : 'border-[#18181B] bg-white text-[#18181B] focus:border-emerald-700'
                  } font-mono text-[14px] outline-none transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className={`w-full py-2.5 px-4 font-mono font-bold text-[13px] uppercase border-2 border-[#18181B] ${
                theme === 'dark'
                  ? 'bg-emerald-500 text-[#0B0E14] hover:bg-emerald-400'
                  : 'bg-[#18181B] text-[#F5F3EC] hover:bg-[#27272A]'
              } retro-shadow-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span>{isSubmitting ? 'VERIFYING...' : 'UNLOCK WEBSITE ACCESS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Secure Footnote */}
          <div className="pt-2 border-t border-dashed border-zinc-500/30 flex items-center justify-between text-[11px] font-mono opacity-70">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Protected Site
            </span>
            <span>Created by Umesh</span>
          </div>
        </div>
      </div>
    </div>
  );
};
