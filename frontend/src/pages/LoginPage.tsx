import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowRight, Sun, Moon, ArrowLeft, ShieldAlert, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, login, signInWithGithub, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as any)?.message || 'Login failed');
    }
  };

  const handleGithubLogin = async () => {
    setError(null);
    setIsGithubLoading(true);
    try {
      await signInWithGithub();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub login failed.');
      setIsGithubLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'retro-grid-dark bg-[#0B0E14] text-[#F4F4F5]' : 'retro-grid-light bg-[#F5F3EC] text-[#09090B]'} flex flex-col items-center justify-center p-4 font-sans transition-colors duration-150`}>

      {/* Return to home link */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between font-mono text-[12px]">
        <Link
          to="/"
          className={`inline-flex items-center gap-1.5 font-bold uppercase hover:underline ${theme === 'dark' ? 'text-[#10B981]' : 'text-[#15803D]'}`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          [RETURN_TO_HOMEPAGE]
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-1.5 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-amber-300' : 'border-[#18181B] bg-white text-zinc-800'} retro-shadow-sm cursor-pointer`}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Retro Auth Window */}
      <div className={`w-full max-w-md border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'} retro-shadow-lg`}>

        {/* Retro Window Titlebar */}
        <div className={`h-9 border-b-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-emerald-400' : 'border-[#18181B] bg-[#18181B] text-[#F5F3EC]'} px-4 flex items-center justify-between font-mono text-[12px] font-bold select-none`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 inline-block border border-black/40" />
            <span className="w-2.5 h-2.5 bg-amber-400 inline-block border border-black/40" />
            <span className="w-2.5 h-2.5 bg-emerald-500 inline-block border border-black/40" />
            <span className="ml-2 font-mono">AUTH_SESSION // LOGIN.EXE</span>
          </div>
          <span className="text-[10px] font-mono opacity-80">PORT: 5173</span>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <div className="inline-block px-2 py-0.5 font-mono text-[10px] font-bold uppercase border border-current text-emerald-600 mb-1">
              [AUTHENTICATED ACCESS]
            </div>
            <h1 className="text-[22px] font-black uppercase tracking-tight">
              Sign In to Workspace
            </h1>
            <p className={`text-[13px] font-mono ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`}>
              Enter candidate or administrator credentials to continue.
            </p>
          </div>

          {error && (
            <div className="p-3 border-2 border-red-600 bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-[12px] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block font-mono text-[12px] font-bold uppercase">
                [EMAIL_ADDRESS]
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="umeshtemburwar2002@gmail.com"
                autoComplete="email"
                aria-label="Email Address"
                required
                className={`w-full px-3.5 py-2.5 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#0B0E14] text-white focus:border-emerald-500' : 'border-[#18181B] bg-white text-[#18181B] focus:border-emerald-700'} font-mono text-[13px] outline-none transition-colors`}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block font-mono text-[12px] font-bold uppercase">
                  [PASSWORD]
                </label>
                <Link
                  to="/reset-password"
                  className="font-mono text-[11px] underline opacity-70 hover:opacity-100"
                >
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-label="Password"
                required
                className={`w-full px-3.5 py-2.5 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#0B0E14] text-white focus:border-emerald-500' : 'border-[#18181B] bg-white text-[#18181B] focus:border-emerald-700'} font-mono text-[13px] outline-none transition-colors`}
              />
            </div>

            {/* Admin Notice */}
            <div className={`p-2.5 border ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-emerald-300' : 'border-[#18181B] bg-[#F5F3EC] text-[#15803D]'} font-mono text-[11px] flex items-center gap-1.5`}>
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span>Admin: <strong className="underline">umeshtemburwar2002@gmail.com</strong></span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 font-mono text-[13px] font-bold uppercase border-2 ${theme === 'dark'
                ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14] hover:bg-[#34D399]'
                : 'border-[#18181B] bg-[#15803D] text-white hover:bg-[#166534]'
                } retro-shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
            >
              {isLoading ? 'VERIFYING CREDENTIALS...' : 'SIGN IN TO DASHBOARD'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleGithubLogin}
              disabled={isLoading || isGithubLoading}
              className={`w-full py-2 font-mono text-[12px] font-bold uppercase border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-white hover:border-emerald-500' : 'border-[#18181B] bg-white text-[#18181B] hover:bg-[#F5F3EC]'
                } retro-shadow-sm transition-all cursor-pointer`}
            >
              {isGithubLoading ? 'CONNECTING GITHUB...' : 'CONTINUE WITH GITHUB'}
            </button>
          </form>

          {/* Footer inside card */}
          <div className={`pt-4 border-t-2 ${theme === 'dark' ? 'border-[#2E384D]' : 'border-[#18181B]'} flex items-center justify-between font-mono text-[12px]`}>
            <span className="opacity-70">Don't have an account?</span>
            <Link
              to="/register"
              className={`font-bold underline ${theme === 'dark' ? 'text-[#10B981]' : 'text-[#15803D]'}`}
            >
              [REGISTER_NEW]
            </Link>
          </div>
        </div>
      </div>

      {/* Credit footer */}
      <div className="mt-6 font-mono text-[11px] opacity-60 text-center">
        UNIVERSAL_JOB_BOT // CRAFTED BY UMESH TEMBURWAR
      </div>
    </div>
  );
};
