import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { savePendingEmail, setCooldownExpiry } from '../utils/cooldown';
import { ArrowLeft, ArrowRight, Sun, Moon, ShieldAlert } from 'lucide-react';

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
      navigate('/applications', { replace: true });
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
      setError('You must accept platform limits and safe execution policies.');
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
        navigate('/applications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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

      {/* Main Retro Registration Window */}
      <div className={`w-full max-w-md border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'} retro-shadow-lg`}>

        {/* Retro Window Titlebar */}
        <div className={`h-9 border-b-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-emerald-400' : 'border-[#18181B] bg-[#18181B] text-[#F5F3EC]'} px-4 flex items-center justify-between font-mono text-[12px] font-bold select-none`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 inline-block border border-black/40" />
            <span className="w-2.5 h-2.5 bg-amber-400 inline-block border border-black/40" />
            <span className="w-2.5 h-2.5 bg-emerald-500 inline-block border border-black/40" />
            <span className="ml-2 font-mono">AUTH_SESSION // REGISTER.EXE</span>
          </div>
          <span className="text-[10px] font-mono opacity-80">CREATE_USER</span>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5">
          <div>
            <div className="inline-block px-2 py-0.5 font-mono text-[10px] font-bold uppercase border border-current text-emerald-600 mb-1">
              [NEW CANDIDATE REGISTRATION]
            </div>
            <h1 className="text-[22px] font-black uppercase tracking-tight">
              Create Candidate Account
            </h1>
            <p className={`text-[13px] font-mono ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`}>
              Configure your credentials to begin background automation.
            </p>
          </div>

          {error && (
            <div className="p-3 border-2 border-red-600 bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-[12px] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-bold uppercase">
                [FULL_NAME]
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Umesh Temburwar"
                required
                className={`w-full px-3.5 py-2 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#0B0E14] text-white focus:border-emerald-500' : 'border-[#18181B] bg-white text-[#18181B] focus:border-emerald-700'} font-mono text-[13px] outline-none transition-colors`}
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-bold uppercase">
                [EMAIL_ADDRESS]
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
                autoComplete="email"
                aria-label="Email Address"
                required
                className={`w-full px-3.5 py-2 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#0B0E14] text-white focus:border-emerald-500' : 'border-[#18181B] bg-white text-[#18181B] focus:border-emerald-700'} font-mono text-[13px] outline-none transition-colors`}
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-bold uppercase">
                [PASSWORD]
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
                className={`w-full px-3.5 py-2 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#0B0E14] text-white focus:border-emerald-500' : 'border-[#18181B] bg-white text-[#18181B] focus:border-emerald-700'} font-mono text-[13px] outline-none transition-colors`}
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[11px] font-bold uppercase">
                [CONFIRM_PASSWORD]
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                required
                className={`w-full px-3.5 py-2 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#0B0E14] text-white focus:border-emerald-500' : 'border-[#18181B] bg-white text-[#18181B] focus:border-emerald-700'} font-mono text-[13px] outline-none transition-colors`}
              />
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2 text-[12px] font-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 accent-emerald-600 cursor-pointer"
                />
                <span>I agree to abide by portal rate limits and automated anti-detection terms.</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 font-mono text-[13px] font-bold uppercase border-2 ${theme === 'dark'
                ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14] hover:bg-[#34D399]'
                : 'border-[#18181B] bg-[#15803D] text-white hover:bg-[#166534]'
                } retro-shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
            >
              {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleGithubSignup}
              disabled={isLoading || isGithubLoading}
              className={`w-full py-2 font-mono text-[12px] font-bold uppercase border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-white hover:border-emerald-500' : 'border-[#18181B] bg-white text-[#18181B] hover:bg-[#F5F3EC]'
                } retro-shadow-sm transition-all cursor-pointer`}
            >
              {isGithubLoading ? 'CONNECTING GITHUB...' : 'REGISTER WITH GITHUB'}
            </button>
          </form>

          {/* Footer inside card */}
          <div className={`pt-4 border-t-2 ${theme === 'dark' ? 'border-[#2E384D]' : 'border-[#18181B]'} flex items-center justify-between font-mono text-[12px]`}>
            <span className="opacity-70">Already have an account?</span>
            <Link
              to="/"
              className={`font-bold underline ${theme === 'dark' ? 'text-[#10B981]' : 'text-[#15803D]'}`}
            >
              [SIGN_IN_HERE]
            </Link>
          </div>
        </div>
      </div>

      {/* Credit footer */}
      <div className="mt-6 font-mono text-[11px] opacity-60 text-center">
        AI-POWERED-JOB-APPLYING // CRAFTED BY UMESH TEMBURWAR
      </div>
    </div>
  );
};
