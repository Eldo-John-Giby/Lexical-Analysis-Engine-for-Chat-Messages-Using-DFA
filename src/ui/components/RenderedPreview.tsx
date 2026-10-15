import React from 'react';
import { useAppStore } from '../../state/store';
import { Sparkles } from 'lucide-react';

export const RenderedPreview: React.FC = () => {
  const { lexResult, setSelectedTokenIndex } = useAppStore();

  const renderToken = (token: typeof lexResult.tokens[0], idx: number) => {
    switch (token.type) {
      case 'MENTION':
        return (
          <span
            key={idx}
            onClick={() => setSelectedTokenIndex(idx)}
            className="inline-block px-1.5 py-0.5 mx-0.5 rounded bg-[#60A5FA]/20 text-[#60A5FA] font-medium text-xs cursor-pointer hover:bg-[#60A5FA]/30 transition-colors"
          >
            {token.lexeme}
          </span>
        );
      case 'HASHTAG':
        return (
          <span
            key={idx}
            onClick={() => setSelectedTokenIndex(idx)}
            className="inline-block px-1 py-0.5 mx-0.5 rounded text-[#A78BFA] font-medium text-xs cursor-pointer hover:underline"
          >
            {token.lexeme}
          </span>
        );
      case 'URL':
        return (
          <span
            key={idx}
            onClick={() => setSelectedTokenIndex(idx)}
            className="text-[#22D3EE] underline decoration-[#22D3EE]/50 hover:decoration-[#22D3EE] cursor-pointer"
          >
            {token.lexeme}
          </span>
        );
      case 'EMAIL':
        return (
          <span
            key={idx}
            onClick={() => setSelectedTokenIndex(idx)}
            className="text-[#2DD4BF] underline decoration-[#2DD4BF]/50 cursor-pointer"
          >
            {token.lexeme}
          </span>
        );
      case 'COMMAND':
        return (
          <span
            key={idx}
            onClick={() => setSelectedTokenIndex(idx)}
            className="inline-block px-1.5 py-0.5 rounded bg-[#F472B6]/20 text-[#F472B6] font-mono text-xs cursor-pointer"
          >
            {token.lexeme}
          </span>
        );
      case 'BOLD': {
        const inner = token.lexeme.slice(1, -1);
        return (
          <strong
            key={idx}
            onClick={() => setSelectedTokenIndex(idx)}
            className="font-bold text-[#E6EAF5] cursor-pointer hover:opacity-80"
          >
            {inner}
          </strong>
        );
      }
      case 'ITALIC': {
        const inner = token.lexeme.slice(1, -1);
        return (
          <em
            key={idx}
            onClick={() => setSelectedTokenIndex(idx)}
            className="italic text-[#E6EAF5] cursor-pointer hover:opacity-80"
          >
            {inner}
          </em>
        );
      }
      case 'STRIKE': {
        const inner = token.lexeme.slice(1, -1);
        return (
          <s
            key={idx}
            onClick={() => setSelectedTokenIndex(idx)}
            className="line-through text-[#8A94B2] cursor-pointer hover:opacity-80"
          >
            {inner}
          </s>
        );
      }
      case 'CODE_SPAN': {
        const inner = token.lexeme.slice(1, -1);
        return (
          <code
            key={idx}
            onClick={() => setSelectedTokenIndex(idx)}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-[#141C33] border border-[#1F2A4A] text-[#38BDF8] font-mono text-xs cursor-pointer"
          >
            {inner}
          </code>
        );
      }
      case 'EMOJI':
        return (
          <span
            key={idx}
            onClick={() => setSelectedTokenIndex(idx)}
            className="text-base mx-0.5 cursor-pointer inline-block transform hover:scale-125 transition-transform"
          >
            {token.lexeme}
          </span>
        );
      case 'NEWLINE':
        return <br key={idx} />;
      default:
        return (
          <span
            key={idx}
            onClick={() => setSelectedTokenIndex(idx)}
            className="cursor-pointer hover:bg-white/5 rounded px-0.5 transition-colors"
          >
            {token.lexeme}
          </span>
        );
    }
  };

  return (
    <div className="bg-[#0E1424] border border-[#1F2A4A] rounded-xl p-4 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1F2A4A]">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[#22D3EE]" />
          <span className="text-xs font-semibold text-[#E6EAF5] uppercase tracking-wider">
            Rendered Chat Preview (Discord / Slack style)
          </span>
        </div>
        <span className="text-[10px] text-[#8A94B2]">Derived purely from DFA token stream</span>
      </div>

      <div className="p-4 rounded-xl bg-[#141C33]/60 border border-[#1F2A4A] text-sm leading-relaxed text-[#E6EAF5] min-h-[140px] whitespace-pre-wrap break-words">
        {lexResult.tokens.map(renderToken)}
      </div>
    </div>
  );
};
