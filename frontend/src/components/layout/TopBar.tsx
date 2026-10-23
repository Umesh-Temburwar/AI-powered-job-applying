import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="md:hidden h-14 border-b border-[#E5E5E5] bg-[#FFFFFF] px-4 flex items-center justify-between sticky top-0 z-20">
      <span className="font-bold text-[14px] text-[#111111]">
        Universal Job Apply Bot
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-[6px] border border-[#E5E5E5] hover:bg-[#FAFAFA] text-[#6B6B6B] hover:text-[#111111] transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="text-[13px] font-medium text-[#111111] border border-[#E5E5E5] rounded-[6px] px-2.5 py-1 hover:bg-[#FAFAFA] transition-colors duration-150"
          aria-label="Open menu"
        >
          Menu
        </button>
      </div>
    </header>
  );
};
