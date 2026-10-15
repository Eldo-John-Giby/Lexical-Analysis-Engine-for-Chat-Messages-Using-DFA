import React from 'react';
import { useAppStore } from '../../state/store';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export const ErrorsPanel: React.FC = () => {
  const { lexResult, setSelectedTokenIndex } = useAppStore();

  const errors = lexResult.errors;

  return (
    <div className="bg-[#0E1424] border border-[#1F2A4A] rounded-xl p-3.5 shadow-lg">
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#1F2A4A]">
        <div className="flex items-center space-x-2">
          {errors.length > 0 ? (
            <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
          ) : (
            <CheckCircle className="w-4 h-4 text-[#34D399]" />
          )}
          <span className="text-xs font-semibold text-[#E6EAF5] uppercase tracking-wider">
            Lexical Diagnostics & Errors ({errors.length})
          </span>
        </div>
        <span className="text-[10px] text-[#8A94B2] font-mono">
          Recovery: Panic Mode
        </span>
      </div>

      {errors.length === 0 ? (
        <div className="py-4 text-center text-xs text-[#34D399] flex items-center justify-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span>Zero lexical errors. Complete input accepted deterministically.</span>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {errors.map((err, idx) => (
            <div
              key={idx}
              onClick={() => {
                const tokenIdx = lexResult.tokens.indexOf(err);
                if (tokenIdx !== -1) setSelectedTokenIndex(tokenIdx);
              }}
              className="p-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start justify-between cursor-pointer hover:bg-[#EF4444]/20 transition-colors text-xs"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-[#EF4444]">{err.type}</span>
                  <span className="font-mono text-[#E6EAF5] bg-black/40 px-1.5 py-0.2 rounded">
                    {JSON.stringify(err.lexeme)}
                  </span>
                </div>
                <p className="text-[11px] text-[#8A94B2] mt-1">
                  {err.flags[0] || 'Unrecognized character or syntax'} &bull; Action: Panic-mode recovery skipped to next code point
                </p>
              </div>
              <span className="font-mono text-[11px] text-[#EF4444] whitespace-nowrap ml-2">
                {err.line}:{err.col}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
