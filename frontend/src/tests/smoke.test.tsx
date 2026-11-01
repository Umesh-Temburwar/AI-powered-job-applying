import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { profileService, resumeService, preferenceService, applicationService } from '../services';

describe('Phase 2 Frontend Smoke & Architecture Tests', () => {
  it('Service Layer: Profile, Resume, and Preference services return valid mock contracts', async () => {
    const profile = await profileService.getProfile();
    expect(profile).toBeDefined();
    expect(profile.skills.length).toBeGreaterThan(0);

    const resumes = await resumeService.getResumes();
    expect(resumes.length).toBeGreaterThanOrEqual(1);
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

  it('Login Page: renders email/password form with Supabase auth status', async () => {
    await render(
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <LoginPage />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign In to Dashboard/i })).toBeInTheDocument();
    });
  });

  it('Security: Client bundle never exposes backend SUPABASE_SERVICE_ROLE_KEY', () => {
    // Vite bundles only VITE_ prefixed environment variables to client
    const clientEnv = import.meta.env as Record<string, unknown>;
    expect(clientEnv.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(clientEnv.VITE_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
});

