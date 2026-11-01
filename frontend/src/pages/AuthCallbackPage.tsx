import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ArrowRight,
  RefreshCw,
  Bot,
  Mail,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input } from '../components/ui';
import {
  getPendingEmail,
  savePendingEmail,
  getRemainingCooldown,
  setCooldownExpiry,
} from '../utils/cooldown';
import type { EmailOtpType } from '@supabase/supabase-js';

export type CallbackState =
  | 'verifying'
  | 'verified'
  | 'failed_expired'
  | 'missing_token'
  | 'already_verified'
  | 'network_error';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resendVerificationEmail } = useAuth();

  const [state, setState] = useState<CallbackState>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [emailForResend, setEmailForResend] = useState<string>(() => getPendingEmail() || '');
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() => getRemainingCooldown());

  // StrictMode double-execution protection
  const hasExecutedRef = useRef<boolean>(false);

  // Sync cooldown ticks
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldownSeconds(getRemainingCooldown());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-redirect to dashboard when verified
  useEffect(() => {
    if (state === 'verified' || state === 'already_verified') {
      const timer = setTimeout(() => {
        navigate('/applications', { replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state, navigate]);

  useEffect(() => {
    // If already executed in this mount lifecycle, avoid double call
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;

    const handleCallback = async () => {
      // 1. Check for URL query params and hash fragments (support both React Router and window)
      const searchString = location.search || (typeof window !== 'undefined' ? window.location.search : '');
      const searchParams = new URLSearchParams(searchString);

      const rawHash = location.hash || (typeof window !== 'undefined' ? window.location.hash : '');
      const hash = rawHash.startsWith('#') ? rawHash.substring(1) : rawHash;
      const hashParams = new URLSearchParams(hash);

      // Check for errors returned in query or hash (e.g., otp_expired, access_denied)
      const urlError = searchParams.get('error') || hashParams.get('error');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const errorDescription =
        searchParams.get('error_description') || hashParams.get('error_description');

      // Strip sensitive tokens, hashes, and codes from the browser address bar immediately
      if (window.location.search || window.location.hash) {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}
      }

      // Handle explicit error returned from Supabase Auth service
      if (urlError || errorCode) {
        setState('failed_expired');
        const formatted = errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : 'Your verification link has expired or is invalid.';
        setErrorMessage(formatted);
        return;
      }

      const typeParam = (searchParams.get('type') || hashParams.get('type')) as EmailOtpType | null;

      // 2. Case A: PKCE code exchange (?code=...)
      const code = searchParams.get('code');
      if (code) {
        try {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            // Check if already used or expired
            if (
              exchangeErr.message.toLowerCase().includes('expired') ||
              exchangeErr.message.toLowerCase().includes('invalid')
            ) {
              setState('failed_expired');
            } else {
              setState('network_error');
            }
            setErrorMessage(exchangeErr.message);
            return;
          }

          if (typeParam === 'recovery' || searchParams.get('next') === '/reset-password') {
            navigate('/reset-password', { replace: true });
            return;
          }

          setState('verified');
          return;
        } catch (err: unknown) {
          setState('network_error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to exchange authentication code');
          return;
        }
      }

      // 3. Case B: Token hash verification (?token_hash=...&type=...)
      const tokenHash = searchParams.get('token_hash');
      if (tokenHash) {
        try {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: typeParam || 'email',
          });

          if (otpErr) {
            if (
              otpErr.message.toLowerCase().includes('expired') ||
              otpErr.message.toLowerCase().includes('invalid')
            ) {
              setState('failed_expired');
            } else {
              setState('network_error');
            }
            setErrorMessage(otpErr.message);
            return;
          }

          if (typeParam === 'recovery') {
            navigate('/reset-password', { replace: true });
            return;
          }

          setState('verified');
          return;
        } catch (err: unknown) {
          setState('network_error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to verify authentication token');
          return;
        }
      }

      // 4. Case C: Implicit token in URL hash (#access_token=...)
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        // supabase-js auto-detects session in URL, confirm session exists
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          setState('verified');
          return;
        }
      }

      // 5. Case D: User already signed in / session active
      const { data: currentSessionData } = await supabase.auth.getSession();
      if (currentSessionData?.session?.user) {
        setState('already_verified');
        return;
      }

      // 6. Case E: No valid verification tokens or params provided
      setState('missing_token');
      setErrorMessage('No verification code or token was found in this link.');
    };

    handleCallback();
  }, [location.search, location.hash, navigate]);

  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = emailForResend.trim();
    if (!cleanEmail) {
      setResendStatus('error');
      setResendMessage('Please enter your email to receive a new link.');
      return;
    }

    if (cooldownSeconds > 0) return;

    setIsResending(true);
    setResendStatus('idle');
    setResendMessage(null);

    try {
      await resendVerificationEmail(cleanEmail);
      savePendingEmail(cleanEmail);
      setResendStatus('success');
      setResendMessage('A fresh confirmation link has been sent to your email.');
      setCooldownExpiry(60);
      setCooldownSeconds(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend confirmation email';
      const isRateLimited =
        msg.toLowerCase().includes('rate limit') ||
        msg.toLowerCase().includes('over_email_send_rate_limit') ||
        msg.includes('429');

      setResendStatus('error');
      if (isRateLimited) {
        setResendMessage("You've requested too many links recently. Please wait a bit.");
        setCooldownExpiry(120);
        setCooldownSeconds(120);
      } else {
        setResendMessage(msg);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow accent */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-cyan-500/10 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none"
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

        {/* Live status announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {state} {resendMessage}
        </div>

        <Card className="p-6 sm:p-8 bg-[#101935]/90 border border-[#223561] shadow-[0_10px_35px_-5px_rgba(0,0,0,0.5)] backdrop-blur-md">
          {/* STATE 1: VERIFYING IN FLIGHT */}
          {state === 'verifying' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0B132B] border border-cyan-500/40 text-cyan-400 mx-auto flex items-center justify-center shadow-inner">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-theme-primary tracking-tight">
                Verifying your email...
              </h2>
              <p className="text-sm text-theme-secondary max-w-sm mx-auto">
                Please wait a moment while we securely validate your confirmation token.
              </p>
            </div>
          )}

          {/* STATE 2: VERIFIED SUCCESSFULLY */}
          {state === 'verified' && (
            <div className="text-center space-y-5 py-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-theme-primary tracking-tight">
                  Email verified successfully
                </h2>
                <p className="text-sm text-theme-secondary">
                  Your account is ready. You can now access your dashboard and configure job automation.
                </p>
              </div>

              <div className="pt-3">
                <Button
                  variant="primary"
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20"
                  onClick={() => navigate('/applications')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to dashboard
                </Button>
              </div>
            </div>
          )}

          {/* STATE 3: ALREADY VERIFIED */}
          {state === 'already_verified' && (
            <div className="text-center space-y-5 py-2">
              <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 text-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-theme-primary tracking-tight">
                  Already verified
                </h2>
                <p className="text-sm text-theme-secondary">
                  Your email is already confirmed and your active session is valid.
                </p>
              </div>

              <div className="pt-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate('/applications')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to dashboard
                </Button>
              </div>
            </div>
          )}

          {/* STATE 4: FAILED OR EXPIRED LINK */}
          {state === 'failed_expired' && (
            <div className="text-center space-y-5 py-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Clock className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-theme-primary tracking-tight">
                  Verification link expired
                </h2>
                <p className="text-sm text-theme-secondary">
                  {errorMessage ||
                    'This verification link has expired or has already been used. Please request a new confirmation email below.'}
                </p>
              </div>

              {/* Resend status banners */}
              {resendStatus === 'success' && resendMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs text-left flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{resendMessage}</span>
                </div>
              )}

              {resendStatus === 'error' && resendMessage && (
                <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs text-left flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{resendMessage}</span>
                </div>
              )}

              {/* Resend Form */}
              <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
                <Input
                  label="Registered Email"
                  type="email"
                  value={emailForResend}
                  onChange={(e) => setEmailForResend(e.target.value)}
                  placeholder="candidate@example.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isResending}
                  disabled={isResending || cooldownSeconds > 0 || !emailForResend.trim()}
                  leftIcon={
                    cooldownSeconds > 0 ? (
                      <Clock className="w-4 h-4 text-theme-muted" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )
                  }
                >
                  {cooldownSeconds > 0
                    ? `Resend available in ${cooldownSeconds}s`
                    : 'Resend confirmation email'}
                </Button>
              </form>

              <div className="pt-3 border-t border-theme/50 text-xs text-theme-secondary">
                <Link to="/login" className="text-[var(--accent)] hover:underline font-semibold">
                  Back to sign in
                </Link>
              </div>
            </div>
          )}

          {/* STATE 5: MISSING TOKEN */}
          {state === 'missing_token' && (
            <div className="text-center space-y-5 py-2">
              <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-400 mx-auto flex items-center justify-center shadow-lg shadow-red-500/10">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-theme-primary tracking-tight">
                  Invalid verification link
                </h2>
                <p className="text-sm text-theme-secondary">
                  No verification token or code was provided in this URL. Please verify you clicked the complete link from your email.
                </p>
              </div>

              <div className="pt-3 space-y-2">
                <Link to="/verify-email" className="block w-full">
                  <Button variant="primary" className="w-full">
                    Go to email verification screen
                  </Button>
                </Link>
                <Link to="/login" className="block w-full">
                  <Button variant="outline" className="w-full">
                    Back to sign in
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* STATE 6: NETWORK OR UNKNOWN ERROR */}
          {state === 'network_error' && (
            <div className="text-center space-y-5 py-2">
              <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-theme-primary tracking-tight">
                  Verification failed
                </h2>
                <p className="text-sm text-theme-secondary">
                  {errorMessage || 'A network error occurred while verifying your account. Please try again.'}
                </p>
              </div>

              <div className="pt-3 space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => window.location.reload()}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  Retry verification
                </Button>

                <Link to="/login" className="block w-full">
                  <Button variant="outline" className="w-full">
                    Return to sign in
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
