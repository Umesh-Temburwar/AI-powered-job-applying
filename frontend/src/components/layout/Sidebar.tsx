import React from 'react';
import { NavLink as RouterNavLink, useNavigate as useRouterNavigate } from 'react-router-dom';
import { Sun, Moon, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useRouterNavigate();

  const navItems = [
    { label: 'Home Page', path: '/', isHome: true },
    { label: 'Overview', path: '/dashboard' },
    { label: 'Applications', path: '/applications' },
    { label: 'Profile & Resume', path: '/profile' },
    { label: 'Resume Analyzer', path: '/resume-analyzer' },
    { label: 'Settings', path: '/settings' },
    ...(user?.isAdmin ? [{ label: 'Admin Panel', path: '/admin' }] : []),
    { label: 'Automation Guide', path: '/guide' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navContent = (
    <div className={`flex flex-col h-full ${theme === 'dark' ? 'bg-[#111520] text-[#F4F4F5]' : 'bg-[#FFFFFF] text-[#09090B]'}`}>
      {/* Product Name */}
      <div className={`h-14 px-6 flex items-center justify-between border-b-2 ${theme === 'dark' ? 'border-[#2E384D]' : 'border-[#18181B]'}`}>
        <RouterNavLink
          to="/dashboard"
          onClick={onCloseMobile}
          className="font-mono font-bold text-[14px] tracking-tight hover:text-emerald-600 transition-colors duration-150 flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 bg-emerald-600 inline-block" />
          UNIVERSAL_JOB_BOT
        </RouterNavLink>
        <button
          onClick={onCloseMobile}
          className="md:hidden opacity-70 hover:opacity-100 text-[13px] p-1 font-mono"
          aria-label="Close menu"
        >
          [X]
        </button>
      </div>

      {/* Nav Links */}
      <nav aria-label="Main Navigation" className="flex-1 py-4">
        {navItems.map((item) => (
          <RouterNavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `block px-6 py-2.5 font-mono text-[13px] font-medium transition-colors duration-150 ${
                isActive
                  ? theme === 'dark'
                    ? 'text-[#10B981] font-bold border-l-4 border-[#10B981] bg-[#141A26]'
                    : 'text-[#15803D] font-bold border-l-4 border-[#15803D] bg-[#F5F3EC]'
                  : 'opacity-75 hover:opacity-100 border-l-4 border-transparent'
              }`
            }
          >
            {item.label}
          </RouterNavLink>
        ))}
      </nav>

      {/* User Footer & Creator Credit */}
      <div className={`p-5 border-t-2 ${theme === 'dark' ? 'border-[#2E384D]' : 'border-[#18181B]'} space-y-4`}>
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-[13px] font-bold truncate">
              {user?.fullName || 'Candidate Session'}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1.5 border ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-amber-300' : 'border-[#18181B] bg-white text-zinc-800'} transition-colors cursor-pointer`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-[12px] opacity-70 truncate mb-2 font-mono">
            {user?.email || ''}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out of account"
            className="text-[12px] opacity-70 hover:opacity-100 font-mono underline transition-colors duration-150 cursor-pointer"
          >
            Sign out
          </button>
        </div>

        {/* Creator Attribution with Portfolio Link */}
        <a
          href="https://umeshtemburwar.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className={`pt-3 border-t ${theme === 'dark' ? 'border-[#2E384D]' : 'border-[#18181B]'} flex items-center gap-2.5 group hover:opacity-90 transition-opacity`}
        >
          <img
            src="/umesh.jpg"
            alt="Umesh Temburwar"
            className={`w-7 h-7 rounded-none object-cover border ${theme === 'dark' ? 'border-[#10B981]' : 'border-[#18181B]'} shrink-0`}
          />
          <div className="text-[11px] leading-tight overflow-hidden font-mono">
            <div className="font-bold truncate flex items-center gap-1 group-hover:text-emerald-500">
              Umesh Temburwar
              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            </div>
            <div className="text-[10px] opacity-60 truncate">umeshtemburwar.vercel.app</div>
          </div>
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className={`hidden md:flex flex-col w-[240px] shrink-0 h-screen sticky top-0 border-r-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'} z-30`}>
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className={`relative w-[240px] h-full z-10 border-r-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'}`}>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
