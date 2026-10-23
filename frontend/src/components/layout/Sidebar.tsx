import React from 'react';
import { NavLink as RouterNavLink, useNavigate as useRouterNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
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
    { label: 'Overview', path: '/dashboard' },
    { label: 'Applications', path: '/applications' },
    { label: 'Profile & Resume', path: '/profile' },
    { label: 'Settings', path: '/settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#FFFFFF]">
      {/* Product Name */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-[#E5E5E5]">
        <RouterNavLink
          to="/dashboard"
          onClick={onCloseMobile}
          className="font-bold text-[14px] text-[#111111] tracking-tight hover:text-[#166534] transition-colors duration-150"
        >
          Universal Job Apply Bot
        </RouterNavLink>
        <button
          onClick={onCloseMobile}
          className="md:hidden text-[#6B6B6B] hover:text-[#111111] text-[13px] p-1"
          aria-label="Close menu"
        >
          Close
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <RouterNavLink
            key={item.path}
            to={item.path}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `block px-6 py-2.5 text-[14px] transition-colors duration-150 ${
                isActive
                  ? 'text-[#166534] font-medium border-l-2 border-[#166534] bg-[#FAFAFA]'
                  : 'text-[#6B6B6B] hover:text-[#111111] border-l-2 border-transparent'
              }`
            }
          >
            {item.label}
          </RouterNavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-6 border-t border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[13px] font-medium text-[#111111] truncate">
            {user?.fullName || 'User'}
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1 rounded-[4px] border border-[#E5E5E5] hover:bg-[#FAFAFA] text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="text-[12px] text-[#6B6B6B] truncate mb-3">
          {user?.email || ''}
        </div>
        <button
          onClick={handleLogout}
          className="text-[13px] text-[#6B6B6B] hover:text-[#111111] transition-colors duration-150 cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] shrink-0 h-screen sticky top-0 border-r border-[#E5E5E5] bg-[#FFFFFF] z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-[240px] h-full z-10 border-r border-[#E5E5E5] bg-[#FFFFFF]">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
