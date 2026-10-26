import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Trash2,
  Star,
  AlertCircle,
  FileCheck,
  Info,
  Sparkles,
} from 'lucide-react';
import { useResumes } from '../hooks/useResumes';
import { useProfile } from '../hooks/useProfile';
import { useToast } from '../context/ToastContext';
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
    loading,
    error,
    uploadResume,
    setDefaultResume,
    deleteResume,
  } = useResumes();
  const { autofillProfile } = useProfile();
  const { showToast } = useToast();

  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileProcess = async (file: File) => {
    setValidationError(null);

    // Validation: PDF only
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setValidationError('Invalid file format. Only standard PDF documents are supported.');
      return;
    }

    // Validation: Max 5 MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setValidationError('File exceeds maximum size limit of 5 MB.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(20);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 25;
        });
      }, 150);

      const uploadRes = await uploadResume(file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      try {
        if (uploadRes?.resume?.id) {
          await autofillProfile(uploadRes.resume.id);
        }
        showToast(`Resume "${file.name}" uploaded & profile autofilled!`, 'success');
      } catch {
        showToast(`Resume "${file.name}" uploaded successfully`, 'success');
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Upload failed');
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

  const handleAutofill = async (id: string, name: string) => {
    try {
      setActionLoading(true);
      await autofillProfile(id);
      showToast(`Profile autofilled from "${name}"! Unmentioned fields left blank.`, 'success');
    } catch (err) {
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Notice Banner */}
      <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-950/40 text-sky-200 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sky-100 mb-0.5">
            Cloud Storage Notice (Demo Simulation)
          </span>
          <span>
            Files are not saved to a server yet. In Phase 4, your resumes will be securely uploaded
            to private Supabase Storage buckets with strict Row Level Security (RLS) and short-lived
            signed URLs.
          </span>
        </div>
      </div>

      {(error || validationError) && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError || error}</span>
        </div>
      )}

      {/* Upload Dropzone Card */}
      <Card>
        <CardHeader
          title="Upload Candidate Resume"
          subtitle="Strict format: PDF format only, maximum 5 MB"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-[var(--accent)] bg-theme-accent-muted'
              : 'border-theme hover:border-theme-focus bg-theme-surface/30 hover:bg-theme-surface/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-theme-accent-muted border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] mx-auto mb-4">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-theme-primary mb-1">
            Drag & drop your resume PDF here, or <span className="text-[var(--accent)]">browse</span>
          </h3>
          <p className="text-xs text-theme-secondary max-w-sm mx-auto">
            Uploaded resumes are parsed for keywords and attached to 1-click Easy Apply workflows.
          </p>

          <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-theme-muted">
            <span className="flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              PDF Format Verified
            </span>
            <span>•</span>
            <span>Max 5 MB</span>
          </div>

          {uploading && (
            <div className="mt-6 max-w-xs mx-auto">
              <ProgressBar progress={uploadProgress} label="Uploading and validating PDF..." />
            </div>
          )}
        </div>
      </Card>

      {/* Resumes List Card */}
      <Card>
        <CardHeader
          title="Candidate Resumes"
          subtitle={`${resumes.length} document${resumes.length === 1 ? '' : 's'} managed`}
        />

        {loading && resumes.length === 0 ? (
          <div className="space-y-3">
            <Skeleton height="4rem" />
            <Skeleton height="4rem" />
          </div>
        ) : resumes.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="Upload your resume to build your profile"
            description="Upload a PDF resume to extract your skills, experience, and enable automated portal attachments."
            actionLabel="Browse PDF File"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <div className="space-y-3">
            {resumes.map((res) => (
              <div
                key={res.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  res.isDefault
                    ? 'border-emerald-500/40 bg-emerald-950/20'
                    : 'border-theme bg-theme-surface/40 hover:bg-theme-card'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      res.isDefault
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                        : 'bg-theme-surface text-theme-muted border border-theme'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-theme-primary truncate">
                        {res.fileName}
                      </span>
                      {res.isDefault && (
                        <Badge variant="success" size="sm">
                          Default Resume
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-theme-muted mt-1">
                      <span>{formatFileSize(res.fileSizeBytes)}</span>
                      <span>•</span>
                      <span>Uploaded {new Date(res.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAutofill(res.id, res.fileName)}
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

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete Resume Document"
        description="Are you sure you want to remove this resume? Automated tasks requiring this resume will fallback to your remaining default document."
        confirmLabel="Delete Resume"
        isDestructive
        isLoading={actionLoading}
      />
    </div>
  );
};
