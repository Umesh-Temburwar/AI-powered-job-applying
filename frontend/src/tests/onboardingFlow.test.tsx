import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OnboardingPage } from '../pages/OnboardingPage';
import { ToastProvider } from '../context/ToastContext';
import * as apiModule from '../services/api';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr_candidate_789', email: 'alex@example.com', fullName: 'Alex Vance' },
    session: { token: 'mock-jwt-token-onboarding', user: { id: 'usr_candidate_789', email: 'alex@example.com' } },
    isLoading: false,
    isConfigured: true,
  }),
}));

describe('Smart Resume Onboarding & Profile Builder Wizard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(apiModule, 'getProfileApi').mockResolvedValue({
      id: 'usr_candidate_789',
      email: 'alex@example.com',
      full_name: 'Alex Vance',
      phone: '+91 9876543210',
      city: 'Pune',
      headline: 'Full Stack Engineer',
      summary: 'Passionate developer',
      linkedin_url: 'https://linkedin.com/in/alexvance',
      github_url: 'https://github.com/alexvance',
      portfolio_url: '',
      skills: ['React', 'TypeScript'],
      is_onboarded: false,
      onboarding_step: 0,
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      additional_info: {
        notice_period_days: 30,
        work_authorization: 'Citizen',
        willing_to_relocate: true,
      },
      completion_percentage: 20,
      missing_fields: ['education', 'experience'],
    });

    vi.spyOn(apiModule, 'listResumesApi').mockResolvedValue({
      resumes: [],
      primary_resume_id: null,
    });

    vi.spyOn(apiModule, 'getPreferencesApi').mockResolvedValue({
      id: 'pref_1',
      user_id: 'usr_candidate_789',
      job_titles: ['Frontend Engineer'],
      locations: ['Remote', 'Pune'],
      experience_level: 'entry',
      employment_types: ['full-time'],
      min_salary: 600000,
      max_salary: 1200000,
      selected_platforms: ['Naukri', 'Indeed'],
      daily_application_limit: 25,
      require_manual_review: false,
    });

    vi.spyOn(apiModule, 'suggestPreferencesApi').mockResolvedValue({
      suggested_titles: ['React Developer', 'Full Stack Engineer'],
      suggested_keywords: ['React', 'TypeScript', 'Node.js'],
      source_skills: ['React', 'TypeScript'],
    });

    vi.spyOn(apiModule, 'updateProfileApi').mockResolvedValue({
      id: 'usr_candidate_789',
      full_name: 'Alex Vance',
      is_onboarded: false,
    } as any);
  });

  it('renders Step 0: Upload Candidate Resume with upload zone and manual entry link', async () => {
    render(
      <ToastProvider>
        <BrowserRouter>
          <OnboardingPage />
        </BrowserRouter>
      </ToastProvider>
    );

    // Wait for step 0 card
    await waitFor(() => {
      expect(screen.getByText(/Upload Candidate Resume/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Drag & Drop Resume, or Click to Browse/i)).toBeInTheDocument();
    expect(screen.getByText(/Strictly Private Storage/i)).toBeInTheDocument();

    // Verify Skip & Fill Manually button
    expect(screen.getByRole('button', { name: /Skip & Fill Manually/i })).toBeInTheDocument();
  });

  it('navigates directly to Step 1 (Candidate Identity) when clicking Skip & Fill Manually', async () => {
    render(
      <ToastProvider>
        <BrowserRouter>
          <OnboardingPage />
        </BrowserRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Skip & Fill Manually/i })).toBeInTheDocument();
    });

    const manualBtn = screen.getByRole('button', { name: /Skip & Fill Manually/i });
    fireEvent.click(manualBtn);

    // Verify Step 1 is rendered
    expect(screen.getByText(/Personal Information/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address \*/i)).toBeInTheDocument();

    // Verify navigation buttons
    expect(screen.getByRole('button', { name: /Save & Continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
  });

  it('handles Step 1 validation: requires Full Name before proceeding to Step 2', async () => {
    render(
      <ToastProvider>
        <BrowserRouter>
          <OnboardingPage />
        </BrowserRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Skip & Fill Manually/i })).toBeInTheDocument();
    });

    // Go to Step 1
    fireEvent.click(screen.getByRole('button', { name: /Skip & Fill Manually/i }));

    // Clear Full Name input
    const nameInput = screen.getByLabelText(/Full Name \*/i);
    fireEvent.change(nameInput, { target: { value: '' } });

    // Click Save & Continue
    fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));

    // Should stay on Step 1 and not advance
    expect(screen.getByText(/Personal Information/i)).toBeInTheDocument();
  });

  it('advances through Education to Skills and supports Fresher toggle in Experience step', async () => {
    render(
      <ToastProvider>
        <BrowserRouter>
          <OnboardingPage />
        </BrowserRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Skip & Fill Manually/i })).toBeInTheDocument();
    });

    // Step 0 -> Step 1
    fireEvent.click(screen.getByRole('button', { name: /Skip & Fill Manually/i }));

    // Fill Step 1
    const nameInput = screen.getByLabelText(/Full Name \*/i);
    fireEvent.change(nameInput, { target: { value: 'Alex Vance' } });
    fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));

    // Now on Step 2: Education
    await waitFor(() => {
      expect(screen.getByText(/Education History/i)).toBeInTheDocument();
    });

    // Advance to Step 3: Skills & Projects
    fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Skills & Technical Projects/i)).toBeInTheDocument();
    });

    // Advance to Step 4: Professional Experience
    fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Work & Internship Experience/i)).toBeInTheDocument();
    });

    // Verify Fresher toggle exists and is checked by default for freshers
    const fresherCheckbox = screen.getByRole('checkbox', {
      name: /I am a Fresher \/ Looking for Entry-Level Roles/i,
    });
    expect(fresherCheckbox).toBeInTheDocument();
    expect(fresherCheckbox).toBeChecked();

    // In Fresher mode, candidate can safely advance without inventing experience
    fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));

    // Now on Step 5: Certifications
    await waitFor(() => {
      expect(screen.getByText(/Certifications & Job Criteria/i)).toBeInTheDocument();
    });
  });

  it('supports simulated resume upload and parses preview details', async () => {
    // Mock uploadResumeApi response
    const mockUploadSpy = vi.spyOn(apiModule, 'uploadResumeApi').mockResolvedValue({
      message: 'Resume parsed and uploaded successfully',
      resume: {
        id: 'res_mock_123',
        user_id: 'usr_candidate_789',
        file_name: 'Alex_Vance_Resume.pdf',
        file_size: 45000,
        mime_type: 'application/pdf',
        is_default: true,
        created_at: new Date().toISOString(),
        ocr_needed: false,
      },
      ocr_needed: false,
      extracted_skills_count: 5,
      parsed_profile: {
        full_name: 'Alex Vance',
        email: 'alex.vance@example.com',
        phone: '+91 9876543210',
        city: 'Pune',
        linkedin_url: 'https://linkedin.com/in/alexvance',
        skills: ['React', 'TypeScript', 'Node.js', 'FastAPI', 'PostgreSQL'],
        education: [
          { degree: 'B.Tech Computer Engineering', institution: 'Pune Institute of Technology', year: '2023', score: '8.5 CGPA' },
        ],
        experience: [
          { company: 'Acme Software', role: 'Full Stack Engineer', duration: '2023 - Present', description: 'Built React apps' },
        ],
        projects: [
          { title: 'Job Apply Bot', description: 'Autonomous agent', technologies: ['FastAPI', 'React'], url: 'https://github.com' },
        ],
      },
    });

    render(
      <ToastProvider>
        <BrowserRouter>
          <OnboardingPage />
        </BrowserRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Upload Candidate Resume/i)).toBeInTheDocument();
    });

    // Simulate file input change
    const file = new File(['%PDF-1.4 mock content'], 'Alex_Vance_Resume.pdf', { type: 'application/pdf' });
    const hiddenFileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(hiddenFileInput).toBeInTheDocument();

    fireEvent.change(hiddenFileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadSpy).toHaveBeenCalled();
      // Should automatically prefill and advance to Personal Info
      expect(screen.getByText(/Personal Information/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Alex Vance/i)).toBeInTheDocument();
    });
  });
});
