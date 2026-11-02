import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { RegisterPage } from '../pages/RegisterPage';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { profileService, resumeService, preferenceService, applicationService } from '../services';

describe('Phase 2 Frontend Smoke & Architecture Tests', () => {
  it('Service Layer: Profile, Resume, and Preference services return valid mock contracts', async () => {
    const profile = await profileService.getProfile();
    expect(profile).toBeDefined();
    expect(profile.fullName).toBeDefined();

    const resumes = await resumeService.getResumes();
    expect(resumes.length).toBeGreaterThan(0);
    expect(resumes[0].fileType).toBe('application/pdf');

    const prefs = await preferenceService.getPreferences();
    expect(prefs.targetTitles.length).toBeGreaterThan(0);
    expect(prefs.minSalaryLakhs).toBeLessThanOrEqual(prefs.maxSalaryLakhs);

    const apps = await applicationService.getApplications();
    expect(apps.items.length).toBeGreaterThan(0);
  });

  it('Landing Page: renders branding, CTA buttons, and supported platforms from the repository', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      </AuthProvider>
    );

    // Hero title check
    expect(
      screen.getByRole('heading', { name: /AUTONOMOUS JOB APPLY ENGINE/i })
    ).toBeInTheDocument();

    // CTA buttons check
    expect(screen.getByRole('button', { name: /START AUTOMATION ENGINE/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /SIGN IN/i }).length).toBeGreaterThanOrEqual(1);

    // Supported platforms check (from repo)
    expect(screen.getByText('Naukri.com')).toBeInTheDocument();
    expect(screen.getByText('Internshala.com')).toBeInTheDocument();
    expect(screen.getByText('Indeed.com')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn.com')).toBeInTheDocument();
    expect(screen.getByText(/9-Portal/i)).toBeInTheDocument();
  });

  it('Register Page: renders full name/email/password form with Supabase auth status', async () => {
    await render(
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <RegisterPage />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByPlaceholderText(/Umesh Temburwar/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('candidate@example.com')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /REGISTER WITH GITHUB/i })).toBeInTheDocument();
    });
  });

  it('Security: Client bundle never exposes backend SUPABASE_SERVICE_ROLE_KEY', () => {
    // Vite bundles only VITE_ prefixed environment variables to client
    const clientEnv = import.meta.env as Record<string, unknown>;
    expect(clientEnv.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(clientEnv.VITE_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
});
