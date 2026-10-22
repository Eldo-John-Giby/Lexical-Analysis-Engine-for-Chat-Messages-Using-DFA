import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../state/store';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FastForward,
  MapPin,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const TracePlayer: React.FC = () => {
  const {
    playgroundText,
    lexResult,
    currentTraceEventIndex,
    setCurrentTraceEventIndex,
    traceSpeed,
    setTraceSpeed,
    isPlayingTrace,
    setIsPlayingTrace,
    engine,
  } = useAppStore();

  const trace = lexResult.trace || [];
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentEvent = trace[currentTraceEventIndex] || null;

  // Auto-advance playback loop
  useEffect(() => {
    if (isPlayingTrace) {
      const delay = Math.max(50, 400 / traceSpeed);
      timerRef.current = setTimeout(() => {
        if (currentTraceEventIndex < trace.length - 1) {
          setCurrentTraceEventIndex(currentTraceEventIndex + 1);
        } else {
          setIsPlayingTrace(false);
        }
      }, delay);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    isPlayingTrace,
    currentTraceEventIndex,
    trace.length,
    traceSpeed,
    setCurrentTraceEventIndex,
    setIsPlayingTrace,
  ]);

  if (trace.length === 0) {
    return (
      <div className="bg-[#0E1424] border border-[#1F2A4A] rounded-xl p-4 text-center text-xs text-[#8A94B2]">
        No trace events available. Lex with tracing enabled.
      </div>
    );
  }

  // Find last accepting mark event before or at current event
  let lastMarkPos = -1;
  for (let i = 0; i <= currentTraceEventIndex; i++) {
    const ev = trace[i]!;
    if (ev.t === 'begin') {
      lastMarkPos = -1;
    } else if (ev.t === 'mark') {
      lastMarkPos = ev.pos;
    }
  }

  // Active read position helper
  const getEventPos = (ev: (typeof trace)[0] | null): number => {
    if (!ev) return 0;
    if (ev.t === 'backtrack') return ev.to;
    if (ev.t === 'emit') return ev.token.end;
    return ev.pos;
  };

  const activePos = getEventPos(currentEvent);

  // Jump to next backtrack event
  const jumpToNextBacktrack = () => {
    for (let i = currentTraceEventIndex + 1; i < trace.length; i++) {
      if (trace[i]!.t === 'backtrack' || trace[i]!.t === 'dead') {
        setCurrentTraceEventIndex(i);
        return;
      }
    }
    // If none found forward, search from beginning
    for (let i = 0; i < currentTraceEventIndex; i++) {
      if (trace[i]!.t === 'backtrack' || trace[i]!.t === 'dead') {
        setCurrentTraceEventIndex(i);
        return;
      }
    }
  };

  // Human narration string
  const getNarration = () => {
    if (!currentEvent) return 'Trace ready. Click play or step to observe the DFA.';
    switch (currentEvent.t) {
      case 'begin':
        return `Initiating token scan at position ${currentEvent.pos}. DFA reset to start state q${currentEvent.startState}.`;
      case 'step': {
        const atomLabel = engine.classifier.atomLabels[currentEvent.atom] || `atom_${currentEvent.atom}`;
        const accText = currentEvent.accepting
          ? ` (ACCEPTING: rule "${engine.rules[currentEvent.ruleId]?.name || currentEvent.ruleId}")`
          : '';
        return `Read character '${currentEvent.ch}' (${atomLabel}): transitioned q${currentEvent.from} -> q${currentEvent.to}${accText}`;
      }
      case 'mark':
        return `Marked last accepting candidate at position ${currentEvent.pos} for rule "${engine.rules[currentEvent.ruleId]?.name}".`;
      case 'dead':
        return `Dead state reached at position ${currentEvent.pos} on character '${currentEvent.ch}'. No outgoing transition from q${currentEvent.from}.`;
      case 'backtrack':
        return `Maximal Munch rollback: rewound ${currentEvent.from - currentEvent.to} character(s) back to position ${currentEvent.to} (last accepted candidate).`;
      case 'emit':
        return `Emitted token: ${currentEvent.token.type}("${currentEvent.token.lexeme}") at [${currentEvent.token.start}..${currentEvent.token.end}].`;
      case 'error':
        return `Lexical Error: ${currentEvent.message} at position ${currentEvent.pos}.`;
    }
  };

  // Tape characters window (render a slice around activePos)
  const tapeSliceStart = Math.max(0, activePos - 12);
  const tapeSliceEnd = Math.min(playgroundText.length, activePos + 18);
  const tapeChars = [];
  for (let idx = tapeSliceStart; idx < tapeSliceEnd; idx++) {
    const cp = playgroundText.codePointAt(idx)!;
    const atom = engine.classifier.classify(cp);
    const atomLabel = engine.classifier.atomLabels[atom] || `a${atom}`;
    tapeChars.push({
      char: playgroundText[idx]!,
      pos: idx,
      atomLabel,
    });
  }

  return (
    <div className="bg-[#0E1424] border border-[#1F2A4A] rounded-xl p-4 shadow-xl flex flex-col space-y-3">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1F2A4A]">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-pulse" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E6EAF5]">
            DFA Execution Trace Player (Maximal Munch Engine)
          </h3>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentTraceEventIndex(0)}
            className="p-1.5 rounded-lg bg-[#141C33] hover:bg-[#1F2A4A] text-[#8A94B2] hover:text-[#E6EAF5] transition-colors"
            title="Reset to beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentTraceEventIndex(Math.max(0, currentTraceEventIndex - 1))}
            disabled={currentTraceEventIndex === 0}
            className="p-1.5 rounded-lg bg-[#141C33] hover:bg-[#1F2A4A] text-[#8A94B2] hover:text-[#E6EAF5] disabled:opacity-40 transition-colors"
            title="Step backward (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlayingTrace(!isPlayingTrace)}
            className="px-3 py-1.5 rounded-lg bg-[#7C5CFF] hover:bg-[#6846FF] text-white font-medium text-xs flex items-center space-x-1.5 shadow-md shadow-[#7C5CFF]/30 transition-all"
            title="Play / Pause (Space)"
          >
            {isPlayingTrace ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>
          <button
            onClick={() => setCurrentTraceEventIndex(Math.min(trace.length - 1, currentTraceEventIndex + 1))}
            disabled={currentTraceEventIndex >= trace.length - 1}
            className="p-1.5 rounded-lg bg-[#141C33] hover:bg-[#1F2A4A] text-[#8A94B2] hover:text-[#E6EAF5] disabled:opacity-40 transition-colors"
            title="Step forward (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={jumpToNextBacktrack}
            className="flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#FBBF24] transition-colors ml-1"
            title="Jump to next backtrack / rollback event"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Next Rollback</span>
          </button>

          {/* Speed selector */}
          <div className="flex items-center space-x-1 ml-2 text-xs text-[#8A94B2]">
            <span>Speed:</span>
            {[0.5, 1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setTraceSpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[11px] ${
                  traceSpeed === spd
                    ? 'bg-[#7C5CFF] text-white font-bold'
                    : 'bg-[#141C33] hover:bg-[#1F2A4A] text-[#8A94B2]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrubber timeline */}
      <div className="relative pt-1">
        <div className="flex items-center justify-between text-[11px] text-[#8A94B2] mb-1">
          <span>Event {currentTraceEventIndex + 1} / {trace.length}</span>
          <span className="font-mono">Pos: {activePos}</span>
        </div>
        <input
          type="range"
          min={0}
          max={trace.length - 1}
          value={currentTraceEventIndex}
          onChange={(e) => setCurrentTraceEventIndex(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-[#141C33] rounded-lg appearance-none cursor-pointer accent-[#7C5CFF]"
        />
      </div>

      {/* Character Tape */}
      <div className="p-3 bg-[#070A12] border border-[#1F2A4A] rounded-xl overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1.5 min-w-max">
          {tapeChars.map((item) => {
            const isReadHead = item.pos === activePos;
            const isLastMark = item.pos === lastMarkPos;
            const isPast = item.pos < activePos;

            return (
              <div
                key={item.pos}
                className={`relative flex flex-col items-center justify-center w-10 h-14 rounded-lg font-mono transition-all ${
                  isReadHead
                    ? 'bg-[#7C5CFF] text-white shadow-lg shadow-[#7C5CFF]/50 scale-105 z-10'
                    : isPast
                    ? 'bg-[#141C33] text-[#8A94B2]'
                    : 'bg-[#0E1424] text-[#E6EAF5] border border-[#1F2A4A]'
                }`}
              >
                {isLastMark && (
                  <div
                    className="absolute -top-3 text-[#34D399]"
                    title={`Last accepting state candidate at pos ${item.pos}`}
                  >
                    <MapPin className="w-3.5 h-3.5 fill-current" />
                  </div>
                )}
                <span className="text-sm font-bold">
                  {item.char === ' ' ? '␣' : item.char === '\n' ? '↵' : item.char}
                </span>
                <span className="text-[9px] opacity-75 truncate max-w-[34px]">
                  {item.atomLabel}
                </span>
                <span className="text-[8px] opacity-40">{item.pos}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Narration Banner */}
      <div className="p-3 rounded-lg bg-[#141C33]/70 border border-[#1F2A4A] flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          {currentEvent?.t === 'backtrack' || currentEvent?.t === 'dead' ? (
            <AlertCircle className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#7C5CFF] flex-shrink-0" />
          )}
          <span className="font-mono text-[#E6EAF5]">{getNarration()}</span>
        </div>
        {currentEvent?.t === 'step' && (
          <span className="px-2 py-0.5 rounded bg-[#7C5CFF]/20 text-[#A78BFA] font-mono text-[11px] whitespace-nowrap ml-2">
            q{currentEvent.to}
          </span>
        )}
      </div>
    </div>
  );
};
