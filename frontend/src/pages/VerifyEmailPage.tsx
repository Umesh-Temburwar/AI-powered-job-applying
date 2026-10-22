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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/ui';
import { getEmailProviderInfo } from '../utils/emailProviders';
import {
  getRemainingCooldown,
  setCooldownExpiry,
  getPendingEmail,
  savePendingEmail,
} from '../utils/cooldown';

export const VerifyEmailPage: React.FC = () => {
  const { user, resendVerificationEmail } = useAuth();
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

  // If user is already authenticated (or confirms in another tab), redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
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
    <div className="min-h-screen bg-theme-base flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle ambient gradient glow background */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-cyan-500/10 via-blue-600/10 to-indigo-500/5 rounded-full blur-3xl pointer-events-none motion-safe:animate-pulse"
        aria-hidden="true"
      />

      <div className="w-full max-w-lg space-y-6 relative z-10">
        {/* Brand header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-2 group">
            <div className="w-10 h-10 rounded-xl bg-theme-accent-muted border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform duration-200">
              <Bot className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-xl text-theme-primary tracking-tight">
              Universal Job Bot
            </span>
          </Link>
        </div>

        {/* Live region for accessibility announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </div>

        {/* Verification Card */}
        <Card className="p-6 sm:p-8 bg-[#101935]/90 border border-[#223561] shadow-[0_10px_35px_-5px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <div className="text-center space-y-5">
            {/* Mail Icon with animated ring glow */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 opacity-20 blur-md"
                aria-hidden="true"
              />
              <div className="relative w-16 h-16 rounded-2xl bg-[#0B132B] border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
                <Mail className="w-8 h-8" />
              </div>
            </div>

            {/* Title & Copy */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-theme-primary tracking-tight">
                Verify your email
              </h1>
              <p className="text-sm text-theme-secondary leading-relaxed">
                We've sent a confirmation link to your email address. Verify your account to get started.
              </p>
              {email ? (
                <div className="pt-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B132B] border border-[#223561] text-xs font-mono text-cyan-300">
                    <span className="truncate max-w-[280px] sm:max-w-xs">{email}</span>
                  </div>
                  <p className="text-[11px] text-theme-muted mt-2 italic">
                    If this address can be used, a link is on its way.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-theme-muted pt-1">
                  Didn't receive an email or used another device? Enter your email address below to resend.
                </p>
              )}
            </div>

            {/* Status alerts */}
            {resendStatus === 'success' && statusMessage && (
              <div
                ref={statusAlertRef}
                tabIndex={-1}
                className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs text-left flex items-start gap-2.5 outline-none"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{statusMessage}</span>
              </div>
            )}

            {resendStatus === 'error' && statusMessage && (
              <div
                ref={errorAlertRef}
                tabIndex={-1}
                className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs text-left flex items-start gap-2.5 outline-none"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Manual email input if email is not available from state */}
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

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              {/* Allowlist-only Webmail button */}
              {providerInfo && (
                <a
                  href={providerInfo.webmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20"
                    rightIcon={<ExternalLink className="w-4 h-4" />}
                  >
                    {providerInfo.buttonLabel}
                  </Button>
                </a>
              )}

              {/* Resend confirmation button */}
              <Button
                type="button"
                variant={providerInfo ? 'outline' : 'primary'}
                className="w-full"
                onClick={() => handleResend()}
                disabled={isResending || secondsRemaining > 0 || (!email && !manualEmail.trim())}
                isLoading={isResending}
                leftIcon={
                  secondsRemaining > 0 ? (
                    <Clock className="w-4 h-4 text-theme-muted" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )
                }
              >
                {secondsRemaining > 0
                  ? `Resend confirmation (${secondsRemaining}s)`
                  : 'Resend confirmation email'}
              </Button>
            </div>

            {/* Help & Navigation */}
            <div className="pt-4 border-t border-theme/50 flex flex-col sm:flex-row items-center justify-between text-xs text-theme-secondary gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-theme-secondary hover:text-theme-primary transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </Link>

              <Link
                to="/register"
                className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>Need a new account?</span>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
