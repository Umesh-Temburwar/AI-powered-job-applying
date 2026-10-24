import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Input } from '../components/ui';
import { savePendingEmail, setCooldownExpiry } from '../utils/cooldown';
import { Zap, ShieldCheck, Sparkles, CheckCircle2, ArrowRight, Sun, Moon, Lock } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { user, register, signInWithGithub, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleGithubSignup = async () => {
    setError(null);
    setIsGithubLoading(true);
    try {
      await signInWithGithub();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub registration failed.');
      setIsGithubLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please complete all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (!agreeTerms) {
      setError('You must accept platform limits.');
      return;
    }

    try {
      const result = await register(email, password, fullName);
      if (result.needsEmailVerification) {
        const cleanEmail = email.trim();
        savePendingEmail(cleanEmail);
        setCooldownExpiry(60);
        navigate('/verify-email', { state: { email: cleanEmail } });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          
          {/* Left Visual Branding Panel */}
          <div className="hidden md:flex flex-col justify-between p-8 sm:p-10 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white relative overflow-hidden border-r border-slate-800">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-6">
                <Sparkles className="w-3.5 h-3.5" /> Start Free in 60 Seconds
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-3">
                Unlock 10x more interview opportunities.
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Join thousands of tech professionals automating their job pipeline across Naukri, LinkedIn, Internshala, and Indeed with stealth timing.
              </p>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Connect 9+ job portals in one unified dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Smart ATS resume tailoring matching job keywords</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Automatic screening test & questionnaire answers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero risk of ban with randomized human cadence</span>
                </div>
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="relative z-10 mt-8 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">100% Privacy Protected</h4>
                <p className="text-[11px] text-slate-400">Credentials stored safely on your machine.</p>
              </div>
            </div>

            {/* Ambient Background glow */}
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Right Form Panel */}
          <div className="p-6 sm:p-10 flex flex-col justify-center">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Create account
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Set up your profile to launch background automation runs.
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
              onClick={handleGithubSignup}
              disabled={isLoading || isGithubLoading}
              isLoading={isGithubLoading}
              leftIcon={
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              }
            >
              Sign up with GitHub
            </Button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                or with email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Vance"
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded-md border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-500"
                  />
                  <span>I agree to abide by portal terms and safe daily application rate limits.</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 font-bold shadow-md shadow-emerald-500/20"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Account & Launch Bot
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-600 py-2">
        AutoApply AI • Automated job hunting engine built for developers.
      </div>

    </div>
  );
};

export default RegisterPage;
