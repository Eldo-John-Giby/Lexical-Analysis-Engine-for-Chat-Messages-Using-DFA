import { DFA, AtomId } from '../types';
import { Classifier } from '../charclass';

export function matchFull(dfa: DFA, text: string, classifier: Classifier): boolean {
  let state = dfa.start;
  const numAtoms = dfa.numAtoms;

  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i)!;
    const atom = classifier.classify(cp);
    const next = dfa.table[state * numAtoms + atom];
    if (next === undefined || next === -1) {
      return false;
    }
    state = next;
    i += cp > 0xffff ? 2 : 1;
  }

  return dfa.acceptRule[state] !== undefined && dfa.acceptRule[state] !== -1;
}

export function pruneUnreachableAndDead(dfa: DFA): DFA {
  const { numStates, numAtoms, start, table, acceptRule } = dfa;

  // 1. Find reachable states via BFS from start
  const reachable = new Uint8Array(numStates);
  const reachQueue: number[] = [start];
  reachable[start] = 1;

  while (reachQueue.length > 0) {
    const s = reachQueue.shift()!;
    for (let a = 0; a < numAtoms; a++) {
      const target = table[s * numAtoms + a]!;
      if (target !== -1 && !reachable[target]) {
        reachable[target] = 1;
        reachQueue.push(target);
      }
    }
  }

  // 2. Find alive states (can reach an accepting state) via backward BFS
  // Build reverse adjacency list
  const revTrans: number[][] = Array.from({ length: numStates }, () => []);
  for (let s = 0; s < numStates; s++) {
    if (!reachable[s]) continue;
    for (let a = 0; a < numAtoms; a++) {
      const target = table[s * numAtoms + a]!;
      if (target !== -1 && reachable[target]) {
        revTrans[target]!.push(s);
      }
    }
  }

  const alive = new Uint8Array(numStates);
  const aliveQueue: number[] = [];

  for (let s = 0; s < numStates; s++) {
    if (reachable[s] && acceptRule[s] !== -1) {
      alive[s] = 1;
      aliveQueue.push(s);
    }
  }

  while (aliveQueue.length > 0) {
    const target = aliveQueue.shift()!;
    for (const pred of revTrans[target] || []) {
      if (!alive[pred]) {
        alive[pred] = 1;
        aliveQueue.push(pred);
      }
    }
  }

  // Keep state if it is reachable AND (alive OR start state)
  const keep = new Uint8Array(numStates);
  for (let s = 0; s < numStates; s++) {
    if (s === start || (reachable[s] && alive[s])) {
      keep[s] = 1;
    }
  }

  // Re-map states in BFS order starting from start
  const oldToNew = new Int32Array(numStates);
  oldToNew.fill(-1);

  const newBfsOrder: number[] = [];
  const visited = new Uint8Array(numStates);
  const q = [start];
  visited[start] = 1;

  while (q.length > 0) {
    const s = q.shift()!;
    if (keep[s]) {
      oldToNew[s] = newBfsOrder.length;
      newBfsOrder.push(s);
    }
    for (let a = 0; a < numAtoms; a++) {
      const target = table[s * numAtoms + a]!;
      if (target !== -1 && keep[target] && !visited[target]) {
        visited[target] = 1;
        q.push(target);
      }
    }
  }

  const newNumStates = newBfsOrder.length;
  if (newNumStates === 0) {
    // Empty language DFA
    const t = new Int32Array(numAtoms);
    t.fill(-1);
    const acc = new Int16Array(1);
    acc[0] = -1;
    return {
      numStates: 1,
      numAtoms,
      start: 0,
      table: t,
      acceptRule: acc,
      stateLabels: ['q0'],
    };
  }

  const newTable = new Int32Array(newNumStates * numAtoms);
  newTable.fill(-1);
  const newAccept = new Int16Array(newNumStates);
  const newStateNfaSets: number[][] = [];
  const newStateLabels: string[] = [];

  for (let newS = 0; newS < newNumStates; newS++) {
    const oldS = newBfsOrder[newS]!;
    newAccept[newS] = acceptRule[oldS]!;
    newStateLabels.push(`q${newS}`);
    if (dfa.stateNfaSets && dfa.stateNfaSets[oldS]) {
      newStateNfaSets.push(dfa.stateNfaSets[oldS]!);
    }

    for (let a = 0; a < numAtoms; a++) {
      const oldTarget = table[oldS * numAtoms + a]!;
      if (oldTarget !== -1 && keep[oldTarget]) {
        newTable[newS * numAtoms + a] = oldToNew[oldTarget]!;
      }
    }
  }

  return {
    numStates: newNumStates,
    numAtoms,
    start: oldToNew[start]!,
    table: newTable,
    acceptRule: newAccept,
    stateNfaSets: dfa.stateNfaSets ? newStateNfaSets : undefined,
    stateLabels: newStateLabels,
  };
}
