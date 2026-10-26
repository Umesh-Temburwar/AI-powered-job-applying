import { useState, useEffect, useCallback } from 'react';
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

let cachedResumesData: Resume[] | null = null;

export function useResumes() {
  const { session, getToken } = useAuth();

  const [resumes, setResumes] = useState<Resume[]>(() => cachedResumesData || []);
  const [loading, setLoading] = useState<boolean>(!cachedResumesData);
  const [error, setError] = useState<string | null>(null);

  const getActiveToken = useCallback(async (): Promise<string | null> => {
    return (await getToken?.()) || session?.token || null;
  }, [getToken, session?.token]);

  const fetchResumes = useCallback(async () => {
    const activeToken = await getActiveToken();
    if (!activeToken) {
      setResumes([]);
      setLoading(false);
      return;
    }

    try {
      if (!cachedResumesData) {
        setLoading(true);
      }
      setError(null);
      const data = await listResumesApi(activeToken);
      const mapped = (data.resumes || []).map(mapBackendToResume);
      cachedResumesData = mapped;
      setResumes(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch candidate resumes');
      if (!cachedResumesData) {
        setResumes([]);
      }
    } finally {
      setLoading(false);
    }
  }, [getActiveToken]);

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
        cachedResumesData = nextList;
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
        cachedResumesData = nextList;
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
        cachedResumesData = nextList;
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
    fetchResumes();
  }, [fetchResumes]);

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
