import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Mail,
  Bot,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Input } from '../components/ui';
import { getEmailProviderInfo } from '../utils/emailProviders';
import {
  getRemainingCooldown,
  setCooldownExpiry,
  getPendingEmail,
  savePendingEmail,
} from '../utils/cooldown';

export const VerifyEmailPage: React.FC = () => {
  const { user, resendVerificationEmail } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve email from navigation state or fallback to persistent sessionStorage
  const locationState = location.state as { email?: string } | null;
  const initialEmail = locationState?.email || getPendingEmail() || '';

  const [email, setEmail] = useState<string>(initialEmail);
  const [manualEmail, setManualEmail] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => getRemainingCooldown());

  const errorAlertRef = useRef<HTMLDivElement>(null);
  const statusAlertRef = useRef<HTMLDivElement>(null);

  // If user is already authenticated (or confirms in another tab), redirect to home page
  useEffect(() => {
    if (user) {
      navigate('/applications', { replace: true });
    }
  }, [user, navigate]);

  // Derived countdown timer using Date.now() on each second
  useEffect(() => {
    const updateCountdown = () => {
      const remaining = getRemainingCooldown();
      setSecondsRemaining(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update pending email if given via props/state
  useEffect(() => {
    if (initialEmail) {
      savePendingEmail(initialEmail);
    }
  }, [initialEmail]);

  // Handle focus management when an error occurs
  useEffect(() => {
    if (resendStatus === 'error' && errorAlertRef.current) {
      errorAlertRef.current.focus();
    } else if (resendStatus === 'success' && statusAlertRef.current) {
      statusAlertRef.current.focus();
    }
  }, [resendStatus]);

  const targetEmail = (email || manualEmail).trim();
  const providerInfo = getEmailProviderInfo(targetEmail);

  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetEmail) {
      setResendStatus('error');
      setStatusMessage('Please enter your email address to resend confirmation.');
      return;
    }

    if (secondsRemaining > 0) {
      return;
    }

    setIsResending(true);
    setResendStatus('idle');
    setStatusMessage(null);

    try {
      await resendVerificationEmail(targetEmail);

      // Successfully sent
      savePendingEmail(targetEmail);
      if (!email && manualEmail) {
        setEmail(manualEmail.trim());
      }
      setResendStatus('success');
      setStatusMessage('Confirmation link resent! Please check your inbox and spam folder.');
      setCooldownExpiry(60);
      setSecondsRemaining(60);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Failed to send confirmation email.';
      const isRateLimited =
        rawMsg.toLowerCase().includes('rate limit') ||
        rawMsg.toLowerCase().includes('over_email_send_rate_limit') ||
        rawMsg.includes('429');

      setResendStatus('error');
      if (isRateLimited) {
        setStatusMessage(
          "You've requested several emails recently. Please wait a bit before requesting another link."
        );
        // Extend cooldown on rate limits
        setCooldownExpiry(120);
        setSecondsRemaining(120);
      } else {
        setStatusMessage(rawMsg);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark'
          ? 'retro-grid-dark bg-[#0B0E14] text-[#F4F4F5]'
          : 'retro-grid-light bg-[#F5F3EC] text-[#09090B]'
      } flex flex-col items-center justify-center p-4 font-sans transition-colors duration-150`}
    >
      {/* Top Bar Navigation: Return link + GitHub Badge + Theme Toggle */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between font-mono text-[12px]">
        <Link
          to="/"
          className={`inline-flex items-center gap-1.5 font-bold uppercase hover:underline ${
            theme === 'dark' ? 'text-[#10B981]' : 'text-[#15803D]'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          [RETURN_TO_HOMEPAGE]
        </Link>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Umesh-Temburwar/AI-powered-job-applying"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 border-2 ${
              theme === 'dark'
                ? 'border-[#2E384D] bg-[#141A26] text-emerald-400 hover:border-emerald-400'
                : 'border-[#18181B] bg-white text-zinc-800 hover:bg-zinc-50'
            } retro-shadow-sm text-[11px] font-bold`}
            title="View AI-powered-job-applying on GitHub"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 text-emerald-600" />
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-1.5 border-2 ${
              theme === 'dark'
                ? 'border-[#2E384D] bg-[#141A26] text-amber-300'
                : 'border-[#18181B] bg-white text-zinc-800'
            } retro-shadow-sm cursor-pointer`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Retro Window Container */}
      <div
        className={`w-full max-w-md border-2 ${
          theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'
        } retro-shadow-lg`}
      >
        {/* Retro Window Titlebar */}
        <div
          className={`h-9 border-b-2 ${
            theme === 'dark'
              ? 'border-[#2E384D] bg-[#141A26] text-emerald-400'
              : 'border-[#18181B] bg-[#18181B] text-[#F5F3EC]'
          } px-4 flex items-center justify-between font-mono text-[12px] font-bold select-none`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 inline-block border border-black/40" />
            <span className="w-2.5 h-2.5 bg-amber-400 inline-block border border-black/40" />
            <span className="w-2.5 h-2.5 bg-emerald-500 inline-block border border-black/40" />
            <span className="ml-2 font-mono">AUTH_SESSION // VERIFY_EMAIL.EXE</span>
          </div>
          <span className="text-[10px] font-mono opacity-80">PORT: 5173</span>
        </div>

        {/* Live region for accessibility announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </div>

        {/* Window Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Brand header with link to GitHub repository */}
          <div className="text-center">
            <a
              href="https://github.com/Umesh-Temburwar/AI-powered-job-applying"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-3 py-1 font-mono text-[11px] font-bold uppercase border-2 ${
                theme === 'dark'
                  ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-950/80'
                  : 'border-[#18181B] bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
              } retro-shadow-sm transition-all group`}
            >
              <Bot className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>AI-powered-job-applying</span>
              <ExternalLink className="w-3 h-3 text-emerald-600 opacity-70" />
            </a>
          </div>

          {/* Mail Icon & Heading */}
          <div className="text-center space-y-3">
            <div
              className={`w-14 h-14 border-2 ${
                theme === 'dark'
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400'
                  : 'border-[#18181B] bg-emerald-100 text-emerald-900'
              } mx-auto flex items-center justify-center retro-shadow-sm`}
            >
              <Mail className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-[22px] font-black uppercase tracking-tight">Verify your email</h1>
              <p
                className={`text-[13px] font-mono mt-1 ${
                  theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#52525B]'
                }`}
              >
                We've sent a confirmation link to your email address. Verify your account to get started.
              </p>
            </div>

            {/* Email Address Display Pill */}
            {email ? (
              <div className="pt-1">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 border-2 ${
                    theme === 'dark'
                      ? 'border-cyan-500/50 bg-[#141A26] text-cyan-300'
                      : 'border-[#18181B] bg-emerald-50 text-emerald-900 font-bold'
                  } font-mono text-xs retro-shadow-sm`}
                >
                  <span className="truncate max-w-[280px] sm:max-w-xs">{email}</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-500 mt-2">
                  If this address can be used, a link is on its way.
                </p>
              </div>
            ) : (
              <p className="text-xs font-mono text-zinc-500 pt-1">
                Didn't receive an email or used another device? Enter your email address below to resend.
              </p>
            )}
          </div>

          {/* Status Alert Banners */}
          {resendStatus === 'success' && statusMessage && (
            <div
              ref={statusAlertRef}
              tabIndex={-1}
              className={`p-3.5 border-2 ${
                theme === 'dark'
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                  : 'border-emerald-700 bg-emerald-100 text-emerald-950'
              } font-mono text-xs text-left flex items-start gap-2.5 outline-none retro-shadow-sm`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="font-semibold">{statusMessage}</span>
            </div>
          )}

          {resendStatus === 'error' && statusMessage && (
            <div
              ref={errorAlertRef}
              tabIndex={-1}
              className="p-3.5 border-2 border-red-600 bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-xs text-left flex items-start gap-2.5 outline-none retro-shadow-sm"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="font-semibold">{statusMessage}</span>
            </div>
          )}

          {/* Manual Email Input if state has no email */}
          {!email && (
            <form onSubmit={handleResend} className="text-left space-y-3 pt-2">
              <Input
                label="Registered Email Address"
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="candidate@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
            </form>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-1">
            {/* Direct Webmail Launch Button */}
            {providerInfo && (
              <a
                href={providerInfo.webmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <button
                  type="button"
                  className="w-full py-2.5 px-4 font-mono font-bold text-[13px] uppercase tracking-wide bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-2 border-[#18181B] dark:border-emerald-500 retro-shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px]"
                >
                  <span>{providerInfo.buttonLabel}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </a>
            )}

            {/* Resend Confirmation Button with Cooldown */}
            <button
              type="button"
              onClick={() => handleResend()}
              disabled={isResending || secondsRemaining > 0 || (!email && !manualEmail.trim())}
              className={`w-full py-2.5 px-4 font-mono font-bold text-[13px] uppercase tracking-wide border-2 ${
                theme === 'dark'
                  ? 'border-[#2E384D] bg-[#141A26] text-zinc-200 hover:border-emerald-500'
                  : 'border-[#18181B] bg-white text-zinc-900 hover:bg-zinc-50'
              } retro-shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-x-[1px] active:translate-y-[1px]`}
            >
              {isResending ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
              ) : secondsRemaining > 0 ? (
                <Clock className="w-4 h-4 text-zinc-400" />
              ) : (
                <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>
                {secondsRemaining > 0
                  ? `Resend confirmation (${secondsRemaining}s)`
                  : 'Resend confirmation email'}
              </span>
            </button>
          </div>

          {/* Footer Links */}
          <div className="pt-4 border-t-2 border-dashed border-zinc-300 dark:border-zinc-800 flex items-center justify-between text-xs font-mono">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-bold hover:underline text-zinc-700 dark:text-zinc-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>

            <Link
              to="/register"
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>Need a new account?</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
