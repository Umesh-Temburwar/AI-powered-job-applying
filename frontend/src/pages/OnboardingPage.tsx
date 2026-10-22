import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  User,
  GraduationCap,
  Code2,
  Briefcase,
  Award,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  Target,
  MapPin,
  Bot,
  Loader2,
  X,
} from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useResumes } from '../hooks/useResumes';
import { usePreferences } from '../hooks/usePreferences';
import { useToast } from '../context/ToastContext';
import {
  Card,
  CardHeader,
  Button,
  Badge,
  Input,
  Textarea,
  Checkbox,
  Select,
  ProgressBar,
  Skeleton,
} from '../components/ui';
import type { EducationItem, ExperienceItem, ProjectItem, CertificationItem, PlatformName } from '../types';

const STEPS = [
  { id: 0, title: 'Upload Resume', icon: UploadCloud, subtitle: 'Automatic extraction' },
  { id: 1, title: 'Personal Info', icon: User, subtitle: 'Identity & contact' },
  { id: 2, title: 'Education', icon: GraduationCap, subtitle: 'Degrees & college' },
  { id: 3, title: 'Skills & Projects', icon: Code2, subtitle: 'Tech stack' },
  { id: 4, title: 'Experience', icon: Briefcase, subtitle: 'Employment history' },
  { id: 5, title: 'Certifications', icon: Award, subtitle: 'Credentials & details' },
  { id: 6, title: 'Job Preferences', icon: Sliders, subtitle: 'Target roles & cities' },
  { id: 7, title: 'Review & Confirm', icon: CheckCircle2, subtitle: 'Final verification' },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { uploadResume } = useResumes();
  const { preferences, updatePreferences, suggestRoles } = usePreferences();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedResumeName, setUploadedResumeName] = useState<string | null>(null);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  // Education & Experience
  const [educationList, setEducationList] = useState<EducationItem[]>([]);
  const [isFresher, setIsFresher] = useState(true);
  const [experienceList, setExperienceList] = useState<ExperienceItem[]>([]);

  // Skills & Projects
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [projectsList, setProjectsList] = useState<ProjectItem[]>([]);
  const [certificationsList, setCertificationsList] = useState<CertificationItem[]>([]);

  // Additional info
  const [noticePeriodDays, setNoticePeriodDays] = useState(15);
  const [willingToRelocate, setWillingToRelocate] = useState(true);
  const [workAuthorization, setWorkAuthorization] = useState('Authorized to work in India');
  const [expectedSalaryLakhs, setExpectedSalaryLakhs] = useState<number | undefined>(undefined);

  // Job Preferences
  const [targetTitles, setTargetTitles] = useState<string[]>([]);
  const [targetTitleInput, setTargetTitleInput] = useState('');
  const [targetLocations, setTargetLocations] = useState<string[]>([]);
  const [targetLocationInput, setTargetLocationInput] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformName[]>(['Naukri', 'Internshala']);
  const [dailyLimit, setDailyLimit] = useState(25);

  // Initialize or resume saved onboarding progress
  useEffect(() => {
    if (profile) {
      if (profile.fullName) setFullName(profile.fullName);
      if (profile.email) setEmail(profile.email);
      if (profile.phone) setPhone(profile.phone);
      if (profile.city || profile.currentLocation) setCity(profile.city || profile.currentLocation);
      if (profile.headline) setHeadline(profile.headline);
      if (profile.summary) setSummary(profile.summary);
      if (profile.linkedinUrl) setLinkedinUrl(profile.linkedinUrl);
      if (profile.githubUrl) setGithubUrl(profile.githubUrl);
      if (profile.portfolioUrl) setPortfolioUrl(profile.portfolioUrl);
      if (profile.skills && profile.skills.length > 0) setSkills(profile.skills);
      const hasExp = Boolean(profile.experience && profile.experience.length > 0);
      if (hasExp) {
        setExperienceList(profile.experience!);
        setIsFresher(false);
      }
      if (profile.projects && profile.projects.length > 0) setProjectsList(profile.projects);
      if (profile.certifications && profile.certifications.length > 0) setCertificationsList(profile.certifications);
      if (profile.additionalInfo) {
        if (!hasExp && profile.additionalInfo.is_fresher !== undefined) setIsFresher(profile.additionalInfo.is_fresher);
        if (profile.additionalInfo.notice_period_days !== undefined) setNoticePeriodDays(profile.additionalInfo.notice_period_days);
        if (profile.additionalInfo.willing_to_relocate !== undefined) setWillingToRelocate(profile.additionalInfo.willing_to_relocate);
        if (profile.additionalInfo.expected_salary_lakhs !== undefined) setExpectedSalaryLakhs(profile.additionalInfo.expected_salary_lakhs || undefined);
      }

      // Resume from saved step if valid
      if (profile.onboardingStep && profile.onboardingStep > 0 && profile.onboardingStep <= 7 && !profile.isOnboarded) {
        setCurrentStep(profile.onboardingStep);
      }
    }
  }, [profile]);

  // Sync preferences
  useEffect(() => {
    if (preferences) {
      if (preferences.targetTitles && preferences.targetTitles.length > 0) setTargetTitles(preferences.targetTitles);
      if (preferences.targetLocations && preferences.targetLocations.length > 0) setTargetLocations(preferences.targetLocations);
      if (preferences.selectedPlatforms && preferences.selectedPlatforms.length > 0) setSelectedPlatforms(preferences.selectedPlatforms);
      if (preferences.dailyApplicationLimit) setDailyLimit(preferences.dailyApplicationLimit);
    }
  }, [preferences]);

  // Resume file upload & parse
  const handleFileProcess = async (file: File) => {
    setValidationError(null);
    setOcrWarning(null);

    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setValidationError('Only PDF (.pdf) and Word (.docx) files are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setValidationError('File size exceeds 10 MB limit.');
      return;
    }

    try {
      setUploadingResume(true);
      const res = await uploadResume(file, true);
      setUploadedResumeName(file.name);

      if (res.ocr_needed) {
        setOcrWarning('Scanned document detected. Digital text was limited, so please review fields in the next steps.');
      }

      const p = res.parsed_profile;
      if (p.full_name) setFullName(p.full_name);
      if (p.email) setEmail(p.email);
      if (p.phone) setPhone(p.phone);
      if (p.city) setCity(p.city);
      if (p.headline) setHeadline(p.headline);
      if (p.summary) setSummary(p.summary);
      if (p.linkedin_url !== undefined) setLinkedinUrl(p.linkedin_url || '');
      if (p.github_url !== undefined) setGithubUrl(p.github_url || '');
      setPortfolioUrl(p.portfolio_url || '');
      if (p.skills && p.skills.length > 0) {
        setSkills(p.skills);
        // Suggest roles from extracted skills
        suggestRoles(p.skills).then((titles) => {
          if (titles.length > 0) setTargetTitles(titles);
        });
      }
      if (p.education && p.education.length > 0) {
        setEducationList(
          p.education.map((e, idx) => ({
            id: String(idx + 1),
            degree: e.degree,
            institution: e.institution,
            year: e.year || '',
            score: e.score,
          }))
        );
      }
      if (p.experience && p.experience.length > 0) {
        setExperienceList(
          p.experience.map((x, idx) => ({
            id: String(idx + 1),
            role: x.role,
            company: x.company,
            duration: x.duration || '',
            description: x.description || '',
          }))
        );
        setIsFresher(false);
      }
      if (p.projects && p.projects.length > 0) {
        setProjectsList(
          p.projects.map((proj, idx) => ({
            id: String(idx + 1),
            title: proj.title,
            description: proj.description,
            technologies: proj.technologies || [],
            url: proj.url,
          }))
        );
      }
      if (p.certifications && p.certifications.length > 0) {
        setCertificationsList(
          p.certifications.map((c, idx) => ({
            id: String(idx + 1),
            name: c.name,
            issuer: c.issuer,
            date: c.date,
            url: c.url,
          }))
        );
      }

      showToast(`Resume parsed successfully! Extracted ${res.extracted_skills_count} skills.`, 'success');
      setCurrentStep(1);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to parse resume file.');
    } finally {
      setUploadingResume(false);
    }
  };

  // Add / Remove helpers
  const handleAddSkill = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const val = skillInput.trim();
    if (val && !skills.includes(val)) {
      setSkills((prev) => [...prev, val]);
      setSkillInput('');
    }
  };

  const handleAddEducation = () => {
    setEducationList((prev) => [
      ...prev,
      { id: String(Date.now()), degree: '', institution: '', year: '2024', score: '' },
    ]);
  };

  const handleAddExperience = () => {
    setExperienceList((prev) => [
      ...prev,
      { id: String(Date.now()), company: '', role: '', duration: '1 Year', description: '' },
    ]);
  };

  const handleAddProject = () => {
    setProjectsList((prev) => [
      ...prev,
      { id: String(Date.now()), title: '', description: '', technologies: ['React'], url: '' },
    ]);
  };

  const handleAddCert = () => {
    setCertificationsList((prev) => [
      ...prev,
      { id: String(Date.now()), name: '', issuer: '', date: '2024', url: '' },
    ]);
  };

  // Step Validation & Save
  const handleSaveAndContinue = async () => {
    setValidationError(null);

    // Validation for Step 1
    if (currentStep === 1) {
      if (!fullName.trim()) {
        setValidationError('Please enter your full name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setValidationError('Please enter a valid email address.');
        return;
      }
    }

    // Validation for Step 2
    if (currentStep === 2) {
      if (educationList.length === 0 || !educationList[0].degree.trim()) {
        setValidationError('Please provide at least one educational qualification.');
        return;
      }
    }

    // Validation for Step 3
    if (currentStep === 3) {
      if (skills.length === 0) {
        setValidationError('Please add at least one technical skill.');
        return;
      }
    }

    // Save progress to backend
    try {
      setSaving(true);
      const nextStep = currentStep + 1;
      await updateProfile({
        fullName,
        email,
        phone,
        city,
        currentLocation: city,
        headline,
        summary,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        skills,
        education: educationList,
        experience: isFresher ? [] : experienceList,
        projects: projectsList,
        certifications: certificationsList,
        additionalInfo: {
          is_fresher: isFresher,
          notice_period_days: noticePeriodDays,
          willing_to_relocate: willingToRelocate,
          work_authorization: workAuthorization,
          expected_salary_lakhs: expectedSalaryLakhs,
        },
        onboardingStep: nextStep,
        isOnboarded: false,
      });

      if (nextStep <= 7) {
        setCurrentStep(nextStep);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save progress', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Final confirmation
  const handleFinalSubmit = async () => {
    try {
      setSaving(true);
      // 1. Mark profile completed
      await updateProfile({
        fullName,
        email,
        phone,
        city,
        currentLocation: city,
        headline,
        summary,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        skills,
        education: educationList,
        experience: isFresher ? [] : experienceList,
        projects: projectsList,
        certifications: certificationsList,
        additionalInfo: {
          is_fresher: isFresher,
          notice_period_days: noticePeriodDays,
          willing_to_relocate: willingToRelocate,
          work_authorization: workAuthorization,
          expected_salary_lakhs: expectedSalaryLakhs,
        },
        isOnboarded: true,
        onboardingStep: 7,
      });

      // 2. Save job preferences
      await updatePreferences({
        targetTitles,
        targetLocations,
        selectedPlatforms,
        dailyApplicationLimit: dailyLimit,
        experienceLevel: isFresher ? 'Fresher / Entry Level' : '1-3 Years',
      });

      showToast('🎉 Onboarding completed successfully! Welcome to your dashboard.', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error completing onboarding', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading && currentStep > 0 && !profile) {
    return (
      <div className="min-h-screen bg-theme-base flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-4">
          <Skeleton height="3rem" />
          <Skeleton height="12rem" />
        </div>
      </div>
    );
  }

  const progressPercentage = Math.round(((currentStep + 1) / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-theme-base flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Header with Brand & Progress */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-theme-accent-muted border border-[var(--accent)] flex items-center justify-center text-[var(--accent)]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-theme-primary">Candidate Onboarding Wizard</h1>
              <p className="text-xs text-theme-secondary">
                Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title} — {STEPS[currentStep].subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {profileLoading && (
              <span className="text-xs text-theme-muted flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                Syncing profile...
              </span>
            )}
            <Badge variant="cyan" size="sm">
              Progress: {progressPercentage}%
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-xs text-theme-muted hover:text-theme-primary"
            >
              Skip to Dashboard
            </Button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="space-y-2">
          <ProgressBar progress={progressPercentage} />
          {/* Step Pill Indicators */}
          <div className="hidden sm:grid grid-cols-8 gap-1.5 text-center pt-1">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(s.id)}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-colors flex flex-col items-center gap-1 ${
                  s.id === currentStep
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : s.id < currentStep
                    ? 'bg-theme-surface text-emerald-400 border border-emerald-500/30'
                    : 'bg-theme-card text-theme-muted hover:text-theme-primary'
                }`}
              >
                <s.icon className="w-3.5 h-3.5" />
                <span className="truncate w-full">{s.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="p-3.5 rounded-xl border border-red-500/40 bg-red-950/40 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Step 0: Resume Upload & Parsing */}
        {currentStep === 0 && (
          <Card className="p-6 space-y-6">
            <CardHeader
              title="Upload Candidate Resume"
              subtitle="Drop your existing PDF or Word resume. Our engine extracts your education, technical skills, and projects."
            />

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0]);
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
                  handleFileProcess(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-[var(--accent)] bg-theme-accent-muted/20 scale-[0.99]'
                  : 'border-theme hover:border-[var(--accent)] hover:bg-theme-surface/50'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-theme-surface flex items-center justify-center text-[var(--accent)] mb-3 shadow-inner">
                {uploadingResume ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <UploadCloud className="w-7 h-7" />
                )}
              </div>
              <h3 className="text-base font-bold text-theme-primary mb-1">
                {uploadingResume ? 'Extracting Resume Data...' : 'Drag & Drop Resume, or Click to Browse'}
              </h3>
              <p className="text-xs text-theme-secondary max-w-sm mb-3">
                Supports standard PDF and Microsoft Word (.docx). Maximum file size 10 MB.
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="default" size="sm">PDF</Badge>
                <Badge variant="default" size="sm">DOCX</Badge>
                <Badge variant="cyan" size="sm">Strictly Private Storage</Badge>
              </div>
            </div>

            {uploadedResumeName && (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-300">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold">{uploadedResumeName}</span>
                  <span className="text-emerald-400/80">— Parsed successfully</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  Upload Different File
                </Button>
              </div>
            )}

            {ocrWarning && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/30 text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">OCR Notice</span>
                  <span>{ocrWarning}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-theme">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(1)}
              >
                Skip & Fill Manually →
              </Button>
              <Button
                variant="primary"
                onClick={() => setCurrentStep(1)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Personal Info
              </Button>
            </div>
          </Card>
        )}

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <Card className="p-6 space-y-6">
            <CardHeader
              title="Personal Information"
              subtitle="Contact coordinates used to introduce you to employer portals."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                placeholder="e.g. Alex Vance"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label="Email Address *"
                placeholder="e.g. alex@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Phone Number"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Current City / Location"
                placeholder="e.g. Pune, Bengaluru, Remote"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <Input
              label="Professional Headline"
              placeholder="e.g. Full Stack Developer | React & FastAPI | 2 Years Experience"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />

            <Textarea
              label="Professional Summary"
              placeholder="Brief introduction highlighting your engineering focus and major career achievements..."
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label="LinkedIn Profile"
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
              <Input
                label="GitHub Profile"
                placeholder="https://github.com/username"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
              <Input
                label="Portfolio / Website"
                placeholder="https://portfolio.dev"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-theme">
              <Button variant="ghost" onClick={() => setCurrentStep(0)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button variant="primary" onClick={handleSaveAndContinue} disabled={saving} rightIcon={<ArrowRight className="w-4 h-4" />}>
                {saving ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Education */}
        {currentStep === 2 && (
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <CardHeader
                title="Education History"
                subtitle="Qualifications reviewed by ATS filtering algorithms."
              />
              <Button variant="secondary" size="sm" onClick={handleAddEducation} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Add Degree
              </Button>
            </div>

            <div className="space-y-4">
              {educationList.map((edu, idx) => (
                <div key={edu.id || idx} className="p-4 rounded-xl border border-theme bg-theme-surface space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                      Qualification #{idx + 1}
                    </span>
                    {educationList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEducationList((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-theme-muted hover:text-red-400 p-1 transition-colors"
                        aria-label="Remove qualification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Degree / Program"
                      placeholder="e.g. Bachelor of Technology (B.Tech)"
                      value={edu.degree}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEducationList((prev) => prev.map((item, i) => (i === idx ? { ...item, degree: val } : item)));
                      }}
                    />
                    <Input
                      label="College / Institute"
                      placeholder="e.g. State University"
                      value={edu.institution}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEducationList((prev) => prev.map((item, i) => (i === idx ? { ...item, institution: val } : item)));
                      }}
                    />
                    <Input
                      label="Graduation Year"
                      placeholder="e.g. 2024"
                      value={edu.year || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEducationList((prev) => prev.map((item, i) => (i === idx ? { ...item, year: val } : item)));
                      }}
                    />
                    <Input
                      label="Marks / CGPA / % (Optional)"
                      placeholder="e.g. 8.5 CGPA or 85%"
                      value={edu.score || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEducationList((prev) => prev.map((item, i) => (i === idx ? { ...item, score: val } : item)));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-theme">
              <Button variant="ghost" onClick={() => setCurrentStep(1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button variant="primary" onClick={handleSaveAndContinue} disabled={saving} rightIcon={<ArrowRight className="w-4 h-4" />}>
                {saving ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Skills & Projects */}
        {currentStep === 3 && (
          <Card className="p-6 space-y-6">
            <CardHeader
              title="Skills & Technical Projects"
              subtitle="Skills match employer keyword triggers. Projects showcase your real coding capability."
            />

            {/* Skills */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wider">
                Confirmed Technical Skills ({skills.length})
              </label>
              <div className="flex flex-wrap gap-1.5 min-h-8 p-3 rounded-xl border border-theme bg-theme-surface">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-theme-card border border-theme text-theme-primary font-medium"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => setSkills((prev) => prev.filter((item) => item !== s))}
                      className="hover:text-red-400 p-0.5 text-theme-muted"
                      aria-label={`Remove skill ${s}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Type a skill and press Enter (e.g. Next.js, Docker)..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                />
                <Button type="button" variant="secondary" onClick={handleAddSkill} disabled={!skillInput.trim()}>
                  Add Skill
                </Button>
              </div>

              {/* Quick suggestion pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-theme-muted text-[11px]">Popular:</span>
                {['React', 'Node.js', 'FastAPI', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS', 'Tailwind'].map((ps) => (
                  <button
                    key={ps}
                    type="button"
                    onClick={() => {
                      if (!skills.includes(ps)) setSkills((prev) => [...prev, ps]);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                      skills.includes(ps)
                        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30'
                        : 'border-theme text-theme-secondary hover:text-theme-primary bg-theme-card'
                    }`}
                  >
                    + {ps}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div className="space-y-4 pt-4 border-t border-theme">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-theme-primary">Featured Engineering Projects</h4>
                  <p className="text-xs text-theme-secondary">High-impact projects that demonstrate your stack mastery.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleAddProject} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Add Project
                </Button>
              </div>

              {projectsList.length === 0 ? (
                <p className="text-xs text-theme-muted p-4 border border-dashed border-theme rounded-xl text-center">
                  No projects added yet. Click &quot;Add Project&quot; to include relevant work.
                </p>
              ) : (
                projectsList.map((proj, idx) => (
                  <div key={proj.id || idx} className="p-4 rounded-xl border border-theme bg-theme-surface space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-theme-primary uppercase">Project #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setProjectsList((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-theme-muted hover:text-red-400 p-1"
                        aria-label="Remove project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Project Title"
                        placeholder="e.g. Universal Job Bot"
                        value={proj.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProjectsList((prev) => prev.map((item, i) => (i === idx ? { ...item, title: val } : item)));
                        }}
                      />
                      <Input
                        label="Live URL or GitHub Repository"
                        placeholder="https://github.com/..."
                        value={proj.url || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProjectsList((prev) => prev.map((item, i) => (i === idx ? { ...item, url: val } : item)));
                        }}
                      />
                    </div>

                    <Textarea
                      label="Project Description"
                      placeholder="What does it do? What technologies and architecture did you employ?"
                      rows={2}
                      value={proj.description || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProjectsList((prev) => prev.map((item, i) => (i === idx ? { ...item, description: val } : item)));
                      }}
                    />
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-theme">
              <Button variant="ghost" onClick={() => setCurrentStep(2)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button variant="primary" onClick={handleSaveAndContinue} disabled={saving} rightIcon={<ArrowRight className="w-4 h-4" />}>
                {saving ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Work Experience */}
        {currentStep === 4 && (
          <Card className="p-6 space-y-6">
            <CardHeader
              title="Work & Internship Experience"
              subtitle="Companies, internships, or freelance experience."
            />

            {/* Fresher Option Toggle */}
            <div className="p-4 rounded-xl border border-theme bg-theme-surface flex items-start gap-3">
              <Checkbox
                checked={isFresher}
                onChange={(e) => {
                  const val = e.target.checked;
                  setIsFresher(val);
                }}
                label="I am a Fresher / Looking for Entry-Level Roles"
                description="Check this box if you are a recent graduate or transitioning without full-time corporate software experience."
              />
            </div>

            {!isFresher && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-theme-primary uppercase">Corporate Positions</span>
                  <Button variant="secondary" size="sm" onClick={handleAddExperience} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Add Position
                  </Button>
                </div>

                {experienceList.length === 0 ? (
                  <p className="text-xs text-theme-muted p-4 border border-dashed border-theme rounded-xl text-center">
                    No corporate experience added. Click &quot;Add Position&quot; or keep the Fresher option enabled.
                  </p>
                ) : (
                  experienceList.map((exp, idx) => (
                    <div key={exp.id || idx} className="p-4 rounded-xl border border-theme bg-theme-surface space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-theme-primary uppercase">Experience #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setExperienceList((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-theme-muted hover:text-red-400 p-1"
                          aria-label="Remove experience entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input
                          label="Company Name"
                          placeholder="e.g. Infosys, StartUp Inc."
                          value={exp.company}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExperienceList((prev) => prev.map((item, i) => (i === idx ? { ...item, company: val } : item)));
                          }}
                        />
                        <Input
                          label="Designation / Role"
                          placeholder="e.g. Junior Software Engineer"
                          value={exp.role}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExperienceList((prev) => prev.map((item, i) => (i === idx ? { ...item, role: val } : item)));
                          }}
                        />
                        <Input
                          label="Duration"
                          placeholder="e.g. Jan 2023 - Present"
                          value={exp.duration}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExperienceList((prev) => prev.map((item, i) => (i === idx ? { ...item, duration: val } : item)));
                          }}
                        />
                      </div>

                      <Textarea
                        label="Responsibilities & Impact"
                        placeholder="Bullet points describing your technical contributions, stack used, and accomplishments..."
                        rows={2}
                        value={exp.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExperienceList((prev) => prev.map((item, i) => (i === idx ? { ...item, description: val } : item)));
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-theme">
              <Button variant="ghost" onClick={() => setCurrentStep(3)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button variant="primary" onClick={handleSaveAndContinue} disabled={saving} rightIcon={<ArrowRight className="w-4 h-4" />}>
                {saving ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 5: Certifications & Additional Application Info */}
        {currentStep === 5 && (
          <Card className="p-6 space-y-6">
            <CardHeader
              title="Certifications & Job Criteria"
              subtitle="Portal questions like Notice Period, Relocation, and Verified Certifications."
            />

            {/* Certifications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-theme-primary">Certifications & Licenses</h4>
                  <p className="text-xs text-theme-secondary">AWS, Google Cloud, Meta, Coursera, or industry certificates.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleAddCert} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Add Certification
                </Button>
              </div>

              {certificationsList.length === 0 ? (
                <p className="text-xs text-theme-muted p-4 border border-dashed border-theme rounded-xl text-center">
                  No certifications added yet. (Optional)
                </p>
              ) : (
                certificationsList.map((c, idx) => (
                  <div key={c.id || idx} className="p-4 rounded-xl border border-theme bg-theme-surface space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-theme-primary uppercase">Certification #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setCertificationsList((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-theme-muted hover:text-red-400 p-1"
                        aria-label="Remove certification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="Certification Name"
                        placeholder="e.g. AWS Certified Solutions Architect"
                        value={c.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCertificationsList((prev) => prev.map((item, i) => (i === idx ? { ...item, name: val } : item)));
                        }}
                      />
                      <Input
                        label="Issuing Organization"
                        placeholder="e.g. Amazon Web Services"
                        value={c.issuer || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCertificationsList((prev) => prev.map((item, i) => (i === idx ? { ...item, issuer: val } : item)));
                        }}
                      />
                      <Input
                        label="Issue Date / ID"
                        placeholder="e.g. 2024"
                        value={c.date || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCertificationsList((prev) => prev.map((item, i) => (i === idx ? { ...item, date: val } : item)));
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Additional criteria */}
            <div className="space-y-4 pt-4 border-t border-theme">
              <h4 className="text-sm font-bold text-theme-primary">Platform Auto-Fill Settings</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Notice Period"
                  options={[
                    { value: '0', label: 'Immediate / 0 Days' },
                    { value: '15', label: '15 Days' },
                    { value: '30', label: '30 Days / 1 Month' },
                    { value: '60', label: '60 Days / 2 Months' },
                    { value: '90', label: '90 Days / 3 Months' },
                  ]}
                  value={String(noticePeriodDays)}
                  onChange={(e) => setNoticePeriodDays(parseInt(e.target.value, 10) || 15)}
                />

                <Input
                  label="Work Authorization"
                  value={workAuthorization}
                  onChange={(e) => setWorkAuthorization(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Input
                  label="Expected Salary (LPA, Optional)"
                  type="number"
                  placeholder="e.g. 8"
                  value={expectedSalaryLakhs ?? ''}
                  onChange={(e) => setExpectedSalaryLakhs(parseFloat(e.target.value) || undefined)}
                  helperText="Used to filter compensation requirements on portals"
                />

                <div className="pt-6">
                  <Checkbox
                    checked={willingToRelocate}
                    onChange={(e) => setWillingToRelocate(e.target.checked)}
                    label="Willing to Relocate for Job"
                    description="Increases interview invitations from outside your home city"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-theme">
              <Button variant="ghost" onClick={() => setCurrentStep(4)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button variant="primary" onClick={handleSaveAndContinue} disabled={saving} rightIcon={<ArrowRight className="w-4 h-4" />}>
                {saving ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 6: Job Preferences */}
        {currentStep === 6 && (
          <Card className="p-6 space-y-6">
            <CardHeader
              title="Job Targeting Criteria"
              subtitle="Specify roles, locations, and portal limits for the automated application bot."
            />

            {/* Target Titles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wider">
                  Target Job Titles & Roles ({targetTitles.length})
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    const recs = await suggestRoles(skills);
                    setTargetTitles(Array.from(new Set([...targetTitles, ...recs])));
                    showToast('Added smart title recommendations!', 'info');
                  }}
                  className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Suggest Roles From Skills
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-8 p-3 rounded-xl border border-theme bg-theme-surface">
                {targetTitles.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-theme-card border border-theme text-theme-primary font-medium"
                  >
                    <Target className="w-3 h-3 text-[var(--accent)]" />
                    {t}
                    <button
                      type="button"
                      onClick={() => setTargetTitles((prev) => prev.filter((item) => item !== t))}
                      className="hover:text-red-400 p-0.5 text-theme-muted"
                      aria-label={`Remove title ${t}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Type a target role and press Enter (e.g. React Developer)..."
                  value={targetTitleInput}
                  onChange={(e) => setTargetTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = targetTitleInput.trim();
                      if (val && !targetTitles.includes(val)) {
                        setTargetTitles((prev) => [...prev, val]);
                        setTargetTitleInput('');
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const val = targetTitleInput.trim();
                    if (val && !targetTitles.includes(val)) {
                      setTargetTitles((prev) => [...prev, val]);
                      setTargetTitleInput('');
                    }
                  }}
                  disabled={!targetTitleInput.trim()}
                >
                  Add Title
                </Button>
              </div>
            </div>

            {/* Target Locations */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wider">
                Preferred Locations & Cities
              </label>

              <div className="flex flex-wrap gap-1.5 min-h-8 p-3 rounded-xl border border-theme bg-theme-surface">
                {targetLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-theme-card border border-theme text-theme-primary font-medium"
                  >
                    <MapPin className="w-3 h-3 text-sky-400" />
                    {loc}
                    <button
                      type="button"
                      onClick={() => setTargetLocations((prev) => prev.filter((item) => item !== loc))}
                      className="hover:text-red-400 p-0.5 text-theme-muted"
                      aria-label={`Remove location ${loc}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Type a location and press Enter (e.g. Remote, Pune)..."
                  value={targetLocationInput}
                  onChange={(e) => setTargetLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = targetLocationInput.trim();
                      if (val && !targetLocations.includes(val)) {
                        setTargetLocations((prev) => [...prev, val]);
                        setTargetLocationInput('');
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const val = targetLocationInput.trim();
                    if (val && !targetLocations.includes(val)) {
                      setTargetLocations((prev) => [...prev, val]);
                      setTargetLocationInput('');
                    }
                  }}
                  disabled={!targetLocationInput.trim()}
                >
                  Add City
                </Button>
              </div>
            </div>

            {/* Platforms & Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">
                  Target Job Platforms
                </label>
                <div className="space-y-2 p-3 rounded-xl border border-theme bg-theme-surface">
                  {(['Naukri', 'Internshala', 'Indeed', 'LinkedIn'] as PlatformName[]).map((p) => (
                    <Checkbox
                      key={p}
                      checked={selectedPlatforms.includes(p)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedPlatforms((prev) =>
                          checked ? [...prev, p] : prev.filter((item) => item !== p)
                        );
                      }}
                      label={p}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Input
                  label="Daily Maximum Applications"
                  type="number"
                  min={1}
                  max={100}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseInt(e.target.value, 10) || 25)}
                  helperText="Safety limit: capped between 1 and 100 applications to avoid account rate-limiting"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-theme">
              <Button variant="ghost" onClick={() => setCurrentStep(5)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button variant="primary" onClick={handleSaveAndContinue} disabled={saving} rightIcon={<ArrowRight className="w-4 h-4" />}>
                {saving ? 'Saving...' : 'Review Full Profile'}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 7: Final Review & Confirmation */}
        {currentStep === 7 && (
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <CardHeader
                title="Profile Review & Confirmation"
                subtitle="Verify all extracted and confirmed profile data before enabling automated task execution."
              />
              <Badge variant="success" size="md" className="shrink-0">
                100% Ready
              </Badge>
            </div>

            {/* Review Sections */}
            <div className="space-y-4">
              {/* Identity & Contact Card */}
              <div className="p-4 rounded-xl border border-theme bg-theme-surface space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-theme-muted uppercase tracking-wider">Candidate Identity</span>
                  <button type="button" onClick={() => setCurrentStep(1)} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                    Edit
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-theme-primary">{fullName || 'Candidate'}</h3>
                    <p className="text-xs text-theme-secondary">{headline || 'Full Stack Software Engineer'}</p>
                  </div>
                  <div className="text-xs text-theme-secondary space-y-0.5 sm:text-right">
                    <p>{email}</p>
                    <p>{phone || 'Phone not specified'}</p>
                    <p>{city || 'Remote / India'}</p>
                  </div>
                </div>
                {summary && <p className="text-xs text-theme-secondary pt-2 border-t border-theme italic">&ldquo;{summary}&rdquo;</p>}
              </div>

              {/* Education Card */}
              <div className="p-4 rounded-xl border border-theme bg-theme-surface space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-theme-muted uppercase tracking-wider">Education</span>
                  <button type="button" onClick={() => setCurrentStep(2)} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                    Edit
                  </button>
                </div>
                <div className="space-y-1.5">
                  {educationList.map((edu, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-theme-primary">{edu.degree} — {edu.institution || 'Recognized University'}</span>
                      <span className="text-theme-muted">{edu.year} {edu.score ? `(${edu.score})` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-theme bg-theme-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-theme-muted uppercase tracking-wider">Technical Skills ({skills.length})</span>
                    <button type="button" onClick={() => setCurrentStep(3)} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {skills.slice(0, 10).map((s) => (
                      <Badge key={s} variant="default" size="sm">{s}</Badge>
                    ))}
                    {skills.length > 10 && <span className="text-xs text-theme-muted">+{skills.length - 10} more</span>}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-theme bg-theme-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-theme-muted uppercase tracking-wider">Experience Status</span>
                    <button type="button" onClick={() => setCurrentStep(4)} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                      Edit
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-theme-primary">
                    {isFresher ? 'Fresher / Entry-Level Candidate' : `${experienceList.length} Corporate Roles Documented`}
                  </p>
                  <p className="text-[11px] text-theme-secondary">
                    Notice period: {noticePeriodDays} days · {willingToRelocate ? 'Open to relocation' : 'Prefers current location'}
                  </p>
                </div>
              </div>

              {/* Targeting Preferences Card */}
              <div className="p-4 rounded-xl border border-theme bg-theme-surface space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-theme-muted uppercase tracking-wider">Target Roles & Portals</span>
                  <button type="button" onClick={() => setCurrentStep(6)} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                    Edit
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-theme-primary">Roles:</span>
                  {targetTitles.map((t) => (
                    <Badge key={t} variant="cyan" size="sm">{t}</Badge>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="font-semibold text-theme-primary">Portals:</span>
                  {selectedPlatforms.map((p) => (
                    <Badge key={p} variant="success" size="sm">{p}</Badge>
                  ))}
                  <span className="text-theme-muted ml-2">Limit: {dailyLimit} apps/day</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 text-xs flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                By confirming, your profile will be saved to Supabase with Row Level Security. You can edit any field anytime from your profile settings.
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-theme">
              <Button variant="ghost" onClick={() => setCurrentStep(6)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleFinalSubmit}
                disabled={saving}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {saving ? 'Completing Onboarding...' : 'Confirm & Complete Onboarding'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
