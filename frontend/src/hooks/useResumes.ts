import { useState, useEffect, useCallback, useRef } from 'react';
import type { Resume } from '../types';
import {
  listResumesApi,
  uploadResumeApi,
  setDefaultResumeApi,
  deleteResumeApi,
  getResumeDownloadUrlApi,
  type BackendResumeItem,
  type BackendResumeUploadResponse,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

function mapBackendToResume(b: BackendResumeItem): Resume {
  return {
    id: b.id,
    userId: b.user_id,
    fileName: b.file_name,
    fileSizeBytes: b.file_size,
    uploadedAt: b.created_at,
    isDefault: b.is_default,
    fileType: b.mime_type,
    ocrNeeded: b.ocr_needed,
  };
}

let cachedResumesByUserId: Record<string, Resume[]> = {};

export function clearCachedResumes() {
  cachedResumesByUserId = {};
}

export function useResumes() {
  const { session, getToken } = useAuth();
  const userId = session?.user?.id || '';
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [resumes, setResumes] = useState<Resume[]>(() => (userId && cachedResumesByUserId[userId]) || []);
  const [loading, setLoading] = useState<boolean>(() => !Boolean(userId && cachedResumesByUserId[userId]));
  const [error, setError] = useState<string | null>(null);

  const getActiveToken = useCallback(async (): Promise<string | null> => {
    return (await getTokenRef.current?.()) || session?.token || null;
  }, [session?.token]);

  const fetchResumes = useCallback(async () => {
    const activeToken = await getActiveToken();
    if (!activeToken || !userId) {
      setResumes([]);
      setLoading(false);
      return;
    }

    try {
      if (!cachedResumesByUserId[userId]) {
        setLoading(true);
      }
      setError(null);
      const data = await listResumesApi(activeToken);
      const mapped = (data.resumes || []).map(mapBackendToResume);
      cachedResumesByUserId[userId] = mapped;
      setResumes(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch candidate resumes');
      if (!cachedResumesByUserId[userId]) {
        setResumes([]);
      }
    } finally {
      setLoading(false);
    }
  }, [getActiveToken, userId]);

  const uploadResume = async (file: File, isDefault = true): Promise<BackendResumeUploadResponse> => {
    const activeToken = await getActiveToken();
    if (!activeToken) {
      throw new Error('Candidate is not authenticated.');
    }

    try {
      setError(null);
      const uploadRes = await uploadResumeApi(activeToken, file, isDefault);
      const mapped = mapBackendToResume(uploadRes.resume);

      setResumes((prev) => {
        const updated = isDefault ? prev.map((r) => ({ ...r, isDefault: false })) : [...prev];
        const nextList = [mapped, ...updated];
        if (userId) {
          cachedResumesByUserId[userId] = nextList;
        }
        return nextList;
      });

      return uploadRes;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Resume upload failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const setDefaultResume = async (id: string) => {
    const activeToken = await getActiveToken();
    if (!activeToken) throw new Error('Candidate is not authenticated.');

    try {
      setError(null);
      await setDefaultResumeApi(activeToken, id);
      setResumes((prev) => {
        const nextList = prev.map((r) => ({
          ...r,
          isDefault: r.id === id,
        }));
        if (userId) {
          cachedResumesByUserId[userId] = nextList;
        }
        return nextList;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to set default resume';
      setError(msg);
      throw new Error(msg);
    }
  };

  const deleteResume = async (id: string) => {
    const activeToken = await getActiveToken();
    if (!activeToken) throw new Error('Candidate is not authenticated.');

    try {
      setError(null);
      await deleteResumeApi(activeToken, id);
      setResumes((prev) => {
        const nextList = prev.filter((r) => r.id !== id);
        if (userId) {
          cachedResumesByUserId[userId] = nextList;
        }
        return nextList;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete resume';
      setError(msg);
      throw new Error(msg);
    }
  };

  const getDownloadUrl = async (id: string): Promise<string> => {
    const activeToken = await getActiveToken();
    if (!activeToken) throw new Error('Candidate is not authenticated.');
    const res = await getResumeDownloadUrlApi(activeToken, id);
    return res.download_url;
  };

  useEffect(() => {
    if (!userId) {
      setResumes([]);
      setLoading(false);
      return;
    }
    setResumes(cachedResumesByUserId[userId] || []);
    fetchResumes();
  }, [userId, fetchResumes]);

  const defaultResume = resumes.find((r) => r.isDefault) || (resumes.length > 0 ? resumes[0] : null);

  return {
    resumes,
    defaultResume,
    loading,
    error,
    refreshResumes: fetchResumes,
    uploadResume,
    setDefaultResume,
    deleteResume,
    getDownloadUrl,
  };
}
