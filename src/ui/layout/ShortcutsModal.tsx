import React from 'react';
import { useAppStore } from '../../state/store';
import { X, Keyboard } from 'lucide-react';

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsOpen, setShortcutsOpen } = useAppStore();

  if (!isShortcutsOpen) return null;

  const shortcuts = [
    { key: 'Cmd/Ctrl + K', desc: 'Open command palette' },
    { key: '1 .. 7', desc: 'Switch navigation tabs' },
    { key: 'Space', desc: 'Play / Pause DFA trace player' },
    { key: 'Left / Right', desc: 'Step backward / forward in trace' },
    { key: '[ / ]', desc: 'Decrease / increase trace speed' },
    { key: 'T', desc: 'Toggle trace dock in Playground' },
    { key: '?', desc: 'Open keyboard shortcuts dialog' },
    { key: 'Esc', desc: 'Close dialogs / modals' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0E1424] border border-[#1F2A4A] rounded-xl shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F2A4A] mb-4">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5 text-[#7C5CFF]" />
            <h3 className="text-sm font-semibold text-[#E6EAF5]">Keyboard Shortcuts</h3>
          </div>
          <button onClick={() => setShortcutsOpen(false)} className="text-[#8A94B2] hover:text-[#E6EAF5]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1">
              <span className="text-[#8A94B2]">{item.desc}</span>
              <kbd className="px-2 py-1 bg-[#141C33] border border-[#1F2A4A] rounded font-mono text-[11px] text-[#22D3EE]">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
