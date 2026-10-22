import React from 'react';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  return (
    <header className="md:hidden h-14 border-b border-[#E5E5E5] bg-[#FFFFFF] px-4 flex items-center justify-between sticky top-0 z-20">
      <span className="font-bold text-[14px] text-[#111111]">
        Universal Job Apply Bot
      </span>
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="text-[13px] font-medium text-[#111111] border border-[#E5E5E5] rounded-[6px] px-2.5 py-1 hover:bg-[#FAFAFA] transition-colors duration-150"
        aria-label="Open menu"
      >
        Menu
      </button>
    </header>
  );
};
