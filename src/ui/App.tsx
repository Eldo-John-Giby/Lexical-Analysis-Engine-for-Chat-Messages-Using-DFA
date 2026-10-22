import React, { useEffect } from 'react';
import { useAppStore } from '../state/store';
import { TopBar } from './layout/TopBar';
import { TabNav } from './layout/TabNav';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { ConstructionLabPage } from './pages/ConstructionLabPage';
import { BenchmarksPage } from './pages/BenchmarksPage';
import { motion, AnimatePresence } from 'framer-motion';

export const App: React.FC = () => {
  const { currentTab, setCurrentTab } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in inputs/textareas
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key >= '1' && e.key <= '4') {
        const tabs: (typeof currentTab)[] = [
          'playground',
          'explorer',
          'construction',
          'benchmarks',
        ];
        const tab = tabs[parseInt(e.key, 10) - 1];
        if (tab) setCurrentTab(tab);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTab]);

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
            {currentTab === 'benchmarks' && <BenchmarksPage />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
