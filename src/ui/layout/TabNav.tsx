import React from 'react';
import { useAppStore, TabType } from '../../state/store';
import { Code2, Network, GitBranch, MessageSquare, BarChart3, Zap, BookOpen } from 'lucide-react';

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  keyNumber: string;
}

const TABS: TabItem[] = [
  { id: 'playground', label: 'Playground', icon: Code2, keyNumber: '1' },
  { id: 'explorer', label: 'Automata Explorer', icon: Network, keyNumber: '2' },
  { id: 'construction', label: 'Construction Lab', icon: GitBranch, keyNumber: '3' },
  { id: 'chat', label: 'Chat Simulator', icon: MessageSquare, keyNumber: '4' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, keyNumber: '5' },
  { id: 'benchmarks', label: 'Benchmarks', icon: Zap, keyNumber: '6' },
  { id: 'theory', label: 'Theory', icon: BookOpen, keyNumber: '7' },
];

export const TabNav: React.FC = () => {
  const { currentTab, setCurrentTab } = useAppStore();

  return (
    <nav className="border-b border-[#1F2A4A] bg-[#070A12]/80 backdrop-blur px-4 flex items-center space-x-1 overflow-x-auto scrollbar-none">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              isActive
                ? 'border-[#7C5CFF] text-[#E6EAF5] bg-[#141C33]/50'
                : 'border-transparent text-[#8A94B2] hover:text-[#E6EAF5] hover:bg-[#0E1424]'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-[#7C5CFF]' : 'text-[#8A94B2]'}`} />
            <span>{tab.label}</span>
            <span className="hidden lg:inline text-[10px] font-mono opacity-40">[{tab.keyNumber}]</span>
          </button>
        );
      })}
    </nav>
  );
};
