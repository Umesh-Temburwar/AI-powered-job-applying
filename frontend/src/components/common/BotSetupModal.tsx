import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Save,
  X,
  FileText,
  User,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { configService, type BotEnvConfig } from '../../services/configService';
import { playRetroSound } from '../../utils/soundEffects';
import { Button, Input, Badge } from '../ui';

interface BotSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBot?: (options?: { platform?: string; dryRun?: boolean }) => Promise<void> | void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const SUGGESTED_ROLES = [
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'React Developer',
  'Node.js Developer',
  'Python Developer',
  'Software Engineer',
  'DevOps Engineer',
];

const SUGGESTED_LOCATIONS = [
  'Pune',
  'Bangalore',
  'Mumbai',
  'Hyderabad',
  'Delhi',
  'Noida',
  'Remote',
];

export const BotSetupModal: React.FC<BotSetupModalProps> = ({
  isOpen,
  onClose,
  onStartBot,
  showToast,
}) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState<boolean>(false);
  const [botConfig, setBotConfig] = useState<BotEnvConfig | null>(null);

  // Launch Target & Mode
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All Portals');
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [maxApplications, setMaxApplications] = useState<number>(50);

  // Search Criteria Tags
  const [keywordList, setKeywordList] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [locationList, setLocationList] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const cfg = await configService.fetchConfig();
      setBotConfig(cfg);
      if (cfg) {
        if (cfg.max_applications) setMaxApplications(Number(cfg.max_applications) || 50);
        if (cfg.keywords) {
          const kws = cfg.keywords.split(',').map((s) => s.trim()).filter(Boolean);
          if (kws.length > 0) setKeywordList(kws);
        }
        if (cfg.location) {
          const locs = cfg.location.split(',').map((s) => s.trim()).filter(Boolean);
          if (locs.length > 0) setLocationList(locs);
        }
      }
    } catch (err) {
      console.warn('Could not fetch config in BotSetupModal:', err);
    }
  };

  const handleAddKeyword = (val?: string) => {
    const raw = (val || keywordInput).trim();
    if (raw && !keywordList.includes(raw)) {
      setKeywordList((prev) => [...prev, raw]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (item: string) => {
    setKeywordList((prev) => prev.filter((k) => k !== item));
  };

  const handleAddLocationTag = (val?: string) => {
    const raw = (val || locationInput).trim();
    if (raw && !locationList.includes(raw)) {
      setLocationList((prev) => [...prev, raw]);
      setLocationInput('');
    }
  };

  const handleRemoveLocationTag = (item: string) => {
    setLocationList((prev) => prev.filter((l) => l !== item));
  };

  const handleSaveEnvOnly = async () => {
    try {
      setSaving(true);
      playRetroSound('click');
      await configService.saveConfig({
        keywords: (keywordList.length > 0 ? keywordList : ['Full Stack Developer']).join(', '),
        location: (locationList.length > 0 ? locationList : ['Pune']).join(', '),
        max_applications: maxApplications,
      });
      playRetroSound('success');
      showToast('✓ Search roles and target locations saved to .env!', 'success');
    } catch (err) {
      playRetroSound('error');
      showToast(err instanceof Error ? err.message : 'Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLaunchNow = async () => {
    try {
      setSaving(true);
      playRetroSound('click');

      // Sync launch keywords & locations to .env first
      await configService.saveConfig({
        keywords: (keywordList.length > 0 ? keywordList : ['Full Stack Developer']).join(', '),
        location: (locationList.length > 0 ? locationList : ['Pune']).join(', '),
        max_applications: maxApplications,
      });

      // Close modal and start automation task
      onClose();
      if (onStartBot) {
        await onStartBot({
          platform: selectedPlatform,
          dryRun,
        });
      }
    } catch (err) {
      playRetroSound('error');
      showToast(err instanceof Error ? err.message : 'Error launching automation task', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const candidateFullName = `${botConfig?.firstname || ''} ${botConfig?.lastname || ''}`.trim() || 'Candidate';
  const activeResumeName = botConfig?.resume_name || 'No resume file attached';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-mono">
      <div
        className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#F4EFEA] dark:bg-[#12151B] border-2 border-[var(--border-color)] retro-shadow overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Window Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[var(--border-color)] bg-[var(--bg-base)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#E74C3C] border border-black/40 block" />
              <span className="w-3 h-3 bg-[#F1C40F] border border-black/40 block" />
              <span className="w-3 h-3 bg-[#2ECC71] border border-black/40 block" />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              // Launch Automation Task (Universal Bot)
            </span>
            <Badge variant="cyan" size="sm">
              .ENV DIRECT SYNC
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border-2 border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-red-500 hover:text-white transition-all cursor-pointer font-bold text-xs"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-[var(--text-primary)] text-xs">
          {/* Quick Profile & Resume Status Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 border-2 border-[var(--border-color)] bg-[var(--bg-card)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Active Bot Resume</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate block">{activeResumeName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/resumes');
                }}
                className="text-[11px] text-[var(--accent)] hover:underline font-bold flex items-center gap-1 shrink-0"
              >
                Change <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 sm:border-l sm:border-[var(--border-color)] sm:pl-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <User className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Candidate Profile</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate block">{candidateFullName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/profile');
                }}
                className="text-[11px] text-[var(--accent)] hover:underline font-bold flex items-center gap-1 shrink-0"
              >
                Edit <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 1. Target Portal & Execution Mode */}
          <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
              <span className="w-5 h-5 bg-black text-white text-[10px] font-bold flex items-center justify-center">1</span>
              <span className="font-bold text-xs uppercase tracking-wider">Automation Target & Mode</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase mb-1">Target Job Portal</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] text-xs font-bold focus:outline-none"
                >
                  <option value="All Portals">All Portals (Naukri, Internshala, Indeed, LinkedIn)</option>
                  <option value="Naukri">Naukri.com</option>
                  <option value="Internshala">Internshala</option>
                  <option value="Indeed">Indeed</option>
                  <option value="LinkedIn">LinkedIn Jobs</option>
                  <option value="Foundit">Foundit (Monster)</option>
                  <option value="Wellfound">Wellfound (AngelList)</option>
                  <option value="Glassdoor">Glassdoor</option>
                  <option value="Cutshort">Cutshort</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase mb-1">Execution Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDryRun(true)}
                    className={`px-3 py-2 border-2 text-[11px] font-bold transition-all cursor-pointer ${
                      dryRun
                        ? 'border-amber-500 bg-amber-400/20 text-amber-300 retro-shadow-sm'
                        : 'border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-secondary)]'
                    }`}
                  >
                    🧪 DRY-RUN (SAFE)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDryRun(false)}
                    className={`px-3 py-2 border-2 text-[11px] font-bold transition-all cursor-pointer ${
                      !dryRun
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 retro-shadow-sm'
                        : 'border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-secondary)]'
                    }`}
                  >
                    ⚡ LIVE APPLY
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-secondary)] italic">
              {dryRun
                ? '🧪 Dry-Run mode queries matching jobs, verifies forms and attachments without submitting.'
                : '⚡ Live mode logs into your official portal accounts and submits real job applications.'}
            </p>
          </div>

          {/* 2. Target Roles / Keywords */}
          <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
              <span className="w-5 h-5 bg-black text-white text-[10px] font-bold flex items-center justify-center">2</span>
              <span className="font-bold text-xs uppercase tracking-wider">Target Job Roles (KEYWORDS)</span>
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-8 p-2.5 border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
              {keywordList.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] font-bold"
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
                placeholder="Type role keyword and press Enter (e.g. React Developer)..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={() => handleAddKeyword()} disabled={!keywordInput.trim()}>
                Add Role
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-[var(--text-secondary)]">Suggested:</span>
              {SUGGESTED_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleAddKeyword(r)}
                  className={`px-1.5 py-0.5 text-[10px] border transition-all cursor-pointer ${
                    keywordList.includes(r)
                      ? 'border-emerald-600 bg-emerald-950/40 text-emerald-300 font-bold'
                      : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                  }`}
                >
                  + {r}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Target Locations & Application Limit */}
          <div className="border-2 border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
              <span className="w-5 h-5 bg-black text-white text-[10px] font-bold flex items-center justify-center">3</span>
              <span className="font-bold text-xs uppercase tracking-wider">Target Locations & Application Limit</span>
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-8 p-2.5 border-2 border-[var(--border-color)] bg-[var(--bg-base)]">
              {locationList.map((loc) => (
                <span
                  key={loc}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] font-bold"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 flex gap-2">
                <Input
                  placeholder="Type city and press Enter (e.g. Pune, Remote)..."
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLocationTag();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={() => handleAddLocationTag()} disabled={!locationInput.trim()}>
                  Add City
                </Button>
              </div>

              <div>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={maxApplications}
                  onChange={(e) => setMaxApplications(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 25)))}
                  placeholder="Limit (1-100)"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-[var(--text-secondary)]">Suggested:</span>
              {SUGGESTED_LOCATIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleAddLocationTag(c)}
                  className={`px-1.5 py-0.5 text-[10px] border transition-all cursor-pointer ${
                    locationList.includes(c)
                      ? 'border-emerald-600 bg-emerald-950/40 text-emerald-300 font-bold'
                      : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                  }`}
                >
                  + {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t-2 border-[var(--border-color)] bg-[var(--bg-base)] shrink-0">
          <div className="text-[11px] text-[var(--text-secondary)] font-mono text-center sm:text-left">
            Target: <span className="font-bold text-[var(--text-primary)]">{selectedPlatform}</span> ({dryRun ? 'Dry-Run' : 'Live'})
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveEnvOnly}
              disabled={saving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save .env Only
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleLaunchNow}
              disabled={saving}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {saving ? 'Launching Bot...' : '🚀 Launch & Start Bot Now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
