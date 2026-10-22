import React from 'react';
import { Menu, Sun, Moon, Bell, ChevronRight, User } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/dashboard':
        return { title: 'Dashboard Overview', section: 'Home' };
      case '/profile':
        return { title: 'Candidate Profile', section: 'Profile' };
      case '/resumes':
        return { title: 'Resume Manager', section: 'Documents' };
      case '/preferences':
        return { title: 'Job Matching Preferences', section: 'Configuration' };
      case '/automation':
        return { title: 'Automation Task Runner', section: 'Operations' };
      case '/applications':
        return { title: 'Application CRM Tracker', section: 'Applications' };
      case '/settings':
        return { title: 'Platform Settings', section: 'Account' };
      default:
        return { title: 'Universal Job Bot', section: 'App' };
    }
  };

  const { title, section } = getPageInfo();

  return (
    <header className="h-16 border-b border-theme bg-theme-surface/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden text-theme-secondary hover:text-theme-primary p-1.5 rounded-lg border border-theme"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <nav className="flex items-center gap-1.5 text-xs text-theme-muted mb-0.5">
            <Link to="/dashboard" className="hover:text-theme-primary transition-colors">
              Platform
            </Link>
            <ChevronRight className="w-3 h-3 text-theme-muted" />
            <span className="text-theme-secondary font-medium">{section}</span>
          </nav>
          <h1 className="text-base sm:text-lg font-bold text-theme-primary leading-none">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          aria-label="Toggle visual theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-sky-600" />
          )}
        </button>

        {/* Notifications mock button */}
        <button
          type="button"
          className="relative p-2 rounded-xl border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-colors cursor-pointer"
          title="Notifications (Demo)"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
        </button>

        {/* User avatar chip */}
        <Link
          to="/profile"
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-theme bg-theme-card hover:border-theme-focus transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-semibold">
            {user?.fullName?.charAt(0) || <User className="w-3.5 h-3.5" />}
          </div>
          <span className="hidden sm:inline text-xs font-medium text-theme-primary">
            {user?.fullName || 'Candidate'}
          </span>
        </Link>
      </div>
    </header>
  );
};
