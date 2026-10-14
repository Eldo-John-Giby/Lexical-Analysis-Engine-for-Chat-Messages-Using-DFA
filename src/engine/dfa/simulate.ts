import { DFA, AtomId } from '../types';
import { Classifier } from '../charclass';

export function stepDFA(dfa: DFA, state: number, atom: AtomId): number {
  if (state < 0 || state >= dfa.numStates) return -1;
  const next = dfa.table[state * dfa.numAtoms + atom];
  return next !== undefined ? next : -1;
}

export function simulateDFA(dfa: DFA, text: string, classifier: Classifier): boolean {
  let state = dfa.start;
  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i)!;
    const atom = classifier.classify(cp);
    state = stepDFA(dfa, state, atom);
    if (state === -1) return false;
    i += cp > 0xffff ? 2 : 1;
  }
  return dfa.acceptRule[state] !== undefined && dfa.acceptRule[state] !== -1;
}
