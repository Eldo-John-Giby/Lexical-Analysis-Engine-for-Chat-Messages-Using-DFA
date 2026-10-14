import { NFA, AtomId } from '../types';
import { Classifier } from '../charclass';

export function epsilonClosure(states: Iterable<number>, nfa: NFA): Set<number> {
  const closure = new Set<number>(states);
  const stack = Array.from(states);

  while (stack.length > 0) {
    const s = stack.pop()!;
    const targets = nfa.eps[s] || [];
    for (const t of targets) {
      if (!closure.has(t)) {
        closure.add(t);
        stack.push(t);
      }
    }
  }

  return closure;
}

export function moveNFA(states: Iterable<number>, atom: AtomId, nfa: NFA): Set<number> {
  const result = new Set<number>();
  for (const s of states) {
    const transitions = nfa.trans[s] || [];
    for (const [transAtom, target] of transitions) {
      if (transAtom === atom) {
        result.add(target);
      }
    }
  }
  return result;
}

export function simulateNFA(nfa: NFA, text: string, classifier: Classifier): boolean {
  let current = epsilonClosure([nfa.start], nfa);

  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i)!;
    const atom = classifier.classify(cp);
    const moved = moveNFA(current, atom, nfa);
    current = epsilonClosure(moved, nfa);
    if (current.size === 0) return false;
    i += cp > 0xffff ? 2 : 1;
  }

  for (const s of current) {
    if (nfa.accept.has(s)) return true;
  }
  return false;
}
