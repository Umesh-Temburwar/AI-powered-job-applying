import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  Save,
  RotateCcw,
  ShieldCheck,
  X,
  Info,
} from 'lucide-react';
import { usePreferences } from '../hooks/usePreferences';
import { useToast } from '../context/ToastContext';
import {
  Card,
  CardHeader,
  Input,
  Select,
  Checkbox,
  Switch,
  Button,
  Badge,
  Skeleton,
} from '../components/ui';
import type { PlatformName, EmploymentType, ExperienceLevel } from '../types';

export const PreferencesPage: React.FC = () => {
  const { preferences, loading, error, updatePreferences } = usePreferences();
  const { showToast } = useToast();

  const [targetTitles, setTargetTitles] = useState<string[]>([]);
  const [titleInput, setTitleInput] = useState('');

  const [targetLocations, setTargetLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');

  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Fresher / Entry Level');
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>(['Full-time']);
  const [minSalary, setMinSalary] = useState<number>(4.5);
  const [maxSalary, setMaxSalary] = useState<number>(12.0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformName[]>([
    'Naukri',
    'Internshala',
    'Indeed',
    'LinkedIn',
  ]);
  const [dailyLimit, setDailyLimit] = useState<number>(25);
  const [requireReview, setRequireReview] = useState<boolean>(true);

  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const allPlatforms: PlatformName[] = ['Naukri', 'Internshala', 'Indeed', 'LinkedIn'];
  const allEmploymentTypes: EmploymentType[] = ['Full-time', 'Part-time', 'Internship', 'Contract'];

  useEffect(() => {
    if (preferences) {
      setTargetTitles(preferences.targetTitles || []);
      setTargetLocations(preferences.targetLocations || []);
      setExperienceLevel(preferences.experienceLevel || 'Fresher / Entry Level');
      setEmploymentTypes(preferences.employmentTypes || ['Full-time']);
      setMinSalary(preferences.minSalaryLakhs || 4.5);
      setMaxSalary(preferences.maxSalaryLakhs || 12.0);
      setSelectedPlatforms(preferences.selectedPlatforms || ['Naukri', 'Internshala']);
      setDailyLimit(preferences.dailyApplicationLimit || 25);
      setRequireReview(
        preferences.requireReviewBeforeSubmit !== undefined
          ? preferences.requireReviewBeforeSubmit
          : true
      );
      setIsDirty(false);
    }
  }, [preferences]);

  const handleAddTitle = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = titleInput.trim();
    if (trimmed && !targetTitles.includes(trimmed)) {
      setTargetTitles((prev) => [...prev, trimmed]);
      setTitleInput('');
      setIsDirty(true);
    }
  };

  const handleRemoveTitle = (t: string) => {
    setTargetTitles((prev) => prev.filter((item) => item !== t));
    setIsDirty(true);
  };

  const handleAddLocation = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = locationInput.trim();
    if (trimmed && !targetLocations.includes(trimmed)) {
      setTargetLocations((prev) => [...prev, trimmed]);
      setLocationInput('');
      setIsDirty(true);
    }
  };

  const handleRemoveLocation = (l: string) => {
    setTargetLocations((prev) => prev.filter((item) => item !== l));
    setIsDirty(true);
  };

  const toggleEmploymentType = (type: EmploymentType) => {
    setEmploymentTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setIsDirty(true);
  };

  const togglePlatform = (plat: PlatformName) => {
    setSelectedPlatforms((prev) =>
      prev.includes(plat) ? prev.filter((p) => p !== plat) : [...prev, plat]
    );
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation
    if (minSalary > maxSalary) {
      setValidationError('Minimum salary cannot exceed maximum salary.');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setValidationError('Please select at least one target job platform.');
      return;
    }

    if (targetTitles.length === 0) {
      setValidationError('Please add at least one target job title or keyword.');
      return;
    }

    if (dailyLimit < 1 || dailyLimit > 100) {
      setValidationError('Daily application limit must be between 1 and 100.');
      return;
    }

    setSaving(true);
    try {
      await updatePreferences({
        targetTitles,
        targetLocations,
        experienceLevel,
        employmentTypes,
        minSalaryLakhs: minSalary,
        maxSalaryLakhs: maxSalary,
        selectedPlatforms,
        dailyApplicationLimit: dailyLimit,
        requireReviewBeforeSubmit: requireReview,
      });
      setIsDirty(false);
      showToast('Job preferences saved successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (preferences) {
      setTargetTitles(preferences.targetTitles || []);
      setTargetLocations(preferences.targetLocations || []);
      setExperienceLevel(preferences.experienceLevel || 'Fresher / Entry Level');
      setEmploymentTypes(preferences.employmentTypes || ['Full-time']);
      setMinSalary(preferences.minSalaryLakhs || 4.5);
      setMaxSalary(preferences.maxSalaryLakhs || 12.0);
      setSelectedPlatforms(preferences.selectedPlatforms || ['Naukri']);
      setDailyLimit(preferences.dailyApplicationLimit || 25);
      setRequireReview(preferences.requireReviewBeforeSubmit ?? true);
      setIsDirty(false);
      setValidationError(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height="3rem" />
        <Skeleton height="12rem" />
        <Skeleton height="12rem" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Informational Banner */}
      <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-950/40 text-sky-200 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            These criteria guide automated keyword queries, location filters, and salary filtering.
          </span>
        </div>
        <Badge variant="cyan" size="sm">
          Strict Matching
        </Badge>
      </div>

      {(error || validationError) && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
          {validationError || error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Targeted Titles & Locations */}
        <Card>
          <CardHeader
            title="Search Keywords & Locations"
            subtitle="Job portal search query definitions"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">
                Targeted Roles / Keywords
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={handleAddTitle}
                  placeholder="e.g. React Developer"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddTitle}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {targetTitles.map((t) => (
                  <Badge key={t} variant="cyan" className="flex items-center gap-1.5 text-xs py-1">
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTitle(t)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">
                Targeted Locations
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={handleAddLocation}
                  placeholder="e.g. Pune, Remote"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddLocation}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {targetLocations.map((loc) => (
                  <Badge key={loc} variant="default" className="flex items-center gap-1.5 text-xs py-1">
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(loc)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Experience & Employment Type */}
        <Card>
          <CardHeader
            title="Experience & Employment Type"
            subtitle="Candidate qualification filters"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Select
              label="Experience Level"
              value={experienceLevel}
              onChange={(e) => {
                setExperienceLevel(e.target.value as ExperienceLevel);
                setIsDirty(true);
              }}
              options={[
                { value: 'Fresher / Entry Level', label: 'Fresher / Entry Level (0-1 yrs)' },
                { value: '1-3 Years', label: 'Associate / Junior (1-3 yrs)' },
                { value: '3-5 Years', label: 'Mid-Senior Level (3-5 yrs)' },
                { value: '5+ Years', label: 'Senior / Lead (5+ yrs)' },
              ]}
            />

            <div>
              <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">
                Employment Types
              </label>
              <div className="grid grid-cols-2 gap-2">
                {allEmploymentTypes.map((type) => (
                  <Checkbox
                    key={type}
                    label={type}
                    checked={employmentTypes.includes(type)}
                    onChange={() => toggleEmploymentType(type)}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Compensation & Rate Limiting */}
        <Card>
          <CardHeader
            title="Salary Filter & Rate Limiting"
            subtitle="Salary range validation and safe daily limits"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Min Salary (₹ Lakhs/yr)"
              type="number"
              step="0.5"
              min="0"
              value={minSalary}
              onChange={(e) => {
                setMinSalary(parseFloat(e.target.value) || 0);
                setIsDirty(true);
              }}
              leftIcon={<IndianRupee className="w-3.5 h-3.5" />}
              required
            />

            <Input
              label="Max Salary (₹ Lakhs/yr)"
              type="number"
              step="0.5"
              min="0"
              value={maxSalary}
              onChange={(e) => {
                setMaxSalary(parseFloat(e.target.value) || 0);
                setIsDirty(true);
              }}
              leftIcon={<IndianRupee className="w-3.5 h-3.5" />}
              required
            />

            <Input
              label="Daily Limit (Apps/Day)"
              type="number"
              min="1"
              max="100"
              value={dailyLimit}
              onChange={(e) => {
                setDailyLimit(parseInt(e.target.value) || 1);
                setIsDirty(true);
              }}
              helperText="Recommended: 25 to avoid portal IP rate-limits."
              required
            />
          </div>
        </Card>

        {/* Portals to Run */}
        <Card>
          <CardHeader
            title="Active Job Platforms"
            subtitle="Select which bot modules should be executed during automated runs"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {allPlatforms.map((plat) => {
              const isSelected = selectedPlatforms.includes(plat);
              return (
                <div
                  key={plat}
                  onClick={() => togglePlatform(plat)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[var(--accent)] bg-theme-accent-muted'
                      : 'border-theme bg-theme-surface/50 hover:bg-theme-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-theme-primary">{plat}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded text-[var(--accent)]"
                    />
                  </div>
                  <span className="text-[11px] text-theme-secondary block">
                    Supported by existing CLI module
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Safety & Review Mode Switch */}
        <Card className="border-sky-500/30 bg-sky-950/20">
          <Switch
            checked={requireReview}
            onChange={(checked) => {
              setRequireReview(checked);
              setIsDirty(true);
            }}
            label={
              <span className="flex items-center gap-2 font-bold text-sky-200">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                Require Manual Review Before Final Submission (Default ON)
              </span>
            }
            description="When enabled, any application that requires custom screening answers or prompts verification will safely pause and wait for your explicit review before proceeding."
          />
        </Card>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-theme bg-theme-card sticky bottom-4 z-10 shadow-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!isDirty || saving}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Discard
          </Button>

          <Button
            type="submit"
            variant="primary"
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};
