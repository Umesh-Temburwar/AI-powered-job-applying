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
  }),
}));

describe('Dashboard Task Queue Dynamic Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Automation Worker Status card and Launch Task button', async () => {
    render(
      <ToastProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </ToastProvider>
    );

    expect(screen.getByText(/Automation Worker Status/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Launch Task/i })[0]).toBeInTheDocument();
  });

  it('opens dynamic Task Launch modal with dry-run enabled by default and pre-filled preferences', async () => {
    render(
      <ToastProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </ToastProvider>
    );

    const launchBtn = screen.getAllByRole('button', { name: /Launch Task/i })[0];
    fireEvent.click(launchBtn);

    // Modal should now be open
    expect(screen.getByText(/Launch Automation Task \(Dry-Run Simulation\)/i)).toBeInTheDocument();

    // Verify dry-run checkbox is checked by default
    const dryRunCheckbox = screen.getByRole('checkbox', {
      name: /Enable Dry-Run Simulation Mode \(Recommended\)/i,
    });
    expect(dryRunCheckbox).toBeChecked();

    // Verify dynamic form inputs exist
    expect(screen.getByLabelText(/Target Platform/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Task Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Application Limit/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type keyword and press Enter/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type location and press Enter/i)).toBeInTheDocument();
  });

  it('allows dynamically adding and removing keyword tags in the modal form', async () => {
    render(
      <ToastProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </ToastProvider>
    );

    // Open modal
    const launchBtn = screen.getAllByRole('button', { name: /Launch Task/i })[0];
    fireEvent.click(launchBtn);

    const keywordInput = screen.getByPlaceholderText(/Type keyword and press Enter/i);
    const addButtons = screen.getAllByRole('button', { name: /^Add$/i });
    const addKeywordBtn = addButtons[0]; // first Add button corresponds to keywords

    // Add new custom keyword
    fireEvent.change(keywordInput, { target: { value: 'Rust Backend Engineer' } });
    fireEvent.click(addKeywordBtn);

    expect(screen.getByText('Rust Backend Engineer')).toBeInTheDocument();

    // Remove the keyword tag
    const removeBtn = screen.getByRole('button', { name: /Remove keyword Rust Backend Engineer/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByText('Rust Backend Engineer')).not.toBeInTheDocument();
  });

  it('invokes enqueueTaskApi with dynamic form values when Enqueue is clicked', async () => {
    const enqueueSpy = vi.spyOn(apiModule, 'enqueueTaskApi').mockResolvedValue({
      id: 'task-new-uuid',
      user_id: 'usr_test_123',
      task_type: 'job_apply',
      platform: 'Naukri',
      status: 'queued',
      progress: 0,
      message: 'Job Apply cycle queued for Naukri',
      retry_count: 0,
      max_retries: 3,
      dry_run: true,
      payload: { platform: 'Naukri', max_applications: 10, keywords: ['DevOps'] },
      created_at: new Date().toISOString(),
    });

    render(
      <ToastProvider>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </ToastProvider>
    );

    // Open modal
    fireEvent.click(screen.getAllByRole('button', { name: /Launch Task/i })[0]);

    // Select Naukri
    const platformSelect = screen.getByLabelText(/Target Platform/i);
    fireEvent.change(platformSelect, { target: { value: 'Naukri' } });

    // Change limit to 10
    const limitInput = screen.getByLabelText(/Application Limit/i);
    fireEvent.change(limitInput, { target: { value: '10' } });

    // Add custom keyword tag
    const keywordInput = screen.getByPlaceholderText(/Type keyword and press Enter/i);
    fireEvent.change(keywordInput, { target: { value: 'DevOps' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Add$/i })[0]);

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Enqueue Task \(POST \/api\/v1\/tasks\)/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(enqueueSpy).toHaveBeenCalledTimes(1);
    });

    const callArgs = enqueueSpy.mock.calls[0];
    expect(callArgs[0]).toBe('mock-jwt-token-123'); // Bearer token
    expect(callArgs[1].platform).toBe('Naukri');
    expect(callArgs[1].dry_run).toBe(true);
    expect(callArgs[1].max_applications).toBe(10);
  });
});
