import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { BotLaunchPasswordModal } from '../components/common/BotLaunchPasswordModal';

describe('BotLaunchPasswordModal Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <ThemeProvider>
        <BotLaunchPasswordModal
          isOpen={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.queryByText(/Verify Password to Start Bot/i)).not.toBeInTheDocument();
  });

  it('renders modal with task details and password input when isOpen is true', () => {
    render(
      <ThemeProvider>
        <BotLaunchPasswordModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Verify Password to Start Bot"
          commandLabel="Run All Platforms (Auto-Apply)"
          platform="All Platforms"
          mode="LIVE APPLY"
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/Verify Password to Start Bot/i)).toBeInTheDocument();
    expect(screen.getByText(/Run All Platforms \(Auto-Apply\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/All Platforms/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText(/Enter access password \(e\.g\. Umesh\)/i)).toBeInTheDocument();
  });

  it('rejects incorrect password with error message and does not call onConfirm', async () => {
    const confirmSpy = vi.fn();

    render(
      <ThemeProvider>
        <BotLaunchPasswordModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={confirmSpy}
          commandLabel="Naukri.com Auto-Apply"
        />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Enter access password/i);
    const submitBtn = screen.getByRole('button', { name: /VERIFY & START/i });

    fireEvent.change(input, { target: { value: 'WrongBotPassword' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Access Denied! Galat password hai/i)).toBeInTheDocument();
    });

    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('verifies correct password "Umesh" and calls onConfirm to launch the bot', async () => {
    const confirmSpy = vi.fn();
    const closeSpy = vi.fn();

    render(
      <ThemeProvider>
        <BotLaunchPasswordModal
          isOpen={true}
          onClose={closeSpy}
          onConfirm={confirmSpy}
          commandLabel="Naukri.com Auto-Apply"
        />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Enter access password/i);
    const submitBtn = screen.getByRole('button', { name: /VERIFY & START/i });

    fireEvent.change(input, { target: { value: 'Umesh' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('verifies password "Umesh@123" and calls onConfirm', async () => {
    const confirmSpy = vi.fn();

    render(
      <ThemeProvider>
        <BotLaunchPasswordModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={confirmSpy}
          commandLabel="Internshala Auto-Apply"
        />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Enter access password/i);
    const submitBtn = screen.getByRole('button', { name: /VERIFY & START/i });

    fireEvent.change(input, { target: { value: 'Umesh@123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('closes modal when cancel button is clicked without invoking onConfirm', () => {
    const closeSpy = vi.fn();
    const confirmSpy = vi.fn();

    render(
      <ThemeProvider>
        <BotLaunchPasswordModal
          isOpen={true}
          onClose={closeSpy}
          onConfirm={confirmSpy}
        />
      </ThemeProvider>
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
