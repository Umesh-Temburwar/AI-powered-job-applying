import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  User,
  Key,
  LogOut,
  AlertTriangle,
  Lock,
  Smartphone,
  Save,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabaseClient';
import { configService } from '../services/configService';
import {
  Card,
  CardHeader,
  Button,
  Input,
  Switch,
  Badge,
  ConfirmDialog,
} from '../components/ui';
import { lockSiteAccess } from '../components/common/SiteAccessGate';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Notification switches
  const [notifyComplete, setNotifyComplete] = useState(true);
  const [notifyReview, setNotifyReview] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Dialog states
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showToast(error.message, 'error');
      } else {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password updated successfully', 'success');
      }
    } catch {
      showToast('Failed to update password', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogoutConfirmed = async () => {
    await logout();
    navigate('/login');
  };

  const handleDeleteAccountConfirmed = async () => {
    setIsResetting(true);
    try {
      // 1. Wipe all candidate data from backend (Supabase tables, SQLite DB, local resumes, .env, and in-memory caches)
      await configService.resetCandidateData();

      // 2. Extra direct client-side Supabase wipe if session exists
      if (user?.id) {
        try {
          await Promise.allSettled([
            supabase.from('applications').delete().eq('user_id', user.id),
            supabase.from('automation_tasks').delete().eq('user_id', user.id),
            supabase.from('platform_connections').delete().eq('user_id', user.id),
            supabase.from('job_preferences').delete().eq('user_id', user.id),
            supabase.from('resumes').delete().eq('user_id', user.id),
            supabase.from('application_answers').delete().eq('user_id', user.id),
          ]);
          await supabase.from('profiles').update({
            full_name: 'Candidate',
            phone: null,
            city: null,
            headline: null,
            skills: [],
            summary: null,
            is_onboarded: false,
            onboarding_step: 1,
            onboarded_at: null,
            education: [],
            experience: [],
            projects: [],
            certifications: [],
            additional_info: {},
            linkedin_url: null,
            github_url: null,
            portfolio_url: null,
          }).eq('id', user.id);
        } catch (sbErr) {
          console.warn('Frontend Supabase direct wipe:', sbErr);
        }
      }

      // 3. Clear all stored client caches
      const keysToRemove = [
        'onboarding_completed',
        'candidate_preferences',
        'bot_config',
        'naukri_filters',
        'cached_profile',
        'active_task',
        'last_automation_run',
        'job_search_filters',
      ];
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();

      showToast('✓ All candidate data deleted from Supabase & backend! Fresh candidate state active.', 'success');
      setDeleteConfirmOpen(false);

      // 4. Force full page refresh to /dashboard as a 100% fresh user
      setTimeout(() => {
        window.location.href = '/applications';
      }, 500);
    } catch (err: any) {
      console.error('Reset candidate data error:', err);
      showToast(err?.message || 'Failed to wipe candidate data', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Notice Banner */}
      <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-950/40 text-sky-200 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            Candidate profile and security settings. Managed with Supabase Authentication.
          </span>
        </div>
        <Badge variant="cyan" size="sm">
          Settings
        </Badge>
      </div>

      {/* Theme & Display Settings */}
      <Card>
        <CardHeader
          title="Theme & Visual Appearance"
          subtitle="Customize interface lighting (Persisted in browser localStorage)"
        />

        <div className="flex items-center justify-between p-4 rounded-xl border border-theme bg-theme-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme flex items-center justify-center text-[var(--accent)]">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
            </div>
            <div>
              <p className="text-sm font-bold text-theme-primary">
                Current Mode: {theme === 'dark' ? 'Deep Navy (Dark)' : 'Clean Slate (Light)'}
              </p>
              <p className="text-xs text-theme-secondary mt-0.5">
                Toggle between dark mode and light theme palette.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            leftIcon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>
        </div>
      </Card>

      {/* Account Profile Card */}
      <Card>
        <CardHeader
          title="Account Information"
          subtitle="Identity managed by Supabase Authentication"
        />

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Candidate Display Name"
              value={user?.fullName || 'Candidate'}
              disabled
              helperText="Managed in My Profile section."
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="Primary Email"
              value={user?.email || ''}
              disabled
              helperText="Verified candidate email."
              leftIcon={<Lock className="w-4 h-4" />}
            />
          </div>
        </div>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader
          title="Change Password"
          subtitle="Update account authentication secret"
          action={
            <Badge variant="cyan" size="sm">
              Security
            </Badge>
          }
        />

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              leftIcon={<Key className="w-4 h-4" />}
            />

            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<Key className="w-4 h-4" />}
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Key className="w-4 h-4" />}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              isLoading={passwordLoading}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader
          title="Event & Alert Preferences"
          subtitle="Configure system and desktop notifications"
          action={
            <Badge variant="default" size="sm">
              Preferences
            </Badge>
          }
        />

        <div className="space-y-4 divide-y divide-theme">
          <div className="pt-2">
            <Switch
              checked={notifyComplete}
              onChange={setNotifyComplete}
              label="Task Cycle Completion"
              description="Notify when a multi-platform automation run finishes evaluating all candidate listings."
            />
          </div>

          <div className="pt-4">
            <Switch
              checked={notifyReview}
              onChange={setNotifyReview}
              label="Review Checkpoints & Screening Prompts"
              description="Immediate alert when a job portal requires manual candidate intervention."
            />
          </div>

          <div className="pt-4">
            <Switch
              checked={notifyDigest}
              onChange={setNotifyDigest}
              label="Daily Summary Digest"
              description="Daily aggregate report summarizing total applications processed across portals."
            />
          </div>
        </div>
      </Card>

      {/* Security & Sessions */}
      <Card>
        <CardHeader
          title="Security & Active Sessions"
          subtitle="Hardware devices and active session security tokens"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-theme bg-theme-surface/50 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-theme-card flex items-center justify-center text-[var(--accent)]">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-theme-primary">Current Windows Browser Client</p>
                <p className="text-theme-muted mt-0.5">Active session • Authenticated</p>
              </div>
            </div>
            <Badge variant="success" size="sm">
              Current Session
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-theme bg-theme-surface/50 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-theme-card flex items-center justify-center text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-theme-primary">Website Access Gatekeeper</p>
                <p className="text-theme-muted mt-0.5">Private Gatekeeper Active • SHA-256 Protected</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={lockSiteAccess}
              className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10 cursor-pointer"
            >
              Lock Site Access
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/40 bg-red-950/20">
        <CardHeader
          title={<span className="text-red-400">Account Management &amp; Exit</span>}
          subtitle="Session sign out and account data deletion"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div>
            <p className="text-sm font-bold text-theme-primary">Exit Active Session</p>
            <p className="text-xs text-theme-secondary mt-0.5">
              Sign out from this workstation and clear in-memory state.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setLogoutConfirmOpen(true)}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-red-300">Delete Candidate Data</p>
            <p className="text-xs text-red-200/80 mt-0.5">
              Permanently wipe all preferences, resumes, and stored application logs.
            </p>
          </div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            leftIcon={<AlertTriangle className="w-4 h-4" />}
            isLoading={isResetting}
          >
            Reset Candidate Data
          </Button>
        </div>
      </Card>

      {/* Logout Confirmation */}
      <ConfirmDialog
        isOpen={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={handleLogoutConfirmed}
        title="Sign Out"
        description="Are you sure you want to end your current session? You can log back in at any time with your authenticated account."
        confirmLabel="Sign Out"
      />

      {/* Delete Data Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => !isResetting && setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteAccountConfirmed}
        title="Reset Candidate Data"
        description="Permanently delete ALL candidate details, resumes, portal credentials, applied jobs history, and reset your account to a completely fresh state. This action cannot be undone."
        confirmLabel={isResetting ? "Deleting All Data..." : "Reset Everything"}
        isDestructive
        isLoading={isResetting}
      />
    </div>
  );
};
