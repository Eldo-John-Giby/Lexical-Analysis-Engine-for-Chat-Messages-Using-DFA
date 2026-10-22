import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../state/store';
import { Search, Copy, Check } from 'lucide-react';

export const TokenTable: React.FC = () => {
  const { lexResult, selectedTokenIndex, setSelectedTokenIndex, engine } = useAppStore();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const rulesMap = useMemo(() => new Map(engine.rules.map((r) => [r.name, r])), [engine.rules]);

  const uniqueTypes = useMemo(() => {
    const s = new Set<string>();
    lexResult.tokens.forEach((t) => s.add(t.type));
    return Array.from(s).sort();
  }, [lexResult.tokens]);

  const filteredTokens = useMemo(() => {
    return lexResult.tokens
      .map((t, idx) => ({ ...t, originalIndex: idx }))
      .filter((t) => {
        if (filterType !== 'ALL' && t.type !== filterType) return false;
        if (search && !t.lexeme.toLowerCase().includes(search.toLowerCase()) && !t.type.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        return true;
      });
  }, [lexResult.tokens, filterType, search]);

  const copyAsJson = () => {
    navigator.clipboard.writeText(JSON.stringify(lexResult.tokens, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0E1424] border border-[#1F2A4A] rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
      {/* Controls Bar */}
      <div className="p-3 border-b border-[#1F2A4A] bg-[#141C33]/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#8A94B2] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search token type or lexeme..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0E1424] border border-[#1F2A4A] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#E6EAF5] placeholder-[#8A94B2] outline-none focus:border-[#7C5CFF]"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0E1424] border border-[#1F2A4A] text-xs text-[#E6EAF5] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7C5CFF]"
          >
            <option value="ALL">All Types ({lexResult.tokens.length})</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={copyAsJson}
            className="flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#0E1424] hover:bg-[#1F2A4A] border border-[#1F2A4A] text-[#8A94B2] hover:text-[#E6EAF5] transition-colors"
            title="Copy tokens as JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Tokens</span>
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="flex-1 overflow-auto max-h-[340px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-[#141C33] text-[#8A94B2] font-semibold border-b border-[#1F2A4A] z-10">
            <tr>
              <th className="py-2 px-3 w-10">#</th>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Lexeme</th>
              <th className="py-2 px-3">Line:Col</th>
              <th className="py-2 px-3">Length</th>
              <th className="py-2 px-3">Flags</th>
              <th className="py-2 px-3">Rule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2A4A]/50 font-mono">
            {filteredTokens.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[#8A94B2] text-xs">
                  No matching tokens found.
                </td>
              </tr>
            ) : (
              filteredTokens.map((token) => {
                const isSelected = selectedTokenIndex === token.originalIndex;
                const rule = rulesMap.get(token.type);
                const color = rule?.color || '#94A3B8';

                return (
                  <tr
                    key={token.originalIndex}
                    onClick={() =>
                      setSelectedTokenIndex(
                        isSelected ? null : token.originalIndex
                      )
                    }
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#7C5CFF]/20 text-white font-semibold'
                        : 'hover:bg-[#141C33]/60 text-[#E6EAF5]'
                    }`}
                  >
                    <td className="py-1.5 px-3 text-[#8A94B2]">
                      {token.originalIndex + 1}
                    </td>
                    <td className="py-1.5 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-semibold"
                        style={{
                          backgroundColor: `${color}25`,
                          color,
                          border: `1px solid ${color}40`,
                        }}
                      >
                        {token.type}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 max-w-[200px] truncate">
                      {JSON.stringify(token.lexeme)}
                    </td>
                    <td className="py-1.5 px-3 text-[#8A94B2]">
                      {token.line}:{token.col}
                    </td>
                    <td className="py-1.5 px-3 text-[#8A94B2]">
                      {token.lexeme.length}
                    </td>
                    <td className="py-1.5 px-3">
                      {token.flags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {token.flags.map((f, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.2 rounded bg-[#7C5CFF]/20 text-[#A78BFA] text-[10px]"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#8A94B2] opacity-40">-</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-[#8A94B2]">
                      q_r{token.ruleId}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
