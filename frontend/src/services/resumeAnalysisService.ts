import { apiClient } from './api';
import { supabase } from '../lib/supabaseClient';

export interface SkillsAnalysis {
  matched: string[];
  missing: string[];
  candidate_skills: string[];
  match_percentage: number;
}

export interface ExperienceAnalysis {
  relevance_score: number;
  detected_years: string;
  insights: string[];
}

export interface EducationAnalysis {
  matches_criteria: boolean;
  degree_detected: string;
  institution?: string;
}

export interface SectionScores {
  contact: number;
  skills: number;
  experience: number;
  education: number;
  projects: number;
}

export interface ResumeAnalysisResponse {
  id: string;
  user_id: string;
  resume_name: string;
  job_title?: string;
  job_description?: string;
  overall_score: number;
  match_summary: string;
  skills_analysis: SkillsAnalysis;
  experience_analysis: ExperienceAnalysis;
  education_analysis: EducationAnalysis;
  section_scores: SectionScores;
  actionable_suggestions: string[];
  created_at: string;
}

export interface ResumeAnalysisListResponse {
  analyses: ResumeAnalysisResponse[];
  total: number;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    // Non-blocking fallback
  }
  return {};
}

export const resumeAnalysisService = {
  async uploadAndAnalyze(file: File, jobTitle: string = 'Software Engineer'): Promise<ResumeAnalysisResponse> {
    const headers = await getAuthHeader();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_title', jobTitle);

    return apiClient<ResumeAnalysisResponse>('/api/resume/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
  },

  async analyze(payload: {
    resume_id?: string;
    resume_text?: string;
    job_title?: string;
  }): Promise<ResumeAnalysisResponse> {
    const headers = await getAuthHeader();
    return apiClient<ResumeAnalysisResponse>('/api/resume/analyze', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  async matchJob(payload: {
    resume_id?: string;
    resume_text?: string;
    job_title?: string;
    job_description: string;
  }): Promise<ResumeAnalysisResponse> {
    const headers = await getAuthHeader();
    return apiClient<ResumeAnalysisResponse>('/api/resume/match-job', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  async getHistory(): Promise<ResumeAnalysisListResponse> {
    const headers = await getAuthHeader();
    return apiClient<ResumeAnalysisListResponse>('/api/resume/history', {
      method: 'GET',
      headers,
    });
  },

  async deleteAnalysis(analysisId: string): Promise<{ status: string; message: string }> {
    const headers = await getAuthHeader();
    return apiClient<{ status: string; message: string }>(`/api/resume/${analysisId}`, {
      method: 'DELETE',
      headers,
    });
  },
};
