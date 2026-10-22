import { useState, useEffect, useCallback } from 'react';
import type { Resume } from '../types';
import { resumeService } from '../services';

export function useResumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await resumeService.getResumes();
      setResumes(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resumes');
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadResume = async (file: File) => {
    try {
      setError(null);
      const newResume = await resumeService.uploadResume(file);
      setResumes((prev) => [newResume, ...prev]);
      return newResume;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const setDefaultResume = async (id: string) => {
    try {
      setError(null);
      await resumeService.setDefaultResume(id);
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
    try {
      setError(null);
      await resumeService.deleteResume(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete resume';
      setError(msg);
      throw new Error(msg);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  return {
    resumes,
    loading,
    error,
    refreshResumes: fetchResumes,
    uploadResume,
    setDefaultResume,
    deleteResume,
  };
}
