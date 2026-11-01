import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Play,
  Save,
  Eye,
  EyeOff,
  Copy,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { configService, type BotEnvConfig, type ResumeAutofillData } from '../../services/configService';
import { playRetroSound } from '../../utils/soundEffects';

interface BotSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBot?: (options?: { platform?: string; dryRun?: boolean }) => Promise<void> | void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const SUGGESTED_KEYWORDS = [
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'React Developer',
  'Node.js Developer',
  'Python Developer',
  'Software Engineer',
  'DevOps Engineer',
  'Web Developer',
];

const SUGGESTED_LOCATIONS = [
  'Pune',
  'Bangalore',
  'Mumbai',
  'Hyderabad',
  'Delhi',
  'Noida',
  'Gurgaon',
  'Remote',
];

export const BotSetupModal: React.FC<BotSetupModalProps> = ({
  isOpen,
  onClose,
  onStartBot,
  showToast,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingResume, setUploadingResume] = useState<boolean>(false);
  const [deletingResume, setDeletingResume] = useState<boolean>(false);
  const [parsingProgress, setParsingProgress] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showOptionalAccordions, setShowOptionalAccordions] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'launch' | 'resume' | 'personal' | 'career' | 'search' | 'credentials' | 'optional'>('launch');

  // Launch Controls State (Direct in Setup)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All Platforms');
  const [dryRun, setDryRun] = useState<boolean>(true);

  // Multiple Option Tag Chips State for Keywords & Locations
  const [keywordList, setKeywordList] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [locationList, setLocationList] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState<string>('');

  // Unified Bot Configuration Form State
  const [formData, setFormData] = useState<BotEnvConfig>({
    firstname: '',
    lastname: '',
    phone: '',
    email: '',
    gender: 'Male',
    total_experience_years: '0',
    relevant_experience_years: '1',
    current_ctc: '0 (Fresher)',
    expected_ctc: '4.5 Lakhs',
    notice_period: 'Immediate (0 Days)',
    work_mode: 'Remote / Hybrid',
    willing_to_relocate: 'Yes',
    education_degree: 'Bachelor of Technology (B.Tech)',
    education_college: '',
    education_passing_year: '2025',
    education_score: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    cover_letter: '',
    keywords: 'full stack developer, react developer, node.js developer, web developer, software engineer',
    location: 'pune',
    pages_per_keyword: 2,
    max_applications: 50,
    browser: 'auto',
    // 8 Job Portals
    naukri_email: '',
    naukri_password: '',
    internshala_email: '',
    internshala_password: '',
    indeed_email: '',
    indeed_password: '',
    linkedin_email: '',
    linkedin_password: '',
    foundit_email: '',
    foundit_password: '',
    wellfound_email: '',
    wellfound_password: '',
    glassdoor_email: '',
    glassdoor_password: '',
    cutshort_email: '',
    cutshort_password: '',
    // Optional AI & Alerts
    telegram_bot_token: '',
    telegram_chat_id: '',
    discord_webhook_url: '',
    gemini_api_key: '',
    dashboard_port: 5000,
    resume_name: null,
    resume_path: null,
    key_skills: [],
    naukri_headline: '',
    profile_summary: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Load existing configuration from backend on open
  useEffect(() => {
    if (isOpen) {
      playRetroSound('modal');
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const conf = await configService.fetchConfig();
      setFormData((prev) => ({
        ...prev,
        ...conf,
      }));

      // Parse keywords into chips
      const parsedKeywords = (conf.keywords || '')
        .split(',')
        .map((k: string) => k.trim())
        .filter(Boolean);
      setKeywordList(
        parsedKeywords.length > 0
          ? parsedKeywords
          : ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer']
      );

      // Parse locations into chips
      const parsedLocations = (conf.location || '')
        .split(',')
        .map((l: string) => l.trim())
        .filter(Boolean);
      setLocationList(parsedLocations.length > 0 ? parsedLocations : ['delhi']);
    } catch (err) {
      console.error('Failed to load bot config:', err);
      showToast('Could not load current .env configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BotEnvConfig, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const togglePasswordVisibility = (key: string) => {
    playRetroSound('click');
    setShowPasswords((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Keywords Chip Handlers
  const handleAddKeyword = (valToAdd?: string) => {
    const val = (valToAdd || keywordInput).trim();
    if (!val) return;
    if (!keywordList.some((k) => k.toLowerCase() === val.toLowerCase())) {
      const updated = [...keywordList, val];
      setKeywordList(updated);
      setFormData((prev) => ({ ...prev, keywords: updated.join(', ') }));
    }
    setKeywordInput('');
    playRetroSound('click');
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    const updated = keywordList.filter((k) => k.toLowerCase() !== kwToRemove.toLowerCase());
    setKeywordList(updated);
    setFormData((prev) => ({ ...prev, keywords: updated.join(', ') }));
    playRetroSound('click');
  };

  // Locations Chip Handlers
  const handleAddLocation = (valToAdd?: string) => {
    const val = (valToAdd || locationInput).trim();
    if (!val) return;
    if (!locationList.some((l) => l.toLowerCase() === val.toLowerCase())) {
      const updated = [...locationList, val];
      setLocationList(updated);
      setFormData((prev) => ({ ...prev, location: updated.join(', ') }));
    }
    setLocationInput('');
    playRetroSound('click');
  };

  const handleRemoveLocation = (locToRemove: string) => {
    const updated = locationList.filter((l) => l.toLowerCase() !== locToRemove.toLowerCase());
    setLocationList(updated);
    setFormData((prev) => ({ ...prev, location: updated.join(', ') }));
    playRetroSound('click');
  };

  // 1-Click Copy Master Email & Password to all other portals
  const handleCopyCredentialsToAll = () => {
    playRetroSound('button');
    const masterEmail = formData.naukri_email || formData.email;
    const masterPwd = formData.naukri_password;

    if (!masterEmail && !masterPwd) {
      showToast('Please enter your primary email and password in Naukri.com first.', 'info');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      internshala_email: masterEmail || prev.internshala_email,
      internshala_password: masterPwd || prev.internshala_password,
      indeed_email: masterEmail || prev.indeed_email,
      indeed_password: masterPwd || prev.indeed_password,
      linkedin_email: masterEmail || prev.linkedin_email,
      linkedin_password: masterPwd || prev.linkedin_password,
      foundit_email: masterEmail || prev.foundit_email,
      foundit_password: masterPwd || prev.foundit_password,
      wellfound_email: masterEmail || prev.wellfound_email,
      wellfound_password: masterPwd || prev.wellfound_password,
      glassdoor_email: masterEmail || prev.glassdoor_email,
      glassdoor_password: masterPwd || prev.glassdoor_password,
      cutshort_email: masterEmail || prev.cutshort_email,
      cutshort_password: masterPwd || prev.cutshort_password,
    }));
    showToast('✓ Credentials copied across all job platforms in 1-click!', 'success');
  };

  // Resume Upload & Autofill Handler
  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processResumeUpload(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processResumeUpload(file);
  };

  const processResumeUpload = async (file: File) => {
    try {
      setUploadingResume(true);
      playRetroSound('slide');
      setParsingProgress('1. Parsing PDF / DOCX Text & Structure...');
      await new Promise((r) => setTimeout(r, 300));
      setParsingProgress('2. Extracting Candidate Identity, Contact & Profiles...');
      await new Promise((r) => setTimeout(r, 300));
      setParsingProgress('3. Detecting Tech Stack & Mapping Keywords...');

      const resp = await configService.uploadResumeAutofill(file);
      const data: ResumeAutofillData = resp.data;

      // Update keywords chips from resume
      if (data.keywords) {
        const kws = data.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
        if (kws.length > 0) setKeywordList(kws);
      }

      // Update location chips from resume
      if (data.city) {
        const locs = data.city.split(',').map((l: string) => l.trim()).filter(Boolean);
        if (locs.length > 0) setLocationList(locs);
      }

      // Auto-fill form fields
      setFormData((prev) => ({
        ...prev,
        firstname: data.firstname || prev.firstname,
        lastname: data.lastname || prev.lastname,
        phone: data.phone || prev.phone,
        email: data.email || prev.email || prev.naukri_email,
        naukri_email: prev.naukri_email || data.email,
        location: data.city || prev.location,
        keywords: data.keywords || prev.keywords,
        resume_name: data.resume_name,
        resume_path: data.resume_path,
        key_skills: data.skills || prev.key_skills,
        naukri_headline: data.headline || prev.naukri_headline,
        linkedin_url: data.linkedin_url || prev.linkedin_url,
        github_url: data.github_url || prev.github_url,
        portfolio_url: data.portfolio_url || prev.portfolio_url,
        education_degree: data.education_degree || prev.education_degree,
        education_college: data.education_college || prev.education_college,
        education_passing_year: data.education_passing_year || prev.education_passing_year,
        education_score: data.education_score || prev.education_score,
        total_experience_years: data.total_experience_years || prev.total_experience_years,
      }));

      playRetroSound('success');
      showToast(`⚡ Resume analyzed! Autofilled ${data.full_name || 'candidate'} details.`, 'success');
      scrollToSection('search');
    } catch (err: any) {
      playRetroSound('error');
      showToast(err.message || 'Failed to parse resume document', 'error');
    } finally {
      setUploadingResume(false);
      setParsingProgress('');
    }
  };

  // Delete Resume from disk and clear configuration
  const handleDeleteResume = async () => {
    if (!formData.resume_name) return;
    const confirmDelete = window.confirm(`Permanently delete "${formData.resume_name}" from project files (data/resumes/)?`);
    if (!confirmDelete) return;

    try {
      setDeletingResume(true);
      playRetroSound('click');
      await configService.deleteResume();
      setFormData((prev) => ({
        ...prev,
        resume_name: null,
        resume_path: null,
      }));
      playRetroSound('success');
      showToast('✓ Resume permanently deleted from data/resumes/ file storage!', 'success');
    } catch (err: any) {
      playRetroSound('error');
      showToast(err.message || 'Failed to delete resume file', 'error');
    } finally {
      setDeletingResume(false);
    }
  };

  const scrollToSection = (sectionId: 'launch' | 'resume' | 'personal' | 'career' | 'search' | 'credentials' | 'optional') => {
    setActiveSection(sectionId);
    playRetroSound('click');
    const elem = document.getElementById(`section-${sectionId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Save Configuration to .env and data files, with optional immediate bot launch
  const handleSave = async (triggerBotAfter = false) => {
    try {
      setSaving(true);
      playRetroSound('button');

      const payload = {
        ...formData,
        keywords: keywordList.join(', '),
        location: locationList.join(', '),
      };

      await configService.saveConfig(payload);

      playRetroSound('success');

      if (triggerBotAfter) {
        showToast(`✓ Setup saved! Launching bot on ${selectedPlatform} (${dryRun ? 'Dry-Run' : 'Live Mode'})...`, 'success');
        onClose();
        if (onStartBot) {
          await onStartBot({
            platform: selectedPlatform,
            dryRun: dryRun,
          });
        }
      } else {
        showToast('✓ All data saved to .env, profile_data.json, & resume.ini!', 'success');
        onClose();
      }
    } catch (err: any) {
      playRetroSound('error');
      showToast(err.message || 'Error saving configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-mono">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] retro-shadow-lg z-10 overflow-hidden animate-fade-in"
      >
        {/* Retro Titlebar */}
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[var(--border-color)] bg-[var(--bg-base)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 inline-block border border-black/40" />
            <span className="w-2.5 h-2.5 bg-amber-400 inline-block border border-black/40" />
            <span className="w-2.5 h-2.5 bg-emerald-500 inline-block border border-black/40" />
            <span className="text-[14px] font-bold uppercase tracking-wider text-[var(--text-primary)] ml-2">
              // LAUNCH & MASTER BOT CONFIGURATION
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--border-color)]">
              .ENV DIRECT SYNC
            </span>
          </div>
          <button
            onClick={() => {
              playRetroSound('click');
              onClose();
            }}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-2 border-[var(--border-color)] p-1 hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Jump Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b-2 border-[var(--border-color)] bg-[var(--bg-card)] overflow-x-auto text-[11px]">
          <span className="text-[var(--text-secondary)] font-bold uppercase text-[10px] mr-1 hidden sm:inline">Section:</span>
          <button
            type="button"
            onClick={() => scrollToSection('launch')}
            className={`px-2.5 py-1 border-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'launch'
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            1. Launch Mode
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('resume')}
            className={`px-2.5 py-1 border-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'resume'
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            2. Resume
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('personal')}
            className={`px-2.5 py-1 border-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'personal'
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            3. Personal
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('career')}
            className={`px-2.5 py-1 border-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'career'
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            4. Job & Career Details
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('search')}
            className={`px-2.5 py-1 border-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'search'
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            4. Roles & Locations
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('credentials')}
            className={`px-2.5 py-1 border-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'credentials'
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            5. Portal Passwords
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('optional')}
            className={`px-2.5 py-1 border-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'optional'
                ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            6. Alerts & AI
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div ref={modalScrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 text-xs bg-[var(--bg-card)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin" />
              <p className="text-[var(--text-secondary)] text-xs">Loading current configuration from .env...</p>
            </div>
          ) : (
            <>
              {/* SECTION 0: LAUNCH TARGET & MODE */}
              <div id="section-launch" className="p-4 border-2 border-[var(--border-color)] bg-[var(--bg-base)] space-y-3 scroll-mt-4">
                <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-[var(--border-color)] text-[var(--bg-card)] font-bold flex items-center justify-center text-[11px]">
                      1
                    </span>
                    <h3 className="text-[13px] font-bold text-[var(--text-primary)] uppercase">
                      Automation Launch Target & Execution Mode
                    </h3>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)]">Single-Run Execution</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      Target Job Portal
                    </label>
                    <select
                      value={selectedPlatform}
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="All Platforms">All Portals (Naukri, Internshala, Indeed, LinkedIn)</option>
                      <option value="Naukri">Naukri.com Only</option>
                      <option value="Internshala">Internshala Only</option>
                      <option value="Indeed">Indeed Only</option>
                      <option value="LinkedIn">LinkedIn Jobs Only</option>
                      <option value="Foundit">Foundit Only</option>
                      <option value="Wellfound">Wellfound Only</option>
                      <option value="Glassdoor">Glassdoor Only</option>
                      <option value="Cutshort">Cutshort Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      Execution Mode
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDryRun(true)}
                        className={`flex-1 py-2 px-3 border-2 font-bold text-xs uppercase transition cursor-pointer flex items-center justify-center gap-1.5 rounded-none ${
                          dryRun
                            ? 'border-[var(--border-color)] bg-[var(--color-warning-muted)] text-[var(--color-warning)] font-black'
                            : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        🧪 Dry-Run Simulation (Safe)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDryRun(false)}
                        className={`flex-1 py-2 px-3 border-2 font-bold text-xs uppercase transition cursor-pointer flex items-center justify-center gap-1.5 rounded-none ${
                          !dryRun
                            ? 'border-[var(--border-color)] bg-[var(--color-success-muted)] text-[var(--color-success)] font-black'
                            : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        ⚡ Live Auto-Apply
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-secondary)]">
                  {dryRun
                    ? '🧪 Dry-Run mode queries matching vacancies & navigates application forms without submitting.'
                    : '⚡ Live mode submits live job applications directly on official company postings.'}
                </p>
              </div>

              {/* SECTION 1: RESUME AUTO-FILL & DELETE */}
              <div id="section-resume" className="space-y-3 scroll-mt-4 p-4 border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
                <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-[var(--border-color)] text-[var(--bg-card)] font-bold flex items-center justify-center text-[11px]">
                      2
                    </span>
                    <h3 className="text-[13px] font-bold text-[var(--text-primary)] uppercase">
                      Resume Document & 1-Click Auto-Fill
                    </h3>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)]">PDF / DOCX</span>
                </div>

                {formData.resume_name ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border-2 border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 border-2 border-[var(--border-color)] bg-[var(--bg-base)] flex items-center justify-center text-[var(--accent)] shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-primary)] text-xs">
                            {formData.resume_name}
                          </span>
                          <span className="px-1.5 py-0.2 text-[10px] font-bold bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--border-color)]">
                            SAVED
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Physical copy stored in <code>data/resumes/</code>. Bot attaches this during portal applications.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 border-2 border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-bold text-[11px] uppercase transition cursor-pointer retro-shadow-sm"
                        title="Upload a new resume to replace"
                      >
                        Replace Resume
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteResume}
                        disabled={deletingResume}
                        className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#B91C1C] bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 text-[#B91C1C] dark:text-[#F87171] font-bold text-[11px] uppercase transition cursor-pointer retro-shadow-sm"
                        title="Permanently remove resume file from data/resumes/"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingResume ? 'Deleting...' : 'Delete Resume'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-5 border-2 border-dashed transition flex flex-col items-center justify-center text-center cursor-pointer ${
                      uploadingResume
                        ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {uploadingResume ? (
                      <div className="py-2 space-y-2">
                        <RefreshCw className="w-6 h-6 text-[var(--accent)] animate-spin mx-auto" />
                        <p className="text-xs text-[var(--accent)] font-bold">{parsingProgress}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">Auto-populating candidate details...</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <UploadCloud className="w-8 h-8 text-[var(--text-secondary)] mx-auto" />
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          Drag & Drop Resume here, or <span className="underline text-[var(--accent)]">browse computer</span>
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Name, phone, email, roles, skills & locations will be automatically extracted into the form!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={handleResumeFileSelect}
                />
              </div>

              {/* SECTION 2: PERSONAL IDENTITY */}
              <div id="section-personal" className="space-y-3 scroll-mt-4 p-4 border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
                <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-[var(--border-color)] text-[var(--bg-card)] font-bold flex items-center justify-center text-[11px]">
                      3
                    </span>
                    <h3 className="text-[13px] font-bold text-[var(--text-primary)] uppercase">
                      Personal & Contact Details (Syncs to .env & profile_data.json)
                    </h3>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)]">Application Identity</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      First Name (FIRSTNAME) *
                    </label>
                    <input
                      type="text"
                      value={formData.firstname || ''}
                      onChange={(e) => handleInputChange('firstname', e.target.value)}
                      placeholder="e.g. Umesh"
                      className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      Last Name (LASTNAME) *
                    </label>
                    <input
                      type="text"
                      value={formData.lastname || ''}
                      onChange={(e) => handleInputChange('lastname', e.target.value)}
                      placeholder="e.g. Temburwar"
                      className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      Phone Number (PHONE) *
                    </label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+919876543210"
                      className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      Primary Candidate Email
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>

          {/* SECTION 4: CAREER & SCREENING DETAILS (ALL PORTALS) */}
          <div id="section-career" className="p-4 rounded-none border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border-color)]">
              <span className="w-2 h-2 bg-emerald-500 inline-block" />
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                4. Job Application & Screening Details (Used for All Job Portals & Bot Auto-Answers)
              </h4>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mb-4">
              Naukri, Internshala, Indeed, aur LinkedIn par forms fill karte samay yeh details require hoti hain. Bot inhi details ko use karke screening questions ke accurate answers dega.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Notice Period *
                </label>
                <select
                  value={formData.notice_period || 'Immediate (0 Days)'}
                  onChange={(e) => handleInputChange('notice_period', e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                >
                  <option value="Immediate (0 Days)">Immediate (0 Days)</option>
                  <option value="15 Days">15 Days</option>
                  <option value="30 Days (1 Month)">30 Days (1 Month)</option>
                  <option value="60 Days (2 Months)">60 Days (2 Months)</option>
                  <option value="90 Days (3 Months)">90 Days (3 Months)</option>
                  <option value="Currently Serving Notice">Currently Serving Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Total Experience *
                </label>
                <select
                  value={formData.total_experience_years || '0'}
                  onChange={(e) => handleInputChange('total_experience_years', e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                >
                  <option value="0">0 (Fresher)</option>
                  <option value="1">1 Year</option>
                  <option value="2">2 Years</option>
                  <option value="3">3 Years</option>
                  <option value="4">4 Years</option>
                  <option value="5+">5+ Years</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Relevant Experience (Years)
                </label>
                <input
                  type="text"
                  value={formData.relevant_experience_years || ''}
                  onChange={(e) => handleInputChange('relevant_experience_years', e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Current CTC / Salary
                </label>
                <input
                  type="text"
                  value={formData.current_ctc || ''}
                  onChange={(e) => handleInputChange('current_ctc', e.target.value)}
                  placeholder="0 (Fresher) or 3.5 LPA"
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Expected CTC / Salary *
                </label>
                <input
                  type="text"
                  value={formData.expected_ctc || ''}
                  onChange={(e) => handleInputChange('expected_ctc', e.target.value)}
                  placeholder="e.g. 4.5 Lakhs"
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Work Mode Preference
                </label>
                <select
                  value={formData.work_mode || 'Remote / Hybrid'}
                  onChange={(e) => handleInputChange('work_mode', e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                >
                  <option value="Remote / Hybrid">Remote / Hybrid</option>
                  <option value="Remote Only">Remote Only</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site / In-Office">On-site / In-Office</option>
                  <option value="Any / Flexible">Any / Flexible</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Willing to Relocate?
                </label>
                <select
                  value={formData.willing_to_relocate || 'Yes'}
                  onChange={(e) => handleInputChange('willing_to_relocate', e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            {/* Education Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 pt-2 border-t border-[var(--border-color)]">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Highest Degree *
                </label>
                <input
                  type="text"
                  value={formData.education_degree || ''}
                  onChange={(e) => handleInputChange('education_degree', e.target.value)}
                  placeholder="e.g. B.Tech / BCA / MCA"
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  College / University
                </label>
                <input
                  type="text"
                  value={formData.education_college || ''}
                  onChange={(e) => handleInputChange('education_college', e.target.value)}
                  placeholder="College Name"
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Passing / Graduation Year
                </label>
                <input
                  type="text"
                  value={formData.education_passing_year || ''}
                  onChange={(e) => handleInputChange('education_passing_year', e.target.value)}
                  placeholder="e.g. 2024 / 2025"
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  CGPA / Percentage
                </label>
                <input
                  type="text"
                  value={formData.education_score || ''}
                  onChange={(e) => handleInputChange('education_score', e.target.value)}
                  placeholder="e.g. 7.5 or 75%"
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                />
              </div>
            </div>

            {/* Links & Gender */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-[var(--border-color)]">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={formData.linkedin_url || ''}
                  onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  value={formData.github_url || ''}
                  onChange={(e) => handleInputChange('github_url', e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Portfolio / Website
                </label>
                <input
                  type="url"
                  value={formData.portfolio_url || ''}
                  onChange={(e) => handleInputChange('portfolio_url', e.target.value)}
                  placeholder="https://yourportfolio.app"
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Gender (Required on forms)
                </label>
                <select
                  value={formData.gender || 'Male'}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] bg-[var(--bg-card)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

              {/* SECTION 5: ROLES & LOCATIONS (MULTIPLE OPTION CHIPS) */}
              <div id="section-search" className="space-y-4 scroll-mt-4 p-4 border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
                <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-[var(--border-color)] text-[var(--bg-card)] font-bold flex items-center justify-center text-[11px]">
                      4
                    </span>
                    <h3 className="text-[13px] font-bold text-[var(--text-primary)] uppercase">
                      Job Search Keywords & Locations (Multiple Options)
                    </h3>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)]">Tag Chips Input</span>
                </div>

                {/* 1. KEYWORDS TAG CHIPS */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[12px] font-bold text-[var(--text-primary)]">
                      Job Search Keywords (KEYWORDS) *
                    </label>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {keywordList.length} role(s) configured
                    </span>
                  </div>

                  {/* Active Chips Container */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[44px] border-2 border-[var(--border-color)] bg-[var(--bg-card)] mb-2">
                    {keywordList.length === 0 ? (
                      <span className="text-[11px] text-[var(--text-secondary)] italic self-center">
                        No roles added yet. Type below or click suggestions to add.
                      </span>
                    ) : (
                      keywordList.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 border-2 border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] text-[12px] font-bold"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="text-[var(--text-secondary)] hover:text-[#B91C1C] cursor-pointer font-black text-sm leading-none ml-0.5"
                            title={`Remove ${kw}`}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Input + Add button */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type keyword and press Enter (e.g. React Developer)..."
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      className="flex-1 px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddKeyword()}
                      disabled={!keywordInput.trim()}
                      className="px-4 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-bold text-xs uppercase retro-shadow-sm cursor-pointer disabled:opacity-40 transition"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Suggested Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mr-1">Suggestions:</span>
                    {SUGGESTED_KEYWORDS.map((sug) => {
                      const isAdded = keywordList.some((k) => k.toLowerCase() === sug.toLowerCase());
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleAddKeyword(sug)}
                          disabled={isAdded}
                          className={`px-2 py-0.5 text-[10px] border font-mono transition cursor-pointer ${
                            isAdded
                              ? 'border-[var(--border-color)] opacity-35 bg-[var(--bg-base)] text-[var(--text-secondary)] cursor-not-allowed'
                              : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                          }`}
                        >
                          {isAdded ? `✓ ${sug}` : `+ ${sug}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. LOCATIONS TAG CHIPS */}
                <div className="pt-2 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[12px] font-bold text-[var(--text-primary)]">
                      Job Locations (LOCATION) *
                    </label>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {locationList.length} location(s) configured
                    </span>
                  </div>

                  {/* Active Chips Container */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[44px] border-2 border-[var(--border-color)] bg-[var(--bg-card)] mb-2">
                    {locationList.length === 0 ? (
                      <span className="text-[11px] text-[var(--text-secondary)] italic self-center">
                        No locations added yet. Type below or click suggestions to add.
                      </span>
                    ) : (
                      locationList.map((loc) => (
                        <span
                          key={loc}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 border-2 border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] text-[12px] font-bold"
                        >
                          <span>{loc}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLocation(loc)}
                            className="text-[var(--text-secondary)] hover:text-[#B91C1C] cursor-pointer font-black text-sm leading-none ml-0.5"
                            title={`Remove ${loc}`}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Input + Add button */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type city/location and press Enter (e.g. Pune, Remote)..."
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLocation();
                        }
                      }}
                      className="flex-1 px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddLocation()}
                      disabled={!locationInput.trim()}
                      className="px-4 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-bold text-xs uppercase retro-shadow-sm cursor-pointer disabled:opacity-40 transition"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Suggested Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mr-1">Suggestions:</span>
                    {SUGGESTED_LOCATIONS.map((sug) => {
                      const isAdded = locationList.some((l) => l.toLowerCase() === sug.toLowerCase());
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleAddLocation(sug)}
                          disabled={isAdded}
                          className={`px-2 py-0.5 text-[10px] border font-mono transition cursor-pointer ${
                            isAdded
                              ? 'border-[var(--border-color)] opacity-35 bg-[var(--bg-base)] text-[var(--text-secondary)] cursor-not-allowed'
                              : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                          }`}
                        >
                          {isAdded ? `✓ ${sug}` : `+ ${sug}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Limits & Browser Choice */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-color)]">
                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      Max Applications (MAX_APPLICATIONS)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={formData.max_applications || 50}
                      onChange={(e) => handleInputChange('max_applications', parseInt(e.target.value) || 50)}
                      className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      Browser Engine (BROWSER)
                    </label>
                    <select
                      value={formData.browser || 'auto'}
                      onChange={(e) => handleInputChange('browser', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="auto">auto (Detect Installed Browser)</option>
                      <option value="chrome">Google Chrome (Stealth)</option>
                      <option value="edge">Microsoft Edge</option>
                      <option value="brave">Brave Browser</option>
                      <option value="firefox">Mozilla Firefox</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: PLATFORM CREDENTIALS & PASSWORDS */}
              <div id="section-credentials" className="space-y-4 scroll-mt-4 p-4 border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[var(--border-color)] pb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-[var(--border-color)] text-[var(--bg-card)] font-bold flex items-center justify-center text-[11px]">
                      5
                    </span>
                    <div>
                      <h3 className="text-[13px] font-bold text-[var(--text-primary)] uppercase">
                        Portal Logins & Passwords (Direct .env Sync)
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Entered passwords write directly to root .env file for bot automation.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyCredentialsToAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-xs font-bold uppercase transition cursor-pointer retro-shadow-sm whitespace-nowrap"
                    title="Copy primary email and password to all platforms"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    ⚡ Fill Same to All Platforms
                  </button>
                </div>

                {/* Primary 4 Core Platforms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Naukri.com */}
                  <div className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-card)] space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
                      <span className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        1. Naukri.com
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-mono">NAUKRI_EMAIL</span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Email / Username</label>
                      <input
                        type="text"
                        value={formData.naukri_email || ''}
                        onChange={(e) => handleInputChange('naukri_email', e.target.value)}
                        placeholder="naukri-login@example.com"
                        className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Password</label>
                      <input
                        type={showPasswords.naukri ? 'text' : 'password'}
                        value={formData.naukri_password || ''}
                        onChange={(e) => handleInputChange('naukri_password', e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)] pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('naukri')}
                        className="absolute right-2 top-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {showPasswords.naukri ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Internshala */}
                  <div className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-card)] space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
                      <span className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500" />
                        2. Internshala
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-mono">INTERNSHALA_EMAIL</span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Email / Username</label>
                      <input
                        type="text"
                        value={formData.internshala_email || ''}
                        onChange={(e) => handleInputChange('internshala_email', e.target.value)}
                        placeholder="internshala-login@example.com"
                        className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Password</label>
                      <input
                        type={showPasswords.internshala ? 'text' : 'password'}
                        value={formData.internshala_password || ''}
                        onChange={(e) => handleInputChange('internshala_password', e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)] pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('internshala')}
                        className="absolute right-2 top-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {showPasswords.internshala ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Indeed */}
                  <div className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-card)] space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
                      <span className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        3. Indeed
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-mono">INDEED_EMAIL</span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Email / Username</label>
                      <input
                        type="text"
                        value={formData.indeed_email || ''}
                        onChange={(e) => handleInputChange('indeed_email', e.target.value)}
                        placeholder="indeed-login@example.com"
                        className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Password</label>
                      <input
                        type={showPasswords.indeed ? 'text' : 'password'}
                        value={formData.indeed_password || ''}
                        onChange={(e) => handleInputChange('indeed_password', e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)] pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('indeed')}
                        className="absolute right-2 top-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {showPasswords.indeed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-card)] space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
                      <span className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        4. LinkedIn Jobs
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-mono">LINKEDIN_EMAIL</span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Email / Username</label>
                      <input
                        type="text"
                        value={formData.linkedin_email || ''}
                        onChange={(e) => handleInputChange('linkedin_email', e.target.value)}
                        placeholder="linkedin-login@example.com"
                        className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Password</label>
                      <input
                        type={showPasswords.linkedin ? 'text' : 'password'}
                        value={formData.linkedin_password || ''}
                        onChange={(e) => handleInputChange('linkedin_password', e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)] pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('linkedin')}
                        className="absolute right-2 top-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {showPasswords.linkedin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional 4 Portals */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOptionalAccordions(!showOptionalAccordions)}
                    className="flex items-center justify-between w-full p-2.5 border-2 border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition cursor-pointer text-[var(--text-primary)]"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                      <span className="font-bold text-xs uppercase">
                        Additional Portals: Foundit, Wellfound, Glassdoor, Cutshort
                      </span>
                    </div>
                    {showOptionalAccordions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showOptionalAccordions && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3 animate-fade-in">
                      {/* Foundit */}
                      <div className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">5. Foundit</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono">FOUNDIT_EMAIL</span>
                        </div>
                        <input
                          type="text"
                          value={formData.foundit_email || ''}
                          onChange={(e) => handleInputChange('foundit_email', e.target.value)}
                          placeholder="foundit-login@example.com"
                          className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)]"
                        />
                        <div className="relative">
                          <input
                            type={showPasswords.foundit ? 'text' : 'password'}
                            value={formData.foundit_password || ''}
                            onChange={(e) => handleInputChange('foundit_password', e.target.value)}
                            placeholder="Password"
                            className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)] pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('foundit')}
                            className="absolute right-2 top-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            {showPasswords.foundit ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Wellfound */}
                      <div className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">6. Wellfound</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono">WELLFOUND_EMAIL</span>
                        </div>
                        <input
                          type="text"
                          value={formData.wellfound_email || ''}
                          onChange={(e) => handleInputChange('wellfound_email', e.target.value)}
                          placeholder="wellfound-login@example.com"
                          className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)]"
                        />
                        <div className="relative">
                          <input
                            type={showPasswords.wellfound ? 'text' : 'password'}
                            value={formData.wellfound_password || ''}
                            onChange={(e) => handleInputChange('wellfound_password', e.target.value)}
                            placeholder="Password"
                            className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)] pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('wellfound')}
                            className="absolute right-2 top-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            {showPasswords.wellfound ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Glassdoor */}
                      <div className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">7. Glassdoor</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono">GLASSDOOR_EMAIL</span>
                        </div>
                        <input
                          type="text"
                          value={formData.glassdoor_email || ''}
                          onChange={(e) => handleInputChange('glassdoor_email', e.target.value)}
                          placeholder="glassdoor-login@example.com"
                          className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)]"
                        />
                        <div className="relative">
                          <input
                            type={showPasswords.glassdoor ? 'text' : 'password'}
                            value={formData.glassdoor_password || ''}
                            onChange={(e) => handleInputChange('glassdoor_password', e.target.value)}
                            placeholder="Password"
                            className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)] pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('glassdoor')}
                            className="absolute right-2 top-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            {showPasswords.glassdoor ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Cutshort */}
                      <div className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">8. Cutshort</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono">CUTSHORT_EMAIL</span>
                        </div>
                        <input
                          type="text"
                          value={formData.cutshort_email || ''}
                          onChange={(e) => handleInputChange('cutshort_email', e.target.value)}
                          placeholder="cutshort-login@example.com"
                          className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)]"
                        />
                        <div className="relative">
                          <input
                            type={showPasswords.cutshort ? 'text' : 'password'}
                            value={formData.cutshort_password || ''}
                            onChange={(e) => handleInputChange('cutshort_password', e.target.value)}
                            placeholder="Password"
                            className="w-full px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-primary)] pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('cutshort')}
                            className="absolute right-2 top-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            {showPasswords.cutshort ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 5: AI & SMART NOTIFICATIONS (OPTIONAL) */}
              <div id="section-optional" className="space-y-3 scroll-mt-4 p-4 border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
                <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-[var(--border-color)] text-[var(--bg-card)] font-bold flex items-center justify-center text-[11px]">
                      6
                    </span>
                    <h3 className="text-[13px] font-bold text-[var(--text-primary)] uppercase">
                      AI Screening Generator & Notifications (Optional)
                    </h3>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)]">Optional Integrations</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      Gemini Flash API Key (GEMINI_API_KEY)
                    </label>
                    <input
                      type="password"
                      value={formData.gemini_api_key || ''}
                      onChange={(e) => handleInputChange('gemini_api_key', e.target.value)}
                      placeholder="AIzaSy... (Leave blank for built-in offline heuristic answerer)"
                      className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                      Free tier available at Google AI Studio. Contextually answers tricky employer questionnaire questions.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      Telegram Bot Token (TELEGRAM_BOT_TOKEN)
                    </label>
                    <input
                      type="text"
                      value={formData.telegram_bot_token || ''}
                      onChange={(e) => handleInputChange('telegram_bot_token', e.target.value)}
                      placeholder="123456789:ABCdef..."
                      className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      Telegram Chat ID (TELEGRAM_CHAT_ID)
                    </label>
                    <input
                      type="text"
                      value={formData.telegram_chat_id || ''}
                      onChange={(e) => handleInputChange('telegram_chat_id', e.target.value)}
                      placeholder="e.g. 987654321"
                      className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-bold text-[var(--text-primary)] mb-1">
                      Discord Webhook URL (DISCORD_WEBHOOK_URL)
                    </label>
                    <input
                      type="text"
                      value={formData.discord_webhook_url || ''}
                      onChange={(e) => handleInputChange('discord_webhook_url', e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-none text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-[var(--bg-base)] border-t-2 border-[var(--border-color)]">
          <div className="text-[11px] text-[var(--text-secondary)]">
            {formData.firstname ? (
              <span>
                Configured for <strong className="text-[var(--text-primary)]">{formData.firstname} {formData.lastname}</strong> on <strong className="text-[var(--accent)]">{selectedPlatform}</strong> ({dryRun ? 'Dry-Run' : 'Live'})
              </span>
            ) : (
              <span>Upload resume or fill details to sync root .env</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-xs font-bold uppercase retro-shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : '💾 Save to .env Only'}
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 border-2 border-[var(--border-color)] bg-[#15803D] hover:bg-[#166534] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white dark:text-[#0B0E14] text-xs font-bold uppercase retro-shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {saving ? 'Saving & Launching...' : '🚀 Launch & Start Bot Now'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
