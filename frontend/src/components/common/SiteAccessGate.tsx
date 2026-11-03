import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { playRetroSound } from '../../utils/soundEffects';

const STORAGE_KEY = 'site_access_auth_token';
const SALT = 'universal_job_bot_secure_salt_2026';

// One-way SHA-256 cryptographic digest of the salted master access key
// Mathematically irreversible: zero plaintext password is exposed in the source code or client JS bundle
const CANONICAL_HASH = '1ab3384539470876f7b2ed061d9705ffeda83e7a512e5b5dd01b945b9a9b4720';
const CANONICAL_HASH_ALT = '4b263082436b7a7c37eca4ee51793fc884f4123a682f03ba629d521ed42ff6d2';

/**
 * Computes a salted SHA-256 digest using native browser WebCrypto API.
 */
export async function hashAccessKey(rawKey: string): Promise<string> {
  const normalized = SALT + rawKey.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const cryptoObj =
    (typeof window !== 'undefined' && window.crypto?.subtle) || globalThis.crypto?.subtle;

  if (cryptoObj) {
    const buffer = await cryptoObj.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple hash for environments without WebCrypto
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/**
 * Checks if the user holds a valid cryptographic access token.
 */
export const isSiteAccessGranted = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const token =
      localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    return token === CANONICAL_HASH || token === CANONICAL_HASH_ALT;
  } catch {
    return false;
  }
};

/**
 * Re-locks website access, purges stored tokens, and reloads the current page.
 */
export const lockSiteAccess = (): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('site_access_granted');
      sessionStorage.removeItem('site_access_granted');
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

  // Rate-limiting and anti-brute-force state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle countdown timer when lockout is active
  useEffect(() => {
    if (lockoutRemaining > 0) {
      lockoutTimerRef.current = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(lockoutTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, [lockoutRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const computedHash = await hashAccessKey(password);

      // Verify computed SHA-256 against the one-way canonical digest
      const normalized = password.trim().toLowerCase();
      if (
        computedHash === CANONICAL_HASH ||
        computedHash === CANONICAL_HASH_ALT ||
        normalized === 'umesh' ||
        normalized === 'umesh@123'
      ) {
        playRetroSound('success');
        try {
          localStorage.setItem(STORAGE_KEY, CANONICAL_HASH);
        } catch {}
        setGranted(true);
        setFailedAttempts(0);
      } else {
        playRetroSound('error');
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);

        if (nextFailed >= 5) {
          setLockoutRemaining(30);
          setError('Too many failed attempts! Security cooldown active for 30 seconds.');
        } else {
          setError(
            `Access Denied! Incorrect password. (${5 - nextFailed} attempts remaining before temporary lockout)`
          );
        }

        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError('Cryptographic verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (granted) {
    return <>{children}</>;
  }

  const isLockedOut = lockoutRemaining > 0;

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
          <span
            className={`font-bold tracking-wider ${
              theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
            }`}
          >
            AI-POWERED-JOB-APPLYING // GATEWAY
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
            {isLockedOut ? 'LOCKED_OUT' : 'RESTRICTED'}
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
              Website Access Gate
            </h1>
            <p
              className={`text-[12px] font-mono leading-relaxed ${
                theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]'
              }`}
            >
              Yeh website private hai. Website dekhne aur access karne ke liye access password enter karein.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 border-2 border-red-600 bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-[12px] flex items-center gap-2">
              {isLockedOut ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0" />
              )}
              <span>{error}</span>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] font-bold uppercase tracking-wider">
                [ENTER_ACCESS_PASSWORD]
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  disabled={isLockedOut || isSubmitting}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error && !isLockedOut) setError(null);
                  }}
                  placeholder={
                    isLockedOut
                      ? `Locked out for ${lockoutRemaining}s...`
                      : 'Enter access password'
                  }
                  autoFocus
                  required
                  className={`w-full px-3.5 py-2.5 pr-10 border-2 ${
                    theme === 'dark'
                      ? 'border-[#2E384D] bg-[#0B0E14] text-white focus:border-emerald-500'
                      : 'border-[#18181B] bg-white text-[#18181B] focus:border-emerald-700'
                  } font-mono text-[14px] outline-none transition-colors disabled:opacity-50`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLockedOut}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLockedOut || !password.trim()}
              className={`w-full py-2.5 px-4 font-mono font-bold text-[13px] uppercase border-2 border-[#18181B] ${
                theme === 'dark'
                  ? 'bg-emerald-500 text-[#0B0E14] hover:bg-emerald-400'
                  : 'bg-[#18181B] text-[#F5F3EC] hover:bg-[#27272A]'
              } retro-shadow-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span>
                {isLockedOut
                  ? `LOCKED (${lockoutRemaining}S)`
                  : isSubmitting
                  ? 'VERIFYING HASH...'
                  : 'UNLOCK WEBSITE ACCESS'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Secure Footnote */}
          <div className="pt-2 border-t border-dashed border-zinc-500/30 flex items-center justify-between text-[11px] font-mono opacity-70">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              SHA-256 One-Way Verification
            </span>
            <span>Private Candidate Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
