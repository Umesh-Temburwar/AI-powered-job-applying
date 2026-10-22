import React from 'react';
import { NavLink as RouterNavLink, useNavigate as useRouterNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  Sliders,
  PlayCircle,
  Briefcase,
  Settings,
  LogOut,
  X,
  Bot,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useRouterNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Profile', path: '/profile', icon: User },
    { label: 'Resume Manager', path: '/resumes', icon: FileText },
    { label: 'Job Preferences', path: '/preferences', icon: Sliders },
    { label: 'Automation', path: '/automation', icon: PlayCircle },
    { label: 'Applications', path: '/applications', icon: Briefcase },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const content = (
    <div className="flex flex-col h-full bg-theme-surface border-r border-theme">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-theme">
        <RouterNavLink
          to="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-3 group text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-theme-accent-muted border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-theme-primary block leading-none">
              Universal Job Bot
            </span>
            <span className="text-[10px] text-theme-muted uppercase tracking-wider block mt-1">
              Multi-User Platform
            </span>
          </div>
        </RouterNavLink>
        <button
          onClick={onCloseMobile}
          className="md:hidden text-theme-muted hover:text-theme-primary p-1 rounded-lg"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Demo Badge */}
      <div className="px-5 py-2.5 bg-sky-950/40 border-b border-sky-800/30 flex items-center justify-between">
        <span className="text-[11px] font-medium text-sky-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          Demo Mode Sandbox
        </span>
        <RouterNavLink
          to="/"
          className="text-[11px] text-sky-400 hover:text-sky-200 flex items-center gap-1"
        >
          Landing <ExternalLink className="w-3 h-3" />
        </RouterNavLink>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <RouterNavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-theme-accent text-slate-950 font-semibold shadow-xs'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-card'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </RouterNavLink>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-4 border-t border-theme bg-theme-surface/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-theme flex items-center justify-center font-bold text-xs text-white shrink-0">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-theme-primary truncate">
                {user?.fullName || 'Demo Candidate'}
              </p>
              <p className="text-[11px] text-theme-muted truncate">
                {user?.email || 'demo@example.com'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Session</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 z-30">
        {content}
      </aside>

      {/* Mobile drawer with backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
