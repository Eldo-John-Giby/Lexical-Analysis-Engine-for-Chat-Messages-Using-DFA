import React from 'react';
import { useAppStore } from '../../state/store';
import { motion } from 'framer-motion';

export const TokenChips: React.FC = () => {
  const { lexResult, selectedTokenIndex, setSelectedTokenIndex, engine } = useAppStore();

  const rulesMap = new Map(engine.rules.map((r) => [r.name, r]));

  return (
    <div className="bg-[#0E1424] border border-[#1F2A4A] rounded-xl p-3.5 shadow-lg">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-[#E6EAF5] uppercase tracking-wider">
          Token Stream ({lexResult.tokens.length})
        </span>
        <span className="text-[11px] text-[#8A94B2]">Click a chip to trace or inspect</span>
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
        {lexResult.tokens.map((token, idx) => {
          const isSelected = selectedTokenIndex === idx;
          const rule = rulesMap.get(token.type);
          const color = rule?.color || '#94A3B8';
          const isError = token.kind === 'ERROR';

          return (
            <motion.button
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, delay: Math.min(idx * 0.005, 0.3) }}
              onClick={() => setSelectedTokenIndex(isSelected ? null : idx)}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs font-mono transition-all ${
                isSelected
                  ? 'ring-2 ring-white scale-105 z-10'
                  : 'hover:opacity-90 hover:scale-[1.02]'
              }`}
              style={{
                backgroundColor: isSelected ? color : `${color}20`,
                border: `1px solid ${color}60`,
                color: isSelected ? '#000000' : '#E6EAF5',
              }}
              title={`${token.type} | "${token.lexeme}" | Line ${token.line}:${token.col}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-semibold text-[11px] opacity-90">{token.type}</span>
              <span className="opacity-75 max-w-[120px] truncate">
                {JSON.stringify(token.lexeme)}
              </span>
              {token.flags.length > 0 && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/30 font-sans">
                  {token.flags[0]}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
