import { create } from 'zustand';
import { buildEngine, Engine, LexResult, RuleDef, DEFAULT_RULES } from '../engine/index';
import { PRESETS } from '../data/presets';

export type TabType =
  | 'playground'
  | 'explorer'
  | 'construction'
  | 'benchmarks';

interface AppState {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Engine instance & rules
  engine: Engine;
  rules: RuleDef[];

  // Playground state
  playgroundText: string;
  setPlaygroundText: (text: string) => void;
  lexResult: LexResult;
  selectedTokenIndex: number | null;
  setSelectedTokenIndex: (index: number | null) => void;
  isTraceDockOpen: boolean;
  setTraceDockOpen: (open: boolean) => void;
  activePresetId: string;
  loadPreset: (id: string) => void;

  // Trace player state
  currentTraceEventIndex: number;
  setCurrentTraceEventIndex: (index: number) => void;
  traceSpeed: number;
  setTraceSpeed: (speed: number) => void;
  isPlayingTrace: boolean;
  setIsPlayingTrace: (playing: boolean) => void;
}

const defaultEngine = buildEngine(DEFAULT_RULES);
const initialText = 'hey @eldo check https://vit.ac.in/x. now!!! meet at 5:30pm tmrw loooool :) <3 #ProjectDay2026';
const initialResult = defaultEngine.lex(initialText, { trace: true });

export const useAppStore = create<AppState>((set, get) => ({
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

  engine: defaultEngine,
  rules: DEFAULT_RULES,

  playgroundText: initialText,
  setPlaygroundText: (text) => {
    const { engine } = get();
    const res = engine.lex(text, { trace: true });
    set({
      playgroundText: text,
      lexResult: res,
      selectedTokenIndex: null,
      currentTraceEventIndex: 0,
      isPlayingTrace: false,
    });
  },
  lexResult: initialResult,
  selectedTokenIndex: null,
  setSelectedTokenIndex: (index) => {
    set({ selectedTokenIndex: index });
    if (index !== null) {
      // Find beginning trace event for this token
      const token = get().lexResult.tokens[index];
      if (token && get().lexResult.trace) {
        const evIdx = get().lexResult.trace!.findIndex(
          (e) => e.t === 'begin' && e.pos === token.start
        );
        if (evIdx !== -1) {
          set({ currentTraceEventIndex: evIdx });
        }
      }
    }
  },
  isTraceDockOpen: true,
  setTraceDockOpen: (open) => set({ isTraceDockOpen: open }),
  activePresetId: 'hackathon',
  loadPreset: (id) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (preset) {
      get().setPlaygroundText(preset.text);
      set({ activePresetId: id });
    }
  },

  currentTraceEventIndex: 0,
  setCurrentTraceEventIndex: (index) => set({ currentTraceEventIndex: index }),
  traceSpeed: 1,
  setTraceSpeed: (speed) => set({ traceSpeed: speed }),
  isPlayingTrace: false,
  setIsPlayingTrace: (playing) => set({ isPlayingTrace: playing }),
}));
