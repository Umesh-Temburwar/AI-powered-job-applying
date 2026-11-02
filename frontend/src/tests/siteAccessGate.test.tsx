import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import {
  SiteAccessGate,
} from '../components/common/SiteAccessGate';

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

    expect(screen.getByText(/Website Access Password/i)).toBeInTheDocument();
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
      expect(screen.getByText(/Galat password! Access denied/i)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(localStorage.getItem('site_access_granted')).toBeNull();
  });

  it('unlocks website when "Umesh" is entered and reveals protected content', async () => {
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

    expect(screen.queryByText(/Website Access Password/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('site_access_granted')).toBe('true');
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

    expect(localStorage.getItem('site_access_granted')).toBe('true');
  });

  it('immediately renders children if access was already granted in localStorage', () => {
    localStorage.setItem('site_access_granted', 'true');

    render(
      <ThemeProvider>
        <SiteAccessGate>
          <div data-testid="protected-content">Secret Website Content</div>
        </SiteAccessGate>
      </ThemeProvider>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByText(/Website Access Password/i)).not.toBeInTheDocument();
  });
});
