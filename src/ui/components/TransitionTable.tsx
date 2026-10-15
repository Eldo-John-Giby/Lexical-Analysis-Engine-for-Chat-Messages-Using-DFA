import React from 'react';
import { DFA } from '../../engine/types';

interface TransitionTableProps {
  dfa: DFA;
  atomLabels: string[];
  activeState?: number | null;
  activeAtom?: number | null;
}

export const TransitionTable: React.FC<TransitionTableProps> = ({
  dfa,
  atomLabels,
  activeState,
  activeAtom,
}) => {
  return (
    <div className="bg-[#0E1424] border border-[#1F2A4A] rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
      <div className="px-4 py-2.5 bg-[#141C33]/70 border-b border-[#1F2A4A] flex items-center justify-between text-xs">
        <span className="font-semibold text-[#E6EAF5] uppercase tracking-wider">
          Transition Table Matrix ({dfa.numStates} states &times; {dfa.numAtoms} alphabet atoms)
        </span>
        <span className="text-[11px] text-[#8A94B2] font-mono">
          -1 = Dead State (Rejected)
        </span>
      </div>

      <div className="flex-1 overflow-auto max-h-[460px]">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead className="sticky top-0 bg-[#141C33] text-[#8A94B2] border-b border-[#1F2A4A] z-10">
            <tr>
              <th className="py-2 px-3 sticky left-0 bg-[#141C33] z-20 border-r border-[#1F2A4A]">
                State
              </th>
              <th className="py-2 px-2.5 border-r border-[#1F2A4A]">Accept</th>
              {Array.from({ length: dfa.numAtoms }).map((_, a) => (
                <th
                  key={a}
                  className={`py-2 px-2 text-center whitespace-nowrap min-w-[36px] ${
                    activeAtom === a ? 'bg-[#7C5CFF]/30 text-white' : ''
                  }`}
                  title={`Atom ${a}: ${atomLabels[a] || a}`}
                >
                  {atomLabels[a] || `a${a}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2A4A]/40 text-[11px]">
            {Array.from({ length: dfa.numStates }).map((_, s) => {
              const isAcc = dfa.acceptRule[s] !== undefined && dfa.acceptRule[s] !== -1;
              const ruleId = dfa.acceptRule[s];
              const isRowActive = activeState === s;

              return (
                <tr
                  key={s}
                  className={`transition-colors ${
                    isRowActive
                      ? 'bg-[#7C5CFF]/20 text-white font-bold'
                      : isAcc
                      ? 'bg-[#22D3EE]/5 hover:bg-[#141C33]'
                      : 'hover:bg-[#141C33]/50'
                  }`}
                >
                  <td
                    className={`py-1.5 px-3 sticky left-0 z-10 border-r border-[#1F2A4A] font-semibold ${
                      isRowActive ? 'bg-[#7C5CFF] text-white' : 'bg-[#0E1424] text-[#E6EAF5]'
                    }`}
                  >
                    q{s}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-[#1F2A4A] text-[#8A94B2]">
                    {isAcc ? (
                      <span className="px-1.5 py-0.2 rounded bg-[#22D3EE]/20 text-[#22D3EE] font-medium text-[10px]">
                        rule {ruleId}
                      </span>
                    ) : (
                      <span className="opacity-30">-</span>
                    )}
                  </td>
                  {Array.from({ length: dfa.numAtoms }).map((_, a) => {
                    const target = dfa.table[s * dfa.numAtoms + a]!;
                    const isCellActive = isRowActive && activeAtom === a;

                    return (
                      <td
                        key={a}
                        className={`py-1.5 px-2 text-center ${
                          isCellActive
                            ? 'bg-[#34D399] text-black font-extrabold ring-2 ring-white'
                            : target === -1
                            ? 'text-[#8A94B2]/30'
                            : 'text-[#E6EAF5]'
                        }`}
                      >
                        {target === -1 ? '—' : `q${target}`}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
