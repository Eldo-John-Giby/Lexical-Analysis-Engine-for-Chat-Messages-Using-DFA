import React, { useState } from 'react';
import { useAppStore } from '../../state/store';
import { RuleDef, TokenKind } from '../../engine/types';
import { X, Plus, Trash2, RotateCcw, Sliders, Check, AlertCircle } from 'lucide-react';
import { DEFAULT_RULES } from '../../engine/lexer/rules';

export const RuleManagerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { rules, rebuildEngineWithRules } = useAppStore();
  const [editableRules, setEditableRules] = useState<RuleDef[]>(rules);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRuleChange = (index: number, field: keyof RuleDef, value: any) => {
    const updated = [...editableRules];
    updated[index] = { ...updated[index]!, [field]: value };
    setEditableRules(updated);
  };

  const handleAddRule = () => {
    const nextId = Math.max(...editableRules.map((r) => r.id), 0) + 1;
    const newRule: RuleDef = {
      id: nextId,
      name: 'CUSTOM_TOKEN',
      pattern: '[A-Za-z]+',
      kind: 'TEXT',
      color: '#A855F7',
      description: 'Custom user-defined token rule',
      examples: ['custom'],
    };
    setEditableRules([...editableRules, newRule]);
  };

  const handleDeleteRule = (index: number) => {
    if (editableRules.length <= 1) {
      setErrorMsg('Cannot delete the last remaining rule.');
      return;
    }
    const updated = editableRules.filter((_, i) => i !== index);
    setEditableRules(updated);
  };

  const handleApply = () => {
    try {
      setErrorMsg(null);
      rebuildEngineWithRules(editableRules);
      setSuccessMsg('DFA Master engine successfully rebuilt with custom rules!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to compile rules into DFA.');
    }
  };

  const handleReset = () => {
    setEditableRules(DEFAULT_RULES);
    rebuildEngineWithRules(DEFAULT_RULES);
    setSuccessMsg('Reset to 29 default chat specification rules.');
    setTimeout(() => setSuccessMsg(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-[#0E1424] border border-[#1F2A4A] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1F2A4A] flex items-center justify-between bg-[#141C33]/60">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-5 h-5 text-[#7C5CFF]" />
            <div>
              <h2 className="text-sm font-bold text-[#E6EAF5]">
                Custom Token Categories & Configurable Rules
              </h2>
              <p className="text-[11px] text-[#8A94B2]">
                Add, edit, or customize patterns. The engine will compile your rules into a new master DFA at runtime.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8A94B2] hover:text-[#E6EAF5]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback banners */}
        {errorMsg && (
          <div className="px-4 py-2 bg-[#EF4444]/15 border-b border-[#EF4444]/30 text-xs text-[#F87171] flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-4 py-2 bg-[#34D399]/15 border-b border-[#34D399]/30 text-xs text-[#34D399] flex items-center space-x-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Rule List Table */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="sticky top-0 bg-[#0E1424] text-[#8A94B2] font-semibold border-b border-[#1F2A4A] z-10">
              <tr>
                <th className="py-2 px-2 w-10">#</th>
                <th className="py-2 px-2 w-32">Token Name</th>
                <th className="py-2 px-2">Regex Pattern</th>
                <th className="py-2 px-2 w-28">Kind</th>
                <th className="py-2 px-2 w-20">Color</th>
                <th className="py-2 px-2 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2A4A]/40 font-mono text-xs">
              {editableRules.map((r, idx) => (
                <tr key={r.id} className="hover:bg-[#141C33]/40">
                  <td className="py-2 px-2 text-[#8A94B2]">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => handleRuleChange(idx, 'name', e.target.value)}
                      className="w-full bg-[#141C33] border border-[#1F2A4A] rounded px-2 py-1 text-xs text-[#E6EAF5] outline-none font-bold"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={r.pattern}
                      onChange={(e) => handleRuleChange(idx, 'pattern', e.target.value)}
                      className="w-full bg-[#141C33] border border-[#1F2A4A] rounded px-2 py-1 text-xs text-[#22D3EE] outline-none"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={r.kind}
                      onChange={(e) =>
                        handleRuleChange(idx, 'kind', e.target.value as TokenKind)
                      }
                      className="w-full bg-[#141C33] border border-[#1F2A4A] rounded px-2 py-1 text-xs text-[#E6EAF5] outline-none"
                    >
                      {['TEXT', 'ENTITY', 'EMOTIVE', 'NUMERIC', 'FORMAT', 'PUNCT', 'SPACE', 'ERROR'].map(
                        (k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        )
                      )}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="color"
                        value={r.color}
                        onChange={(e) => handleRuleChange(idx, 'color', e.target.value)}
                        className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <span className="text-[10px] text-[#8A94B2]">{r.color}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => handleDeleteRule(idx)}
                      className="p-1 rounded text-[#8A94B2] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-[#1F2A4A] bg-[#141C33]/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddRule}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141C33] hover:bg-[#1F2A4A] border border-[#1F2A4A] text-xs text-[#E6EAF5] transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Add Token Rule</span>
            </button>
            <button
              onClick={handleReset}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141C33] hover:bg-[#1F2A4A] border border-[#1F2A4A] text-xs text-[#8A94B2] hover:text-[#E6EAF5] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-[#1F2A4A] text-xs text-[#8A94B2] hover:text-[#E6EAF5]"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg bg-[#7C5CFF] hover:bg-[#6846FF] text-white text-xs font-semibold shadow-md shadow-[#7C5CFF]/30 transition-all flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Rebuild DFA Engine</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
