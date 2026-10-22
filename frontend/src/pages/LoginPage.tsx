import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';

export const LoginPage: React.FC = () => {
  const { user, login, signInWithGithub, isLoading } = useAuth();
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
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#FFFFFF] border border-[#E5E5E5] rounded-[6px] p-6">
        <h1 className="text-[20px] font-bold text-[#111111] mb-1">
          Sign in
        </h1>
        <p className="text-[13px] text-[#6B6B6B] mb-6">
          Access your job application dashboard.
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-[6px] border border-[#B91C1C] text-[#B91C1C] text-[13px]">
            {error}
          </div>
        )}

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

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Sign In to Dashboard
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleGithubLogin}
            disabled={isLoading || isGithubLoading}
            isLoading={isGithubLoading}
          >
            Continue with GitHub
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E5E5E5] flex items-center justify-between text-[13px]">
          <Link
            to="/register"
            className="text-[#166534] hover:underline"
          >
            Create account
          </Link>
          <Link
            to="/reset-password"
            className="text-[#6B6B6B] hover:text-[#111111]"
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
};
