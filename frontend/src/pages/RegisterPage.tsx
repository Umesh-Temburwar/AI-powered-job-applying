import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { savePendingEmail, setCooldownExpiry } from '../utils/cooldown';

export const RegisterPage: React.FC = () => {
  const { user, register, signInWithGithub, isLoading } = useAuth();
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
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#FFFFFF] border border-[#E5E5E5] rounded-[6px] p-6">
        <h1 className="text-[20px] font-bold text-[#111111] mb-1">
          Create account
        </h1>
        <p className="text-[13px] text-[#6B6B6B] mb-6">
          Set up your profile to start automation runs.
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-[6px] border border-[#B91C1C] text-[#B91C1C] text-[13px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
          />

          <div className="pt-1">
            <label className="flex items-start gap-2 text-[13px] text-[#6B6B6B] cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 rounded-[4px] border-[#E5E5E5] text-[#166534] focus:ring-[#166534]"
              />
              <span>I agree to follow platform policies and rate limits.</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Create Account
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleGithubSignup}
            disabled={isLoading || isGithubLoading}
            isLoading={isGithubLoading}
          >
            Continue with GitHub
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E5E5E5] text-center text-[13px] text-[#6B6B6B]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#166534] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
