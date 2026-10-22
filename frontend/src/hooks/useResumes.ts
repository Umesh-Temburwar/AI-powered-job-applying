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

export function useResumes() {
  const { session } = useAuth();
  const token = session?.token;

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    if (!token) {
      setResumes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await listResumesApi(token);
      setResumes((data.resumes || []).map(mapBackendToResume));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch candidate resumes');
      setResumes([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const uploadResume = async (file: File, isDefault = true): Promise<BackendResumeUploadResponse> => {
    if (!token) {
      throw new Error('Candidate is not authenticated.');
    }

    try {
      setError(null);
      const uploadRes = await uploadResumeApi(token, file, isDefault);
      const mapped = mapBackendToResume(uploadRes.resume);

      setResumes((prev) => {
        const updated = isDefault ? prev.map((r) => ({ ...r, isDefault: false })) : [...prev];
        return [mapped, ...updated];
      });

      return uploadRes;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Resume upload failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const setDefaultResume = async (id: string) => {
    if (!token) throw new Error('Candidate is not authenticated.');

    try {
      setError(null);
      await setDefaultResumeApi(token, id);
      setResumes((prev) =>
        prev.map((r) => ({
          ...r,
          isDefault: r.id === id,
        }))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to set default resume';
      setError(msg);
      throw new Error(msg);
    }
  };

  const deleteResume = async (id: string) => {
    if (!token) throw new Error('Candidate is not authenticated.');

    try {
      setError(null);
      await deleteResumeApi(token, id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete resume';
      setError(msg);
      throw new Error(msg);
    }
  };

  const getDownloadUrl = async (id: string): Promise<string> => {
    if (!token) throw new Error('Candidate is not authenticated.');
    const res = await getResumeDownloadUrlApi(token, id);
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
