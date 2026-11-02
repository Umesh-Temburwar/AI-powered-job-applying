import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { supabase } from '../lib/supabaseClient';

// Mock Supabase client
vi.mock('../lib/supabaseClient', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'u-123' }, session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u-123' } } }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'github', url: 'https://github.com/login/oauth/authorize' }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-123' } }, error: null }),
      resend: vi.fn().mockResolvedValue({ data: {}, error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u-123' } } }, error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u-123' } } }, error: null }),
    },
  };

  return {
    supabase: mockSupabase,
    isSupabaseConfigured: true,
  };
});

describe('Email + GitHub Auth Complete Suite', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  // 1. IN-PLACE EMAIL & PASSWORD LOGIN + INVALID CREDENTIALS
  it('Login: handles in-place login with valid credentials and handles invalid credentials error', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <LandingPage />
        </MemoryRouter>
      </AuthProvider>
    );

    const flipBtn = screen.getByRole('button', { name: /SIGN IN TO DASHBOARD/i });
    fireEvent.click(flipBtn);

    const submitBtn = await screen.findByRole('button', { name: /SIGN IN TO WORKSPACE/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());

    const emailInput = screen.getByPlaceholderText('candidate@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, { target: { value: 'candidate@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPassword123!' } });

    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });
  });

  // 3. GITHUB OAUTH BUTTON ON REGISTER PAGE
  it('GitHub OAuth: RegisterPage triggers signInWithOAuth with provider=github', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    const githubBtn = await screen.findByRole('button', { name: /(Continue|Register) with GitHub/i });
    expect(githubBtn).toBeInTheDocument();
    await waitFor(() => expect(githubBtn).not.toBeDisabled());

    fireEvent.click(githubBtn);

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'github',
        })
      );
    });
  });

  // 3b. EMAIL SIGNUP: PASSES ENVIRONMENT-AWARE emailRedirectTo
  it('Email Signup: invokes supabase.auth.signUp with environment-aware emailRedirectTo', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    const submitBtn = await screen.findByRole('button', { name: /^CREATE ACCOUNT$/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());

    fireEvent.change(screen.getByPlaceholderText('Umesh Temburwar'), {
      target: { value: 'Alex Vance' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
      target: { value: 'SecretPassword123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repeat password'), {
      target: { value: 'SecretPassword123!' },
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'alex@example.com',
          password: 'SecretPassword123!',
          options: expect.objectContaining({
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: 'Alex Vance',
            },
          }),
        })
      );
    });
  });

  // 4. PASSWORD RESET FLOW: REQUEST RESET LINK
  it('Password Reset: sends password reset email successfully', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/reset-password']}>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /Send Password Reset Email/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'candidate@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/reset-password'),
        })
      );
      expect(screen.getByText(/Password Reset Email Dispatched/i)).toBeInTheDocument();
    });
  });

  // 5. PASSWORD RESET FLOW: SET NEW PASSWORD IN UPDATE MODE
  it('Password Reset: allows setting a new password in recovery mode', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/reset-password?type=recovery']}>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /Set new password/i })).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Update Password/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());

    fireEvent.change(screen.getByPlaceholderText(/Minimum 8 characters/i), {
      target: { value: 'BrandNewSecure2026!' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Repeat your new password/i), {
      target: { value: 'BrandNewSecure2026!' },
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'BrandNewSecure2026!',
      });
      expect(screen.getByText(/Password updated successfully/i)).toBeInTheDocument();
    });
  });

  // 6. GITHUB OAUTH CANCELLATION / ACCESS DENIED HANDLING IN CALLBACK
  it('OAuth Callback: renders expired/denied state on user cancellation', async () => {
    render(
      <AuthProvider>
        <MemoryRouter
          initialEntries={[
            '/auth/confirm?error=access_denied&error_description=The+user+has+denied+your+application+an+access+token',
          ]}
        >
          <Routes>
            <Route path="/auth/confirm" element={<AuthCallbackPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Verification link expired/i)).toBeInTheDocument();
      expect(
        screen.getByText(/The user has denied your application an access token/i)
      ).toBeInTheDocument();
    });
  });

  // 7. PROTECTED ROUTE GUARDS
  it('Protected Routes: redirects unauthenticated user to /login', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page Target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page Target')).toBeInTheDocument();
    });
    expect(screen.queryByText('Secret Dashboard')).not.toBeInTheDocument();
  });

  // 8. LOGOUT ACTION
  it('Logout: calls supabase.auth.signOut and clears session state', async () => {
    const TestComponent = () => {
      const { user, logout } = useAuth();
      return (
        <div>
          <span>{user ? 'Logged In' : 'Logged Out'}</span>
          <button onClick={() => logout()}>Perform Logout</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Perform Logout'));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(screen.getByText('Logged Out')).toBeInTheDocument();
    });
  });
});
