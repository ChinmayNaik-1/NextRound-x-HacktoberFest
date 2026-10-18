import React from 'react';
import { Moon, ShieldCheck, Sparkles, Sun, Terminal } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface HeaderProps {
  currentRound?: string;
  isProctoringActive?: boolean;
  warningsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRound,
  isProctoringActive = false,
  warningsCount = 0,
}) => {
  const { theme, toggleTheme } = useTheme();
  const themeAction = theme === 'light' ? 'Dark' : 'Light';

  return (
    <header className="sticky top-0 z-30 w-full shrink-0 bg-white/90 backdrop-blur-md border-b border-[#EBEBEB] px-6 py-3.5 flex items-center justify-between">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <img
          src={`${import.meta.env.BASE_URL}${theme === 'dark' ? 'dark.png' : 'light.png'}`}
          alt=""
          aria-hidden="true"
          className="h-7 w-7 object-contain drop-shadow-sm"
        />

        <div className="flex items-center gap-2">
          <span className="font-medium text-[1.125rem] tracking-tight text-[#1A1A1A]">
            NextRound
          </span>
          <span className="text-gray-300 font-light">|</span>
          <span className="text-sm font-normal text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-pill flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
            InterviewAI
          </span>
        </div>
      </div>

      {/* Center Status: Active Round Badge if in session */}
      {currentRound && (
        <div className="hidden md:flex items-center gap-2 bg-[#F8F9FA] border border-[#E5E7EB] px-3.5 py-1 rounded-pill">
          <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
          <span className="text-xs font-medium text-gray-700 tracking-wide uppercase">
            Active: {currentRound}
          </span>
        </div>
      )}

      {/* Right Controls: Proctoring Shield & Warnings */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${themeAction} Mode`}
          title={`Switch to ${themeAction} Mode`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
        {isProctoringActive && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-medium border ${
              warningsCount === 0
                ? "bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]"
                : warningsCount === 1
                ? "bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]"
                : "bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]"
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {warningsCount === 0 ? "Anti-Cheat Active" : `Warnings: ${warningsCount}/3`}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-gray-500 font-mono bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">
          <span>HacktoberFest'26</span>
        </div>
      </div>
    </header>
  );
};
