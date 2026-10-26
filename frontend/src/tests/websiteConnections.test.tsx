import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { ToastProvider } from '../context/ToastContext';
import * as apiModule from '../services/api';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr_test_123', email: 'test@example.com', fullName: 'Tester' },
    session: { token: 'mock-jwt-token-123', user: { id: 'usr_test_123', email: 'test@example.com' } },
    isLoading: false,
    isConfigured: true,
    getToken: vi.fn().mockResolvedValue('mock-jwt-token-123'),
  }),
}));

describe('Website Connections Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(apiModule, 'getConnectionsApi').mockResolvedValue({
      connections: [
        { user_id: 'usr_test_123', platform: 'Naukri.com', portal_id: 'naukri', status: 'not_connected' },
        { user_id: 'usr_test_123', platform: 'Internshala', portal_id: 'internshala', status: 'login_required', error_message: 'Session expired' },
        { user_id: 'usr_test_123', platform: 'Indeed', portal_id: 'indeed', status: 'connected', last_verified: new Date().toISOString() },
        { user_id: 'usr_test_123', platform: 'LinkedIn Jobs', portal_id: 'linkedin', status: 'not_connected' },
      ],
    });

    vi.spyOn(apiModule, 'openPlatformPortalApi').mockResolvedValue({
      success: true,
      platform: 'Naukri.com',
      status: 'connecting',
      message: 'Portal window opened',
    });

    vi.spyOn(apiModule, 'connectPlatformApi').mockResolvedValue({
      success: true,
      platform: 'Naukri.com',
      status: 'connecting',
      message: 'Browser opened',
    });

    vi.spyOn(apiModule, 'verifyConnectionApi').mockResolvedValue({
      success: true,
      platform: 'Naukri.com',
      status: 'connected',
      message: 'Verified',
    });
  });

  it('renders Website Connections card with registered portals and exact status concepts', async () => {
    render(
      <ToastProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </ToastProvider>
    );

    expect(await screen.findByText('Website Connections')).toBeInTheDocument();
    expect(screen.getAllByText('Naukri.com').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Internshala').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Indeed').length).toBeGreaterThanOrEqual(1);

    expect(screen.getAllByText('Not Connected').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Login Required')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('triggers connectPlatformApi when clicking Connect', async () => {
    const connectSpy = vi.spyOn(apiModule, 'connectPlatformApi');

    render(
      <ToastProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </ToastProvider>
    );

    const connectButtons = await screen.findAllByRole('button', { name: /Connect/i });
    expect(connectButtons.length).toBeGreaterThan(0);
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(connectSpy).toHaveBeenCalledWith('mock-jwt-token-123', 'naukri');
    });
  });

  it('triggers openPlatformPortalApi when clicking Open', async () => {
    const openSpy = vi.spyOn(apiModule, 'openPlatformPortalApi');

    render(
      <ToastProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </ToastProvider>
    );

    const openButtons = await screen.findAllByRole('button', { name: /Open/i });
    expect(openButtons.length).toBeGreaterThan(0);
    fireEvent.click(openButtons[0]);

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith('mock-jwt-token-123', 'naukri');
    });
  });

  it('triggers syncEnvConnectionsApi when clicking Sync from .env', async () => {
    const syncSpy = vi.spyOn(apiModule, 'syncEnvConnectionsApi').mockResolvedValue({
      connections: [
        { user_id: 'usr_test_123', platform: 'Naukri.com', portal_id: 'naukri', status: 'connected', account_email: 'umesh@example.com' },
      ],
    });

    render(
      <ToastProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </ToastProvider>
    );

    const syncButton = await screen.findByRole('button', { name: /Sync from \.env/i });
    expect(syncButton).toBeInTheDocument();
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(syncSpy).toHaveBeenCalledWith('mock-jwt-token-123');
    });
  });
});
