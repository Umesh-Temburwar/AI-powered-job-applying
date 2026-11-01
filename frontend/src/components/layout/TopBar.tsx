import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Home, Volume2, VolumeX, ExternalLink, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { isSoundEnabled, toggleSound, playRetroSound } from '../../utils/soundEffects';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  const handleSoundToggle = () => {
    const next = toggleSound();
    setSoundOn(next);
  };

  const handleThemeToggle = () => {
    playRetroSound('toggle');
    toggleTheme();
  };

  // Human friendly page label from route
  const getPageTitle = (path: string) => {
    if (path.startsWith('/dashboard')) return 'OVERVIEW_DASHBOARD';
    if (path.startsWith('/guide')) return 'AUTOMATION_GUIDE';
    if (path.startsWith('/applications')) return 'APPLICATIONS_LEDGER';
    if (path.startsWith('/profile')) return 'PROFILE_AND_RESUME';
    if (path.startsWith('/settings')) return 'SYSTEM_SETTINGS';
    if (path.startsWith('/admin')) return 'ADMIN_CONSOLE';
    return 'WORKSPACE';
  };

  return (
    <header
      className={`h-14 border-b-2 ${
        theme === 'dark'
          ? 'border-[#2E384D] bg-[#111520] text-[#F4F4F5]'
          : 'border-[#18181B] bg-white text-[#09090B]'
      } px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 font-mono transition-colors duration-150`}
    >
      {/* Left side: Mobile menu toggle or desktop breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className={`md:hidden p-1.5 border-2 ${
            theme === 'dark'
              ? 'border-[#2E384D] bg-[#141A26] text-white'
              : 'border-[#18181B] bg-[#F5F3EC] text-[#09090B]'
          } retro-shadow-sm`}
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-[12px]">
          <span className="w-2.5 h-2.5 bg-emerald-500 inline-block shrink-0" />
          <span className="font-bold hidden sm:inline">[SYS_ACTIVE]</span>
          <span className="opacity-40 hidden sm:inline">/</span>
          <span className="font-bold text-emerald-600 truncate">
            {getPageTitle(location.pathname)}
          </span>
        </div>
      </div>

      {/* Right side: Home, Sound Toggle, Theme Toggle, Creator Credit */}
      <div className="flex items-center gap-2 sm:gap-3 text-[12px]">
        
        {/* Public Home Landing Page Button */}
        <Link
          to="/"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 border-2 ${
            theme === 'dark'
              ? 'border-[#2E384D] bg-[#141A26] hover:border-[#10B981] text-white'
              : 'border-[#18181B] bg-[#F5F3EC] hover:bg-white text-[#09090B]'
          } font-bold uppercase retro-shadow-sm transition-all`}
          title="Return to Public Homepage & Creator Spotlight"
          data-sound="nav"
        >
          <Home className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden xs:inline">HOME</span>
        </Link>

        {/* Retro Sound FX Toggle */}
        <button
          type="button"
          onClick={handleSoundToggle}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 border-2 ${
            soundOn
              ? theme === 'dark'
                ? 'border-[#10B981] bg-[#141A26] text-[#10B981]'
                : 'border-[#18181B] bg-emerald-50 text-emerald-800'
              : theme === 'dark'
              ? 'border-[#2E384D] bg-[#141A26] text-zinc-500'
              : 'border-[#18181B] bg-zinc-100 text-zinc-500'
          } font-bold retro-shadow-sm cursor-pointer transition-colors`}
          title={`Retro Audio: ${soundOn ? 'ENABLED (Click to mute)' : 'MUTED (Click to enable)'}`}
          aria-label="Toggle retro audio"
          data-sound="toggle"
        >
          {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{soundOn ? 'SFX:ON' : 'SFX:OFF'}</span>
        </button>

        {/* High-Contrast Theme Toggle */}
        <button
          type="button"
          onClick={handleThemeToggle}
          className={`p-1.5 border-2 ${
            theme === 'dark'
              ? 'border-[#2E384D] bg-[#141A26] text-amber-300 hover:border-amber-400'
              : 'border-[#18181B] bg-white text-zinc-800 hover:bg-zinc-50'
          } retro-shadow-sm transition-colors cursor-pointer`}
          title={`Switch to ${theme === 'dark' ? 'Light Parchment' : 'Dark Terminal'} theme`}
          aria-label="Toggle dark mode"
          data-sound="toggle"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Creator Portfolio Link */}
        <a
          href="https://umeshtemburwar.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex items-center gap-1 text-[11px] opacity-75 hover:opacity-100 hover:underline"
          title="Engineered by Umesh Temburwar"
        >
          <span>umeshtemburwar.vercel.app</span>
          <ExternalLink className="w-3 h-3 text-emerald-600" />
        </a>
      </div>
    </header>
  );
};
