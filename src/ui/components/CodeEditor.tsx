import React, { useRef, useState } from 'react';
import { useAppStore } from '../../state/store';
import { Token } from '../../engine/types';

export const CodeEditor: React.FC = () => {
  const {
    playgroundText,
    setPlaygroundText,
    lexResult,
    selectedTokenIndex,
    setSelectedTokenIndex,
    engine,
  } = useAppStore();

  const [hoveredToken, setHoveredToken] = useState<{
    token: Token;
    x: number;
    y: number;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && containerRef.current) {
      const mirror = containerRef.current.querySelector('.mirror-layer');
      if (mirror) {
        mirror.scrollTop = textareaRef.current.scrollTop;
        mirror.scrollLeft = textareaRef.current.scrollLeft;
      }
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-[#0E1424] border border-[#1F2A4A] rounded-xl overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1F2A4A] bg-[#141C33]/60 text-xs text-[#8A94B2]">
        <span className="font-mono font-medium text-[#E6EAF5]">Live Lexer Input</span>
        <div className="flex items-center space-x-3">
          <span>{playgroundText.length} chars</span>
          <span>{lexResult.tokens.length} tokens</span>
        </div>
      </div>

      <div ref={containerRef} className="relative flex-1 min-h-[220px] font-mono text-sm">
        {/* Mirror div overlay */}
        <div
          aria-hidden="true"
          className="mirror-layer absolute inset-0 p-4 pointer-events-none whitespace-pre-wrap break-words overflow-auto leading-relaxed"
          style={{ fontKerning: 'none' }}
        >
          {lexResult.tokens.map((token, idx) => {
            const isSelected = selectedTokenIndex === idx;
            const isError = token.kind === 'ERROR';

            return (
              <span
                key={idx}
                style={{
                  backgroundColor: isSelected
                    ? 'rgba(124, 92, 255, 0.45)'
                    : isError
                    ? 'rgba(239, 68, 68, 0.25)'
                    : 'transparent',
                  borderBottom: isError
                    ? '2px wavy #EF4444'
                    : isSelected
                    ? '2px solid #7C5CFF'
                    : 'none',
                  color: isSelected ? '#FFFFFF' : 'transparent',
                }}
                className={`transition-colors duration-100 rounded-sm ${
                  isSelected ? 'ring-1 ring-[#7C5CFF]' : ''
                }`}
              >
                {token.lexeme}
              </span>
            );
          })}
        </div>

        {/* Real transparent Textarea */}
        <textarea
          ref={textareaRef}
          value={playgroundText}
          onChange={(e) => setPlaygroundText(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          className="absolute inset-0 p-4 bg-transparent text-[#E6EAF5] caret-[#22D3EE] outline-none resize-none whitespace-pre-wrap break-words overflow-auto leading-relaxed z-10 selection:bg-[#7C5CFF]/40"
          placeholder="Type or paste informal chat text here..."
        />
      </div>

      {/* Floating Hover Tooltip if token selected */}
      {selectedTokenIndex !== null && lexResult.tokens[selectedTokenIndex] && (
        <div className="px-4 py-2 bg-[#141C33] border-t border-[#1F2A4A] flex items-center justify-between text-xs">
          {(() => {
            const token = lexResult.tokens[selectedTokenIndex]!;
            const rule = engine.rules[token.ruleId];
            return (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#7C5CFF]">{token.type}</span>
                <span className="text-[#8A94B2] font-mono">[{token.start}..{token.end}]</span>
                <span className="text-[#8A94B2]">line {token.line}:{token.col}</span>
                {rule && (
                  <span className="px-1.5 py-0.5 rounded bg-[#0E1424] text-[11px] font-mono text-[#22D3EE]">
                    pattern: {rule.pattern}
                  </span>
                )}
                {token.flags.length > 0 && (
                  <div className="flex items-center gap-1">
                    {token.flags.map((f, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded-full bg-[#7C5CFF]/20 text-[#A78BFA] text-[10px] font-medium">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          <button
            onClick={() => setSelectedTokenIndex(null)}
            className="text-[11px] text-[#8A94B2] hover:text-[#E6EAF5] underline ml-2"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
