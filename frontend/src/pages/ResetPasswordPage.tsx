import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bot, Mail, CheckCircle2, ArrowLeft, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/ui';

export const ResetPasswordPage: React.FC = () => {
  const { user, resetPassword, updatePassword, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Detect if user landed with a recovery token or active recovery session
  const [isUpdateMode, setIsUpdateMode] = useState<boolean>(() => {
    const search = location.search;
    const hash = location.hash;
    return (
      search.includes('type=recovery') ||
      hash.includes('type=recovery') ||
      hash.includes('access_token') ||
      Boolean(user)
    );
  });

  // Request mode state
  const [email, setEmail] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Update mode state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updateSubmitted, setUpdateSubmitted] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const search = location.search;
    const hash = location.hash;
    if (
      search.includes('type=recovery') ||
      hash.includes('type=recovery') ||
      hash.includes('access_token') ||
      Boolean(user)
    ) {
      setIsUpdateMode(true);
    }
  }, [location.search, location.hash, user]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }

    try {
      await resetPassword(email);
      setRequestSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset request failed');
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword.trim()) {
      setError('Please enter your new password.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await updatePassword(newPassword);
      setUpdateSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    }
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-xl bg-theme-accent-muted border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-xl text-theme-primary tracking-tight">
              AI-powered-job-applying
            </span>
          </Link>
          <h2 className="text-2xl font-bold text-theme-primary">
            {isUpdateMode ? 'Set new password' : 'Reset your password'}
          </h2>
          <p className="text-xs text-theme-secondary mt-1">
            {isUpdateMode
              ? 'Enter and confirm your updated account password'
              : 'We will send a secure password reset link to your email'}
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          {/* CASE 1: Password update succeeded */}
          {updateSubmitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-theme-primary">
                Password updated successfully
              </h3>
              <p className="text-xs text-theme-secondary">
                Your password has been changed. You can now access your dashboard and automation workflows.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate(user ? '/dashboard' : '/')}
                >
                  {user ? 'Continue to Dashboard' : 'Proceed to Sign In'}
                </Button>
              </div>
            </div>
          ) : isUpdateMode ? (
            /* CASE 2: Update Mode Form */
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-theme-primary transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                autoComplete="new-password"
                required
              />

              <Input
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                leftIcon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isLoading}
                leftIcon={<KeyRound className="w-4 h-4" />}
              >
                Update Password
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs text-theme-secondary hover:text-theme-primary transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </Link>
              </div>
            </form>
          ) : requestSubmitted ? (
            /* CASE 3: Reset email dispatched */
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-theme-primary">
                Password Reset Email Dispatched
              </h3>
              <p className="text-xs text-theme-secondary">
                Supabase Auth has dispatched an email with a secure password reset link to{' '}
                <span className="text-theme-primary font-medium">{email}</span>. Please check your inbox or spam folder.
              </p>
              <div className="pt-2">
                <Link to="/">
                  <Button variant="primary" className="w-full">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* CASE 4: Initial Reset Request Form */
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Send Password Reset Email
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs text-theme-secondary hover:text-theme-primary transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
