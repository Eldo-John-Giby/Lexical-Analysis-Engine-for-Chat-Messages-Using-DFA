import { NFA, DFA, AtomId } from '../types';
import { epsilonClosure, moveNFA } from '../nfa/simulate';

export interface SubsetStepLog {
  step: number;
  sourceDfaState: number;
  nfaSet: number[];
  atom: AtomId;
  moveSet: number[];
  closureSet: number[];
  targetDfaState: number;
  isNew: boolean;
}

export interface SubsetResult {
  dfa: DFA;
  logs: SubsetStepLog[];
}

export function subsetConstruction(
  nfa: NFA,
  numAtoms: number,
  maxStates = 2000
): SubsetResult {
  const logs: SubsetStepLog[] = [];
  let stepCount = 0;

  // Canonical string key for a sorted set of NFA state ids
  function setKey(states: number[]): string {
    return states.join(',');
  }

  const startClosureSet = epsilonClosure([nfa.start], nfa);
  const startClosure = Array.from(startClosureSet).sort((a, b) => a - b);

  const stateMap = new Map<string, number>();
  const dfaStateNfaSets: number[][] = [];
  const transitions: Map<AtomId, number>[] = [];
  const acceptRules: number[] = [];

  function getAcceptRule(nfaStates: number[]): number {
    let minRule = -1;
    for (const s of nfaStates) {
      if (nfa.accept.has(s)) {
        const ruleId = nfa.accept.get(s)!;
        if (minRule === -1 || ruleId < minRule) {
          minRule = ruleId;
        }
      }
    }
    return minRule;
  }

  // Register state 0 (q0)
  const startKey = setKey(startClosure);
  stateMap.set(startKey, 0);
  dfaStateNfaSets.push(startClosure);
  transitions.push(new Map());
  acceptRules.push(getAcceptRule(startClosure));

  const queue: number[] = [0];

  while (queue.length > 0) {
    const dfaState = queue.shift()!;
    const nfaSet = dfaStateNfaSets[dfaState]!;

    for (let atom = 0; atom < numAtoms; atom++) {
      const moved = moveNFA(nfaSet, atom, nfa);
      if (moved.size === 0) continue;

      const closure = epsilonClosure(moved, nfa);
      const sortedClosure = Array.from(closure).sort((a, b) => a - b);
      const key = setKey(sortedClosure);

      let targetState = stateMap.get(key);
      let isNew = false;

      if (targetState === undefined) {
        if (dfaStateNfaSets.length >= maxStates) {
          throw new Error(
            `Subset construction exceeded safety limit of ${maxStates} states.`
          );
        }
        targetState = dfaStateNfaSets.length;
        stateMap.set(key, targetState);
        dfaStateNfaSets.push(sortedClosure);
        transitions.push(new Map());
        acceptRules.push(getAcceptRule(sortedClosure));
        queue.push(targetState);
        isNew = true;
      }

      transitions[dfaState]!.set(atom, targetState);

      logs.push({
        step: ++stepCount,
        sourceDfaState: dfaState,
        nfaSet: [...nfaSet],
        atom,
        moveSet: Array.from(moved).sort((a, b) => a - b),
        closureSet: sortedClosure,
        targetDfaState: targetState,
        isNew,
      });
    }
  }

  // Build flat table representation
  const numStates = dfaStateNfaSets.length;
  const table = new Int32Array(numStates * numAtoms);
  table.fill(-1);

  for (let s = 0; s < numStates; s++) {
    const transMap = transitions[s]!;
    for (const [atom, target] of transMap.entries()) {
      table[s * numAtoms + atom] = target;
    }
  }

  const acceptRuleArray = new Int16Array(numStates);
  for (let s = 0; s < numStates; s++) {
    acceptRuleArray[s] = acceptRules[s]!;
  }

  const stateLabels = Array.from({ length: numStates }, (_, i) => `q${i}`);

  return {
    dfa: {
      numStates,
      numAtoms,
      start: 0,
      table,
      acceptRule: acceptRuleArray,
      stateNfaSets: dfaStateNfaSets,
      stateLabels,
    },
    logs,
  };
}
