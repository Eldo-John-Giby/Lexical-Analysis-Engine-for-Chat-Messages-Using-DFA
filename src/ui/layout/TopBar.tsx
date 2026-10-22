import React from 'react';
import { useAppStore } from '../../state/store';
import { Sun, Moon, Activity } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { theme, toggleTheme, engine } = useAppStore();
  const stats = engine.stats;
  const statsText = `Engine ready: ${stats.perRule.length} rules, ${stats.master.minDfaStates} DFA states, built in ${stats.buildMs} ms`;

  return (
    <header className="h-14 border-b border-[#1F2A4A] bg-[#0E1424]/90 backdrop-blur px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & animated DFA glyph */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-[#141C33] border border-[#1F2A4A] px-3 py-1.5 rounded-lg">
          <svg className="w-5 h-5 text-[#7C5CFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="5" cy="12" r="3" strokeWidth="2" />
            <circle cx="19" cy="12" r="3" strokeWidth="2" />
            <circle cx="19" cy="12" r="1.5" strokeWidth="1.5" />
            <path d="M8 12h8" strokeWidth="2" strokeDasharray="2 2" className="animate-pulse" />
          </svg>
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-[#7C5CFF] to-[#22D3EE] bg-clip-text text-transparent">
            LexiChat DFA
          </span>
          <span className="text-[10px] text-[#8A94B2] font-mono border-l border-[#1F2A4A] pl-2 hidden sm:inline">
            Compiler Lexical Engine
          </span>
        </div>

        {/* Real engine stats pill */}
        <div className="hidden md:flex items-center space-x-2 text-xs bg-[#141C33]/70 border border-[#1F2A4A] px-2.5 py-1 rounded-full text-[#8A94B2]">
          <Activity className="w-3.5 h-3.5 text-[#34D399]" />
          <span className="font-mono text-[11px] text-[#E6EAF5]">{statsText}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={toggleTheme}
          className="p-1.5 text-[#8A94B2] hover:text-[#E6EAF5] hover:bg-[#141C33] rounded-lg border border-transparent hover:border-[#1F2A4A] transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-[#FBBF24]" /> : <Moon className="w-4 h-4 text-[#7C5CFF]" />}
        </button>
      </div>
    </header>
  );
};
