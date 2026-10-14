import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../state/store';
import { Search, X, Code2, Network, GitBranch, MessageSquare, BarChart3, Zap, BookOpen, Sun, Moon } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setCommandPaletteOpen, setCurrentTab, theme, toggleTheme } = useAppStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const actions = [
    { label: 'Go to Playground', icon: Code2, run: () => setCurrentTab('playground') },
    { label: 'Go to Automata Explorer', icon: Network, run: () => setCurrentTab('explorer') },
    { label: 'Go to Construction Lab', icon: GitBranch, run: () => setCurrentTab('construction') },
    { label: 'Go to Chat Simulator', icon: MessageSquare, run: () => setCurrentTab('chat') },
    { label: 'Go to Analytics', icon: BarChart3, run: () => setCurrentTab('analytics') },
    { label: 'Go to Benchmarks', icon: Zap, run: () => setCurrentTab('benchmarks') },
    { label: 'Go to Theory', icon: BookOpen, run: () => setCurrentTab('theory') },
    { label: `Toggle theme (current: ${theme})`, icon: theme === 'dark' ? Sun : Moon, run: toggleTheme },
  ];

  const filtered = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0E1424] border border-[#1F2A4A] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center px-4 border-b border-[#1F2A4A]">
          <Search className="w-4 h-4 text-[#8A94B2] mr-3" />
          <input
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full py-3.5 bg-transparent text-sm text-[#E6EAF5] placeholder-[#8A94B2] outline-none"
          />
          <button onClick={() => setCommandPaletteOpen(false)} className="text-[#8A94B2] hover:text-[#E6EAF5]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#8A94B2]">No matching commands</div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    item.run();
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-xs text-[#E6EAF5] hover:bg-[#141C33] rounded-lg transition-colors text-left"
                >
                  <Icon className="w-4 h-4 text-[#7C5CFF]" />
                  <span>{item.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
