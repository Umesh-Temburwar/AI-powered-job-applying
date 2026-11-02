import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Plus,
  Trash2,
  Save,
  X,
  Sparkles,
  Award,
  UploadCloud,
  FileText,
  Download,
  Play,
  Eye,
  EyeOff,
  ExternalLink,
  Check,
  RefreshCw,
  BarChart3,
  Zap,
} from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../hooks/usePreferences';
import { useResumes } from '../hooks/useResumes';
import { useTasks } from '../hooks/useTasks';
import { configService } from '../services/configService';
import { useToast } from '../context/ToastContext';
import { playRetroSound } from '../utils/soundEffects';
import {
  Input,
  Textarea,
  Button,
  Modal,
  Skeleton,
  Select,
  Badge,
  ProgressBar,
  ConfirmDialog,
} from '../components/ui';
import type { EducationItem, ExperienceItem, ProjectItem, CertificationItem, PlatformName } from '../types';

const SUGGESTED_ROLES = [
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

const SUGGESTED_CITIES = [
  'Pune',
  'Bangalore',
  'Mumbai',
  'Hyderabad',
  'Delhi',
  'Noida',
  'Gurgaon',
  'Remote',
];

interface QuickCommandItem {
  id: string;
  label: string;
  subtitle: string;
  cli: string;
  platform: string;
  taskType: string;
  badge?: string;
  logoType: 'all' | 'naukri' | 'internshala' | 'indeed' | 'linkedin' | 'update-naukri' | 'update-internshala' | 'update-all' | 'report';
}

const QUICK_COMMANDS: QuickCommandItem[] = [
  {
    id: 'all',
    label: 'Run All Platforms',
    subtitle: 'Naukri, Internshala, Indeed & LinkedIn',
    cli: 'py universal_bot.py --platform all',
    platform: 'All Platforms',
    taskType: 'job_apply',
    badge: 'RECOMMENDED',
    logoType: 'all',
  },
  {
    id: 'naukri',
    label: 'Naukri.com Auto-Apply',
    subtitle: 'Direct Vacancies Auto-Apply',
    cli: 'py universal_bot.py --platform naukri',
    platform: 'Naukri',
    taskType: 'job_apply',
    logoType: 'naukri',
  },
  {
    id: 'internshala',
    label: 'Internshala Auto-Apply',
    subtitle: 'Internships & Fresher Vacancies',
    cli: 'py universal_bot.py --platform internshala',
    platform: 'Internshala',
    taskType: 'job_apply',
    logoType: 'internshala',
  },
  {
    id: 'indeed',
    label: 'Indeed.com Auto-Apply',
    subtitle: 'Easily Apply Portal Vacancies',
    cli: 'py universal_bot.py --platform indeed',
    platform: 'Indeed',
    taskType: 'job_apply',
    logoType: 'indeed',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Easy Apply',
    subtitle: 'Automated Easy Apply Submissions',
    cli: 'py universal_bot.py --platform linkedin',
    platform: 'LinkedIn',
    taskType: 'job_apply',
    logoType: 'linkedin',
  },
  {
    id: 'update-naukri-profile',
    label: 'Update Naukri Profile',
    subtitle: 'Profile Freshness & Headline Sync',
    cli: 'py universal_bot.py --update-naukri-profile',
    platform: 'Naukri',
    taskType: 'profile_update',
    logoType: 'update-naukri',
  },
  {
    id: 'update-internshala-profile',
    label: 'Update Internshala Profile',
    subtitle: 'Sync Projects, Credentials & Skills',
    cli: 'py universal_bot.py --update-internshala-profile',
    platform: 'Internshala',
    taskType: 'profile_update',
    logoType: 'update-internshala',
  },
  {
    id: 'update-all-profiles',
    label: 'Update All Profiles',
    subtitle: 'Refresh Freshness Across All Portals',
    cli: 'py universal_bot.py --update-all-profiles',
    platform: 'All Platforms',
    taskType: 'profile_update',
    logoType: 'update-all',
  },
  {
    id: 'report',
    label: 'Analytics Report',
    subtitle: 'Applied Jobs Ledger & Analytics',
    cli: 'py universal_bot.py --report',
    platform: 'All Platforms',
    taskType: 'report',
    logoType: 'report',
  },
];

const renderTaskLogo = (logoType: QuickCommandItem['logoType']) => {
  switch (logoType) {
    case 'all':
      return (
        <div className="w-10 h-10 bg-emerald-600 text-white flex flex-col items-center justify-center font-black text-xs border border-emerald-400 select-none shadow-sm shrink-0">
          <Zap className="w-4 h-4 fill-current text-amber-300" />
          <span className="text-[9px] font-mono leading-none tracking-tighter">ALL</span>
        </div>
      );
    case 'naukri':
      return (
        <div className="w-10 h-10 bg-[#0078DB] text-white flex items-center justify-center font-black text-lg font-sans border border-blue-400 select-none shadow-sm shrink-0">
          N
        </div>
      );
    case 'internshala':
      return (
        <div className="w-10 h-10 bg-[#1295D8] text-white flex items-center justify-center font-black text-sm font-sans tracking-tight border border-cyan-300 select-none shadow-sm shrink-0">
          IS
        </div>
      );
    case 'indeed':
      return (
        <div className="w-10 h-10 bg-[#2164F3] text-white flex items-center justify-center font-black text-sm font-sans tracking-tight border border-indigo-400 select-none shadow-sm shrink-0">
          IN
        </div>
      );
    case 'linkedin':
      return (
        <div className="w-10 h-10 bg-[#0A66C2] text-white flex items-center justify-center font-bold text-base font-sans lowercase border border-sky-400 select-none shadow-sm shrink-0">
          in
        </div>
      );
    case 'update-naukri':
      return (
        <div className="w-10 h-10 bg-[#0078DB] text-white flex flex-col items-center justify-center border border-blue-400 select-none shadow-sm shrink-0 relative">
          <span className="font-black text-xs font-sans leading-none">N</span>
          <RefreshCw className="w-3 h-3 text-emerald-300 mt-0.5" />
        </div>
      );
    case 'update-internshala':
      return (
        <div className="w-10 h-10 bg-[#1295D8] text-white flex flex-col items-center justify-center border border-cyan-300 select-none shadow-sm shrink-0 relative">
          <span className="font-black text-[10px] font-sans leading-none">IS</span>
          <RefreshCw className="w-3 h-3 text-cyan-200 mt-0.5" />
        </div>
      );
    case 'update-all':
      return (
        <div className="w-10 h-10 bg-emerald-700 text-white flex flex-col items-center justify-center border border-emerald-400 select-none shadow-sm shrink-0">
          <RefreshCw className="w-4 h-4 text-emerald-200" />
          <span className="text-[8px] font-mono leading-none tracking-tighter mt-0.5">SYNC</span>
        </div>
      );
    case 'report':
      return (
        <div className="w-10 h-10 bg-amber-600 text-white flex items-center justify-center border border-amber-400 select-none shadow-sm shrink-0">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 bg-zinc-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
          BOT
        </div>
      );
  }
};

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startTask } = useTasks();
  const { profile, loading: profileLoading, updateProfile, autofillProfile } = useProfile();
  const { preferences, updatePreferences, suggestRoles } = usePreferences();
  const {
    resumes,
    uploadResume: uploadSbResume,
    deleteResume: deleteSbResume,
    getDownloadUrl,
    refreshResumes,
  } = useResumes();
  const { showToast } = useToast();

  const [localResumeName, setLocalResumeName] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [deleteResumeModalOpen, setDeleteResumeModalOpen] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [botConfigLoading, setBotConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Platform Login Credentials (Naukri, Internshala, Indeed, LinkedIn)
  const [naukriEmail, setNaukriEmail] = useState('');
  const [naukriPassword, setNaukriPassword] = useState('');
  const [showNaukriPassword, setShowNaukriPassword] = useState(false);

  const [internshalaEmail, setInternshalaEmail] = useState('');
  const [internshalaPassword, setInternshalaPassword] = useState('');
  const [showInternshalaPassword, setShowInternshalaPassword] = useState(false);

  const [indeedEmail, setIndeedEmail] = useState('');
  const [indeedPassword, setIndeedPassword] = useState('');
  const [showIndeedPassword, setShowIndeedPassword] = useState(false);

  const [linkedinEmail, setLinkedinEmail] = useState('');
  const [linkedinPassword, setLinkedinPassword] = useState('');
  const [showLinkedinPassword, setShowLinkedinPassword] = useState(false);

  // Quick Commands & Bot Launcher State (Execution Mode always LIVE APPLY, Browser Mode always VISIBLE)
  const [selectedCommand, setSelectedCommand] = useState('all');
  const [maxApplications, setMaxApplications] = useState(50);
  const [startingBot, setStartingBot] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingData, setResettingData] = useState(false);



  // 1. Identity & Contact Details
  const [firstname, setFirstname] = useState(() => (user?.fullName ? user.fullName.split(' ')[0] : ''));
  const [lastname, setLastname] = useState(() => {
    if (user?.fullName) {
      const parts = user.fullName.trim().split(' ');
      return parts.slice(1).join(' ') || '';
    }
    return '';
  });
  const [email, setEmail] = useState(() => user?.email || '');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [currentCity, setCurrentCity] = useState('');
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');

  // 2. Job & Career Screening Details (Directly for Bot Applications)
  const [totalExperience, setTotalExperience] = useState('0');
  const [relevantExperience, setRelevantExperience] = useState('0');
  const [currentCtc, setCurrentCtc] = useState('0');
  const [expectedCtc, setExpectedCtc] = useState('0');
  const [noticePeriod, setNoticePeriod] = useState('Immediate (0 Days)');
  const [workMode, setWorkMode] = useState('Remote / Hybrid');
  const [willingToRelocate, setWillingToRelocate] = useState('Yes');
  const [coverLetter, setCoverLetter] = useState('');
  const [workAuthorization, setWorkAuthorization] = useState('Authorized to work in India');
  const [isFresher, setIsFresher] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformName[]>(['Naukri', 'Internshala', 'Indeed', 'LinkedIn']);
  const [suggestingRoles, setSuggestingRoles] = useState(false);

  // 3. Primary Academic Qualifications (Screening Sync)
  const [educationDegree, setEducationDegree] = useState('');
  const [educationCollege, setEducationCollege] = useState('');
  const [educationPassingYear, setEducationPassingYear] = useState('');
  const [educationScore, setEducationScore] = useState('');

  // 4. Target Roles & Locations (Search Keywords Chips)
  const [keywordList, setKeywordList] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [locationList, setLocationList] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');

  // 5. Professional Social Profiles
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  // 6. Detailed Lists: Skills, Education, Experience, Projects, Certifications
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);

  // Modals for adding items
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', year: '', score: '' });

  const [expModalOpen, setExpModalOpen] = useState(false);
  const [newExp, setNewExp] = useState({ role: '', company: '', duration: '', description: '' });

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '', technologies: '', url: '' });

  const [certModalOpen, setCertModalOpen] = useState(false);
  const [newCert, setNewCert] = useState({ name: '', issuer: '', date: '', url: '' });

  // Comprehensive Auto-Fill: Updates all candidate form fields across the entire profile page
  const applyExtractedProfile = (d: any) => {
    if (!d) return;
    if (d.firstname) setFirstname(d.firstname);
    if (d.lastname) setLastname(d.lastname);
    if (d.full_name && (!d.firstname || !d.lastname)) {
      const parts = d.full_name.trim().split(' ');
      setFirstname(parts[0] || '');
      setLastname(parts.slice(1).join(' ') || '');
    }
    if (d.email) setEmail(d.email);
    if (d.phone) setPhone(d.phone);
    if (d.gender) setGender(d.gender);

    const cityLoc = d.city || d.currentLocation || d.current_location;
    if (cityLoc) {
      setCurrentCity(cityLoc);
      setLocationList((prev) => (prev.includes(cityLoc) ? prev : [cityLoc, ...prev]));
    }

    if (d.headline) setHeadline(d.headline);
    if (d.summary) setSummary(d.summary);
    if (d.cover_letter) setCoverLetter(d.cover_letter);

    if (d.linkedin_url || d.linkedinUrl) setLinkedinUrl(d.linkedin_url || d.linkedinUrl);
    if (d.github_url || d.githubUrl) setGithubUrl(d.github_url || d.githubUrl);
    if (d.portfolio_url !== undefined || d.portfolioUrl !== undefined) {
      setPortfolioUrl(d.portfolio_url || d.portfolioUrl || '');
    }

    if (d.skills && Array.isArray(d.skills) && d.skills.length > 0) {
      setSkills(d.skills);
      suggestRoles(d.skills).then((roles) => {
        if (roles && roles.length > 0) {
          setKeywordList((prev) => Array.from(new Set([...prev, ...roles])));
        }
      });
    }

    if (d.keywords) {
      const kws = typeof d.keywords === 'string'
        ? d.keywords.split(',').map((s: string) => s.trim()).filter(Boolean)
        : d.keywords;
      if (Array.isArray(kws) && kws.length > 0) {
        setKeywordList((prev) => Array.from(new Set([...prev, ...kws])));
      }
    }

    if (d.education_degree) setEducationDegree(d.education_degree);
    if (d.education_college) setEducationCollege(d.education_college);
    if (d.education_passing_year) setEducationPassingYear(String(d.education_passing_year));
    if (d.education_score) setEducationScore(String(d.education_score));

    if (d.education && Array.isArray(d.education) && d.education.length > 0) {
      const mappedEdu: EducationItem[] = d.education.map((e: any, idx: number) => ({
        id: String(e.id || idx + 1),
        degree: e.degree || 'Bachelor of Technology (B.Tech)',
        institution: e.institution || e.college || '',
        year: String(e.year || e.passing_year || '2025'),
        score: e.score ? String(e.score) : (e.cgpa ? String(e.cgpa) : ''),
      }));
      setEducation(mappedEdu);
      if (!d.education_degree && mappedEdu[0]?.degree) setEducationDegree(mappedEdu[0].degree);
      if (!d.education_college && mappedEdu[0]?.institution) setEducationCollege(mappedEdu[0].institution);
      if (!d.education_passing_year && mappedEdu[0]?.year) setEducationPassingYear(mappedEdu[0].year);
      if (!d.education_score && mappedEdu[0]?.score) setEducationScore(mappedEdu[0].score);
    }

    if (typeof d.is_fresher === 'boolean') {
      setIsFresher(d.is_fresher);
      if (d.is_fresher) {
        setTotalExperience('0');
        setRelevantExperience('0');
      }
    } else if (d.experience && Array.isArray(d.experience)) {
      const fresherCheck = d.experience.length === 0;
      setIsFresher(fresherCheck);
      if (fresherCheck) {
        setTotalExperience('0');
        setRelevantExperience('0');
      }
    }

    if (d.total_experience_years !== undefined) setTotalExperience(String(d.total_experience_years));
    if (d.relevant_experience_years !== undefined) setRelevantExperience(String(d.relevant_experience_years));

    if (d.experience && Array.isArray(d.experience) && d.experience.length > 0) {
      const mappedExp: ExperienceItem[] = d.experience.map((x: any, idx: number) => ({
        id: String(x.id || idx + 1),
        role: x.role || '',
        company: x.company || x.organization || '',
        duration: x.duration || '',
        description: x.description || (Array.isArray(x.highlights) ? x.highlights.join('; ') : ''),
      }));
      setExperience(mappedExp);
    }

    if (d.projects && Array.isArray(d.projects) && d.projects.length > 0) {
      const mappedProj: ProjectItem[] = d.projects.map((proj: any, idx: number) => ({
        id: String(proj.id || idx + 1),
        title: proj.title || '',
        description: proj.description || '',
        technologies: Array.isArray(proj.technologies)
          ? proj.technologies
          : (typeof proj.technologies === 'string'
              ? proj.technologies.split(',').map((s: string) => s.trim())
              : ['React.js']),
        url: proj.url || '',
      }));
      setProjects(mappedProj);
    }

    if (d.certifications && Array.isArray(d.certifications) && d.certifications.length > 0) {
      const mappedCert: CertificationItem[] = d.certifications.map((c: any, idx: number) => ({
        id: String(c.id || idx + 1),
        name: c.name || '',
        issuer: c.issuer || '',
        date: String(c.date || '2024'),
        url: c.url || '',
      }));
      setCertifications(mappedCert);
    }

    if (d.notice_period) setNoticePeriod(d.notice_period);
    if (d.work_mode) setWorkMode(d.work_mode);
    if (d.willing_to_relocate) setWillingToRelocate(d.willing_to_relocate);
    if (d.work_authorization) setWorkAuthorization(d.work_authorization);

    setIsDirty(true);
  };

  // Initial load from bot .env config and Supabase profile
  const loadData = async () => {
    try {
      setBotConfigLoading(true);
      const cfg = await configService.fetchConfig();
      if (cfg) {
        if (cfg.resume_name) setLocalResumeName(cfg.resume_name);
        if (cfg.firstname) setFirstname(cfg.firstname);
        if (cfg.lastname) setLastname(cfg.lastname);
        if (cfg.email) setEmail(cfg.email);
        if (cfg.phone) setPhone(cfg.phone);
        if (cfg.gender) setGender(cfg.gender);
        if (cfg.location) {
          const locs = cfg.location.split(',').map((s) => s.trim()).filter(Boolean);
          if (locs.length > 0) {
            setLocationList(locs);
            setCurrentCity(locs[0]);
          }
        }
        if (cfg.total_experience_years !== undefined && cfg.total_experience_years !== '') {
          setTotalExperience(String(cfg.total_experience_years));
        }
        if (cfg.relevant_experience_years !== undefined && cfg.relevant_experience_years !== '') {
          setRelevantExperience(String(cfg.relevant_experience_years));
        }
        if (cfg.current_ctc) setCurrentCtc(cfg.current_ctc);
        if (cfg.expected_ctc) setExpectedCtc(cfg.expected_ctc);
        if (cfg.notice_period) setNoticePeriod(cfg.notice_period);
        if (cfg.work_mode) setWorkMode(cfg.work_mode);
        if (cfg.willing_to_relocate) setWillingToRelocate(cfg.willing_to_relocate);
        if (cfg.work_authorization) setWorkAuthorization(cfg.work_authorization);
        if (typeof cfg.is_fresher === 'boolean') {
          setIsFresher(cfg.is_fresher);
          if (cfg.is_fresher) {
            setTotalExperience('0');
            setRelevantExperience('0');
          }
        }
        if (cfg.selected_platforms && Array.isArray(cfg.selected_platforms) && cfg.selected_platforms.length > 0) {
          setSelectedPlatforms(cfg.selected_platforms as PlatformName[]);
        }
        if (cfg.education_degree) setEducationDegree(cfg.education_degree);
        if (cfg.education_college) setEducationCollege(cfg.education_college);
        if (cfg.education_passing_year) setEducationPassingYear(cfg.education_passing_year);
        if (cfg.education_score) setEducationScore(cfg.education_score);
        if (cfg.linkedin_url) setLinkedinUrl(cfg.linkedin_url);
        if (cfg.github_url) setGithubUrl(cfg.github_url);
        if (cfg.portfolio_url) setPortfolioUrl(cfg.portfolio_url);
        if (cfg.cover_letter) setCoverLetter(cfg.cover_letter);

        // Platform credentials saved for this candidate
        if (cfg.naukri_email) setNaukriEmail(cfg.naukri_email);
        if (cfg.naukri_password) setNaukriPassword(cfg.naukri_password);
        if (cfg.internshala_email) setInternshalaEmail(cfg.internshala_email);
        if (cfg.internshala_password) setInternshalaPassword(cfg.internshala_password);
        if (cfg.indeed_email) setIndeedEmail(cfg.indeed_email);
        if (cfg.indeed_password) setIndeedPassword(cfg.indeed_password);
        if (cfg.linkedin_email) setLinkedinEmail(cfg.linkedin_email);
        if (cfg.linkedin_password) setLinkedinPassword(cfg.linkedin_password);

        if (cfg.max_applications) setMaxApplications(Number(cfg.max_applications) || 50);
        if (cfg.keywords) {
          const kws = cfg.keywords.split(',').map((s) => s.trim()).filter(Boolean);
          if (kws.length > 0) setKeywordList(kws);
        }
        if (cfg.key_skills && cfg.key_skills.length > 0) {
          setSkills(cfg.key_skills);
        }
        if (cfg.naukri_headline) setHeadline(cfg.naukri_headline);
        if (cfg.profile_summary) setSummary(cfg.profile_summary);
      }
    } catch (err) {
      console.warn('Could not load bot config:', err);
    } finally {
      setBotConfigLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLocalResumeName(null);
      setFirstname('');
      setLastname('');
      setEmail('');
      setPhone('');
      setCurrentCity('');
      setHeadline('');
      setSummary('');
      setEducation([]);
      setExperience([]);
      setProjects([]);
      setCertifications([]);
      setSkills([]);
      setNaukriEmail('');
      setNaukriPassword('');
      setInternshalaEmail('');
      setInternshalaPassword('');
      setIndeedEmail('');
      setIndeedPassword('');
      setLinkedinEmail('');
      setLinkedinPassword('');
    } else {
      loadData();
    }
  }, [user?.id]);

  // Sync Supabase profile data if available
  useEffect(() => {
    if (profile) {
      if (profile.fullName && (!firstname || !lastname || firstname === 'Candidate')) {
        const parts = profile.fullName.trim().split(' ');
        if (parts[0] && parts[0] !== 'Candidate') {
          setFirstname(parts[0] || '');
          setLastname(parts.slice(1).join(' ') || '');
        }
      }
      if (profile.email && !email) setEmail(profile.email);
      if (profile.phone && !phone) setPhone(profile.phone);
      if (profile.city || profile.currentLocation) {
        const loc = profile.city || profile.currentLocation;
        if (!currentCity) setCurrentCity(loc);
        if (locationList.length === 0 && loc) setLocationList([loc]);
      }
      if (profile.headline && !headline) setHeadline(profile.headline);
      if (profile.summary && !summary) setSummary(profile.summary);
      if (profile.skills && profile.skills.length > 0 && (skills.length === 0 || profile.skills.length > skills.length)) {
        setSkills(profile.skills);
      }
      if (profile.education && profile.education.length > 0 && (education.length === 0 || profile.education.length > education.length)) {
        setEducation(profile.education);
        if (!educationCollege && profile.education[0]?.institution) {
          setEducationCollege(profile.education[0].institution);
        }
        if (!educationDegree && profile.education[0]?.degree) {
          setEducationDegree(profile.education[0].degree);
        }
        if (!educationPassingYear && profile.education[0]?.year) {
          setEducationPassingYear(profile.education[0].year);
        }
        if (!educationScore && profile.education[0]?.score) {
          setEducationScore(profile.education[0].score);
        }
      }
      if (profile.experience && profile.experience.length > 0 && (experience.length === 0 || profile.experience.length > experience.length)) {
        setExperience(profile.experience);
      }
      if (profile.projects && profile.projects.length > 0 && (projects.length === 0 || profile.projects.length > projects.length)) {
        setProjects(profile.projects);
      }
      if (profile.certifications && profile.certifications.length > 0 && (certifications.length === 0 || profile.certifications.length > certifications.length)) {
        setCertifications(profile.certifications);
      }
      if (profile.additionalInfo) {
        const info: any = profile.additionalInfo;
        if (info.gender && !gender) setGender(info.gender);
        if (info.work_authorization && !workAuthorization) {
          setWorkAuthorization(info.work_authorization);
        }
        if (typeof info.is_fresher === 'boolean') {
          setIsFresher(info.is_fresher);
          if (info.is_fresher) {
            setTotalExperience('0');
            setRelevantExperience('0');
          }
        }
        if (info.total_experience_years && (!totalExperience || totalExperience === '0')) {
          setTotalExperience(String(info.total_experience_years));
        }
        if (info.relevant_experience_years && (!relevantExperience || relevantExperience === '0')) {
          setRelevantExperience(String(info.relevant_experience_years));
        }
        if (info.current_ctc && !currentCtc) setCurrentCtc(info.current_ctc);
        if (info.expected_ctc && !expectedCtc) setExpectedCtc(info.expected_ctc);
        if (info.notice_period && !noticePeriod) setNoticePeriod(info.notice_period);
        if (info.work_mode && !workMode) setWorkMode(info.work_mode);
        if (info.willing_to_relocate && !willingToRelocate) setWillingToRelocate(info.willing_to_relocate);
        if (info.cover_letter && !coverLetter) setCoverLetter(info.cover_letter);
        if (info.education_degree && !educationDegree) setEducationDegree(info.education_degree);
        if (info.education_college && !educationCollege) setEducationCollege(info.education_college);
        if (info.education_passing_year && !educationPassingYear) setEducationPassingYear(info.education_passing_year);
        if (info.education_score && !educationScore) setEducationScore(info.education_score);
        if (info.naukri_email && !naukriEmail) setNaukriEmail(info.naukri_email);
        if (info.naukri_password && !naukriPassword) setNaukriPassword(info.naukri_password);
        if (info.internshala_email && !internshalaEmail) setInternshalaEmail(info.internshala_email);
        if (info.internshala_password && !internshalaPassword) setInternshalaPassword(info.internshala_password);
        if (info.indeed_email && !indeedEmail) setIndeedEmail(info.indeed_email);
        if (info.indeed_password && !indeedPassword) setIndeedPassword(info.indeed_password);
        if (info.linkedin_email && !linkedinEmail) setLinkedinEmail(info.linkedin_email);
        if (info.linkedin_password && !linkedinPassword) setLinkedinPassword(info.linkedin_password);
        if (info.resume_name && !localResumeName) setLocalResumeName(info.resume_name);
      }
      if (profile.linkedinUrl && !linkedinUrl) setLinkedinUrl(profile.linkedinUrl);
      if (profile.githubUrl && !githubUrl) setGithubUrl(profile.githubUrl);
      if (profile.portfolioUrl && !portfolioUrl) setPortfolioUrl(profile.portfolioUrl);
    }
  }, [profile]);

  // Sync Supabase preferences
  useEffect(() => {
    if (preferences) {
      if (preferences.targetTitles && preferences.targetTitles.length > 0 && keywordList.length === 0) {
        setKeywordList(preferences.targetTitles);
      }
      if (preferences.targetLocations && preferences.targetLocations.length > 0 && locationList.length === 0) {
        setLocationList(preferences.targetLocations);
      }
      if (preferences.selectedPlatforms && preferences.selectedPlatforms.length > 0) {
        setSelectedPlatforms(preferences.selectedPlatforms);
      }
    }
  }, [preferences]);

  const handleFresherToggle = (checked: boolean) => {
    setIsFresher(checked);
    setIsDirty(true);
    if (checked) {
      setTotalExperience('0');
      setRelevantExperience('0');
    } else if (totalExperience === '0') {
      setTotalExperience('1');
      setRelevantExperience('1');
    }
  };

  const handleSuggestRoles = async () => {
    try {
      setSuggestingRoles(true);
      playRetroSound('click');
      const recs = await suggestRoles(skills);
      if (recs && recs.length > 0) {
        setKeywordList((prev) => Array.from(new Set([...prev, ...recs])));
        setIsDirty(true);
        playRetroSound('success');
        showToast(`✨ Added ${recs.length} AI suggested role keywords from your skills!`, 'success');
      } else {
        showToast('Add more technical skills to receive AI role recommendations.', 'info');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to suggest roles', 'error');
    } finally {
      setSuggestingRoles(false);
    }
  };

  // Tag chip add / remove helpers
  const handleAddKeyword = (val?: string) => {
    const raw = (val || keywordInput).trim();
    if (raw && !keywordList.includes(raw)) {
      setKeywordList((prev) => [...prev, raw]);
      setKeywordInput('');
      setIsDirty(true);
    }
  };

  const handleRemoveKeyword = (item: string) => {
    setKeywordList((prev) => prev.filter((k) => k !== item));
    setIsDirty(true);
  };

  const handleAddLocationTag = (val?: string) => {
    const raw = (val || locationInput).trim();
    if (raw && !locationList.includes(raw)) {
      setLocationList((prev) => [...prev, raw]);
      setLocationInput('');
      setIsDirty(true);
    }
  };

  const handleRemoveLocationTag = (item: string) => {
    setLocationList((prev) => prev.filter((l) => l !== item));
    setIsDirty(true);
  };

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setSkillInput('');
      setIsDirty(true);
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
    setIsDirty(true);
  };

  // Education list handlers
  const handleAddEducationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEdu.degree || !newEdu.institution) return;
    const item: EducationItem = {
      id: `edu_${Date.now()}`,
      degree: newEdu.degree.trim(),
      institution: newEdu.institution.trim(),
      year: newEdu.year.trim(),
      score: newEdu.score.trim() || undefined,
    };
    setEducation((prev) => [...prev, item]);
    setNewEdu({ degree: '', institution: '', year: '', score: '' });
    setEduModalOpen(false);
    setIsDirty(true);
  };

  const handleDeleteEducation = (id: string) => {
    setEducation((prev) => prev.filter((e) => e.id !== id));
    setIsDirty(true);
  };

  // Experience list handlers
  const handleAddExperienceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExp.role || !newExp.company) return;
    const item: ExperienceItem = {
      id: `exp_${Date.now()}`,
      role: newExp.role.trim(),
      company: newExp.company.trim(),
      duration: newExp.duration.trim(),
      description: newExp.description.trim(),
    };
    setExperience((prev) => [...prev, item]);
    setNewExp({ role: '', company: '', duration: '', description: '' });
    setExpModalOpen(false);
    setIsDirty(true);
  };

  const handleDeleteExperience = (id: string) => {
    setExperience((prev) => prev.filter((exp) => exp.id !== id));
    setIsDirty(true);
  };

  // Project list handlers
  const handleAddProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title.trim()) return;
    const item: ProjectItem = {
      id: `proj_${Date.now()}`,
      title: newProject.title.trim(),
      description: newProject.description.trim() || undefined,
      technologies: newProject.technologies ? newProject.technologies.split(',').map((t) => t.trim()).filter(Boolean) : [],
      url: newProject.url.trim() || undefined,
    };
    setProjects((prev) => [...prev, item]);
    setNewProject({ title: '', description: '', technologies: '', url: '' });
    setProjectModalOpen(false);
    setIsDirty(true);
  };

  const handleDeleteProject = (id?: string) => {
    if (!id) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setIsDirty(true);
  };

  // Certification list handlers
  const handleAddCertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCert.name.trim()) return;
    const item: CertificationItem = {
      id: `cert_${Date.now()}`,
      name: newCert.name.trim(),
      issuer: newCert.issuer.trim() || undefined,
      date: newCert.date.trim() || undefined,
      url: newCert.url.trim() || undefined,
    };
    setCertifications((prev) => [...prev, item]);
    setNewCert({ name: '', issuer: '', date: '', url: '' });
    setCertModalOpen(false);
    setIsDirty(true);
  };

  const handleDeleteCert = (id?: string) => {
    if (!id) return;
    setCertifications((prev) => prev.filter((c) => c.id !== id));
    setIsDirty(true);
  };

  // Active Resume Resolution & Formatting
  const activeSbResume = resumes.find((r) => r.isDefault) || resumes[0];
  const activeResume = activeSbResume
    ? {
        id: activeSbResume.id,
        fileName: activeSbResume.fileName,
        fileSize: activeSbResume.fileSizeBytes,
        uploadedAt: activeSbResume.uploadedAt,
      }
    : localResumeName
    ? {
        id: null,
        fileName: localResumeName,
        fileSize: null,
        uploadedAt: null,
      }
    : null;

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleResumeFileUpload = async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx') && !name.endsWith('.txt')) {
      showToast('Invalid format. Only PDF (.pdf), Word (.docx), and Text (.txt) files are supported.', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File exceeds maximum size limit of 10 MB.', 'error');
      return;
    }

    try {
      setUploadingResume(true);
      setUploadProgress(20);
      playRetroSound('click');

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 85 ? prev : prev + 15));
      }, 150);

      // 1. Upload to local bot filesystem & update .env
      let autofillRes: any = null;
      try {
        autofillRes = await configService.uploadResumeAutofill(file);
      } catch (localErr) {
        console.warn('Local bot resume upload error:', localErr);
      }

      // 2. Upload to Supabase Storage
      let sbRes: any = null;
      try {
        sbRes = await uploadSbResume(file, true);
      } catch (sbErr) {
        console.warn('Supabase resume upload error:', sbErr);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      // 3. Extract and autofill candidate profile
      if (autofillRes?.data) {
        applyExtractedProfile(autofillRes.data);
      }
      if (sbRes?.parsed_profile) {
        applyExtractedProfile(sbRes.parsed_profile);
      }
      if (sbRes?.resume?.id) {
        try {
          const upProf = await autofillProfile(sbRes.resume.id);
          if (upProf) applyExtractedProfile(upProf);
        } catch {
          // ignore
        }
      }

      setLocalResumeName(file.name);
      await Promise.allSettled([loadData(), refreshResumes()]);

      playRetroSound('success');
      showToast(`✓ Resume "${file.name}" uploaded successfully and linked to profile!`, 'success');
    } catch (err: any) {
      playRetroSound('error');
      showToast(err?.message || 'Resume upload failed', 'error');
    } finally {
      setTimeout(() => {
        setUploadingResume(false);
        setUploadProgress(0);
      }, 350);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleResumeFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleResumeFileUpload(e.target.files[0]);
    }
  };

  const handleDeleteResumeConfirmed = async () => {
    try {
      setDeletingResume(true);
      playRetroSound('click');

      // 1. Delete physical resume from local bot engine (data/resumes/ and .env)
      try {
        await configService.deleteResume();
      } catch (localErr) {
        console.warn('Local resume delete error:', localErr);
      }

      // 2. Delete all resumes associated with user in Supabase
      if (resumes.length > 0) {
        for (const r of resumes) {
          try {
            await deleteSbResume(r.id);
          } catch (sbErr) {
            console.warn('Supabase resume delete error:', sbErr);
          }
        }
      }

      setLocalResumeName(null);

      // 3. Clear all form fields
      setFirstname('');
      setLastname('');
      setPhone('');
      setEmail('');
      setGender('Male');
      setCurrentCity('');
      setHeadline('');
      setSummary('');
      setTotalExperience('0');
      setRelevantExperience('0');
      setCurrentCtc('0');
      setExpectedCtc('0');
      setNoticePeriod('Immediate (0 Days)');
      setWorkMode('Remote / Hybrid');
      setWillingToRelocate('Yes');
      setWorkAuthorization('Authorized to work in India');
      setIsFresher(false);
      setSelectedPlatforms(['Naukri', 'Internshala', 'Indeed', 'LinkedIn']);
      setCoverLetter('');
      setEducationDegree('');
      setEducationCollege('');
      setEducationPassingYear('');
      setEducationScore('');
      setEducation([]);
      setSkills([]);
      setSkillInput('');
      setKeywordList([]);
      setKeywordInput('');
      setLocationList([]);
      setLocationInput('');
      setExperience([]);
      setProjects([]);
      setCertifications([]);
      setLinkedinUrl('');
      setGithubUrl('');
      setPortfolioUrl('');
      setNaukriEmail('');
      setNaukriPassword('');
      setInternshalaEmail('');
      setInternshalaPassword('');
      setIndeedEmail('');
      setIndeedPassword('');
      setLinkedinEmail('');
      setLinkedinPassword('');
      setIsDirty(false);

      // 4. Wipe persisted configs in Root .env and data/profile_data.json
      try {
        await configService.saveConfig({
          firstname: '',
          lastname: '',
          phone: '',
          email: '',
          gender: 'Male',
          total_experience_years: '0',
          relevant_experience_years: '0',
          current_ctc: '0',
          expected_ctc: '0',
          notice_period: 'Immediate (0 Days)',
          work_mode: 'Remote / Hybrid',
          willing_to_relocate: 'Yes',
          education_degree: '',
          education_college: '',
          education_passing_year: '',
          education_score: '',
          linkedin_url: '',
          github_url: '',
          portfolio_url: '',
          cover_letter: '',
          keywords: '',
          location: '',
          key_skills: [],
          naukri_headline: '',
          profile_summary: '',
          naukri_email: '',
          naukri_password: '',
          internshala_email: '',
          internshala_password: '',
          indeed_email: '',
          indeed_password: '',
          linkedin_email: '',
          linkedin_password: '',
          max_applications: 25,
        });
      } catch (saveErr) {
        console.warn('Config wipe error:', saveErr);
      }

      // 5. Wipe Supabase Profile and Preferences
      try {
        await updateProfile({
          fullName: '',
          email: '',
          phone: '',
          city: '',
          currentLocation: '',
          headline: '',
          summary: '',
          linkedinUrl: '',
          githubUrl: '',
          portfolioUrl: '',
          skills: [],
          education: [],
          experience: [],
          projects: [],
          certifications: [],
          additionalInfo: {},
        });
      } catch (sbProfErr) {
        console.warn('Supabase profile wipe error:', sbProfErr);
      }

      try {
        await updatePreferences({
          targetTitles: [],
          targetLocations: [],
        });
      } catch (sbPrefErr) {
        console.warn('Supabase preferences wipe error:', sbPrefErr);
      }

      await refreshResumes();

      playRetroSound('success');
      showToast('✓ Resume removed and all form data has been cleared.', 'success');
      setDeleteResumeModalOpen(false);
    } catch (err: any) {
      playRetroSound('error');
      showToast(err?.message || 'Failed to remove resume', 'error');
    } finally {
      setDeletingResume(false);
    }
  };

  const handleViewResume = async () => {
    if (!activeResume) return;
    try {
      setPdfLoading(true);
      setPdfModalOpen(true);
      setPdfFileName(activeResume.fileName);
      playRetroSound('click');

      let downloadUrl: string | undefined = undefined;
      if (activeSbResume?.id) {
        try {
          const sbUrl = await getDownloadUrl(activeSbResume.id);
          if (sbUrl) downloadUrl = sbUrl;
        } catch {
          // fallback to local endpoint
        }
      }

      const blob = await configService.getResumeBlob(downloadUrl);
      const objUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(objUrl);
    } catch (err: any) {
      showToast(err?.message || 'Could not load resume document for preview', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePdfModal = () => {
    setPdfModalOpen(false);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  };

  const handleDownloadActiveResume = async () => {
    if (!activeResume) return;
    try {
      playRetroSound('click');
      let targetUrl: string | null = null;
      if (activeSbResume?.id) {
        try {
          targetUrl = await getDownloadUrl(activeSbResume.id);
        } catch {
          // fallback
        }
      }
      if (!targetUrl) {
        targetUrl = configService.getResumeFileUrl();
      }

      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = activeResume.fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Downloading "${activeResume.fileName}"...`, 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to download resume', 'error');
    }
  };

  // 1-Click Autofill Profile from existing resume
  const handleAutofillFromResume = async () => {
    try {
      setAutofilling(true);
      playRetroSound('click');
      let applied = false;

      // 1. Deep extraction from local bot resume parser & sync
      try {
        const res = await configService.autofillActiveResume();
        if (res?.data) {
          applyExtractedProfile(res.data);
          applied = true;
        }
      } catch (localErr) {
        console.warn('Local bot autofill note:', localErr);
      }

      // 2. Also run Supabase profile autofill
      try {
        const updated = await autofillProfile();
        if (updated) {
          applyExtractedProfile(updated);
          applied = true;
        }
      } catch (sbErr) {
        console.warn('Supabase profile autofill note:', sbErr);
      }

      if (applied) {
        playRetroSound('success');
        showToast('✓ Candidate profile auto-filled from resume and trained into bot!', 'success');
      } else {
        showToast('Please upload a resume first to auto-fill details.', 'warning');
      }
    } catch (err: any) {
      playRetroSound('error');
      showToast(err instanceof Error ? err.message : 'Autofill failed', 'error');
    } finally {
      setAutofilling(false);
    }
  };

  // Launch Bot according to Quick Commands Cheatsheet
  const handleLaunchBot = async () => {
    try {
      setStartingBot(true);
      playRetroSound('click');

      // 1. Save all profile fields and platform credentials
      await handleSave();

      // 2. Resolve matching command configuration
      const cmd = QUICK_COMMANDS.find((c) => c.id === selectedCommand) || QUICK_COMMANDS[0];

      // 3. Dispatch automation task
      const safeKeywords = keywordList.length > 0 ? keywordList : ['Full Stack Developer'];
      const safeLocations = locationList.length > 0 ? locationList : [currentCity || 'Pune'];

      await startTask({
        platform: cmd.platform as any,
        taskType: cmd.taskType as any,
        dryRun: false,
        userConfirmedRealSubmission: true,
        maxApplications: maxApplications || 50,
        keywords: safeKeywords,
        locations: safeLocations,
        force: true,
        headless: false,
      });

      playRetroSound('success');
      showToast(`🚀 Started: ${cmd.label} (Live Apply Mode)! Redirecting to Applications...`, 'success');
      navigate('/applications');
    } catch (err: any) {
      playRetroSound('error');
      showToast(err?.message || 'Failed to start bot task', 'error');
    } finally {
      setStartingBot(false);
    }
  };

  // Reset all candidate data to clean empty state
  const handleResetData = async () => {
    try {
      setResettingData(true);
      playRetroSound('click');
      await configService.resetCandidateData();
      setLocalResumeName(null);
      setFirstname('');
      setLastname('');
      setEmail(user?.email || '');
      setPhone('');
      setCurrentCity('');
      setHeadline('');
      setSummary('');
      setGender('Male');
      setTotalExperience('0');
      setRelevantExperience('0');
      setCurrentCtc('');
      setExpectedCtc('');
      setNoticePeriod('Immediate (0 Days)');
      setWorkMode('Remote / Hybrid');
      setWillingToRelocate('Yes');
      setWorkAuthorization('Authorized to work in India');
      setIsFresher(false);
      setEducationDegree('');
      setEducationCollege('');
      setEducationPassingYear('');
      setEducationScore('');
      setCoverLetter('');
      setLinkedinUrl('');
      setGithubUrl('');
      setPortfolioUrl('');
      setNaukriEmail('');
      setNaukriPassword('');
      setInternshalaEmail('');
      setInternshalaPassword('');
      setIndeedEmail('');
      setIndeedPassword('');
      setLinkedinEmail('');
      setLinkedinPassword('');
      setSkills([]);
      setEducation([]);
      setExperience([]);
      setProjects([]);
      setCertifications([]);
      setKeywordList(['Full Stack Developer']);
      setLocationList(['Pune']);
      setIsDirty(false);
      setResetModalOpen(false);
      playRetroSound('success');
      showToast('✓ Candidate data has been reset to default clean state.', 'success');
    } catch (err: any) {
      playRetroSound('error');
      showToast(err?.message || 'Failed to reset candidate data', 'error');
    } finally {
      setResettingData(false);
    }
  };

  // Unified Save: Updates Supabase tables + Root .env & profile_data.json
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      playRetroSound('click');

      const fullCandidateName = `${firstname.trim()} ${lastname.trim()}`.trim() || 'Candidate';
      const safeKeywords = keywordList.length > 0 ? keywordList : ['Full Stack Developer'];
      const safeLocations = locationList.length > 0 ? locationList : [currentCity || 'Pune'];

      // 1. Save to Supabase Profile table
      try {
        await updateProfile({
          fullName: fullCandidateName,
          email: email.trim(),
          phone: phone.trim(),
          city: currentCity.trim() || safeLocations[0],
          currentLocation: currentCity.trim() || safeLocations[0],
          headline: headline.trim(),
          summary: summary.trim(),
          linkedinUrl: linkedinUrl.trim(),
          githubUrl: githubUrl.trim(),
          portfolioUrl: portfolioUrl.trim(),
          skills,
          education,
          experience,
          projects,
          certifications,
          additionalInfo: {
            has_saved_config: true,
            gender,
            total_experience_years: totalExperience,
            relevant_experience_years: relevantExperience,
            current_ctc: currentCtc,
            expected_ctc: expectedCtc,
            notice_period: noticePeriod,
            notice_period_days: parseInt(noticePeriod, 10) || 15,
            work_mode: workMode,
            willing_to_relocate: willingToRelocate === 'Yes',
            work_authorization: workAuthorization,
            is_fresher: isFresher,
            cover_letter: coverLetter,
            education_degree: educationDegree,
            education_college: educationCollege,
            education_passing_year: educationPassingYear,
            education_score: educationScore,
            keywords: safeKeywords.join(', '),
            location: safeLocations.join(', '),
            selected_platforms: selectedPlatforms,
            max_applications: maxApplications,
            naukri_email: naukriEmail.trim(),
            naukri_password: naukriPassword,
            internshala_email: internshalaEmail.trim(),
            internshala_password: internshalaPassword,
            indeed_email: indeedEmail.trim(),
            indeed_password: indeedPassword,
            linkedin_email: linkedinEmail.trim(),
            linkedin_password: linkedinPassword,
            resume_name: localResumeName,
          },
        });
      } catch (sbErr) {
        console.warn('Supabase profile update warning:', sbErr);
      }

      // 2. Save targeting preferences to Supabase
      try {
        await updatePreferences({
          targetTitles: safeKeywords,
          targetLocations: safeLocations,
          selectedPlatforms,
          dailyApplicationLimit: maxApplications,
        });
      } catch (prefErr) {
        console.warn('Preferences update warning:', prefErr);
      }

      // 3. Synchronize to Root .env and data/profile_data.json
      await configService.saveConfig({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gender,
        total_experience_years: totalExperience,
        relevant_experience_years: relevantExperience,
        current_ctc: currentCtc,
        expected_ctc: expectedCtc,
        notice_period: noticePeriod,
        work_mode: workMode,
        willing_to_relocate: willingToRelocate,
        work_authorization: workAuthorization,
        is_fresher: isFresher,
        selected_platforms: selectedPlatforms,
        education_degree: educationDegree,
        education_college: educationCollege.trim(),
        education_passing_year: educationPassingYear,
        education_score: educationScore.trim(),
        linkedin_url: linkedinUrl.trim(),
        github_url: githubUrl.trim(),
        portfolio_url: portfolioUrl.trim(),
        cover_letter: coverLetter.trim(),
        keywords: safeKeywords.join(', '),
        location: safeLocations.join(', '),
        key_skills: skills,
        naukri_headline: headline.trim(),
        profile_summary: summary.trim(),
        // Platform Credentials (.env)
        naukri_email: naukriEmail.trim(),
        naukri_password: naukriPassword,
        internshala_email: internshalaEmail.trim(),
        internshala_password: internshalaPassword,
        indeed_email: indeedEmail.trim(),
        indeed_password: indeedPassword,
        linkedin_email: linkedinEmail.trim(),
        linkedin_password: linkedinPassword,
        max_applications: maxApplications,
      });

      setIsDirty(false);
      playRetroSound('success');
      showToast('🎉 Candidate profile & bot .env synchronized successfully!', 'success');
    } catch (err) {
      playRetroSound('error');
      showToast(err instanceof Error ? err.message : 'Failed to save candidate configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  if ((profileLoading || botConfigLoading) && !profile && !firstname) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton height="3rem" />
        <Skeleton height="15rem" />
        <Skeleton height="15rem" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] font-mono">
            Candidate Profile & Ai Automation Data
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure application screening answers, contact info, and job targeting. Syncs directly to Supabase & bot .env.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isDirty && (
            <span className="text-amber-400 font-bold flex items-center gap-1.5 text-xs font-mono mr-2 hidden sm:inline-flex">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Unsaved changes
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving || startingBot}
            leftIcon={<Save className="w-3.5 h-3.5 text-emerald-400" />}
            className="text-xs font-mono font-bold border-emerald-500/50 hover:bg-emerald-950/20"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setResetModalOpen(true)}
            disabled={saving || startingBot || resettingData}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
            className="text-xs font-mono text-red-400 hover:bg-red-500/10 border border-red-500/30"
            title="Reset candidate data to fresh state"
          >
            Reset Data
          </Button>
        </div>
      </div>

      {/* SECTION: CANDIDATE RESUME & ATS DOCUMENT ATTACHMENT */}
      <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] retro-shadow p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-[var(--accent)] text-black text-xs font-mono font-bold flex items-center justify-center">
              📄
            </span>
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              CANDIDATE RESUME & ATS ATTACHMENT
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">
            {activeResume ? '1 Document Attached' : 'No Resume Attached'}
          </span>
        </div>

        {activeResume ? (
          <div className="p-4 border-2 border-emerald-500/40 bg-emerald-950/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border-2 border-emerald-500/60 bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono break-all">
                      {activeResume.fileName}
                    </span>
                    <Badge variant="success" size="sm">ACTIVE RESUME</Badge>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                    {activeResume.fileSize ? formatFileSize(activeResume.fileSize) : 'Bot Engine Storage'}
                    {activeResume.uploadedAt ? ` • Uploaded ${new Date(activeResume.uploadedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleViewResume}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold retro-shadow-sm"
                  title="View / Preview uploaded PDF resume"
                >
                  View PDF
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutofillFromResume}
                  disabled={autofilling}
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />}
                  className="text-xs border-[var(--border-color)]"
                  title="Re-extract candidate details from this resume"
                >
                  {autofilling ? 'Autofilling...' : 'Autofill Fields'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadActiveResume}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  className="text-xs border-[var(--border-color)]"
                  title="Download attached resume"
                >
                  Download
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                  className="text-xs border-[var(--border-color)]"
                  title="Replace with another resume document"
                >
                  Replace
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteResumeModalOpen(true)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 border-red-500/40 font-bold"
                  title="Remove this resume document"
                >
                  Remove Resume
                </Button>
              </div>
            </div>

            {uploadingResume && (
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
                <div className="flex justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                  <span>Uploading & parsing replacement resume...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <ProgressBar progress={uploadProgress} />
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`p-6 border-2 border-dashed text-center transition-all cursor-pointer ${
              dragOver
                ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                : 'border-[var(--border-color)] bg-[var(--bg-base)] hover:border-[var(--accent)]/60'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 border-2 border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center text-[var(--accent)]">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)] font-mono uppercase">
                  {uploadingResume ? 'Processing Resume Document...' : 'Drag & Drop Resume Here, or Click to Browse'}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                  Supports PDF (.pdf), Microsoft Word (.docx), and Text (.txt). Max file size 10 MB.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={uploadingResume}
                leftIcon={<UploadCloud className="w-4 h-4" />}
                className="mt-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Upload Resume
              </Button>
            </div>

            {uploadingResume && (
              <div className="mt-4 max-w-xs mx-auto space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                  <span>Parsing and extracting skills...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <ProgressBar progress={uploadProgress} />
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* SECTION 1: CANDIDATE IDENTITY & CONTACT */}
      <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] retro-shadow p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Personal & Contact Details (Syncs to .env & Profiles)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutofillFromResume}
              disabled={autofilling}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
              className="text-xs font-mono bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
              title="Auto-Fill all form fields from uploaded resume"
            >
              {autofilling ? 'Analyzing Resume...' : '⚡ Auto-Fill from Resume'}
            </Button>
            <span className="text-[11px] text-[var(--text-secondary)] font-mono hidden sm:inline">Application Identity</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name (FIRSTNAME) *"
            value={firstname}
            onChange={(e) => {
              setFirstname(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. Umesh"
          />
          <Input
            label="Last Name (LASTNAME) *"
            value={lastname}
            onChange={(e) => {
              setLastname(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. Temburwar"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Phone Number (PHONE) *"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. 9876543210"
          />
          <Input
            label="Contact Email (EMAIL) *"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. umesh@example.com"
          />
          <Select
            label="Gender"
            value={gender}
            onChange={(e) => {
              setGender(e.target.value);
              setIsDirty(true);
            }}
            options={[
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
              { value: 'Other', label: 'Other / Prefer not to say' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <Input
            label="Current City / Base Location"
            value={currentCity}
            onChange={(e) => {
              setCurrentCity(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. Pune / Remote"
          />
          <Input
            label="Professional Headline (Naukri Headline)"
            value={headline}
            onChange={(e) => {
              setHeadline(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. Full Stack Software Engineer | React, Node.js, Python"
          />
        </div>

        <div>
          <Textarea
            label="Professional Profile Summary"
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              setIsDirty(true);
            }}
            rows={2}
            placeholder="Brief 2-3 line overview of your engineering skills, projects, and career highlights..."
          />
        </div>
      </div>

      {/* SECTION 2: PLATFORM LOGIN CREDENTIALS & ACCESS KEYS (SYNCS TO .ENV) */}
      <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] retro-shadow p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              PLATFORM LOGIN CREDENTIALS (NAUKRI, INTERNSHALA, INDEED, LINKEDIN)
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">Auto-Login Access</span>
        </div>

        <p className="text-[11px] text-[var(--text-secondary)] font-mono">
          Enter your login credentials for official job portals. These are saved to your local <code className="text-emerald-400 font-bold">.env</code> configuration and used by your automated browser session to log in, discover vacancies, and submit applications.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* 1. Naukri.com Credentials */}
          <div className="p-4 border-2 border-[var(--border-color)] bg-[var(--bg-base)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-blue-500 inline-block" />
                <span className="text-xs font-bold font-mono text-[var(--text-primary)] uppercase">1. Naukri.com</span>
              </div>
              {naukriEmail && naukriPassword ? (
                <Badge variant="success" size="sm">CONFIGURED</Badge>
              ) : (
                <Badge variant="warning" size="sm">LOGIN REQUIRED</Badge>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1 font-mono text-[var(--text-primary)]">
                Naukri Email / Username *
              </label>
              <Input
                type="email"
                value={naukriEmail}
                onChange={(e) => {
                  setNaukriEmail(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="your_naukri_email@example.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1 font-mono text-[var(--text-primary)]">
                Naukri Password *
              </label>
              <div className="relative">
                <Input
                  type={showNaukriPassword ? 'text' : 'password'}
                  value={naukriPassword}
                  onChange={(e) => {
                    setNaukriPassword(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNaukriPassword(!showNaukriPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
                  title={showNaukriPassword ? 'Hide password' : 'Show password'}
                >
                  {showNaukriPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Internshala Credentials */}
          <div className="p-4 border-2 border-[var(--border-color)] bg-[var(--bg-base)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-sky-500 inline-block" />
                <span className="text-xs font-bold font-mono text-[var(--text-primary)] uppercase">2. Internshala.com</span>
              </div>
              {internshalaEmail && internshalaPassword ? (
                <Badge variant="success" size="sm">CONFIGURED</Badge>
              ) : (
                <Badge variant="warning" size="sm">LOGIN REQUIRED</Badge>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1 font-mono text-[var(--text-primary)]">
                Internshala Email / Username *
              </label>
              <Input
                type="email"
                value={internshalaEmail}
                onChange={(e) => {
                  setInternshalaEmail(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="your_internshala_email@example.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1 font-mono text-[var(--text-primary)]">
                Internshala Password *
              </label>
              <div className="relative">
                <Input
                  type={showInternshalaPassword ? 'text' : 'password'}
                  value={internshalaPassword}
                  onChange={(e) => {
                    setInternshalaPassword(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowInternshalaPassword(!showInternshalaPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
                  title={showInternshalaPassword ? 'Hide password' : 'Show password'}
                >
                  {showInternshalaPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 3. Indeed Credentials */}
          <div className="p-4 border-2 border-[var(--border-color)] bg-[var(--bg-base)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-indigo-500 inline-block" />
                <span className="text-xs font-bold font-mono text-[var(--text-primary)] uppercase">3. Indeed.com</span>
              </div>
              {indeedEmail && indeedPassword ? (
                <Badge variant="success" size="sm">CONFIGURED</Badge>
              ) : (
                <Badge variant="warning" size="sm">LOGIN REQUIRED</Badge>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1 font-mono text-[var(--text-primary)]">
                Indeed Email / Username *
              </label>
              <Input
                type="email"
                value={indeedEmail}
                onChange={(e) => {
                  setIndeedEmail(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="your_indeed_email@example.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1 font-mono text-[var(--text-primary)]">
                Indeed Password *
              </label>
              <div className="relative">
                <Input
                  type={showIndeedPassword ? 'text' : 'password'}
                  value={indeedPassword}
                  onChange={(e) => {
                    setIndeedPassword(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowIndeedPassword(!showIndeedPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
                  title={showIndeedPassword ? 'Hide password' : 'Show password'}
                >
                  {showIndeedPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 4. LinkedIn Credentials */}
          <div className="p-4 border-2 border-[var(--border-color)] bg-[var(--bg-base)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-blue-600 inline-block" />
                <span className="text-xs font-bold font-mono text-[var(--text-primary)] uppercase">4. LinkedIn.com</span>
              </div>
              {linkedinEmail && linkedinPassword ? (
                <Badge variant="success" size="sm">CONFIGURED</Badge>
              ) : (
                <Badge variant="warning" size="sm">LOGIN REQUIRED</Badge>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1 font-mono text-[var(--text-primary)]">
                LinkedIn Email / Username *
              </label>
              <Input
                type="email"
                value={linkedinEmail}
                onChange={(e) => {
                  setLinkedinEmail(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="your_linkedin_email@example.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1 font-mono text-[var(--text-primary)]">
                LinkedIn Password *
              </label>
              <div className="relative">
                <Input
                  type={showLinkedinPassword ? 'text' : 'password'}
                  value={linkedinPassword}
                  onChange={(e) => {
                    setLinkedinPassword(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowLinkedinPassword(!showLinkedinPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
                  title={showLinkedinPassword ? 'Hide password' : 'Show password'}
                >
                  {showLinkedinPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: JOB & CAREER SCREENING DETAILS */}
      <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] retro-shadow p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Job & Career Screening Details (Automated Portal Answers)
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">Used in Auto-Form Filling</span>
        </div>

        {/* Fresher Mode Toggle Banner */}
        <div className="p-3.5 border-2 border-[var(--border-color)] bg-[var(--bg-base)] flex items-start gap-3">
          <input
            type="checkbox"
            id="fresherToggle"
            checked={isFresher}
            onChange={(e) => handleFresherToggle(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-emerald-500 rounded cursor-pointer"
          />
          <div className="flex-1">
            <label htmlFor="fresherToggle" className="text-xs font-bold text-[var(--text-primary)] font-mono cursor-pointer flex items-center gap-2">
              I am a Fresher / Looking for Entry-Level Roles
              {isFresher && <Badge variant="success" size="sm">FRESHER MODE ACTIVE</Badge>}
            </label>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Enabling Fresher mode configures job screening questions for 0 years experience and highlights academic projects instead.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Select
            label="Total Experience"
            value={totalExperience}
            onChange={(e) => {
              const val = e.target.value;
              setTotalExperience(val);
              setIsFresher(val === '0');
              setIsDirty(true);
            }}
            options={[
              { value: '0', label: 'Fresher (0 Years)' },
              { value: '1', label: '1 Year' },
              { value: '2', label: '2 Years' },
              { value: '3', label: '3 Years' },
              { value: '4', label: '4 Years' },
              { value: '5+', label: '5+ Years' },
            ]}
          />
          <Select
            label="Relevant Experience"
            value={relevantExperience}
            onChange={(e) => {
              setRelevantExperience(e.target.value);
              setIsDirty(true);
            }}
            options={[
              { value: '0', label: '0 Years' },
              { value: '1', label: '1 Year' },
              { value: '2', label: '2 Years' },
              { value: '3', label: '3 Years' },
              { value: '4', label: '4 Years' },
            ]}
          />
          <Input
            label="Current CTC"
            value={currentCtc}
            onChange={(e) => {
              setCurrentCtc(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. 0 (Fresher) or 3.5 Lakhs"
          />
          <Input
            label="Expected CTC"
            value={expectedCtc}
            onChange={(e) => {
              setExpectedCtc(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. 5 Lakhs or Negotiable"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <Select
            label="Notice Period"
            value={noticePeriod}
            onChange={(e) => {
              setNoticePeriod(e.target.value);
              setIsDirty(true);
            }}
            options={[
              { value: 'Immediate (0 Days)', label: 'Immediate (0 Days)' },
              { value: '15 Days', label: '15 Days' },
              { value: '30 Days', label: '30 Days / 1 Month' },
              { value: '60 Days', label: '60 Days / 2 Months' },
              { value: '90 Days', label: '90 Days / 3 Months' },
            ]}
          />
          <Select
            label="Work Mode Preference"
            value={workMode}
            onChange={(e) => {
              setWorkMode(e.target.value);
              setIsDirty(true);
            }}
            options={[
              { value: 'Remote / Hybrid', label: 'Remote / Hybrid' },
              { value: 'In-Office', label: 'In-Office (On-site)' },
              { value: 'Remote Only', label: 'Strictly Remote Only' },
            ]}
          />
          <Select
            label="Willing to Relocate?"
            value={willingToRelocate}
            onChange={(e) => {
              setWillingToRelocate(e.target.value);
              setIsDirty(true);
            }}
            options={[
              { value: 'Yes', label: 'Yes, Open to Relocation' },
              { value: 'No', label: 'No, Prefer Current City' },
            ]}
          />
          <Input
            label="Work Authorization"
            value={workAuthorization}
            onChange={(e) => {
              setWorkAuthorization(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. Authorized to work in India"
            helperText="Legal employment status for portal screening"
          />
        </div>

        <div>
          <Textarea
            label="Cover Letter / Why should we hire you? (Short Pitch)"
            value={coverLetter}
            onChange={(e) => {
              setCoverLetter(e.target.value);
              setIsDirty(true);
            }}
            rows={2}
            placeholder="Bot inputs this into application cover letter and screening answer textboxes..."
          />
        </div>
      </div>

      {/* SECTION 4: ACADEMIC QUALIFICATIONS */}
      <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] retro-shadow p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
              3
            </span>
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Academic Qualifications (Degree, College & Score)
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEduModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Degree
          </Button>
        </div>

        {/* Primary Education Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Input
            label="Graduation Degree *"
            value={educationDegree}
            onChange={(e) => {
              setEducationDegree(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. B.Tech / BCA"
          />
          <Input
            label="College / Institute Name *"
            value={educationCollege}
            onChange={(e) => {
              setEducationCollege(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. State University"
          />
          <Input
            label="Passing / Graduation Year *"
            value={educationPassingYear}
            onChange={(e) => {
              setEducationPassingYear(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. 2025"
          />
          <Input
            label="Score / CGPA / %"
            value={educationScore}
            onChange={(e) => {
              setEducationScore(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. 8.5 CGPA or 80%"
          />
        </div>

        {/* Education List Cards */}
        {education.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase font-mono">
              Documented Degrees ({education.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {education.map((edu) => (
                <div
                  key={edu.id}
                  className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-base)] flex items-start justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)] font-mono">{edu.degree}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">{edu.institution}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      Graduated {edu.year} {edu.score ? `· Score: ${edu.score}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteEducation(edu.id)}
                    className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                    title="Remove degree"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5: TARGET JOB ROLES & LOCATIONS */}
      <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] retro-shadow p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
              4
            </span>
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Target Job Roles & Locations (Search Keywords)
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">Sequentially Queried by Bot</span>
        </div>

        {/* Roles Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[var(--text-primary)] font-mono uppercase">
              Job Search Roles / Keywords (KEYWORDS) * ({keywordList.length})
            </label>
            <button
              type="button"
              onClick={handleSuggestRoles}
              disabled={suggestingRoles}
              className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              {suggestingRoles ? 'Suggesting...' : '✨ Suggest Roles From Skills'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-9 p-3 border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
            {keywordList.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] font-mono text-[var(--text-primary)] font-semibold"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(kw)}
                  className="hover:text-red-400 p-0.5 text-[var(--text-secondary)] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Type a role keyword and press Enter (e.g. React Developer)..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleAddKeyword()}
              disabled={!keywordInput.trim()}
            >
              Add Role
            </Button>
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">Suggested:</span>
            {SUGGESTED_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleAddKeyword(r)}
                className={`px-2 py-0.5 text-[10px] border font-mono transition-all cursor-pointer ${
                  keywordList.includes(r)
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-300 font-bold'
                    : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                }`}
              >
                + {r}
              </button>
            ))}
          </div>
        </div>

        {/* Locations Chips */}
        <div className="space-y-2 pt-3 border-t border-[var(--border-color)]">
          <label className="block text-xs font-bold text-[var(--text-primary)] font-mono uppercase">
            Target Locations & Cities (LOCATION) *
          </label>
          <div className="flex flex-wrap gap-1.5 min-h-9 p-3 border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
            {locationList.map((loc) => (
              <span
                key={loc}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] font-mono text-[var(--text-primary)] font-semibold"
              >
                <MapPin className="w-3 h-3 text-sky-400" />
                {loc}
                <button
                  type="button"
                  onClick={() => handleRemoveLocationTag(loc)}
                  className="hover:text-red-400 p-0.5 text-[var(--text-secondary)] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Type city and press Enter (e.g. Remote, Pune, Bangalore)..."
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddLocationTag();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleAddLocationTag()}
              disabled={!locationInput.trim()}
            >
              Add City
            </Button>
          </div>

          {/* Quick Location Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">Suggested:</span>
            {SUGGESTED_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleAddLocationTag(c)}
                className={`px-2 py-0.5 text-[10px] border font-mono transition-all cursor-pointer ${
                  locationList.includes(c)
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-300 font-bold'
                    : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                }`}
              >
                + {c}
              </button>
            ))}
          </div>
        </div>

        {/* Target Job Platforms */}
        <div className="space-y-2 pt-3 border-t border-[var(--border-color)]">
          <label className="block text-xs font-bold text-[var(--text-primary)] font-mono uppercase">
            Target Job Platforms for Automation ({selectedPlatforms.length})
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
            {(['Naukri', 'Internshala', 'Indeed', 'LinkedIn'] as PlatformName[]).map((p) => (
              <label key={p} className="flex items-center gap-2 text-xs font-mono font-medium text-[var(--text-primary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(p)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectedPlatforms((prev) =>
                      checked ? [...prev, p] : prev.filter((item) => item !== p)
                    );
                    setIsDirty(true);
                  }}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <span>{p}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 6: TECHNICAL SKILLS */}
      <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] retro-shadow p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
              5
            </span>
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Key Technical Skills ({skills.length})
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">Matched against Job Descriptions</span>
        </div>

        <div className="flex flex-wrap gap-1.5 min-h-10 p-3 border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
          {skills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] font-mono text-[var(--text-primary)] font-semibold"
            >
              {s}
              <button
                type="button"
                onClick={() => handleRemoveSkill(s)}
                className="hover:text-red-400 p-0.5 text-[var(--text-secondary)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Type skill and press Enter (e.g. React.js, FastAPI, Docker)..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleAddSkill}
          />
          <Button type="button" variant="secondary" onClick={handleAddSkill} disabled={!skillInput.trim()}>
            Add Skill
          </Button>
        </div>
      </div>

      {/* SECTION 7: WORK EXPERIENCE & PROJECTS */}
      <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] retro-shadow p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
              6
            </span>
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Employment Roles & Engineering Projects
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Job Role
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProjectModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Project
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCertModalOpen(true)}
              leftIcon={<Award className="w-3.5 h-3.5" />}
            >
              Add Cert
            </Button>
          </div>
        </div>

        {/* Experience Items */}
        {isFresher ? (
          <div className="p-3.5 border-2 border-dashed border-emerald-500/40 bg-emerald-950/15 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">FRESHER CANDIDATE</Badge>
              <span className="text-xs font-bold text-emerald-400 font-mono">0 Years Corporate Experience</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Bot screening engines will submit answers as a Fresher and emphasize your technical projects and skill proficiency.
            </p>
          </div>
        ) : experience.length > 0 ? (
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase font-mono">
              Employment History ({experience.length})
            </span>
            {experience.map((exp) => (
              <div
                key={exp.id}
                className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-base)] flex items-start justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] font-mono">{exp.role}</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] font-semibold">{exp.company} · {exp.duration}</p>
                  {exp.description && <p className="text-[11px] text-[var(--text-secondary)] mt-1">{exp.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteExperience(exp.id)}
                  className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                  title="Remove experience"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3.5 border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-base)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
            <span>No corporate employment roles documented.</span>
            <Button size="sm" variant="outline" onClick={() => setExpModalOpen(true)} leftIcon={<Plus className="w-3 h-3" />}>
              Add Experience
            </Button>
          </div>
        )}

        {/* Projects Items */}
        <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase font-mono">
              Technical Projects ({projects.length})
            </span>
            <Button size="sm" variant="outline" onClick={() => setProjectModalOpen(true)} leftIcon={<Plus className="w-3 h-3" />}>
              Add Project
            </Button>
          </div>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-base)] flex items-start justify-between gap-2"
                >
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] font-mono">{proj.title}</h4>
                    {proj.description && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{proj.description}</p>}
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {proj.technologies.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 text-[9px] bg-[var(--bg-card)] border border-[var(--border-color)] font-mono">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(proj.id)}
                    className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                    title="Remove project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-base)] text-xs text-[var(--text-secondary)] text-center">
              No technical projects documented yet. Click + Add Project to showcase your portfolio.
            </div>
          )}
        </div>

        {/* Certifications Items */}
        <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase font-mono">
              Credentials & Certifications ({certifications.length})
            </span>
            <Button size="sm" variant="outline" onClick={() => setCertModalOpen(true)} leftIcon={<Award className="w-3 h-3" />}>
              Add Credential
            </Button>
          </div>
          {certifications.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {certifications.map((c) => (
                <div
                  key={c.id}
                  className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-base)] flex items-start justify-between gap-2"
                >
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] font-mono">{c.name}</h4>
                    {c.issuer && <p className="text-[11px] text-[var(--text-secondary)]">{c.issuer} {c.date ? `· ${c.date}` : ''}</p>}
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noreferrer" className="text-[10px] text-[var(--accent)] hover:underline mt-1 block">
                        Verify Credential →
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCert(c.id)}
                    className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                    title="Remove certification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-base)] text-xs text-[var(--text-secondary)] text-center">
              No credentials documented yet. Click + Add Credential to document AWS, Microsoft, or Google certifications.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 8: PROFESSIONAL LINKS */}
      <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] retro-shadow p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
              7
            </span>
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Professional Social Profiles & Portfolio
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">Submitted with Applications</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="LinkedIn Profile URL"
            value={linkedinUrl}
            onChange={(e) => {
              setLinkedinUrl(e.target.value);
              setIsDirty(true);
            }}
            placeholder="https://linkedin.com/in/username"
          />
          <Input
            label="GitHub Profile URL"
            value={githubUrl}
            onChange={(e) => {
              setGithubUrl(e.target.value);
              setIsDirty(true);
            }}
            placeholder="https://github.com/username"
          />
          <Input
            label="Portfolio / Personal Website"
            value={portfolioUrl}
            onChange={(e) => {
              setPortfolioUrl(e.target.value);
              setIsDirty(true);
            }}
            placeholder="https://yourportfolio.dev"
          />
        </div>
      </div>

      {/* SECTION 9: 🚀 QUICK COMMANDS CHEATSHEET & AUTOMATION LAUNCHER */}
      <div className="border-2 border-emerald-500/50 bg-[var(--bg-card)] retro-shadow p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-emerald-500/40">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-emerald-600 text-white text-xs font-mono font-bold flex items-center justify-center">
              🚀
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                QUICK COMMANDS CHEATSHEET & BOT LAUNCHER
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                Select your automation task from the cheatsheet below and launch the bot with 1 click.
              </p>
            </div>
          </div>
          <Badge variant="success" size="sm">COMMAND DISPATCHER</Badge>
        </div>

        {/* Command Selector Grid */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase font-mono text-[var(--text-primary)]">
            Select Automation Command:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUICK_COMMANDS.map((cmd) => {
              const isSelected = selectedCommand === cmd.id;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => {
                    playRetroSound('click');
                    setSelectedCommand(cmd.id);
                  }}
                  className={`p-3 text-left border-2 transition-all cursor-pointer font-mono flex items-center justify-between gap-3 group relative ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/40 retro-shadow ring-2 ring-emerald-500/80'
                      : 'border-[var(--border-color)] bg-[var(--bg-base)] hover:border-emerald-500/60 hover:bg-[var(--bg-card)]'
                  }`}
                  aria-pressed={isSelected}
                  title={`Select ${cmd.label}`}
                >
                  {/* Left: Platform Logo & Task Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {renderTaskLogo(cmd.logoType)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs font-bold leading-tight ${
                            isSelected ? 'text-emerald-400 font-extrabold' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {cmd.label}
                        </span>
                        {cmd.badge && (
                          <span className="text-[9px] px-1 py-0.2 bg-emerald-600 text-white font-bold shrink-0">
                            {cmd.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                        {cmd.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right: Tick Indicator */}
                  <div className="shrink-0 pl-1">
                    {isSelected ? (
                      <div className="w-6 h-6 bg-emerald-500 border-2 border-emerald-300 text-black flex items-center justify-center font-black retro-shadow-sm">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-[var(--border-color)] bg-black/20 flex items-center justify-center group-hover:border-emerald-500/60 transition-colors">
                        <span className="text-[10px] text-zinc-500 opacity-40 group-hover:opacity-100 group-hover:text-emerald-400">
                          ✓
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Execution Mode & Settings Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[var(--border-color)]">
          <div>
            <label className="block text-[11px] font-bold uppercase mb-1 font-mono text-[var(--text-primary)]">
              Execution Mode
            </label>
            <div className="w-full px-3 py-2 border-2 border-emerald-500 bg-emerald-500/15 text-emerald-400 text-[11px] font-mono font-bold flex items-center justify-between retro-shadow-sm select-none">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 animate-pulse inline-block" />
                ⚡ LIVE APPLY
              </span>
              <span className="text-[10px] text-emerald-300 uppercase tracking-wider bg-emerald-950/70 px-1.5 py-0.5 border border-emerald-500/50">
                ALWAYS ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-emerald-500/80 font-mono mt-1">
              Direct live job portal applications enabled.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase mb-1 font-mono text-[var(--text-primary)]">
              Max Applications (Limit)
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              value={maxApplications}
              onChange={(e) => setMaxApplications(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 25)))}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase mb-1 font-mono text-[var(--text-primary)]">
              Browser Display Mode
            </label>
            <div className="w-full px-3 py-2 border-2 border-sky-500 bg-sky-950/30 text-sky-300 text-[11px] font-mono font-bold flex items-center justify-between retro-shadow-sm select-none">
              <span className="flex items-center gap-1.5">
                🖥️ Visible Browser Window
              </span>
              <span className="text-[10px] text-sky-200 uppercase tracking-wider bg-sky-950/70 px-1.5 py-0.5 border border-sky-500/50">
                ALWAYS VISIBLE
              </span>
            </div>
            <p className="text-[10px] text-sky-400/80 font-mono mt-1">
              Browser window will open visibly during run.
            </p>
          </div>
        </div>

        {/* Selected Command Summary & Primary Launch Button */}
        <div className="p-4 border-2 border-emerald-500/40 bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-mono space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <span className="text-[var(--text-secondary)]">Target Task:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {QUICK_COMMANDS.find((c) => c.id === selectedCommand)?.label}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-black border border-emerald-400">
                ⚡ LIVE APPLY MODE
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <span className="text-sky-300 font-semibold">🖥️ Visible Browser Window</span>
              <span>•</span>
              <span className="text-emerald-300 font-semibold">Limit: {maxApplications} Applications</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setResetModalOpen(true)}
              disabled={saving || startingBot || resettingData}
              leftIcon={<Trash2 className="w-4 h-4 text-red-400" />}
              className="text-xs text-red-400 hover:bg-red-500/10 border border-red-500/40 font-mono"
              title="Reset all candidate data and screening answers"
            >
              Reset Candidate Data
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleSave}
              disabled={saving || startingBot}
              leftIcon={<Save className="w-4 h-4 text-emerald-400" />}
              className="text-xs font-mono font-bold"
            >
              {saving ? 'Saving...' : 'Save All'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleLaunchBot}
              disabled={startingBot || saving}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 retro-shadow cursor-pointer"
            >
              {startingBot ? 'Starting Bot...' : '🚀 Start / Launch Bot'}
            </Button>
          </div>
        </div>
      </div>

      {/* Reset Candidate Data Confirmation Modal */}
      <ConfirmDialog
        isOpen={resetModalOpen}
        onClose={() => !resettingData && setResetModalOpen(false)}
        onConfirm={handleResetData}
        title="Reset Candidate Data"
        description="Are you sure you want to permanently reset all candidate details, credentials, and screening answers? Your profile will be returned to a fresh clean state. This action cannot be undone."
        confirmLabel={resettingData ? 'Resetting All Data...' : 'Reset Everything'}
        isDestructive={true}
        isLoading={resettingData}
      />

      {/* Add Education Modal */}
      <Modal isOpen={eduModalOpen} onClose={() => setEduModalOpen(false)} title="Add Educational Degree">
        <form onSubmit={handleAddEducationSubmit} className="space-y-4">
          <Input
            label="Degree / Qualification *"
            value={newEdu.degree}
            onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
            placeholder="e.g. Master of Science (M.Sc)"
            required
          />
          <Input
            label="College / University *"
            value={newEdu.institution}
            onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
            placeholder="e.g. Pune University"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Year of Completion"
              value={newEdu.year}
              onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value })}
              placeholder="e.g. 2024"
            />
            <Input
              label="Score / CGPA"
              value={newEdu.score}
              onChange={(e) => setNewEdu({ ...newEdu, score: e.target.value })}
              placeholder="e.g. 8.2"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEduModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Qualification
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Experience Modal */}
      <Modal isOpen={expModalOpen} onClose={() => setExpModalOpen(false)} title="Add Work Experience Role">
        <form onSubmit={handleAddExperienceSubmit} className="space-y-4">
          <Input
            label="Job Role / Position *"
            value={newExp.role}
            onChange={(e) => setNewExp({ ...newExp, role: e.target.value })}
            placeholder="e.g. Software Engineer Intern"
            required
          />
          <Input
            label="Company / Employer *"
            value={newExp.company}
            onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
            placeholder="e.g. Acme Tech Solutions"
            required
          />
          <Input
            label="Duration"
            value={newExp.duration}
            onChange={(e) => setNewExp({ ...newExp, duration: e.target.value })}
            placeholder="e.g. Jan 2024 - Present (6 mos)"
          />
          <Textarea
            label="Key Responsibilities & Highlights"
            value={newExp.description}
            onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
            rows={3}
            placeholder="Describe what you built and worked on..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setExpModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Experience Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Project Modal */}
      <Modal isOpen={projectModalOpen} onClose={() => setProjectModalOpen(false)} title="Add Technical Project">
        <form onSubmit={handleAddProjectSubmit} className="space-y-4">
          <Input
            label="Project Title *"
            value={newProject.title}
            onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
            placeholder="e.g. AI-powered-job-applying Bot"
            required
          />
          <Textarea
            label="Description"
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            rows={2}
            placeholder="What does this application do? Core achievements..."
          />
          <Input
            label="Technologies (comma separated)"
            value={newProject.technologies}
            onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })}
            placeholder="e.g. React, TypeScript, FastAPI, Python"
          />
          <Input
            label="Project Repository / Live URL"
            value={newProject.url}
            onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
            placeholder="https://github.com/username/project"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setProjectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Project
            </Button>
          </div>
        </form>
      </Modal>
      {/* Add Certification Modal */}
      <Modal isOpen={certModalOpen} onClose={() => setCertModalOpen(false)} title="Add Credential / Certification">
        <form onSubmit={handleAddCertSubmit} className="space-y-4">
          <Input
            label="Certification Name *"
            value={newCert.name}
            onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
            placeholder="e.g. AWS Certified Developer Associate"
            required
          />
          <Input
            label="Issuing Organization"
            value={newCert.issuer}
            onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
            placeholder="e.g. Amazon Web Services / Coursera"
          />
          <Input
            label="Issue Date / Year"
            value={newCert.date}
            onChange={(e) => setNewCert({ ...newCert, date: e.target.value })}
            placeholder="e.g. 2024"
          />
          <Input
            label="Credential Verification URL"
            value={newCert.url}
            onChange={(e) => setNewCert({ ...newCert, url: e.target.value })}
            placeholder="https://..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCertModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Credential
            </Button>
          </div>
        </form>
      </Modal>

      
      {/* View PDF / Document Preview Modal */}
      <Modal
        isOpen={pdfModalOpen}
        onClose={handleClosePdfModal}
        maxWidth="4xl"
        title={
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="truncate max-w-md">Resume Document Viewer: {pdfFileName}</span>
          </div>
        }
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2">
            <span className="text-[11px] text-[var(--text-secondary)] font-mono">
              💡 Use browser toolbar inside preview to zoom, print, or navigate pages.
            </span>
            <div className="flex items-center gap-2">
              {pdfBlobUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(pdfBlobUrl, '_blank')}
                  leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Open in New Tab
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleClosePdfModal}
              >
                Close Viewer
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3 font-mono">
          {pdfLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[var(--text-secondary)]">Loading resume PDF preview...</p>
            </div>
          ) : pdfBlobUrl ? (
            pdfFileName.toLowerCase().endsWith('.docx') ? (
              <div className="p-8 text-center border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-card)] space-y-4">
                <FileText className="w-12 h-12 text-blue-400 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase">Microsoft Word Document (.docx)</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
                    Web browsers cannot render .docx files inline like PDFs. You can download the document to view it in Word or Google Docs.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleDownloadActiveResume}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Download .docx File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full h-[72vh] min-h-[520px] bg-zinc-800 rounded-xs overflow-hidden border-2 border-[var(--border-color)]">
                <iframe
                  src={`${pdfBlobUrl}#toolbar=1`}
                  className="w-full h-full border-0 bg-white"
                  title="Resume PDF Viewer"
                />
              </div>
            )
          ) : (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
              Could not display document preview. Click download to view the file locally.
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Resume Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteResumeModalOpen}
        onClose={() => !deletingResume && setDeleteResumeModalOpen(false)}
        onConfirm={handleDeleteResumeConfirmed}
        title="Remove Attached Resume & Clear Form Data"
        description="Are you sure you want to remove this resume from your profile? This will delete the resume file from storage and clear all candidate details, screening answers, and portal credentials from the form."
        confirmLabel={deletingResume ? "Removing..." : "Remove Resume & Clear Data"}
        isDestructive
        isLoading={deletingResume}
      />
    </div>
  );
};
