import { apiClient, getBaseApiUrl } from './api';
import { supabase } from '../lib/supabaseClient';

export interface BotEnvConfig {
  firstname: string;
  lastname: string;
  phone: string;
  email: string;
  gender?: string;
  keywords: string;
  location: string;
  pages_per_keyword: number;
  max_applications: number;
  browser: string;
  // Career & Screening Details for All Portals
  total_experience_years?: string | number;
  relevant_experience_years?: string | number;
  current_ctc?: string;
  expected_ctc?: string;
  notice_period?: string;
  work_mode?: string;
  willing_to_relocate?: string;
  education_degree?: string;
  education_college?: string;
  education_passing_year?: string;
  education_score?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  cover_letter?: string;
  // Platform credentials
  naukri_email: string;
  naukri_password: string;
  internshala_email: string;
  internshala_password: string;
  indeed_email: string;
  indeed_password: string;
  linkedin_email: string;
  linkedin_password: string;
  foundit_email?: string;
  foundit_password?: string;
  wellfound_email?: string;
  wellfound_password?: string;
  glassdoor_email?: string;
  glassdoor_password?: string;
  cutshort_email?: string;
  cutshort_password?: string;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  discord_webhook_url?: string;
  gemini_api_key?: string;
  dashboard_port?: number;
  resume_name?: string | null;
  resume_path?: string | null;
  key_skills?: string[];
  profile_summary?: string;
  naukri_headline?: string;
}

export interface ResumeAutofillData {
  resume_name: string;
  resume_path: string;
  firstname: string;
  lastname: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  headline: string;
  keywords: string;
  skills: string[];
  education: any[];
  experience: any[];
  projects: any[];
  certifications: any[];
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  education_degree?: string;
  education_college?: string;
  education_passing_year?: string;
  education_score?: string;
  total_experience_years?: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (e) {
    // Non-blocking fallback
  }
  return {};
}

export const configService = {
  async fetchConfig(): Promise<BotEnvConfig> {
    const headers = await getAuthHeader();
    return apiClient<BotEnvConfig>('/api/v1/config/env', {
      headers,
    });
  },

  async saveConfig(payload: Partial<BotEnvConfig>): Promise<{ status: string; message: string }> {
    const headers = await getAuthHeader();
    return apiClient<{ status: string; message: string }>('/api/v1/config/env', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  async uploadResumeAutofill(file: File): Promise<{ status: string; message: string; data: ResumeAutofillData }> {
    const headers = await getAuthHeader();
    const formData = new FormData();
    formData.append('file', file);

    return apiClient<{ status: string; message: string; data: ResumeAutofillData }>('/api/v1/config/upload-resume', {
      method: 'POST',
      headers,
      body: formData,
    });
  },

  async deleteResume(): Promise<{ status: string; message: string; deleted_files?: string[] }> {
    const headers = await getAuthHeader();
    return apiClient<{ status: string; message: string; deleted_files?: string[] }>('/api/v1/config/resume', {
      method: 'DELETE',
      headers,
    });
  },

  async resetCandidateData(): Promise<{ status: string; message: string; supabase_cleaned?: string[]; resumes_deleted?: string[] }> {
    const headers = await getAuthHeader();
    return apiClient<{ status: string; message: string; supabase_cleaned?: string[]; resumes_deleted?: string[] }>('/api/v1/config/reset-candidate', {
      method: 'POST',
      headers,
    });
  },

  getResumeFileUrl(): string {
    const base = getBaseApiUrl();
    return `${base}/api/v1/config/resume/file`;
  },

  async getResumeBlob(url?: string): Promise<Blob> {
    const headers = await getAuthHeader();
    const target = url || this.getResumeFileUrl();
    const res = await fetch(target, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load resume document (${res.status} ${res.statusText})`);
    }
    return res.blob();
  },
};

