import React, { useEffect } from 'react';
import { useAppStore } from '../state/store';
import { TopBar } from './layout/TopBar';
import { TabNav } from './layout/TabNav';
import { CommandPalette } from './layout/CommandPalette';
import { ShortcutsModal } from './layout/ShortcutsModal';
import { RuleManagerModal } from './components/RuleManagerModal';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { ConstructionLabPage } from './pages/ConstructionLabPage';
import { ChatSimPage } from './pages/ChatSimPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BenchmarksPage } from './pages/BenchmarksPage';
import { TheoryPage } from './pages/TheoryPage';
import { motion, AnimatePresence } from 'framer-motion';

export const App: React.FC = () => {
  const { currentTab, setCurrentTab, setShortcutsOpen, isRuleModalOpen, setRuleModalOpen } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in inputs/textareas
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key >= '1' && e.key <= '7') {
        const tabs: (typeof currentTab)[] = [
          'playground',
          'explorer',
          'construction',
          'chat',
          'analytics',
          'benchmarks',
          'theory',
        ];
        const tab = tabs[parseInt(e.key, 10) - 1];
        if (tab) setCurrentTab(tab);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTab, setShortcutsOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-[#070A12] text-[#E6EAF5]">
      <TopBar />
      <TabNav />

      <main className="flex-1 relative overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="h-full"
          >
            {currentTab === 'playground' && <PlaygroundPage />}
            {currentTab === 'explorer' && <ExplorerPage />}
            {currentTab === 'construction' && <ConstructionLabPage />}
            {currentTab === 'chat' && <ChatSimPage />}
            {currentTab === 'analytics' && <AnalyticsPage />}
            {currentTab === 'benchmarks' && <BenchmarksPage />}
            {currentTab === 'theory' && <TheoryPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      <CommandPalette />
      <ShortcutsModal />
      <RuleManagerModal isOpen={isRuleModalOpen} onClose={() => setRuleModalOpen(false)} />
    </div>
  );
};
