import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserProfile } from '../types';
import {
  autofillProfileApi,
  getProfileApi,
  updateProfileApi,
  type BackendProfileResponse,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

function mapBackendToUserProfile(b: BackendProfileResponse): UserProfile {
  return {
    id: b.id,
    email: b.email || '',
    fullName: b.full_name,
    phone: b.phone || '',
    currentLocation: b.city || '',
    city: b.city || '',
    headline: b.headline || '',
    summary: b.summary || '',
    linkedinUrl: b.linkedin_url || '',
    githubUrl: b.github_url || '',
    portfolioUrl: b.portfolio_url || '',
    skills: b.skills || [],
    preferredTitles: [],
    preferredLocations: b.city ? [b.city] : [],
    noticePeriodDays: b.additional_info?.notice_period_days || 15,
    education: (b.education || []).map((e, idx) => ({
      id: e.id || `edu_${idx}`,
      degree: e.degree,
      institution: e.institution,
      year: e.year || '',
      score: e.score,
    })),
    experience: (b.experience || []).map((x, idx) => ({
      id: x.id || `exp_${idx}`,
      role: x.role,
      company: x.company,
      duration: x.duration || '',
      description: x.description || '',
    })),
    projects: (b.projects || []).map((p, idx) => ({
      id: p.id || `proj_${idx}`,
      title: p.title,
      description: p.description,
      technologies: p.technologies || [],
      url: p.url,
    })),
    certifications: (b.certifications || []).map((c, idx) => ({
      id: c.id || `cert_${idx}`,
      name: c.name,
      issuer: c.issuer,
      date: c.date,
      url: c.url,
    })),
    additionalInfo: b.additional_info,
    isOnboarded: b.is_onboarded,
    onboardingStep: b.onboarding_step,
    onboardedAt: b.onboarded_at,
    completionPercentage: b.completion_percentage,
    missingFields: b.missing_fields,
    updatedAt: new Date().toISOString(),
  };
}

let cachedProfileData: UserProfile | null = null;

export function useProfile() {
  const { session, user, getToken } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(() => cachedProfileData);
  const [loading, setLoading] = useState<boolean>(!cachedProfileData);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id || session?.user?.id || '';
  const userEmail = user?.email || session?.user?.email || '';
  const userFullName = user?.fullName || '';

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const getActiveToken = useCallback(async (): Promise<string | null> => {
    return (await getTokenRef.current?.()) || session?.token || null;
  }, [session?.token]);

  const fetchProfile = useCallback(async () => {
    const activeToken = await getActiveToken();
    if (!activeToken) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      if (!cachedProfileData) {
        setLoading(true);
      }
      setError(null);
      const data = await getProfileApi(activeToken);
      const mapped = mapBackendToUserProfile(data);
      cachedProfileData = mapped;
      setProfile(mapped);
    } catch (err) {
      if (!cachedProfileData) {
        setProfile({
          id: userId,
          email: userEmail,
          fullName: userFullName,
          phone: '',
          currentLocation: '',
          city: '',
          headline: '',
          summary: '',
          linkedinUrl: '',
          githubUrl: '',
          portfolioUrl: '',
          noticePeriodDays: 15,
          skills: [],
          preferredTitles: [],
          preferredLocations: [],
          education: [],
          experience: [],
          projects: [],
          certifications: [],
          isOnboarded: false,
          onboardingStep: 0,
          completionPercentage: 0,
          missingFields: ['full_name', 'email', 'skills'],
          updatedAt: new Date().toISOString(),
        });
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch candidate profile');
    } finally {
      setLoading(false);
    }
  }, [getActiveToken, userId, userEmail, userFullName]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setUpdating(true);
      setError(null);

      const activeToken = await getActiveToken();
      if (activeToken) {
        const payload: Partial<BackendProfileResponse> = {};
        if (updates.fullName !== undefined) payload.full_name = updates.fullName;
        if (updates.email !== undefined) payload.email = updates.email;
        if (updates.phone !== undefined) payload.phone = updates.phone;
        if (updates.city !== undefined || updates.currentLocation !== undefined) {
          payload.city = updates.city || updates.currentLocation;
        }
        if (updates.headline !== undefined) payload.headline = updates.headline;
        if (updates.summary !== undefined) payload.summary = updates.summary;
        if (updates.linkedinUrl !== undefined) payload.linkedin_url = updates.linkedinUrl;
        if (updates.githubUrl !== undefined) payload.github_url = updates.githubUrl;
        if (updates.portfolioUrl !== undefined) payload.portfolio_url = updates.portfolioUrl;
        if (updates.skills !== undefined) payload.skills = updates.skills;
        if (updates.education !== undefined) {
          payload.education = updates.education.map((e) => ({
            id: e.id ? String(e.id) : undefined,
            degree: String(e.degree || ''),
            institution: String(e.institution || ''),
            year: e.year ? String(e.year) : undefined,
            score: e.score ? String(e.score) : undefined,
          }));
        }
        if (updates.experience !== undefined) {
          payload.experience = updates.experience.map((x) => ({
            id: x.id ? String(x.id) : undefined,
            role: String(x.role || ''),
            company: String(x.company || ''),
            duration: x.duration ? String(x.duration) : undefined,
            description: x.description ? String(x.description) : undefined,
          }));
        }
        if (updates.projects !== undefined) {
          payload.projects = updates.projects.map((p) => ({
            id: p.id ? String(p.id) : undefined,
            title: String(p.title || ''),
            description: p.description ? String(p.description) : undefined,
            technologies: p.technologies || [],
            url: p.url ? String(p.url) : undefined,
          }));
        }
        if (updates.certifications !== undefined) {
          payload.certifications = updates.certifications.map((c) => ({
            id: c.id ? String(c.id) : undefined,
            name: String(c.name || ''),
            issuer: c.issuer ? String(c.issuer) : undefined,
            date: c.date ? String(c.date) : undefined,
            url: c.url ? String(c.url) : undefined,
          }));
        }
        if (updates.additionalInfo !== undefined) payload.additional_info = updates.additionalInfo;
        if (updates.isOnboarded !== undefined) payload.is_onboarded = updates.isOnboarded;
        if (updates.onboardingStep !== undefined) payload.onboarding_step = updates.onboardingStep;

        const updated = await updateProfileApi(activeToken, payload);
        const mapped = mapBackendToUserProfile(updated);
        cachedProfileData = mapped;
        setProfile(mapped);
        return mapped;
      }

      // Local / Offline fallback when candidate token is unavailable
      const fallbackProfile: UserProfile = {
        ...(profile || {
          id: userId || 'local_user',
          email: userEmail || '',
          fullName: userFullName || 'Candidate',
          phone: '',
          currentLocation: '',
          city: '',
          headline: '',
          summary: '',
          linkedinUrl: '',
          githubUrl: '',
          portfolioUrl: '',
          skills: [],
          preferredTitles: [],
          preferredLocations: [],
          noticePeriodDays: 15,
          education: [],
          experience: [],
          projects: [],
          certifications: [],
          isOnboarded: false,
          onboardingStep: 0,
          completionPercentage: 0,
          missingFields: [],
          updatedAt: new Date().toISOString(),
        }),
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      cachedProfileData = fallbackProfile;
      setProfile(fallbackProfile);
      return fallbackProfile;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(msg);
      throw new Error(msg);
    } finally {
      setUpdating(false);
    }
  };

  const autofillProfile = async (resumeId?: string) => {
    try {
      setUpdating(true);
      setError(null);

      const activeToken = await getActiveToken();
      if (!activeToken) {
        throw new Error('Candidate is not authenticated.');
      }

      const updated = await autofillProfileApi(activeToken, resumeId);
      const mapped = mapBackendToUserProfile(updated);
      cachedProfileData = mapped;
      setProfile(mapped);
      return mapped;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to autofill profile from resume';
      setError(msg);
      throw new Error(msg);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    updating,
    error,
    refreshProfile: fetchProfile,
    updateProfile,
    autofillProfile,
  };
}
