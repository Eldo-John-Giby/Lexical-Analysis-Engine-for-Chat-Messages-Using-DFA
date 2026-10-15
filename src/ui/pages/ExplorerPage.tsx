import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../../state/store';
import { DfaGraph } from '../components/DfaGraph';
import { TransitionTable } from '../components/TransitionTable';
import { buildToyElongationDFA } from '../../engine/lexer/postprocess';
import {
  Network,
  Table,
  Layers,
  Cpu,
  Zap,
  HardDrive,
  FileCode,
  Search,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  FastForward,
} from 'lucide-react';

export const ExplorerPage: React.FC = () => {
  const { engine } = useAppStore();
  const [selectedTarget, setSelectedTarget] = useState<string>('2'); // default to URL (id 2)
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [searchStateText, setSearchStateText] = useState<string>('');

  const toyElongationDfa = useMemo(() => buildToyElongationDFA(), []);

  // Compute active DFA based on selection
  const { currentDfa, currentTitle, currentColor, currentRuleId } = useMemo(() => {
    if (selectedTarget === 'master') {
      return {
        currentDfa: engine.dfaNormal,
        currentTitle: 'Master DFA (Standard Lexing)',
        currentColor: '#7C5CFF',
        currentRuleId: null,
      };
    }
    if (selectedTarget === 'master-linestart') {
      return {
        currentDfa: engine.dfaLineStart,
        currentTitle: 'Master DFA (Line-Start Active with COMMAND)',
        currentColor: '#F472B6',
        currentRuleId: null,
      };
    }
    if (selectedTarget === 'toy-elongation') {
      return {
        currentDfa: toyElongationDfa,
        currentTitle: 'Elongation Detection Toy DFA (3+ repeats)',
        currentColor: '#FBBF24',
        currentRuleId: null,
      };
    }
    const rId = parseInt(selectedTarget, 10);
    const rule = engine.rules[rId] || engine.rules[0]!;
    return {
      currentDfa: engine.dfaFor(rule.id),
      currentTitle: `Rule #${rule.id + 1}: ${rule.name}`,
      currentColor: rule.color,
      currentRuleId: rule.id,
    };
  }, [selectedTarget, engine, toyElongationDfa]);

  // Edges count
  const edgeCount = useMemo(() => {
    let count = 0;
    for (let s = 0; s < currentDfa.numStates; s++) {
      for (let a = 0; a < currentDfa.numAtoms; a++) {
        if (currentDfa.table[s * currentDfa.numAtoms + a] !== -1) {
          count++;
        }
      }
    }
    return count;
  }, [currentDfa]);

  // Interactive Simulation & State Transition Animation
  const defaultSimInputs: Record<string, string> = {
    '2': 'https://vit.ac.in',
    '3': '#ProjectDay2026',
    '4': '@eldo',
    '8': '5:30pm',
    '9': '🔥',
    'toy-elongation': 'aaabbc',
    'master': 'hey @eldo 5:30pm',
  };

  const [simInput, setSimInput] = useState<string>(defaultSimInputs[selectedTarget] || 'https://vit.ac.in');
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimPlaying, setIsSimPlaying] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync default input on target machine change
  useEffect(() => {
    setSimInput(defaultSimInputs[selectedTarget] || 'test');
    setSimStep(0);
    setIsSimPlaying(false);
  }, [selectedTarget]);

  // Compute simulation steps for currentDfa and simInput
  const simSteps = useMemo(() => {
    const steps: {
      index: number;
      fromState: number;
      toState: number;
      char: string;
      atom: number;
      atomLabel: string;
      isDead: boolean;
      isAccept: boolean;
      acceptRule: number;
    }[] = [];

    let currState = currentDfa.start;
    steps.push({
      index: 0,
      fromState: currState,
      toState: currState,
      char: 'ε',
      atom: -1,
      atomLabel: 'ε',
      isDead: false,
      isAccept: (currentDfa.acceptRule[currState] ?? -1) !== -1,
      acceptRule: currentDfa.acceptRule[currState] ?? -1,
    });

    for (let i = 0; i < simInput.length; i++) {
      const ch = simInput[i]!;
      let atom = -1;
      let atomLabel = ch;

      if (selectedTarget === 'toy-elongation') {
        if (ch === 'a') atom = 0;
        else if (ch === 'b') atom = 1;
        else if (ch === 'c') atom = 2;
        else atom = 3;
        atomLabel = ch;
      } else {
        const cp = ch.codePointAt(0) ?? 0;
        atom = engine.classifier.classify(cp);
        atomLabel = engine.classifier.atomLabels[atom] || ch;
      }

      if (currState === -1) {
        steps.push({
          index: i + 1,
          fromState: -1,
          toState: -1,
          char: ch,
          atom,
          atomLabel,
          isDead: true,
          isAccept: false,
          acceptRule: -1,
        });
        continue;
      }

      const nextState = currentDfa.table[currState * currentDfa.numAtoms + atom] ?? -1;
      const isDead = nextState === -1;
      const isAccept = !isDead && (currentDfa.acceptRule[nextState] ?? -1) !== -1;
      const acceptRule = !isDead ? (currentDfa.acceptRule[nextState] ?? -1) : -1;

      steps.push({
        index: i + 1,
        fromState: currState,
        toState: nextState,
        char: ch,
        atom,
        atomLabel,
        isDead,
        isAccept,
        acceptRule,
      });

      currState = nextState;
    }

    return steps;
  }, [currentDfa, engine.classifier, selectedTarget, simInput]);

  // Auto-play timer
  useEffect(() => {
    if (isSimPlaying) {
      const delay = Math.max(80, 600 / simSpeed);
      simTimerRef.current = setTimeout(() => {
        if (simStep < simSteps.length - 1) {
          setSimStep((s) => s + 1);
        } else {
          setIsSimPlaying(false);
        }
      }, delay);
    }
    return () => {
      if (simTimerRef.current) clearTimeout(simTimerRef.current);
    };
  }, [isSimPlaying, simStep, simSteps.length, simSpeed]);

  const activeSimStep = simSteps[simStep] || simSteps[0]!;
  const animatedActiveStateId = activeSimStep.toState !== -1 ? activeSimStep.toState : (selectedStateId ?? null);
  const animatedActiveEdge =
    activeSimStep.index > 0 && !activeSimStep.isDead
      ? { from: activeSimStep.fromState, to: activeSimStep.toState }
      : null;

  // NFA state origin set for selected state
  const nfaOriginSet = useMemo(() => {
    const sId = selectedStateId ?? (activeSimStep.toState !== -1 ? activeSimStep.toState : null);
    if (sId === null || !currentDfa.stateNfaSets) return null;
    return currentDfa.stateNfaSets[sId] || null;
  }, [selectedStateId, activeSimStep.toState, currentDfa]);

  return (
    <div className="p-4 max-w-[1600px] mx-auto flex flex-col space-y-4">
      {/* Top Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] border border-[#1F2A4A] p-3 rounded-xl shadow-lg">
        <div className="flex items-center space-x-3">
          <Network className="w-5 h-5 text-[#7C5CFF]" />
          <span className="text-xs font-semibold text-[#E6EAF5]">Target Automaton:</span>
          <select
            value={selectedTarget}
            onChange={(e) => {
              setSelectedTarget(e.target.value);
              setSelectedStateId(null);
            }}
            className="bg-[#141C33] border border-[#1F2A4A] text-xs text-[#E6EAF5] rounded-lg px-3 py-1.5 outline-none focus:border-[#7C5CFF]"
          >
            <optgroup label="Compiled Master Automata">
              <option value="master">Master DFA (All Normal Rules)</option>
              <option value="master-linestart">Master DFA (Line-Start Rules)</option>
            </optgroup>
            <optgroup label="Specialized Machines">
              <option value="toy-elongation">Elongation Toy DFA ({'{a,b,c,other}'})</option>
            </optgroup>
            <optgroup label="Token Rule DFAs (29 Rules)">
              {engine.rules.map((r) => (
                <option key={r.id} value={r.id.toString()}>
                  #{r.id + 1} {r.name} ({r.kind})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* View Switcher & State Jump */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8A94B2] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="State # (e.g. 5)"
              value={searchStateText}
              onChange={(e) => {
                setSearchStateText(e.target.value);
                const s = parseInt(e.target.value, 10);
                if (!isNaN(s) && s >= 0 && s < currentDfa.numStates) {
                  setSelectedStateId(s);
                }
              }}
              className="w-28 bg-[#141C33] border border-[#1F2A4A] rounded-lg pl-8 pr-2 py-1 text-xs text-[#E6EAF5] placeholder-[#8A94B2] outline-none"
            />
          </div>

          <div className="flex items-center bg-[#141C33] p-1 rounded-lg border border-[#1F2A4A]">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors ${
                viewMode === 'graph'
                  ? 'bg-[#7C5CFF] text-white font-medium shadow'
                  : 'text-[#8A94B2] hover:text-[#E6EAF5]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Graph</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#7C5CFF] text-white font-medium shadow'
                  : 'text-[#8A94B2] hover:text-[#E6EAF5]'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Automata Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3 rounded-xl flex items-center space-x-3">
          <Layers className="w-5 h-5 text-[#7C5CFF]" />
          <div>
            <div className="text-[11px] text-[#8A94B2]">DFA States</div>
            <div className="text-base font-bold text-[#E6EAF5]">{currentDfa.numStates}</div>
          </div>
        </div>
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3 rounded-xl flex items-center space-x-3">
          <Network className="w-5 h-5 text-[#22D3EE]" />
          <div>
            <div className="text-[11px] text-[#8A94B2]">Active Transitions</div>
            <div className="text-base font-bold text-[#E6EAF5]">{edgeCount}</div>
          </div>
        </div>
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3 rounded-xl flex items-center space-x-3">
          <Zap className="w-5 h-5 text-[#34D399]" />
          <div>
            <div className="text-[11px] text-[#8A94B2]">Alphabet Atoms</div>
            <div className="text-base font-bold text-[#E6EAF5]">{currentDfa.numAtoms}</div>
          </div>
        </div>
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3 rounded-xl flex items-center space-x-3">
          <Cpu className="w-5 h-5 text-[#FBBF24]" />
          <div>
            <div className="text-[11px] text-[#8A94B2]">Build Duration</div>
            <div className="text-base font-bold text-[#E6EAF5]">{engine.stats.buildMs} ms</div>
          </div>
        </div>
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3 rounded-xl flex items-center space-x-3">
          <HardDrive className="w-5 h-5 text-[#F472B6]" />
          <div>
            <div className="text-[11px] text-[#8A94B2]">Table Memory</div>
            <div className="text-base font-bold text-[#E6EAF5]">
              {(currentDfa.table.byteLength / 1024).toFixed(1)} KB
            </div>
          </div>
        </div>
        <div className="bg-[#0E1424] border border-[#1F2A4A] p-3 rounded-xl flex items-center space-x-3">
          <FileCode className="w-5 h-5 text-[#A78BFA]" />
          <div>
            <div className="text-[11px] text-[#8A94B2]">Start State</div>
            <div className="text-base font-bold text-[#E6EAF5]">q{currentDfa.start}</div>
          </div>
        </div>
      </div>

      {/* Animated State Transitions Simulator Card */}
      <div className="bg-[#0E1424] border border-[#1F2A4A] p-4 rounded-xl shadow-xl flex flex-col space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#1F2A4A]">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#34D399]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#E6EAF5]">
              Interactive DFA Simulation & Animated State Transitions
            </h3>
          </div>

          {/* Quick Preset Inputs for this rule */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
            <span className="text-[#8A94B2] text-[11px]">Quick Tests:</span>
            {(selectedTarget === '2'
              ? ['https://vit.ac.in', 'http://chat.io/api', 'ftp://bad']
              : selectedTarget === '3'
              ? ['#VIT2026', '#compiler_lab', '#123']
              : selectedTarget === '4'
              ? ['@eldo', '@everyone', '@123']
              : selectedTarget === '8'
              ? ['5:30pm', '12:45', '25:99']
              : selectedTarget === '9'
              ? ['🔥', '👨‍💻', ':)']
              : selectedTarget === 'toy-elongation'
              ? ['aaabbc', 'aab', 'cccc']
              : ['hey @eldo', 'https://vit.ac.in', '#VIT']
            ).map((sample) => (
              <button
                key={sample}
                onClick={() => {
                  setSimInput(sample);
                  setSimStep(0);
                  setIsSimPlaying(false);
                }}
                className="px-2 py-0.5 rounded bg-[#141C33] hover:bg-[#1F2A4A] border border-[#1F2A4A] text-[#22D3EE] font-mono text-[11px] transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Input & Playback Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
            <span className="text-xs font-semibold text-[#8A94B2] font-mono">Input:</span>
            <input
              type="text"
              value={simInput}
              onChange={(e) => {
                setSimInput(e.target.value);
                setSimStep(0);
                setIsSimPlaying(false);
              }}
              placeholder="Enter test string..."
              className="flex-1 bg-[#141C33] border border-[#1F2A4A] rounded-lg px-3 py-1.5 font-mono text-xs text-[#E6EAF5] placeholder-[#8A94B2] outline-none focus:border-[#7C5CFF]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSimStep(0);
                setIsSimPlaying(false);
              }}
              className="p-1.5 rounded-lg bg-[#141C33] hover:bg-[#1F2A4A] border border-[#1F2A4A] text-[#8A94B2] hover:text-[#E6EAF5] transition-colors"
              title="Reset Simulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setIsSimPlaying(false);
                setSimStep((s) => Math.max(0, s - 1));
              }}
              disabled={simStep === 0}
              className="p-1.5 rounded-lg bg-[#141C33] hover:bg-[#1F2A4A] border border-[#1F2A4A] text-[#8A94B2] hover:text-[#E6EAF5] disabled:opacity-40 transition-colors"
              title="Step Back"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsSimPlaying(!isSimPlaying)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#7C5CFF] hover:bg-[#6846FF] text-white text-xs font-semibold shadow-md shadow-[#7C5CFF]/25 transition-colors"
            >
              {isSimPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isSimPlaying ? 'Pause' : 'Animate'}</span>
            </button>

            <button
              onClick={() => {
                setIsSimPlaying(false);
                setSimStep((s) => Math.min(simSteps.length - 1, s + 1));
              }}
              disabled={simStep === simSteps.length - 1}
              className="p-1.5 rounded-lg bg-[#141C33] hover:bg-[#1F2A4A] border border-[#1F2A4A] text-[#8A94B2] hover:text-[#E6EAF5] disabled:opacity-40 transition-colors"
              title="Step Forward"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-[#141C33] rounded-lg border border-[#1F2A4A] p-0.5 text-[11px] font-mono">
              {[0.5, 1, 2].map((sp) => (
                <button
                  key={sp}
                  onClick={() => setSimSpeed(sp)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    simSpeed === sp ? 'bg-[#7C5CFF] text-white font-bold' : 'text-[#8A94B2] hover:text-[#E6EAF5]'
                  }`}
                >
                  {sp}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tape Display & Active Transition Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-[#141C33]/60 rounded-xl border border-[#1F2A4A]">
          {/* Tape */}
          <div className="flex items-center space-x-1 overflow-x-auto py-1">
            <span className="text-[10px] text-[#8A94B2] font-mono uppercase mr-1">Tape:</span>
            {simInput.split('').map((char, idx) => {
              const isActive = simStep === idx + 1;
              const isPast = simStep > idx + 1;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setIsSimPlaying(false);
                    setSimStep(idx + 1);
                  }}
                  className={`cursor-pointer px-2 py-1 rounded text-xs font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-[#7C5CFF] text-white ring-2 ring-[#7C5CFF] ring-offset-1 ring-offset-[#0E1424] scale-110 shadow-lg'
                      : isPast
                      ? 'bg-[#1F2A4A] text-[#8A94B2]'
                      : 'bg-[#0E1424] text-[#8A94B2] border border-[#1F2A4A]'
                  }`}
                >
                  {char}
                </div>
              );
            })}
          </div>

          {/* Transition Badge */}
          <div className="flex items-center space-x-2 font-mono text-xs">
            {activeSimStep.index === 0 ? (
              <span className="px-2.5 py-1 rounded-lg bg-[#7C5CFF]/20 text-[#A78BFA] border border-[#7C5CFF]/30 font-semibold">
                Initial State: q{currentDfa.start}
              </span>
            ) : activeSimStep.isDead ? (
              <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 font-semibold animate-pulse">
                <XCircle className="w-3.5 h-3.5" />
                <span>Dead State (Rejected / No Transition on &apos;{activeSimStep.char}&apos;)</span>
              </span>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 rounded-lg bg-[#141C33] text-[#22D3EE] border border-[#1F2A4A]">
                  q{activeSimStep.fromState} &rarr; &apos;{activeSimStep.char}&apos; &rarr; q{activeSimStep.toState}
                </span>
                {activeSimStep.isAccept ? (
                  <span className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40 font-bold shadow-sm shadow-[#34D399]/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accepted (Rule #{activeSimStep.acceptRule + 1})</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-[#8A94B2]/20 text-[#8A94B2] border border-[#1F2A4A]">
                    In-progress
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main View Area: Graph or Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 h-[560px]">
          {viewMode === 'graph' ? (
            <DfaGraph
              dfa={currentDfa}
              atomLabels={engine.classifier.atomLabels}
              ruleName={currentTitle}
              ruleColor={currentColor}
              onSelectState={setSelectedStateId}
              activeStateId={animatedActiveStateId}
              activeEdge={animatedActiveEdge}
            />
          ) : (
            <TransitionTable
              dfa={currentDfa}
              atomLabels={engine.classifier.atomLabels}
              activeState={selectedStateId}
            />
          )}
        </div>

        {/* State Inspector Sidebar */}
        <div className="bg-[#0E1424] border border-[#1F2A4A] rounded-xl p-4 shadow-xl flex flex-col space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-[#1F2A4A]">
            <Network className="w-4 h-4 text-[#7C5CFF]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E6EAF5]">
              State Inspector
            </h3>
          </div>

          {selectedStateId === null ? (
            <div className="py-12 text-center text-xs text-[#8A94B2]">
              Click any node in the graph or matrix row to inspect its subset construction origins and outgoing transitions.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#141C33] rounded-lg border border-[#1F2A4A]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-[#7C5CFF]">
                    q{selectedStateId}
                  </span>
                  {currentDfa.acceptRule[selectedStateId] !== -1 ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#34D399]/20 text-[#34D399] font-medium text-[11px]">
                      Accepts: rule {currentDfa.acceptRule[selectedStateId]}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#8A94B2]/20 text-[#8A94B2] text-[11px]">
                      Non-accepting
                    </span>
                  )}
                </div>
              </div>

              {/* Subset Origin Set */}
              <div>
                <span className="text-[11px] font-semibold text-[#8A94B2] uppercase">
                  Subset Construction Origin (NFA States):
                </span>
                {nfaOriginSet ? (
                  <div className="flex flex-wrap gap-1 mt-1.5 p-2 bg-[#070A12] border border-[#1F2A4A] rounded-lg font-mono text-[11px] max-h-28 overflow-y-auto">
                    {nfaOriginSet.map((id) => (
                      <span
                        key={id}
                        className="px-1.5 py-0.5 rounded bg-[#7C5CFF]/20 text-[#A78BFA]"
                      >
                        n{id}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#8A94B2] italic mt-1">
                    Directly optimized state representation
                  </p>
                )}
              </div>

              {/* Outgoing Transitions */}
              <div>
                <span className="text-[11px] font-semibold text-[#8A94B2] uppercase">
                  Outgoing Transitions:
                </span>
                <div className="mt-1.5 space-y-1 max-h-48 overflow-y-auto font-mono text-[11px]">
                  {Array.from({ length: currentDfa.numAtoms })
                    .map((_, a) => {
                      const target = currentDfa.table[selectedStateId * currentDfa.numAtoms + a]!;
                      if (target === -1) return null;
                      return (
                        <div
                          key={a}
                          className="flex items-center justify-between p-1.5 rounded bg-[#141C33]/60 border border-[#1F2A4A]/50"
                        >
                          <span className="text-[#22D3EE]">
                            {engine.classifier.atomLabels[a] || `atom_${a}`}
                          </span>
                          <span className="text-[#E6EAF5] font-bold">
                            &rarr; q{target}
                          </span>
                        </div>
                      );
                    })
                    .filter(Boolean)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
