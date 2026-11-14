import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import { playRetroSound } from '../../utils/soundEffects';
import { verifyMasterPassword } from '../../utils/authGate';

interface HomePageGateProps {
  children: React.ReactNode;
}

/**
 * HomePageGate ensures that accessing the Home Page (Landing Page) requires
 * password verification when opening the website / localhost for guest/unauthenticated users.
 * Once a user is logged in, no password is required to visit the Home Page.
 */
export const HomePageGate: React.FC<HomePageGateProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // Safely check authenticated user without throwing if rendered outside AuthProvider
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;

  // Fresh unverified state on initial open / session
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [accessSuccess, setAccessSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Automatically forward OAuth or email verification queries to AuthCallbackPage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      if (
        search.includes('code=') ||
        search.includes('token_hash=') ||
        search.includes('error=') ||
        hash.includes('access_token=') ||
        hash.includes('error=')
      ) {
        navigate(`/auth/confirm${search}${hash}`, { replace: true });
      }
    }
  }, [navigate]);

  // Autofocus the password field on mount for guest users
  useEffect(() => {
    if (!user && !isUnlocked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [user, isUnlocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Kripya password enter karein (Please enter the access password).');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const isValid = await verifyMasterPassword(password);

      if (isValid) {
        playRetroSound('success');
        setAccessSuccess(true);
        setTimeout(() => {
          setIsUnlocked(true);
        }, 350);
      } else {
        playRetroSound('error');
        setError('Access Denied! Galat password hai. (Incorrect password. Please try again.)');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }
    } catch {
      setError('Verification error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. If user is already logged in, no password needed when navigating to Home Page
  // 2. If guest user has entered correct password for this viewing session, show Home Page
  if (user || isUnlocked) {
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
      {/* Top Bar with Branding & Theme Switcher */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between font-mono text-[12px]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span
            className={`font-bold tracking-wider ${
              theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
            }`}
          >
            AI-POWERED-JOB-APPLYING // SECURITY
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://umeshtemburwar.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[11px] font-mono font-semibold transition-all ${
              theme === 'dark'
                ? 'border-[#2E384D] bg-[#141A26] text-emerald-400 hover:border-emerald-500'
                : 'border-[#18181B] bg-white text-emerald-700 hover:border-emerald-600'
            }`}
          >
            UMESH TEMBURWAR
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>

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
      </div>

      {/* Main Retro Gate Window */}
      <div
        className={`w-full max-w-md border-2 ${
          theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'
        } retro-shadow transition-all ${shake ? 'animate-shake' : ''}`}
      >
        {/* Terminal Title Bar */}
        <div
          className={`px-4 py-2 border-b-2 ${
            theme === 'dark'
              ? 'border-[#2E384D] bg-[#141A26] text-zinc-300'
              : 'border-[#18181B] bg-[#09090B] text-white'
          } flex items-center justify-between font-mono text-[11px] select-none`}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold tracking-wide">
              SECURITY_VERIFICATION // HOME_PAGE_GATE.EXE
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] opacity-75">
            <span>[_]</span>
            <span>[o]</span>
            <span className="text-red-400 font-bold">[X]</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div
              className={`w-14 h-14 mx-auto mb-3 border-2 ${
                theme === 'dark'
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400'
                  : 'border-emerald-600 bg-emerald-50 text-emerald-700'
              } flex items-center justify-center retro-shadow-sm`}
            >
              {accessSuccess ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-500 animate-bounce" />
              ) : (
                <KeyRound className="w-7 h-7" />
              )}
            </div>

            <div className="inline-block px-2 py-0.5 mb-2 text-[10px] font-mono font-bold tracking-wider uppercase border border-amber-500/50 text-amber-500 bg-amber-500/10">
              [RESTRICTED_ACCESS // MANDATORY_GATE]
            </div>

            <h1 className="text-[17px] font-bold font-mono tracking-tight text-theme-primary">
              Home Page Access Verification
            </h1>
            <p
              className={`text-[12px] mt-1.5 leading-relaxed ${
                theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              Website open karne aur Home page dekhne ke liye password enter karein. Sahi password enter karne ke baad hi home page display hoga.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 border-2 border-red-500 bg-red-500/10 text-red-500 text-[12px] font-mono flex items-start gap-2"
            >
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          {/* Success Banner */}
          {accessSuccess && (
            <div
              role="status"
              className="mb-4 p-3 border-2 border-emerald-500 bg-emerald-500/10 text-emerald-400 text-[12px] font-mono flex items-center gap-2 animate-pulse"
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="flex-1 font-bold">
                [ACCESS GRANTED] Opening Home Page...
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="home-page-password"
                className={`block text-[11px] font-mono font-bold mb-1.5 uppercase ${
                  theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                Enter Access Password:
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="home-page-password"
                  name="home-page-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access password"
                  disabled={isSubmitting || accessSuccess}
                  autoComplete="current-password"
                  autoFocus
                  className={`w-full px-3 py-2.5 pr-10 border-2 font-mono text-[13px] ${
                    theme === 'dark'
                      ? 'border-[#2E384D] bg-[#0B0E14] text-white placeholder-zinc-600 focus:border-emerald-500'
                      : 'border-[#18181B] bg-[#F5F3EC] text-black placeholder-zinc-400 focus:border-emerald-600'
                  } outline-none transition-colors duration-150`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 ${
                    theme === 'dark'
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-600 hover:text-black'
                  } cursor-pointer`}
                  title={showPassword ? 'Hide password' : 'Show password'}
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
              disabled={isSubmitting || accessSuccess}
              className="w-full py-2.5 px-4 font-mono font-bold text-[13px] uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-500 retro-shadow cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  VERIFYING CREDENTIALS...
                </>
              ) : accessSuccess ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  ACCESS GRANTED
                </>
              ) : (
                <>
                  UNLOCK &amp; PROCEED TO HOME PAGE
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Direct WhatsApp Contact for Password */}
          <div className="mt-4 pt-3 border-t border-dashed border-[#2E384D]/40 text-center space-y-2">
            <p className={`text-[11px] font-mono leading-tight ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Password nahi hai? Umesh ko WhatsApp par message karke password lein:
            </p>
            <a
              href="https://wa.me/918856087984?text=Hi%20Umesh,%20mujhe%20website%20access%20karne%20ke%20liye%20password%20chahiye%20(AI%20Job%20Apply%20Bot)."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-[11px] font-mono uppercase tracking-wider border-2 border-[#128C7E] retro-shadow-sm cursor-pointer transition-all"
              title="Contact Umesh on WhatsApp for access password"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-10.416c-5.522 0-10 4.477-10 10 0 1.765.459 3.424 1.261 4.869l-1.34 4.898 5.021-1.317c1.389.757 2.974 1.19 4.658 1.19 5.522 0 10-4.477 10-10s-4.478-10-10-10z" />
              </svg>
              <span>GET PASSWORD ON WHATSAPP ↗</span>
            </a>
          </div>

          {/* Quick link to Dashboard / Applications */}
          <div className="mt-5 pt-4 border-t border-dashed border-[#2E384D]/40 text-center">
            <Link
              to="/applications"
              className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold ${
                theme === 'dark'
                  ? 'text-emerald-400 hover:underline'
                  : 'text-emerald-700 hover:underline'
              }`}
            >
              <span>Already signed in? Go to Dashboard / Applications</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Footer note */}
          <div
            className={`mt-4 text-center font-mono text-[10px] ${
              theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'
            }`}
          >
            PROTECTED BY 256-BIT CRYPTOGRAPHIC VERIFICATION
          </div>
        </div>
      </div>
    </div>
  );
};
