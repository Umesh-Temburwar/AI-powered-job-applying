import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { SiteAccessGate } from '../components/common/SiteAccessGate';

const CANONICAL_HASH = '1ab3384539470876f7b2ed061d9705ffeda83e7a512e5b5dd01b945b9a9b4720';

describe('SiteAccessGate Component Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders password protection gate when access is not yet granted', () => {
    render(
      <ThemeProvider>
        <SiteAccessGate>
          <div data-testid="protected-content">Secret Website Content</div>
        </SiteAccessGate>
      </ThemeProvider>
    );

    expect(screen.getByText(/Website Access Gate/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter access password/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('rejects incorrect password with error message and keeps site locked', async () => {
    render(
      <ThemeProvider>
        <SiteAccessGate>
          <div data-testid="protected-content">Secret Website Content</div>
        </SiteAccessGate>
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Enter access password/i);
    const submitBtn = screen.getByRole('button', { name: /UNLOCK WEBSITE ACCESS/i });

    fireEvent.change(input, { target: { value: 'WrongPassword' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Access Denied! Incorrect password/i)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(localStorage.getItem('site_access_auth_token')).toBeNull();
  });

  it('unlocks website when "Umesh" is entered and stores cryptographic token', async () => {
    render(
      <ThemeProvider>
        <SiteAccessGate>
          <div data-testid="protected-content">Secret Website Content</div>
        </SiteAccessGate>
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Enter access password/i);
    const submitBtn = screen.getByRole('button', { name: /UNLOCK WEBSITE ACCESS/i });

    fireEvent.change(input, { target: { value: 'Umesh' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Website Access Gate/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('site_access_auth_token')).toBe(CANONICAL_HASH);
  });

  it('case-insensitively accepts "umesh"', async () => {
    render(
      <ThemeProvider>
        <SiteAccessGate>
          <div data-testid="protected-content">Secret Website Content</div>
        </SiteAccessGate>
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Enter access password/i);
    const submitBtn = screen.getByRole('button', { name: /UNLOCK WEBSITE ACCESS/i });

    fireEvent.change(input, { target: { value: 'umesh' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    expect(localStorage.getItem('site_access_auth_token')).toBe(CANONICAL_HASH);
  });

  it('immediately renders children if cryptographic token is already present', () => {
    localStorage.setItem('site_access_auth_token', CANONICAL_HASH);

    render(
      <ThemeProvider>
        <SiteAccessGate>
          <div data-testid="protected-content">Secret Website Content</div>
        </SiteAccessGate>
      </ThemeProvider>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByText(/Website Access Gate/i)).not.toBeInTheDocument();
  });
});
