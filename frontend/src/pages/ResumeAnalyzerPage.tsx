import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Target,
  Trash2,
  Code2,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import {
  resumeAnalysisService,
  type ResumeAnalysisResponse,
} from '../services/resumeAnalysisService';
import { useToast } from '../context/ToastContext';
import { playRetroSound } from '../utils/soundEffects';
import {
  Card,
  CardHeader,
  Button,
  Badge,
  Input,
  Textarea,
  ConfirmDialog,
  Skeleton,
} from '../components/ui';

export const ResumeAnalyzerPage: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetJobTitle, setTargetJobTitle] = useState<string>('Full Stack Developer');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [pastedResumeText, setPastedResumeText] = useState<string>('');
  const [dragOver, setDragOver] = useState<boolean>(false);

  // Analysis Result States
  const [currentAnalysis, setCurrentAnalysis] = useState<ResumeAnalysisResponse | null>(null);
  const [history, setHistory] = useState<ResumeAnalysisResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');

  // Load Analysis History on Mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await resumeAnalysisService.getHistory();
      setHistory(res.analyses);
      if (res.analyses.length > 0 && !currentAnalysis) {
        setCurrentAnalysis(res.analyses[0]);
      }
    } catch (err) {
      console.debug('History load note:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.pdf') && !ext.endsWith('.docx') && !ext.endsWith('.txt')) {
      showToast('Please upload a PDF (.pdf), Word (.docx), or Text (.txt) file.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds the 10 MB limit.', 'error');
      return;
    }
    setSelectedFile(file);
    playRetroSound('click');
  };

  const handleAnalyzeResume = async () => {
    if (activeTab === 'upload' && !selectedFile) {
      showToast('Please select or drop a resume document first.', 'warning');
      return;
    }
    if (activeTab === 'text' && (!pastedResumeText || pastedResumeText.trim().length < 30)) {
      showToast('Please paste your resume text (at least 30 characters).', 'warning');
      return;
    }

    try {
      setLoading(true);
      playRetroSound('button');

      let analysis: ResumeAnalysisResponse;
      if (activeTab === 'upload' && selectedFile) {
        analysis = await resumeAnalysisService.uploadAndAnalyze(selectedFile, targetJobTitle);
      } else {
        analysis = await resumeAnalysisService.analyze({
          resume_text: pastedResumeText,
          job_title: targetJobTitle,
        });
      }

      setCurrentAnalysis(analysis);
      setHistory((prev) => [analysis, ...prev.filter((item) => item.id !== analysis.id)]);
      showToast('🎉 Resume analyzed successfully! Score generated.', 'success');
      playRetroSound('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze resume.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchJobDescription = async () => {
    if (!jobDescription || jobDescription.trim().length < 20) {
      showToast('Please paste a job description (at least 20 characters) to compare.', 'warning');
      return;
    }

    try {
      setLoading(true);
      playRetroSound('button');

      const analysis = await resumeAnalysisService.matchJob({
        resume_id: currentAnalysis?.id,
        resume_text: pastedResumeText || undefined,
        job_title: targetJobTitle,
        job_description: jobDescription,
      });

      setCurrentAnalysis(analysis);
      setHistory((prev) => [analysis, ...prev.filter((item) => item.id !== analysis.id)]);
      showToast('🎯 Job Description matched! Missing skills and recommendations generated.', 'success');
      playRetroSound('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to match job description.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(true);
      await resumeAnalysisService.deleteAnalysis(deleteTargetId);
      setHistory((prev) => prev.filter((item) => item.id !== deleteTargetId));
      if (currentAnalysis?.id === deleteTargetId) {
        setCurrentAnalysis(history.find((item) => item.id !== deleteTargetId) || null);
      }
      showToast('Analysis record deleted.', 'info');
      setDeleteTargetId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete analysis.';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
    if (score >= 65) return 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20';
    if (score >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/30 bg-rose-950/20';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Exceptional ATS Alignment';
    if (score >= 70) return 'Strong Recruiter Match';
    if (score >= 55) return 'Good / Moderate Fit';
    return 'Needs Keyword Optimization';
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-theme">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-mono font-bold uppercase tracking-tight text-theme-primary">
              ATS Resume Analyzer & Job Matcher
            </h1>
            <Badge variant="cyan" size="sm">
              <Sparkles className="w-3 h-3 mr-1 inline" />
              AI & Heuristic Engine
            </Badge>
          </div>
          <p className="text-xs text-theme-secondary mt-1">
            Score your resume against applicant tracking systems, identify missing keyword gaps, and customize for employer job descriptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            className="text-xs"
          >
            Refresh History
          </Button>
        </div>
      </div>

      {/* Main Grid: Input Form vs Live ATS Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload / Paste & Job Description Input (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-5 space-y-4">
            <CardHeader
              title="1. Candidate Resume"
              subtitle="Upload your document or paste raw text for analysis."
            />

            {/* Mode Switcher */}
            <div className="flex rounded-lg border border-theme p-1 bg-theme-surface text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload Document
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'text'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Paste Text
              </button>
            </div>

            {/* Tab 1: Drag & Drop Upload */}
            {activeTab === 'upload' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-[var(--accent)] bg-theme-accent-muted/20'
                      : 'border-theme hover:border-[var(--accent)] hover:bg-theme-surface/50'
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-[var(--accent)] mb-2" />
                  <span className="text-xs font-bold text-theme-primary">
                    {selectedFile ? selectedFile.name : 'Click to Browse or Drag Resume Here'}
                  </span>
                  <span className="text-[11px] text-theme-secondary mt-1">
                    Supports standard PDF, Word (.docx), and Text (.txt) up to 10 MB.
                  </span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Badge variant="default" size="sm">PDF</Badge>
                    <Badge variant="default" size="sm">DOCX</Badge>
                    <Badge variant="default" size="sm">TXT</Badge>
                  </div>
                </div>

                {selectedFile && (
                  <div className="mt-3 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between text-xs text-emerald-300">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span className="truncate font-semibold">{selectedFile.name}</span>
                      <span className="text-[10px] text-emerald-400/80">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 p-1"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Paste Raw Text */}
            {activeTab === 'text' && (
              <Textarea
                label="Raw Resume Text *"
                placeholder="Paste the full text of your resume here including contact details, skills, experience, and education..."
                rows={7}
                value={pastedResumeText}
                onChange={(e) => setPastedResumeText(e.target.value)}
                className="font-mono text-xs"
              />
            )}

            {/* Target Job Title */}
            <Input
              label="Target Role / Job Title"
              placeholder="e.g. Full Stack Developer, React Engineer, Python Backend"
              value={targetJobTitle}
              onChange={(e) => setTargetJobTitle(e.target.value)}
            />

            <Button
              variant="primary"
              className="w-full"
              disabled={loading || (activeTab === 'upload' && !selectedFile && !currentAnalysis)}
              onClick={handleAnalyzeResume}
              leftIcon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            >
              {loading ? 'Evaluating Resume...' : 'Analyze Resume Score'}
            </Button>
          </Card>

          {/* Job Description Matching Section */}
          <Card className="p-5 space-y-4">
            <CardHeader
              title="2. Compare Job Description"
              subtitle="Paste employer requirements to generate keyword gap analysis."
            />

            <Textarea
              label="Employer Job Description (JD)"
              placeholder="Paste full job description from Naukri, LinkedIn, Indeed, or Internshala..."
              rows={6}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="font-mono text-xs"
            />

            <Button
              variant="outline"
              className="w-full"
              disabled={loading || !jobDescription.trim()}
              onClick={handleMatchJobDescription}
              leftIcon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            >
              {loading ? 'Matching Keywords...' : 'Match Against Job Description'}
            </Button>
          </Card>
        </div>

        {/* Right Column: Live ATS Evaluation Report (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {loading && !currentAnalysis ? (
            <Card className="p-6 space-y-4">
              <Skeleton height="3rem" />
              <Skeleton height="8rem" />
              <Skeleton height="6rem" />
            </Card>
          ) : currentAnalysis ? (
            <>
              {/* Overall Score Header Card */}
              <Card className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-theme-muted block">
                      Target Role: {currentAnalysis.job_title || 'General Engineering'}
                    </span>
                    <h2 className="text-xl font-bold font-mono text-theme-primary flex items-center gap-2 mt-0.5">
                      <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
                      ATS Compatibility Assessment
                    </h2>
                    <span className="text-xs text-theme-secondary">
                      Evaluated on {new Date(currentAnalysis.created_at).toLocaleDateString()} for{' '}
                      <span className="font-semibold text-theme-primary">{currentAnalysis.resume_name}</span>
                    </span>
                  </div>

                  {/* Circular/Gauge ATS Score Indicator */}
                  <div className={`px-5 py-3 rounded-2xl border flex flex-col items-center justify-center text-center shadow-xs ${getScoreColor(currentAnalysis.overall_score)}`}>
                    <div className="text-3xl font-mono font-extrabold leading-none">
                      {currentAnalysis.overall_score}
                      <span className="text-sm font-normal opacity-70">/100</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
                      {getScoreLabel(currentAnalysis.overall_score)}
                    </span>
                  </div>
                </div>

                {/* Section Breakdown Meter */}
                <div className="pt-2 border-t border-theme space-y-2.5">
                  <span className="text-xs font-semibold text-theme-secondary uppercase tracking-wider block">
                    Section Quality Breakdown
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div className="p-2 rounded-xl bg-theme-surface border border-theme">
                      <span className="text-[10px] text-theme-muted uppercase block">Contact</span>
                      <span className="text-sm font-bold font-mono text-theme-primary">
                        {currentAnalysis.section_scores.contact}%
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-theme-surface border border-theme">
                      <span className="text-[10px] text-theme-muted uppercase block">Skills</span>
                      <span className="text-sm font-bold font-mono text-theme-primary">
                        {currentAnalysis.section_scores.skills}%
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-theme-surface border border-theme">
                      <span className="text-[10px] text-theme-muted uppercase block">Experience</span>
                      <span className="text-sm font-bold font-mono text-theme-primary">
                        {currentAnalysis.section_scores.experience}%
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-theme-surface border border-theme">
                      <span className="text-[10px] text-theme-muted uppercase block">Education</span>
                      <span className="text-sm font-bold font-mono text-theme-primary">
                        {currentAnalysis.section_scores.education}%
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-theme-surface border border-theme col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-theme-muted uppercase block">Projects</span>
                      <span className="text-sm font-bold font-mono text-theme-primary">
                        {currentAnalysis.section_scores.projects}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="p-3.5 rounded-xl border border-theme bg-theme-surface/70 text-xs text-theme-secondary leading-relaxed">
                  <span className="font-bold text-theme-primary block mb-1">Assessment Summary:</span>
                  {currentAnalysis.match_summary}
                </div>
              </Card>

              {/* Skills Analysis Card */}
              <Card className="p-6 space-y-4">
                <CardHeader
                  title="Keyword & Skills Gap Analysis"
                  subtitle="Comparison against employer requirements and industry standards."
                />

                {/* Matched Skills */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Matched Skills ({currentAnalysis.skills_analysis.matched.length})
                    </span>
                    <span className="text-[11px] font-mono text-theme-muted">
                      {currentAnalysis.skills_analysis.match_percentage.toFixed(0)}% JD Match
                    </span>
                  </div>
                  {currentAnalysis.skills_analysis.matched.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {currentAnalysis.skills_analysis.matched.map((sk) => (
                        <Badge key={sk} variant="success" size="sm">
                          {sk}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-theme-muted italic">
                      Paste a Job Description on the left to see matched employer keywords.
                    </span>
                  )}
                </div>

                {/* Missing Skills */}
                {currentAnalysis.skills_analysis.missing.length > 0 && (
                  <div className="pt-3 border-t border-theme">
                    <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Missing Skills Required by Employer ({currentAnalysis.skills_analysis.missing.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentAnalysis.skills_analysis.missing.map((sk) => (
                        <Badge key={sk} variant="warning" size="sm">
                          + {sk}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Detected Skills */}
                <div className="pt-3 border-t border-theme">
                  <span className="text-xs font-semibold text-theme-secondary flex items-center gap-1.5 mb-2">
                    <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                    All Extracted Skills in Resume ({currentAnalysis.skills_analysis.candidate_skills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {currentAnalysis.skills_analysis.candidate_skills.map((sk) => (
                      <Badge key={sk} variant="default" size="sm">
                        {sk}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Actionable Improvement Suggestions */}
              {currentAnalysis.actionable_suggestions.length > 0 && (
                <Card className="p-6 space-y-3">
                  <CardHeader
                    title="Priority ATS Recommendations"
                    subtitle="Action items to maximize interview callback rates."
                  />
                  <div className="space-y-2">
                    {currentAnalysis.actionable_suggestions.map((tip, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-theme bg-theme-surface/50 text-xs flex items-start gap-2.5 text-theme-secondary"
                      >
                        <span className="w-5 h-5 rounded-full bg-theme-accent-muted border border-[var(--accent)] text-[var(--accent)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{tip}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-12 text-center space-y-3 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-theme-surface border border-theme flex items-center justify-center text-theme-muted mb-2">
                <Sparkles className="w-8 h-8 text-[var(--accent)]" />
              </div>
              <h3 className="text-base font-bold font-mono text-theme-primary">
                No Resume Analysis Selected
              </h3>
              <p className="text-xs text-theme-secondary max-w-md">
                Upload your resume file or paste text on the left to generate ATS compatibility scores, section breakdowns, and keyword gap analysis.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Analysis History Section */}
      <Card className="p-6 space-y-4">
        <CardHeader
          title="Previous Resume Analyses"
          subtitle="All historical ATS evaluations saved under your account."
        />

        {historyLoading ? (
          <div className="space-y-2">
            <Skeleton height="2.5rem" />
            <Skeleton height="2.5rem" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-xs text-theme-muted">
            No previous analyses recorded yet. Upload a resume above to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-theme text-theme-muted">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Resume Name</th>
                  <th className="py-2.5 px-3">Target Role</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-theme-surface/50 transition-colors cursor-pointer ${
                      currentAnalysis?.id === item.id ? 'bg-theme-surface font-semibold' : ''
                    }`}
                    onClick={() => {
                      setCurrentAnalysis(item);
                      playRetroSound('click');
                    }}
                  >
                    <td className="py-3 px-3 text-theme-muted whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-medium text-theme-primary flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-theme-secondary" />
                      {item.resume_name}
                    </td>
                    <td className="py-3 px-3 text-theme-secondary">
                      {item.job_title || 'General Engineering'}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={item.overall_score >= 80 ? 'success' : item.overall_score >= 60 ? 'cyan' : 'warning'}
                        size="sm"
                      >
                        {item.overall_score} / 100
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(item.id);
                        }}
                        className="text-theme-muted hover:text-red-400 p-1 transition-colors"
                        aria-label="Delete analysis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirmation Dialog for Deleting Analysis */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Resume Analysis Record"
        description="Are you sure you want to permanently delete this ATS evaluation record? This action cannot be undone."
        confirmLabel={deleting ? 'Deleting...' : 'Delete Record'}
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDeleteAnalysis}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
