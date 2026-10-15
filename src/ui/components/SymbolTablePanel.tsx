import React from 'react';
import { useAppStore } from '../../state/store';
import { Database, Hash, AtSign, Globe, Mail, Terminal, Smile } from 'lucide-react';

export const SymbolTablePanel: React.FC = () => {
  const { lexResult, setSelectedTokenIndex } = useAppStore();

  const symbols = Array.from(lexResult.symbols.values());

  const getIcon = (type: string) => {
    switch (type) {
      case 'MENTION':
        return <AtSign className="w-3.5 h-3.5 text-[#60A5FA]" />;
      case 'HASHTAG':
        return <Hash className="w-3.5 h-3.5 text-[#A78BFA]" />;
      case 'URL':
        return <Globe className="w-3.5 h-3.5 text-[#22D3EE]" />;
      case 'EMAIL':
        return <Mail className="w-3.5 h-3.5 text-[#2DD4BF]" />;
      case 'COMMAND':
        return <Terminal className="w-3.5 h-3.5 text-[#F472B6]" />;
      case 'SHORTCODE':
        return <Smile className="w-3.5 h-3.5 text-[#F59E0B]" />;
      default:
        return <Database className="w-3.5 h-3.5 text-[#7C5CFF]" />;
    }
  };

  const handleSymbolClick = (lexeme: string) => {
    const idx = lexResult.tokens.findIndex((t) => t.lexeme === lexeme);
    if (idx !== -1) {
      setSelectedTokenIndex(idx);
    }
  };

  return (
    <div className="bg-[#0E1424] border border-[#1F2A4A] rounded-xl p-3.5 shadow-lg">
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#1F2A4A]">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-[#7C5CFF]" />
          <span className="text-xs font-semibold text-[#E6EAF5] uppercase tracking-wider">
            Compiler Symbol Table ({symbols.length})
          </span>
        </div>
        <span className="text-[10px] text-[#8A94B2] font-mono">Scope: Chat Context</span>
      </div>

      {symbols.length === 0 ? (
        <div className="py-6 text-center text-xs text-[#8A94B2]">
          No symbols extracted (mentions, hashtags, links, commands).
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {symbols.map((sym, idx) => (
            <div
              key={idx}
              onClick={() => handleSymbolClick(sym.lexeme)}
              className="flex items-center justify-between p-2 rounded-lg bg-[#141C33]/50 hover:bg-[#141C33] border border-[#1F2A4A] cursor-pointer transition-colors text-xs"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                {getIcon(sym.type)}
                <span className="font-mono text-[#E6EAF5] truncate max-w-[180px]">
                  {sym.lexeme}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0E1424] text-[#8A94B2] uppercase">
                  {sym.type}
                </span>
              </div>

              <div className="flex items-center space-x-3 text-[11px] text-[#8A94B2]">
                <span>x{sym.count}</span>
                <span className="font-mono">
                  {sym.firstPos.line}:{sym.firstPos.col}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
