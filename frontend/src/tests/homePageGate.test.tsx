import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { HomePageGate } from '../components/common/HomePageGate';

describe('HomePageGate Component Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders password protection gate when user attempts to access Home Page', () => {
    render(
      <ThemeProvider>
        <BrowserRouter>
          <HomePageGate>
            <div data-testid="landing-page-content">Autonomous Job Apply Engine Home Page</div>
          </HomePageGate>
        </BrowserRouter>
      </ThemeProvider>
    );

    expect(screen.getByText(/Home Page Access Verification/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter access password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /UNLOCK & PROCEED TO HOME PAGE/i })).toBeInTheDocument();
    expect(screen.queryByTestId('landing-page-content')).not.toBeInTheDocument();
  });

  it('rejects incorrect password with error message and keeps home page locked', async () => {
    render(
      <ThemeProvider>
        <BrowserRouter>
          <HomePageGate>
            <div data-testid="landing-page-content">Autonomous Job Apply Engine Home Page</div>
          </HomePageGate>
        </BrowserRouter>
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Enter access password/i);
    const submitBtn = screen.getByRole('button', { name: /UNLOCK & PROCEED TO HOME PAGE/i });

    fireEvent.change(input, { target: { value: 'WrongPassword' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Access Denied! Galat password hai/i)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('landing-page-content')).not.toBeInTheDocument();
  });

  it('unlocks Home Page when "Umesh" is entered', async () => {
    render(
      <ThemeProvider>
        <BrowserRouter>
          <HomePageGate>
            <div data-testid="landing-page-content">Autonomous Job Apply Engine Home Page</div>
          </HomePageGate>
        </BrowserRouter>
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Enter access password/i);
    const submitBtn = screen.getByRole('button', { name: /UNLOCK & PROCEED TO HOME PAGE/i });

    fireEvent.change(input, { target: { value: 'Umesh' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('landing-page-content')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Home Page Access Verification/i)).not.toBeInTheDocument();
  });

  it('case-insensitively unlocks Home Page when "umesh" is entered', async () => {
    render(
      <ThemeProvider>
        <BrowserRouter>
          <HomePageGate>
            <div data-testid="landing-page-content">Autonomous Job Apply Engine Home Page</div>
          </HomePageGate>
        </BrowserRouter>
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Enter access password/i);
    const submitBtn = screen.getByRole('button', { name: /UNLOCK & PROCEED TO HOME PAGE/i });

    fireEvent.change(input, { target: { value: 'umesh' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('landing-page-content')).toBeInTheDocument();
    });
  });

  it('unlocks Home Page when "Umesh@123" is entered', async () => {
    render(
      <ThemeProvider>
        <BrowserRouter>
          <HomePageGate>
            <div data-testid="landing-page-content">Autonomous Job Apply Engine Home Page</div>
          </HomePageGate>
        </BrowserRouter>
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Enter access password/i);
    const submitBtn = screen.getByRole('button', { name: /UNLOCK & PROCEED TO HOME PAGE/i });

    fireEvent.change(input, { target: { value: 'Umesh@123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('landing-page-content')).toBeInTheDocument();
    });
  });

  it('toggles password visibility between password and text', () => {
    render(
      <ThemeProvider>
        <BrowserRouter>
          <HomePageGate>
            <div data-testid="landing-page-content">Autonomous Job Apply Engine Home Page</div>
          </HomePageGate>
        </BrowserRouter>
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Enter access password/i);
    expect(input).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByTitle(/Show password/i);
    fireEvent.click(toggleBtn);

    expect(input).toHaveAttribute('type', 'text');

    const hideBtn = screen.getByTitle(/Hide password/i);
    fireEvent.click(hideBtn);

    expect(input).toHaveAttribute('type', 'password');
  });

  it('always requires password on each fresh visit ("har bar")', async () => {
    const { unmount } = render(
      <ThemeProvider>
        <BrowserRouter>
          <HomePageGate>
            <div data-testid="landing-page-content">Autonomous Job Apply Engine Home Page</div>
          </HomePageGate>
        </BrowserRouter>
      </ThemeProvider>
    );

    // Unlock in first visit
    const input = screen.getByPlaceholderText(/Enter access password/i);
    const submitBtn = screen.getByRole('button', { name: /UNLOCK & PROCEED TO HOME PAGE/i });
    fireEvent.change(input, { target: { value: 'Umesh' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('landing-page-content')).toBeInTheDocument();
    });

    // Unmount (simulates navigating away to another route or reloading)
    unmount();

    // Re-render (simulates navigating back to Home Page)
    render(
      <ThemeProvider>
        <BrowserRouter>
          <HomePageGate>
            <div data-testid="landing-page-content">Autonomous Job Apply Engine Home Page</div>
          </HomePageGate>
        </BrowserRouter>
      </ThemeProvider>
    );

    // Gate must be locked again!
    expect(screen.getByText(/Home Page Access Verification/i)).toBeInTheDocument();
    expect(screen.queryByTestId('landing-page-content')).not.toBeInTheDocument();
  });
  it('bypasses password gate without prompt when user is already logged in', () => {
    const mockAuthContext = {
      user: {
        id: 'usr_123',
        email: 'umeshtemburwar2002@gmail.com',
        fullName: 'Umesh Temburwar',
      },
      session: null,
      isLoading: false,
      isConfigured: true,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      resendVerificationEmail: vi.fn(),
      signInWithGithub: vi.fn(),
      getToken: vi.fn(),
    };

    render(
      <AuthContext.Provider value={mockAuthContext as any}>
        <ThemeProvider>
          <BrowserRouter>
            <HomePageGate>
              <div data-testid="landing-page-content">Autonomous Job Apply Engine Home Page</div>
            </HomePageGate>
          </BrowserRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    );

    // Must immediately show Home Page content without asking for password!
    expect(screen.getByTestId('landing-page-content')).toBeInTheDocument();
    expect(screen.queryByText(/Home Page Access Verification/i)).not.toBeInTheDocument();
  });
});