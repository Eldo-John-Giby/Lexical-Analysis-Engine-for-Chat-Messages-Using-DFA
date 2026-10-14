import { NFA, AtomId } from '../types';

export function combineNFAs(nfas: NFA[]): NFA {
  if (nfas.length === 0) {
    return {
      numStates: 1,
      start: 0,
      eps: [[]],
      trans: [[]],
      accept: new Map(),
    };
  }

  if (nfas.length === 1) {
    return nfas[0]!;
  }

  // Master start state is 0
  let totalStates = 1;
  const offsets: number[] = [];
  for (const nfa of nfas) {
    offsets.push(totalStates);
    totalStates += nfa.numStates;
  }

  const eps: number[][] = Array.from({ length: totalStates }, () => []);
  const trans: [AtomId, number][][] = Array.from({ length: totalStates }, () => []);
  const accept = new Map<number, number>();

  // Add epsilon transitions from master start (0) to each rule's start
  for (let i = 0; i < nfas.length; i++) {
    const nfa = nfas[i]!;
    const offset = offsets[i]!;
    eps[0]!.push(offset + nfa.start);

    // Copy transitions with shifted indices
    for (let s = 0; s < nfa.numStates; s++) {
      const newS = offset + s;
      for (const target of nfa.eps[s] || []) {
        eps[newS]!.push(offset + target);
      }
      for (const [atom, target] of nfa.trans[s] || []) {
        trans[newS]!.push([atom, offset + target]);
      }
    }

    // Copy accepting states
    for (const [accState, ruleId] of nfa.accept.entries()) {
      accept.set(offset + accState, ruleId);
    }
  }

  return {
    numStates: totalStates,
    start: 0,
    eps,
    trans,
    accept,
  };
}
