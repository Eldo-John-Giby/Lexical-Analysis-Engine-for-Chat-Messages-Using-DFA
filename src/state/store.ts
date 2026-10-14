import { create } from 'zustand';

export type TabType = 
  | 'playground' 
  | 'explorer' 
  | 'construction' 
  | 'chat' 
  | 'analytics' 
  | 'benchmarks' 
  | 'theory';

interface AppState {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isShortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  playgroundText: string;
  setPlaygroundText: (text: string) => void;
  selectedTokenIndex: number | null;
  setSelectedTokenIndex: (index: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentTab: 'playground',
  setCurrentTab: (tab) => set({ currentTab: tab }),
  theme: 'dark',
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        if (nextTheme === 'light') {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('dark');
        }
      }
      return { theme: nextTheme };
    }),
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  isShortcutsOpen: false,
  setShortcutsOpen: (open) => set({ isShortcutsOpen: open }),
  playgroundText: 'hey @eldo check https://vit.ac.in/x. now!!! meet at 5:30pm tmrw loooool :) <3 #ProjectDay2026',
  setPlaygroundText: (text) => set({ playgroundText: text, selectedTokenIndex: null }),
  selectedTokenIndex: null,
  setSelectedTokenIndex: (index) => set({ selectedTokenIndex: index }),
}));
