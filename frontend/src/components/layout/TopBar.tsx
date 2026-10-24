import React from 'react';
import { Sun, Moon, Menu, Zap } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="md:hidden h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center text-white shadow-2xs">
          <Zap className="w-4 h-4 fill-white" />
        </div>
        <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
          AutoApply<span className="text-emerald-500">.ai</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
          <span>Menu</span>
        </button>
      </div>
    </header>
  );
};
