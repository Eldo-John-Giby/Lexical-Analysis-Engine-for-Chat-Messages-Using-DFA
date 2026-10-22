import React, { useState, useMemo } from 'react';
import { parseRegex } from '../../engine/regex/parser';
import { buildThompsonNFA } from '../../engine/nfa/thompson';
import { subsetConstruction } from '../../engine/dfa/subset';
import { minimizeMoore } from '../../engine/dfa/minimize-moore';
import { minimizeHopcroft } from '../../engine/dfa/minimize-hopcroft';
import { simulateNFA } from '../../engine/nfa/simulate';
import { matchFull } from '../../engine/dfa/table';
import { buildClassifierForAST } from '../../engine/charclass';
import { prettyPrintRegex } from '../../engine/regex/pretty';
import {
  GitBranch,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

export const ConstructionLabPage: React.FC = () => {
  const [regexInput, setRegexInput] = useState<string>('(a|b)*abb');
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [testString, setTestString] = useState<string>('ababb');

  // Parse regex and build isolated automata pipeline
  const pipeline = useMemo(() => {
    try {
      const ast = parseRegex(regexInput);
      const classifier = buildClassifierForAST(ast);
      const { nfa, logs: thompsonLogs } = buildThompsonNFA(ast, classifier, 0);
      const { dfa: rawDfa, logs: subsetLogs } = subsetConstruction(nfa, classifier.numAtoms);
      const { dfa: minDfa, rounds: mooreRounds } = minimizeMoore(rawDfa);
      const hopcroftDfa = minimizeHopcroft(rawDfa);

      return {
        ast,
        classifier,
        nfa,
        thompsonLogs,
        rawDfa,
        subsetLogs,
        minDfa,
        hopcroftDfa,
        mooreRounds,
        error: null,
      };
    } catch (e: any) {
      return {
        ast: null,
        classifier: null,
        nfa: null,
        thompsonLogs: [],
        rawDfa: null,
        subsetLogs: [],
        minDfa: null,
        hopcroftDfa: null,
        mooreRounds: [],
        error: e.message || 'Invalid regular expression',
      };
    }
  }, [regexInput]);

  // Simulation results
  const simResult = useMemo(() => {
    if (!pipeline.nfa || !pipeline.minDfa || !pipeline.classifier) return null;
    const nfaAccepts = simulateNFA(pipeline.nfa, testString, pipeline.classifier);
    const dfaAccepts = matchFull(pipeline.minDfa, testString, pipeline.classifier);
    return { nfaAccepts, dfaAccepts };
  }, [pipeline, testString]);

  return (
    <div className="p-4 max-w-[1600px] mx-auto flex flex-col space-y-4">
      {/* Top Input & Step Navigation */}
      <div className="bg-[#0E1424] border border-[#1F2A4A] p-4 rounded-xl shadow-lg flex flex-col space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-[#7C5CFF]" />
            <h2 className="text-sm font-bold text-[#E6EAF5]">
              Compiler Construction Lab: Regex &rarr; NFA &rarr; DFA &rarr; Minimized DFA
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#8A94B2]">Presets:</span>
            {['(a|b)*abb', 'a*b*', '<L>(<L>|<D>)*', '0(0|1)*1'].map((preset) => (
              <button
                key={preset}
                onClick={() => setRegexInput(preset)}
                className="px-2 py-1 rounded bg-[#141C33] hover:bg-[#1F2A4A] text-[11px] font-mono text-[#22D3EE] border border-[#1F2A4A] transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Live Regex Input */}
        <div className="relative">
          <input
            type="text"
            value={regexInput}
            onChange={(e) => setRegexInput(e.target.value)}
            className="w-full bg-[#141C33] border border-[#1F2A4A] rounded-lg px-3.5 py-2.5 font-mono text-sm text-[#E6EAF5] placeholder-[#8A94B2] outline-none focus:border-[#7C5CFF]"
            placeholder="Type regular expression (e.g. (a|b)*abb or <D>+)..."
          />
          {pipeline.error && (
            <div className="mt-2 text-xs text-[#EF4444] flex items-center space-x-1.5 bg-[#EF4444]/10 p-2 rounded-lg border border-[#EF4444]/30">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{pipeline.error}</span>
            </div>
          )}
        </div>

        {/* 5-Step Pipeline Tabs */}
        <div className="grid grid-cols-5 gap-2 pt-2 border-t border-[#1F2A4A]">
          {[
            { step: 1, title: '1. Regex &rarr; AST', desc: 'Grammar Tree' },
            { step: 2, title: '2. AST &rarr; NFA', desc: 'Thompson Fragments' },
            { step: 3, title: '3. NFA &rarr; DFA', desc: 'Subset Construction' },
            { step: 4, title: '4. Minimization', desc: 'Moore Partitions' },
            { step: 5, title: '5. Run & Compare', desc: 'NFA vs DFA Dual Sim' },
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => setActiveStep(item.step as any)}
              className={`p-2.5 rounded-lg text-left transition-all border ${
                activeStep === item.step
                  ? 'bg-[#7C5CFF]/20 border-[#7C5CFF] shadow-md shadow-[#7C5CFF]/20'
                  : 'bg-[#141C33]/50 border-transparent hover:bg-[#141C33] text-[#8A94B2]'
              }`}
            >
              <div
                className={`text-xs font-semibold ${
                  activeStep === item.step ? 'text-[#E6EAF5]' : 'text-[#8A94B2]'
                }`}
                dangerouslySetInnerHTML={{ __html: item.title }}
              />
              <div className="text-[10px] text-[#8A94B2] mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {pipeline.error ? (
        <div className="p-8 text-center bg-[#0E1424] border border-[#1F2A4A] rounded-xl text-sm text-[#8A94B2]">
          Please fix the regular expression above to view the compiler stages.
        </div>
      ) : (
        <div className="bg-[#0E1424] border border-[#1F2A4A] rounded-xl p-5 shadow-xl min-h-[460px]">
          {/* STEP 1: AST */}
          {activeStep === 1 && pipeline.ast && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2A4A]">
                <div>
                  <h3 className="text-sm font-bold text-[#E6EAF5]">
                    Abstract Syntax Tree (AST) Representation
                  </h3>
                  <p className="text-xs text-[#8A94B2] mt-0.5">
                    Recursive descent parser generated tree from the regular expression.
                  </p>
                </div>
                <span className="text-xs font-mono text-[#22D3EE] bg-[#141C33] px-2.5 py-1 rounded-lg border border-[#1F2A4A]">
                  Pretty AST: {prettyPrintRegex(pipeline.ast)}
                </span>
              </div>

              <div className="p-4 bg-[#070A12] border border-[#1F2A4A] rounded-xl overflow-auto max-h-[380px] font-mono text-xs text-[#E6EAF5] leading-relaxed">
                <pre>{JSON.stringify(pipeline.ast, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* STEP 2: Thompson NFA */}
          {activeStep === 2 && pipeline.nfa && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2A4A]">
                <div>
                  <h3 className="text-sm font-bold text-[#E6EAF5]">
                    Thompson NFA Construction Fragments ({pipeline.nfa.numStates} States)
                  </h3>
                  <p className="text-xs text-[#8A94B2] mt-0.5">
                    Inductive construction with epsilon edges linking sub-expressions.
                  </p>
                </div>
                <span className="text-xs font-mono text-[#34D399] bg-[#141C33] px-2.5 py-1 rounded-lg border border-[#1F2A4A]">
                  Start: q{pipeline.nfa.start} &bull; Accepts: {Array.from(pipeline.nfa.accept.keys()).map((s) => `q${s}`).join(', ')}
                </span>
              </div>

              <div className="overflow-auto max-h-[380px]">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="sticky top-0 bg-[#141C33] text-[#8A94B2] border-b border-[#1F2A4A]">
                    <tr>
                      <th className="p-2.5">Step</th>
                      <th className="p-2.5">Operation</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Created States</th>
                      <th className="p-2.5">&epsilon;-Transitions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2A4A]/50">
                    {pipeline.thompsonLogs.map((log) => (
                      <tr key={log.step} className="hover:bg-[#141C33]/50">
                        <td className="p-2.5 text-[#8A94B2]">#{log.step}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-[#7C5CFF]/20 text-[#A78BFA] font-semibold text-[11px]">
                            {log.op}
                          </span>
                        </td>
                        <td className="p-2.5 text-[#E6EAF5]">{log.description}</td>
                        <td className="p-2.5 text-[#22D3EE]">
                          {log.createdStates.map((s) => `q${s}`).join(', ') || '-'}
                        </td>
                        <td className="p-2.5 text-[#8A94B2]">
                          {log.epsilonEdges.map(([u, v]) => `q${u} &rarr; q${v}`).join('; ') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Subset Construction Table */}
          {activeStep === 3 && pipeline.subsetLogs && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2A4A]">
                <div>
                  <h3 className="text-sm font-bold text-[#E6EAF5]">
                    Subset Construction Step Table (Worklist Algorithm)
                  </h3>
                  <p className="text-xs text-[#8A94B2] mt-0.5">
                    Each DFA state represents an &epsilon;-closure subset of NFA states.
                  </p>
                </div>
                <span className="text-xs font-mono text-[#FBBF24] bg-[#141C33] px-2.5 py-1 rounded-lg border border-[#1F2A4A]">
                  DFA States Generated: {pipeline.rawDfa?.numStates}
                </span>
              </div>

              <div className="overflow-auto max-h-[380px]">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="sticky top-0 bg-[#141C33] text-[#8A94B2] border-b border-[#1F2A4A]">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Source DFA State</th>
                      <th className="p-2.5">NFA Subset T</th>
                      <th className="p-2.5">Input Symbol</th>
                      <th className="p-2.5">move(T, a)</th>
                      <th className="p-2.5">&epsilon;-closure</th>
                      <th className="p-2.5">Target DFA State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2A4A]/50">
                    {pipeline.subsetLogs.map((log) => (
                      <tr key={log.step} className="hover:bg-[#141C33]/50">
                        <td className="p-2.5 text-[#8A94B2]">{log.step}</td>
                        <td className="p-2.5 font-bold text-[#7C5CFF]">q{log.sourceDfaState}</td>
                        <td className="p-2.5 text-[#E6EAF5]">{`{${log.nfaSet.join(',')}}`}</td>
                        <td className="p-2.5 text-[#22D3EE]">
                          {pipeline.classifier?.atomLabels[log.atom] || `a${log.atom}`}
                        </td>
                        <td className="p-2.5 text-[#8A94B2]">{`{${log.moveSet.join(',')}}`}</td>
                        <td className="p-2.5 text-[#8A94B2]">{`{${log.closureSet.join(',')}}`}</td>
                        <td className="p-2.5 font-bold text-[#34D399]">
                          q{log.targetDfaState} {log.isNew && <span className="text-[10px] text-[#FBBF24]">(new)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Moore Minimization & State-Count Comparison */}
          {activeStep === 4 && pipeline.mooreRounds && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2A4A]">
                <div>
                  <h3 className="text-sm font-bold text-[#E6EAF5]">
                    DFA Minimization & State-Count Comparison (Moore vs Hopcroft)
                  </h3>
                  <p className="text-xs text-[#8A94B2] mt-0.5">
                    Refines state equivalence classes round-by-round until distinguishable partitions stabilize.
                  </p>
                </div>
                <span className="text-xs font-mono text-[#34D399] bg-[#141C33] px-2.5 py-1 rounded-lg border border-[#1F2A4A]">
                  Reduction: {pipeline.rawDfa?.numStates} &rarr; {pipeline.minDfa?.numStates} minimal states
                </span>
              </div>

              {/* State Count Comparison Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-[#141C33]/60 border border-[#1F2A4A] rounded-xl text-center">
                  <div className="text-[11px] text-[#8A94B2]">Subset Raw DFA</div>
                  <div className="text-lg font-bold text-[#FBBF24] mt-0.5">{pipeline.rawDfa?.numStates} States</div>
                  <div className="text-[10px] text-[#8A94B2]">Unminimized Machine</div>
                </div>

                <div className="p-3 bg-[#141C33]/60 border border-[#1F2A4A] rounded-xl text-center">
                  <div className="text-[11px] text-[#8A94B2]">Moore Algorithm (O(|&Sigma;| n&sup2;))</div>
                  <div className="text-lg font-bold text-[#34D399] mt-0.5">{pipeline.minDfa?.numStates} States</div>
                  <div className="text-[10px] text-[#34D399]">{pipeline.mooreRounds.length} Partition Rounds</div>
                </div>

                <div className="p-3 bg-[#141C33]/60 border border-[#1F2A4A] rounded-xl text-center">
                  <div className="text-[11px] text-[#8A94B2]">Hopcroft Algorithm (O(|&Sigma;| n log n))</div>
                  <div className="text-lg font-bold text-[#22D3EE] mt-0.5">{pipeline.hopcroftDfa?.numStates} States</div>
                  <div className="text-[10px] text-[#22D3EE]">
                    {pipeline.minDfa?.numStates === pipeline.hopcroftDfa?.numStates ? 'Canonical Isomorphism Verified' : 'Equivalence Mismatch'}
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto">
                {pipeline.mooreRounds.map((round) => (
                  <div key={round.round} className="p-3 bg-[#141C33]/60 border border-[#1F2A4A] rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#7C5CFF]">Round {round.round}</span>
                      <span className="text-[#8A94B2]">{round.partition.length} partition blocks</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {round.partition.map((block, bIdx) => (
                        <div
                          key={bIdx}
                          className="px-2.5 py-1 rounded-lg bg-[#0E1424] border border-[#1F2A4A] font-mono text-xs text-[#22D3EE]"
                        >
                          P{bIdx} = {'{' + block.map((s) => `q${s}`).join(', ') + '}'}
                        </div>
                      ))}
                    </div>

                    {round.splits.length > 0 && (
                      <div className="pt-1.5 border-t border-[#1F2A4A]/50 text-[11px] text-[#FBBF24] space-y-0.5 font-mono">
                        {round.splits.map((split, sIdx) => (
                          <div key={sIdx}>&bull; Split: {split.reason}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Dual Simulation & Comparison */}
          {activeStep === 5 && simResult && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-[#1F2A4A]">
                <h3 className="text-sm font-bold text-[#E6EAF5]">
                  Dual Simulation: NFA (Non-deterministic) vs DFA (Deterministic)
                </h3>
                <p className="text-xs text-[#8A94B2] mt-0.5">
                  Side-by-side verification proving that both automata models accept the identical formal language.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-[#8A94B2]">Test Input String:</span>
                <input
                  type="text"
                  value={testString}
                  onChange={(e) => setTestString(e.target.value)}
                  className="bg-[#141C33] border border-[#1F2A4A] rounded-lg px-3 py-1.5 font-mono text-xs text-[#E6EAF5] placeholder-[#8A94B2] outline-none focus:border-[#7C5CFF]"
                  placeholder="Type word to test..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* NFA Side */}
                <div className="p-4 bg-[#141C33]/60 border border-[#1F2A4A] rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-xs text-[#E6EAF5]">NFA Simulation</span>
                      <span className="text-[11px] text-[#8A94B2] font-mono">{pipeline.nfa?.numStates} states</span>
                    </div>
                    <p className="text-xs text-[#8A94B2] leading-relaxed">
                      Tracks multiple concurrent active state configurations on &epsilon; and symbol transitions.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#1F2A4A] flex items-center space-x-2">
                    {simResult.nfaAccepts ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-[#34D399]" />
                        <span className="font-bold text-xs text-[#34D399]">ACCEPTED by NFA</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-[#EF4444]" />
                        <span className="font-bold text-xs text-[#EF4444]">REJECTED by NFA</span>
                      </>
                    )}
                  </div>
                </div>

                {/* DFA Side */}
                <div className="p-4 bg-[#141C33]/60 border border-[#1F2A4A] rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-xs text-[#E6EAF5]">Minimized DFA Simulation</span>
                      <span className="text-[11px] text-[#8A94B2] font-mono">{pipeline.minDfa?.numStates} states</span>
                    </div>
                    <p className="text-xs text-[#8A94B2] leading-relaxed">
                      Always tracks exactly ONE state per character with guaranteed O(n) transitions and zero backtracking.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#1F2A4A] flex items-center space-x-2">
                    {simResult.dfaAccepts ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-[#34D399]" />
                        <span className="font-bold text-xs text-[#34D399]">ACCEPTED by DFA</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-[#EF4444]" />
                        <span className="font-bold text-xs text-[#EF4444]">REJECTED by DFA</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
