import React, { useState } from 'react';
import { useAppStore } from '../../state/store';
import { PRESETS } from '../../data/presets';
import { CodeEditor } from '../components/CodeEditor';
import { TokenChips } from '../components/TokenChips';
import { TokenTable } from '../components/TokenTable';
import { SymbolTablePanel } from '../components/SymbolTablePanel';
import { ErrorsPanel } from '../components/ErrorsPanel';
import { RenderedPreview } from '../components/RenderedPreview';
import { TracePlayer } from '../components/TracePlayer';
import { Sparkles, Dices, Layers, Table2, Database, AlertCircle } from 'lucide-react';

export const PlaygroundPage: React.FC = () => {
  const {
    activePresetId,
    loadPreset,
    setPlaygroundText,
    isTraceDockOpen,
    setTraceDockOpen,
  } = useAppStore();

  const [activeRightTab, setActiveRightTab] = useState<'table' | 'symbols' | 'preview' | 'errors'>('table');

  const handleRandomize = () => {
    const templates = [
      'yo @channel check https://github.com/vit/repo.git ASAP! meeting at 4:30pm #ProjectDay2026 🔥',
      'selling brand new iPhone price ~₹75,000~ ₹62,000! Contact +91 9123456789 or mail sales@vit.ac.in',
      'Run `npm test` before 11:59pm! We are 90% done with the 2nd module :thumbsup: *urgent*',
      'brooo THAT was insaneeee lol <3 :D did you finish before 5pm??',
      'नमस्ते दोस्त, kal 10am pe milte hain 🔥 வணக்கம் #VIT',
    ];
    const picked = templates[Math.floor(Math.random() * templates.length)]!;
    setPlaygroundText(picked);
  };

  return (
    <div className="p-4 max-w-[1600px] mx-auto flex flex-col space-y-4">
      {/* Preset & Quick Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] border border-[#1F2A4A] p-2.5 rounded-xl">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[#7C5CFF]" />
          <span className="text-xs font-semibold text-[#E6EAF5]">Preset Chats:</span>
          <select
            value={activePresetId}
            onChange={(e) => loadPreset(e.target.value)}
            className="bg-[#141C33] border border-[#1F2A4A] text-xs text-[#E6EAF5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7C5CFF]"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRandomize}
            className="flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#141C33] hover:bg-[#1F2A4A] border border-[#1F2A4A] text-[#8A94B2] hover:text-[#E6EAF5] transition-colors"
          >
            <Dices className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>Randomize Message</span>
          </button>

          <button
            onClick={() => setTraceDockOpen(!isTraceDockOpen)}
            className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
              isTraceDockOpen
                ? 'bg-[#7C5CFF]/20 border-[#7C5CFF] text-[#E6EAF5]'
                : 'bg-[#141C33] border-[#1F2A4A] text-[#8A94B2] hover:text-[#E6EAF5]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#7C5CFF]" />
            <span>{isTraceDockOpen ? 'Hide Trace Dock' : 'Show Trace Dock'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Editor & Token Chips */}
        <div className="flex flex-col space-y-4">
          <div className="h-[280px]">
            <CodeEditor />
          </div>
          <TokenChips />
        </div>

        {/* Right Column: Tabbed View (Table, Symbol Table, Preview, Errors) */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-1 border-b border-[#1F2A4A] pb-1">
            <button
              onClick={() => setActiveRightTab('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeRightTab === 'table'
                  ? 'bg-[#141C33] text-[#E6EAF5] border border-[#1F2A4A]'
                  : 'text-[#8A94B2] hover:text-[#E6EAF5]'
              }`}
            >
              <Table2 className="w-3.5 h-3.5 text-[#7C5CFF]" />
              <span>Token Table</span>
            </button>
            <button
              onClick={() => setActiveRightTab('symbols')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeRightTab === 'symbols'
                  ? 'bg-[#141C33] text-[#E6EAF5] border border-[#1F2A4A]'
                  : 'text-[#8A94B2] hover:text-[#E6EAF5]'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>Symbol Table</span>
            </button>
            <button
              onClick={() => setActiveRightTab('preview')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeRightTab === 'preview'
                  ? 'bg-[#141C33] text-[#E6EAF5] border border-[#1F2A4A]'
                  : 'text-[#8A94B2] hover:text-[#E6EAF5]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />
              <span>Rendered Preview</span>
            </button>
            <button
              onClick={() => setActiveRightTab('errors')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeRightTab === 'errors'
                  ? 'bg-[#141C33] text-[#E6EAF5] border border-[#1F2A4A]'
                  : 'text-[#8A94B2] hover:text-[#E6EAF5]'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>Diagnostics</span>
            </button>
          </div>

          <div className="flex-1 min-h-[380px]">
            {activeRightTab === 'table' && <TokenTable />}
            {activeRightTab === 'symbols' && <SymbolTablePanel />}
            {activeRightTab === 'preview' && <RenderedPreview />}
            {activeRightTab === 'errors' && <ErrorsPanel />}
          </div>
        </div>
      </div>

      {/* Trace Player Dock */}
      {isTraceDockOpen && (
        <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <TracePlayer />
        </div>
      )}
    </div>
  );
};
