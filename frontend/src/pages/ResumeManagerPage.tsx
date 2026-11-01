import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Trash2,
  Star,
  AlertCircle,
  FileCheck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useResumes } from '../hooks/useResumes';
import { useProfile } from '../hooks/useProfile';
import { configService, type BotEnvConfig } from '../services/configService';
import { useToast } from '../context/ToastContext';
import { playRetroSound } from '../utils/soundEffects';
import {
  Card,
  CardHeader,
  Button,
  Badge,
  ConfirmDialog,
  EmptyState,
  ProgressBar,
  Skeleton,
} from '../components/ui';

export const ResumeManagerPage: React.FC = () => {
  const {
    resumes,
    loading: resumesLoading,
    error: resumesError,
    uploadResume,
    setDefaultResume,
    deleteResume,
    refreshResumes,
  } = useResumes();
  const { autofillProfile } = useProfile();
  const { showToast } = useToast();

  const [botConfig, setBotConfig] = useState<BotEnvConfig | null>(null);
  const [configLoading, setConfigLoading] = useState<boolean>(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [deleteLocalModalOpen, setDeleteLocalModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load bot .env configuration
  const loadBotConfig = async () => {
    try {
      setConfigLoading(true);
      const data = await configService.fetchConfig();
      setBotConfig(data);
    } catch (err) {
      console.warn('Could not load bot config in ResumeManagerPage:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    loadBotConfig();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileProcess = async (file: File) => {
    setValidationError(null);

    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setValidationError('Invalid file format. Only PDF (.pdf) and Word (.docx) documents are supported.');
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setValidationError('File exceeds maximum size limit of 10 MB.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(20);
      playRetroSound('click');

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 85 ? prev : prev + 15));
      }, 150);

      // 1. Physical copy in data/resumes/, update .env, and parse structured fields
      let autofillRes: any = null;
      try {
        autofillRes = await configService.uploadResumeAutofill(file);
      } catch (localErr) {
        console.warn('Local bot resume upload failed:', localErr);
      }

      // 2. Upload to Supabase Storage if available
      let sbUploadRes: any = null;
      try {
        sbUploadRes = await uploadResume(file);
      } catch (sbErr) {
        console.warn('Supabase storage upload error:', sbErr);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      // 3. Trigger profile autofill
      if (sbUploadRes?.resume?.id) {
        try {
          await autofillProfile(sbUploadRes.resume.id);
        } catch {
          // ignore
        }
      }

      playRetroSound('success');
      const skillCount = autofillRes?.data?.skills?.length || 0;
      showToast(
        `✓ Resume "${file.name}" saved to data/resumes/ and synced to bot .env! ${
          skillCount > 0 ? `(${skillCount} skills extracted)` : ''
        }`,
        'success'
      );

      // Reload config & resumes list
      await loadBotConfig();
      refreshResumes();
    } catch (err) {
      playRetroSound('error');
      setValidationError(err instanceof Error ? err.message : 'Upload failed');
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 400);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDeleteLocalResume = async () => {
    try {
      setActionLoading(true);
      playRetroSound('click');
      await configService.deleteResume();
      playRetroSound('success');
      showToast('✓ Resume file deleted from data/resumes/ and removed from bot .env!', 'success');
      setDeleteLocalModalOpen(false);
      await loadBotConfig();
      refreshResumes();
    } catch (err) {
      playRetroSound('error');
      showToast(err instanceof Error ? err.message : 'Failed to delete resume file', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutofill = async (id?: string) => {
    try {
      setActionLoading(true);
      playRetroSound('click');
      await autofillProfile(id);
      playRetroSound('success');
      showToast(`Profile autofilled from resume! Unmentioned fields left intact.`, 'success');
    } catch (err) {
      playRetroSound('error');
      showToast(err instanceof Error ? err.message : 'Autofill failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDefault = async (id: string, name: string) => {
    try {
      setActionLoading(true);
      await setDefaultResume(id);
      showToast(`"${name}" marked as default resume for automation`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to set default', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setActionLoading(true);
      await deleteResume(deleteTargetId);
      showToast('Resume document removed', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete resume', 'error');
    } finally {
      setActionLoading(false);
      setDeleteTargetId(null);
    }
  };

  const activeBotResumeName = botConfig?.resume_name || (resumes.length > 0 ? resumes[0].fileName : null);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] font-mono">
            Resume Manager & Bot Auto-Fill
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Manage your physical resume document attached by Universal Bot during job submissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              loadBotConfig();
              refreshResumes();
            }}
            disabled={configLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${configLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {(resumesError || validationError) && (
        <div className="p-4 rounded-none bg-red-950/40 border-2 border-red-500/40 text-red-300 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError || resumesError}</span>
        </div>
      )}

      {/* 1. Active Bot Physical Resume Card (Moved from Modal Section 2) */}
      <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] retro-shadow p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Active Bot Resume Document (.env & data/resumes/)
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">
            Directly Attached by Universal Bot
          </span>
        </div>

        {activeBotResumeName ? (
          <div className="p-4 border-2 border-emerald-600/40 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 bg-emerald-900/40 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[var(--text-primary)] truncate font-mono">
                    {activeBotResumeName}
                  </span>
                  <Badge variant="success" size="sm">
                    SAVED
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Physical copy stored in <code className="text-emerald-400 font-mono">data/resumes/</code>. Bot attaches this during portal applications.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={actionLoading || uploading}
              >
                Replace Resume
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAutofill()}
                disabled={actionLoading}
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-sky-400" />}
              >
                1-Click Auto-Fill Profile
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteLocalModalOpen(true)}
                disabled={actionLoading}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete Resume
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-2 border-amber-600/40 bg-amber-950/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-200">No Physical Resume Attached</p>
                <p className="text-[11px] text-amber-300/80">
                  Please upload your resume PDF below. The bot will save it to <code className="font-mono">data/resumes/</code> and sync it to <code className="font-mono">.env</code>.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0"
            >
              Upload Resume
            </Button>
          </div>
        )}
      </div>

      {/* 2. Upload Dropzone Card */}
      <Card>
        <CardHeader
          title="Upload or Update Candidate Resume"
          subtitle="Supports PDF (.pdf) and Word (.docx) documents up to 10 MB"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-none p-8 sm:p-12 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-[var(--accent)] bg-theme-accent-muted'
              : 'border-[var(--border-color)] hover:border-[var(--accent)] bg-[var(--bg-base)]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-none bg-[var(--bg-card)] border-2 border-[var(--border-color)] flex items-center justify-center text-[var(--accent)] mx-auto mb-4 retro-shadow-sm">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 font-mono">
            Drag & drop your resume PDF / DOCX here, or <span className="text-[var(--accent)] underline">browse</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            Saves directly into <code className="font-mono text-emerald-400">data/resumes/</code>, updates <code className="font-mono text-emerald-400">.env</code>, extracts career details, and equips the universal bot for auto-applications.
          </p>

          <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-[var(--text-secondary)] font-mono">
            <span className="flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              PDF / DOCX Format Supported
            </span>
            <span>•</span>
            <span>Max 10 MB</span>
          </div>

          {uploading && (
            <div className="mt-6 max-w-xs mx-auto">
              <ProgressBar progress={uploadProgress} label="Saving to data/resumes/ & extracting profile..." />
            </div>
          )}
        </div>
      </Card>

      {/* 3. Managed Resumes List Card */}
      <Card>
        <CardHeader
          title="All Managed Resume Documents"
          subtitle={`${resumes.length} document${resumes.length === 1 ? '' : 's'} synchronized in database`}
        />

        {resumesLoading && resumes.length === 0 ? (
          <div className="space-y-3">
            <Skeleton height="4rem" />
            <Skeleton height="4rem" />
          </div>
        ) : resumes.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="Upload your resume to empower automated job applications"
            description="Upload a PDF or Word resume to automatically extract your skills, education, and job screening answers."
            actionLabel="Browse Resume File"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <div className="space-y-3">
            {resumes.map((res) => (
              <div
                key={res.id}
                className={`p-4 rounded-none border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  res.isDefault
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-base)]'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-none flex items-center justify-center shrink-0 border-2 ${
                      res.isDefault
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-500'
                        : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--text-primary)] truncate font-mono">
                        {res.fileName}
                      </span>
                      {res.isDefault && (
                        <Badge variant="success" size="sm">
                          Default Resume
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-1 font-mono">
                      <span>{formatFileSize(res.fileSizeBytes)}</span>
                      <span>•</span>
                      <span>Uploaded {new Date(res.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAutofill(res.id)}
                    disabled={actionLoading}
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-sky-400" />}
                  >
                    Autofill Profile
                  </Button>

                  {!res.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(res.id, res.fileName)}
                      disabled={actionLoading}
                      leftIcon={<Star className="w-3.5 h-3.5" />}
                    >
                      Make Default
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    onClick={() => setDeleteTargetId(res.id)}
                    disabled={actionLoading}
                    aria-label={`Delete resume ${res.fileName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Delete Cloud Resume Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete Resume Document"
        description="Are you sure you want to remove this resume document? Tasks requiring this document will fallback to your remaining default document."
        confirmLabel="Delete Resume"
        isDestructive
        isLoading={actionLoading}
      />

      {/* Delete Physical Local Resume Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteLocalModalOpen}
        onClose={() => setDeleteLocalModalOpen(false)}
        onConfirm={handleDeleteLocalResume}
        title="Delete Physical Bot Resume from Disk"
        description={`Are you sure you want to delete "${activeBotResumeName}" from data/resumes/ and clear it from .env? Automated portal applications will require a resume before applying.`}
        confirmLabel="Yes, Delete from Disk & .env"
        isDestructive
        isLoading={actionLoading}
      />
    </div>
  );
};
