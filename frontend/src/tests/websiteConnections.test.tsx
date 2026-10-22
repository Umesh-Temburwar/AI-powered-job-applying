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
        { user_id: 'usr_test_123', platform: 'Naukri', status: 'not_connected' },
        { user_id: 'usr_test_123', platform: 'Internshala', status: 'login_required', error_message: 'Session expired' },
        { user_id: 'usr_test_123', platform: 'Indeed', status: 'connected', last_verified: new Date().toISOString() },
      ],
    });

    vi.spyOn(apiModule, 'connectPlatformApi').mockResolvedValue({
      success: true,
      platform: 'Naukri',
      status: 'connecting',
      message: 'Browser opened',
    });

    vi.spyOn(apiModule, 'verifyConnectionApi').mockResolvedValue({
      success: true,
      platform: 'Naukri',
      status: 'connected',
      message: 'Verified',
    });
  });

  it('renders Website Connections card with all three platforms', async () => {
    render(
      <ToastProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </ToastProvider>
    );

    expect(await screen.findByText('Website Connections')).toBeInTheDocument();
    expect(screen.getAllByText('Naukri').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Internshala').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Indeed').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(screen.getByText('Login required')).toBeInTheDocument();
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
      expect(connectSpy).toHaveBeenCalledWith('mock-jwt-token-123', 'Naukri');
    });
  });
});
