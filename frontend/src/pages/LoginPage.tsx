import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Input } from '../components/ui';
import { Zap, Sparkles, CheckCircle2, ArrowRight, Sun, Moon } from 'lucide-react';

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
      navigate('/dashboard', { replace: true });
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
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">
      
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
            AutoApply<span className="text-emerald-500">.ai</span>
          </span>
        </Link>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Card Container */}
      <div className="flex-1 flex items-center justify-center py-6">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xl overflow-hidden">
          
          {/* Left Visual Branding Panel (hidden on small screens) */}
          <div className="hidden md:flex flex-col justify-between p-8 sm:p-10 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white relative overflow-hidden border-r border-slate-800">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-6">
                <Sparkles className="w-3.5 h-3.5" /> 9 Major Portals Connected
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-3">
                Automate your dream tech job search.
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Save 40+ hours per month. AutoApply AI matches open positions on Naukri, LinkedIn, and Indeed, tailors your ATS resume, and auto-applies with stealth timing.
              </p>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dynamic ATS keyword extraction</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Autonomous screening question solver</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Human-like anti-detection pauses</span>
                </div>
              </div>
            </div>

            {/* Testimonial mini card */}
            <div className="relative z-10 mt-8 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-xs text-slate-300 italic mb-2">
                "AutoApply sent 150+ tailored applications for React Lead roles and got me 4 interview calls in 10 days."
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Rohit K. • Senior Dev</span>
                <span className="text-emerald-400 font-semibold">Verified Offer</span>
              </div>
            </div>

            {/* Ambient Background blur */}
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Right Form Panel */}
          <div className="p-6 sm:p-10 flex flex-col justify-center">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Welcome back
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Access your applications dashboard and live bot runner.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            {/* GitHub OAuth Button */}
            <Button
              type="button"
              variant="secondary"
              className="w-full mb-4 py-2.5 flex items-center justify-center gap-2 font-semibold text-xs"
              onClick={handleGithubLogin}
              disabled={isLoading || isGithubLoading}
              isLoading={isGithubLoading}
              leftIcon={
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              }
            >
              Continue with GitHub
            </Button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                or with email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />

              <div>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <div className="flex justify-end mt-1.5">
                  <Link
                    to="/reset-password"
                    className="text-xs text-slate-500 hover:text-emerald-500 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 font-bold shadow-md shadow-emerald-500/20"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Dashboard
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
              Don't have an account yet?{' '}
              <Link to="/register" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                Create free account
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-600 py-2">
        AutoApply AI • Bank-grade encryption & local credential safety.
      </div>

    </div>
  );
};
