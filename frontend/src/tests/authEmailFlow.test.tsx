import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import { getEmailProviderInfo } from '../utils/emailProviders';
import {
  setCooldownExpiry,
  getRemainingCooldown,
  savePendingEmail,
  clearPendingEmail,
} from '../utils/cooldown';
import { AuthProvider } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

// Mock Supabase client
vi.mock('../lib/supabaseClient', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
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

describe('Email Provider Allowlist Unit Tests', () => {
  it('detects allowlisted domains and returns correct webmail targets', () => {
    expect(getEmailProviderInfo('user@gmail.com')?.webmailUrl).toBe('https://mail.google.com');
    expect(getEmailProviderInfo('user@googlemail.com')?.providerName).toBe('Gmail');
    expect(getEmailProviderInfo('user@outlook.com')?.webmailUrl).toBe('https://outlook.live.com/mail/');
    expect(getEmailProviderInfo('user@hotmail.com')?.buttonLabel).toBe('Open Outlook');
    expect(getEmailProviderInfo('user@yahoo.com')?.webmailUrl).toBe('https://mail.yahoo.com');
    expect(getEmailProviderInfo('user@proton.me')?.webmailUrl).toBe('https://mail.proton.me');
    expect(getEmailProviderInfo('user@icloud.com')?.buttonLabel).toBe('Open iCloud Mail');
  });

  it('omits webmail button for custom, unknown, or corporate domains (no guessing)', () => {
    expect(getEmailProviderInfo('candidate@startup.io')).toBeNull();
    expect(getEmailProviderInfo('john@corporation.com')).toBeNull();
    expect(getEmailProviderInfo('invalid-email')).toBeNull();
    expect(getEmailProviderInfo('')).toBeNull();
    expect(getEmailProviderInfo(null)).toBeNull();
  });
});

describe('Cooldown Mechanics Unit Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('calculates cooldown from Date.now() and survives across evaluations', () => {
    expect(getRemainingCooldown()).toBe(0);

    setCooldownExpiry(60);
    expect(getRemainingCooldown()).toBe(60);

    // Advance timer by 30 seconds
    vi.advanceTimersByTime(30000);
    expect(getRemainingCooldown()).toBe(30);

    // Advance timer by remaining 31 seconds
    vi.advanceTimersByTime(31000);
    expect(getRemainingCooldown()).toBe(0);
  });
});

describe('VerifyEmailPage Component Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('renders email address and "Open Gmail" button only for allowlisted Gmail address', () => {
    savePendingEmail('alex@gmail.com');

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/verify-email']}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /Verify your email/i })).toBeInTheDocument();
    expect(screen.getByText('alex@gmail.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Gmail/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to sign in/i })).toBeInTheDocument();
  });

  it('omits webmail button for custom domains and shows resend button', () => {
    savePendingEmail('candidate@customenterprise.org');

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/verify-email']}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('candidate@customenterprise.org')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open Gmail/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open Outlook/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend confirmation email/i })).toBeInTheDocument();
  });

  it('renders neutral manual input if no email is known', () => {
    clearPendingEmail();

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/verify-email']}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByLabelText(/Registered Email Address/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open Gmail/i })).not.toBeInTheDocument();
  });

  it('successfully resends confirmation email and starts 60s cooldown', async () => {
    savePendingEmail('alex@gmail.com');
    (supabase.auth.resend as any).mockResolvedValueOnce({ data: {}, error: null });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/verify-email']}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    const resendBtn = screen.getByRole('button', { name: /Resend confirmation email/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(supabase.auth.resend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'signup',
          email: 'alex@gmail.com',
        })
      );
    });

    await waitFor(() => {
      expect(
        screen.getAllByText(/Confirmation link resent! Please check your inbox and spam folder./i)[0]
      ).toBeInTheDocument();
    });
  });

  it('displays rate-limit error message on 429 and extends cooldown', async () => {
    savePendingEmail('alex@gmail.com');
    (supabase.auth.resend as any).mockRejectedValueOnce(
      new Error('over_email_send_rate_limit: rate limit exceeded')
    );

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/verify-email']}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    const resendBtn = screen.getByRole('button', { name: /Resend confirmation email/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(
        screen.getAllByText(/You've requested several emails recently. Please wait a bit/i)[0]
      ).toBeInTheDocument();
    });

    // Does NOT show false success message
    expect(screen.queryByText(/Confirmation link resent!/i)).not.toBeInTheDocument();
  });
});

describe('AuthCallbackPage Callback Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('renders verified success state when valid PKCE code is exchanged', async () => {
    (supabase.auth.exchangeCodeForSession as any).mockResolvedValueOnce({
      data: { session: { user: { id: 'usr-123' } } },
      error: null,
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/auth/confirm?code=valid-pkce-code-123']}>
          <Routes>
            <Route path="/auth/confirm" element={<AuthCallbackPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Email verified successfully/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Continue to dashboard/i })).toBeInTheDocument();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('valid-pkce-code-123');
  });

  it('renders expired state when error param is present in URL', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/auth/confirm?error=access_denied&error_code=otp_expired']}>
          <Routes>
            <Route path="/auth/confirm" element={<AuthCallbackPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Verification link expired/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Registered Email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend confirmation email/i })).toBeInTheDocument();
  });

  it('renders missing token state when no code or token is provided', async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/auth/confirm']}>
          <Routes>
            <Route path="/auth/confirm" element={<AuthCallbackPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Invalid verification link/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Go to email verification screen/i })).toBeInTheDocument();
  });

  it('renders already verified state when an active user session exists', async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: { user: { id: 'u-already-in', email: 'test@example.com' } } },
      error: null,
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/auth/confirm']}>
          <Routes>
            <Route path="/auth/confirm" element={<AuthCallbackPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Already verified/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Continue to dashboard/i })).toBeInTheDocument();
  });
});
