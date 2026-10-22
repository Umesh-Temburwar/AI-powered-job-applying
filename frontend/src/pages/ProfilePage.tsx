import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  AlertCircle,
  X,
  Info,
} from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useToast } from '../context/ToastContext';
import {
  Card,
  CardHeader,
  Input,
  Textarea,
  Button,
  Badge,
  Modal,
  Skeleton,
} from '../components/ui';
import type { EducationItem, ExperienceItem } from '../types';

export const ProfilePage: React.FC = () => {
  const { profile, loading, error, updateProfile } = useProfile();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    currentLocation: '',
    headline: '',
    summary: '',
    noticePeriodDays: 15,
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const [preferredTitles, setPreferredTitles] = useState<string[]>([]);
  const [titleInput, setTitleInput] = useState('');

  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');

  const [education, setEducation] = useState<EducationItem[]>([]);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);

  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal states for adding Education / Experience
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', year: '', score: '' });

  const [expModalOpen, setExpModalOpen] = useState(false);
  const [newExp, setNewExp] = useState({ role: '', company: '', duration: '', description: '' });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        currentLocation: profile.currentLocation || '',
        headline: profile.headline || '',
        summary: profile.summary || '',
        noticePeriodDays: profile.noticePeriodDays || 15,
      });
      setSkills(profile.skills || []);
      setPreferredTitles(profile.preferredTitles || []);
      setPreferredLocations(profile.preferredLocations || []);
      setEducation(profile.education || []);
      setExperience(profile.experience || []);
      setIsDirty(false);
    }
  }, [profile]);

  const handleFieldChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const handleAddTitle = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = titleInput.trim();
    if (trimmed && !preferredTitles.includes(trimmed)) {
      setPreferredTitles((prev) => [...prev, trimmed]);
      setTitleInput('');
      setIsDirty(true);
    }
  };

  const handleRemoveTitle = (t: string) => {
    setPreferredTitles((prev) => prev.filter((item) => item !== t));
    setIsDirty(true);
  };

  const handleAddLocation = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = locationInput.trim();
    if (trimmed && !preferredLocations.includes(trimmed)) {
      setPreferredLocations((prev) => [...prev, trimmed]);
      setLocationInput('');
      setIsDirty(true);
    }
  };

  const handleRemoveLocation = (loc: string) => {
    setPreferredLocations((prev) => prev.filter((l) => l !== loc));
    setIsDirty(true);
  };

  const handleAddEducationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEdu.degree || !newEdu.institution) return;
    const item: EducationItem = {
      id: `edu_${Date.now()}`,
      ...newEdu,
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

  const handleAddExperienceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExp.role || !newExp.company) return;
    const item: ExperienceItem = {
      id: `exp_${Date.now()}`,
      ...newExp,
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        ...formData,
        skills,
        preferredTitles,
        preferredLocations,
        education,
        experience,
      });
      setIsDirty(false);
      showToast('Candidate profile updated successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        currentLocation: profile.currentLocation || '',
        headline: profile.headline || '',
        summary: profile.summary || '',
        noticePeriodDays: profile.noticePeriodDays || 15,
      });
      setSkills(profile.skills || []);
      setPreferredTitles(profile.preferredTitles || []);
      setPreferredLocations(profile.preferredLocations || []);
      setEducation(profile.education || []);
      setExperience(profile.experience || []);
      setIsDirty(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height="3rem" />
        <Skeleton height="15rem" />
        <Skeleton height="15rem" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Demo Notice */}
      <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-950/40 text-sky-200 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            Candidate profile changes are synchronized across bot question answerers and form fillers.
          </span>
        </div>
        {isDirty && (
          <span className="font-semibold text-amber-300 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Unsaved modifications
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Personal Information */}
        <Card>
          <CardHeader
            title="Personal & Contact Details"
            subtitle="Standard candidate information used for screening responses"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={formData.fullName}
              onChange={(e) => handleFieldChange('fullName', e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
              required
            />

            <Input
              label="Current Location"
              value={formData.currentLocation}
              onChange={(e) => handleFieldChange('currentLocation', e.target.value)}
              leftIcon={<MapPin className="w-4 h-4" />}
              required
            />
          </div>
        </Card>

        {/* Professional Summary */}
        <Card>
          <CardHeader
            title="Headline & Profile Summary"
            subtitle="Auto-populated into portal headlines and cover letters"
          />

          <div className="space-y-4">
            <Input
              label="Professional Headline"
              value={formData.headline}
              onChange={(e) => handleFieldChange('headline', e.target.value)}
              placeholder="e.g. Full Stack Developer | React, Node.js, Python"
              required
            />

            <Textarea
              label="Career Objective / Summary"
              rows={4}
              value={formData.summary}
              onChange={(e) => handleFieldChange('summary', e.target.value)}
              placeholder="Brief summary highlighting core strengths and hands-on project accomplishments..."
              required
            />

            <div className="w-full sm:w-1/2">
              <Input
                label="Notice Period (Days)"
                type="number"
                min="0"
                max="90"
                value={formData.noticePeriodDays}
                onChange={(e) => handleFieldChange('noticePeriodDays', parseInt(e.target.value) || 0)}
                helperText="Screening questions asking for availability will map to this value."
              />
            </div>
          </div>
        </Card>

        {/* Skills Tag Input */}
        <Card>
          <CardHeader
            title="Technical Skills & Keywords"
            subtitle="Skills are evaluated by ATS heuristic matchers to verify job relevance"
          />

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder="Type a skill and press Enter (e.g. React.js, FastAPI, Docker)"
              />
              <Button type="button" variant="secondary" onClick={handleAddSkill}>
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="cyan"
                  className="flex items-center gap-1.5 py-1 px-3 text-xs"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-400 transition-colors"
                    aria-label={`Remove skill ${skill}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Target Preferences */}
        <Card>
          <CardHeader
            title="Preferred Roles & Locations"
            subtitle="Determines search queries executed by Naukri and Internshala modules"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2">
                Target Job Titles
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={handleAddTitle}
                  placeholder="e.g. Full Stack Developer"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddTitle}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {preferredTitles.map((title) => (
                  <Badge key={title} variant="default" className="flex items-center gap-1 text-xs">
                    <span>{title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTitle(title)}
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
                Target Cities / Work Modes
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
                {preferredLocations.map((loc) => (
                  <Badge key={loc} variant="default" className="flex items-center gap-1 text-xs">
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

        {/* Education & Experience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Education list */}
          <Card>
            <CardHeader
              title="Education"
              subtitle="Degree and institutional records"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setEduModalOpen(true)}
                >
                  Add
                </Button>
              }
            />

            <div className="space-y-3">
              {education.length === 0 ? (
                <p className="text-xs text-theme-muted py-4 text-center">No education added.</p>
              ) : (
                education.map((edu) => (
                  <div
                    key={edu.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl border border-theme bg-theme-surface/50"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-sky-400" />
                        {edu.degree}
                      </h4>
                      <p className="text-[11px] text-theme-secondary mt-0.5">{edu.institution}</p>
                      <p className="text-[10px] text-theme-muted mt-1">
                        {edu.year} {edu.score ? `• ${edu.score}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteEducation(edu.id)}
                      className="text-theme-muted hover:text-red-400 p-1 transition-colors"
                      aria-label="Remove education"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Work experience list */}
          <Card>
            <CardHeader
              title="Experience & Internships"
              subtitle="Professional experience records"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setExpModalOpen(true)}
                >
                  Add
                </Button>
              }
            />

            <div className="space-y-3">
              {experience.length === 0 ? (
                <p className="text-xs text-theme-muted py-4 text-center">No experience added.</p>
              ) : (
                experience.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl border border-theme bg-theme-surface/50"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-emerald-400" />
                        {exp.role}
                      </h4>
                      <p className="text-[11px] text-theme-secondary mt-0.5">{exp.company}</p>
                      <p className="text-[10px] text-theme-muted mt-0.5">{exp.duration}</p>
                      <p className="text-[11px] text-theme-muted mt-1 line-clamp-2">
                        {exp.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="text-theme-muted hover:text-red-400 p-1 transition-colors"
                      aria-label="Remove experience"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

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
            Discard Changes
          </Button>

          <Button
            type="submit"
            variant="primary"
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Candidate Profile
          </Button>
        </div>
      </form>

      {/* Add Education Modal */}
      <Modal
        isOpen={eduModalOpen}
        onClose={() => setEduModalOpen(false)}
        title="Add Education Qualification"
      >
        <form onSubmit={handleAddEducationSubmit} className="space-y-4">
          <Input
            label="Degree / Course"
            placeholder="e.g. B.Tech Computer Science"
            value={newEdu.degree}
            onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
            required
          />
          <Input
            label="College / University"
            placeholder="e.g. State Engineering College"
            value={newEdu.institution}
            onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Year of Completion"
              placeholder="e.g. 2024"
              value={newEdu.year}
              onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value })}
            />
            <Input
              label="Grade / CGPA"
              placeholder="e.g. 8.5 CGPA"
              value={newEdu.score}
              onChange={(e) => setNewEdu({ ...newEdu, score: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEduModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Qualification
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Experience Modal */}
      <Modal
        isOpen={expModalOpen}
        onClose={() => setExpModalOpen(false)}
        title="Add Professional Experience"
      >
        <form onSubmit={handleAddExperienceSubmit} className="space-y-4">
          <Input
            label="Job / Internship Title"
            placeholder="e.g. Full Stack Developer Intern"
            value={newExp.role}
            onChange={(e) => setNewExp({ ...newExp, role: e.target.value })}
            required
          />
          <Input
            label="Organization / Company"
            placeholder="e.g. TechNova Labs"
            value={newExp.company}
            onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
            required
          />
          <Input
            label="Duration"
            placeholder="e.g. Jan 2024 - Jun 2024"
            value={newExp.duration}
            onChange={(e) => setNewExp({ ...newExp, duration: e.target.value })}
          />
          <Textarea
            label="Responsibilities & Impact"
            rows={3}
            placeholder="Key technologies used, accomplishments, and team contribution..."
            value={newExp.description}
            onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setExpModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Experience
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
