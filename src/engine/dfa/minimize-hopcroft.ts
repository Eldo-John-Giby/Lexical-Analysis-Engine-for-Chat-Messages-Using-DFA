import { DFA, AtomId } from '../types';
import { pruneUnreachableAndDead } from './table';

export function minimizeHopcroft(inputDfa: DFA): DFA {
  const dfa = pruneUnreachableAndDead(inputDfa);
  const { numStates, numAtoms, start, table, acceptRule } = dfa;

  if (numStates <= 1) {
    return dfa;
  }

  // 1. Initial partition by acceptRule (-1 for non-accepting, ruleId for accepting)
  const groupMap = new Map<number, Set<number>>();
  for (let s = 0; s < numStates; s++) {
    const key = acceptRule[s]!;
    if (!groupMap.has(key)) {
      groupMap.set(key, new Set());
    }
    groupMap.get(key)!.add(s);
  }

  const P: Set<number>[] = Array.from(groupMap.values()).filter((g) => g.size > 0);
  const W: Set<number>[] = P.map((block) => new Set(block));

  // Build reverse transitions: rev[target][atom] -> array of source states
  const rev: number[][][] = Array.from({ length: numStates }, () =>
    Array.from({ length: numAtoms }, () => [])
  );
  for (let s = 0; s < numStates; s++) {
    for (let a = 0; a < numAtoms; a++) {
      const target = table[s * numAtoms + a]!;
      if (target !== -1) {
        rev[target]![a]!.push(s);
      }
    }
  }

  while (W.length > 0) {
    const A = W.pop()!;

    for (let a = 0; a < numAtoms; a++) {
      // Find X: states that transition on atom 'a' to some state in A
      const X = new Set<number>();
      for (const target of A) {
        const sources = rev[target]![a] || [];
        for (const s of sources) {
          X.add(s);
        }
      }

      if (X.size === 0) continue;

      // Check each block Y in P
      for (let i = P.length - 1; i >= 0; i--) {
        const Y = P[i]!;

        // Compute intersection Y1 = Y ∩ X and difference Y2 = Y \ X
        const Y1 = new Set<number>();
        const Y2 = new Set<number>();

        for (const s of Y) {
          if (X.has(s)) {
            Y1.add(s);
          } else {
            Y2.add(s);
          }
        }

        if (Y1.size > 0 && Y2.size > 0) {
          // Replace Y with Y1 and Y2 in P
          P.splice(i, 1, Y1, Y2);

          // Update W
          const wIndex = W.findIndex((b) => b === Y);
          if (wIndex !== -1) {
            W.splice(wIndex, 1, Y1, Y2);
          } else {
            if (Y1.size <= Y2.size) {
              W.push(Y1);
            } else {
              W.push(Y2);
            }
          }
        }
      }
    }
  }

  // Find start state's block
  let startBlockIdx = 0;
  for (let b = 0; b < P.length; b++) {
    if (P[b]!.has(start)) {
      startBlockIdx = b;
      break;
    }
  }

  // Put start block first
  const orderedBlocks: number[][] = [Array.from(P[startBlockIdx]!)];
  for (let b = 0; b < P.length; b++) {
    if (b !== startBlockIdx) {
      orderedBlocks.push(Array.from(P[b]!));
    }
  }

  const newNumStates = orderedBlocks.length;
  const oldToNew = new Int32Array(numStates);
  for (let newS = 0; newS < newNumStates; newS++) {
    for (const oldS of orderedBlocks[newS]!) {
      oldToNew[oldS] = newS;
    }
  }

  const newTable = new Int32Array(newNumStates * numAtoms);
  newTable.fill(-1);
  const newAccept = new Int16Array(newNumStates);
  const newStateNfaSets: number[][] = [];

  for (let newS = 0; newS < newNumStates; newS++) {
    const repOld = orderedBlocks[newS]![0]!;
    newAccept[newS] = acceptRule[repOld]!;

    if (dfa.stateNfaSets) {
      const mergedNfaSet = new Set<number>();
      for (const oldS of orderedBlocks[newS]!) {
        const nfaSet = dfa.stateNfaSets[oldS] || [];
        for (const id of nfaSet) mergedNfaSet.add(id);
      }
      newStateNfaSets.push(Array.from(mergedNfaSet).sort((a, b) => a - b));
    }

    for (let a = 0; a < numAtoms; a++) {
      const targetOld = table[repOld * numAtoms + a]!;
      if (targetOld !== -1) {
        newTable[newS * numAtoms + a] = oldToNew[targetOld]!;
      }
    }
  }

  const stateLabels = Array.from({ length: newNumStates }, (_, i) => `q${i}`);

  return {
    numStates: newNumStates,
    numAtoms,
    start: 0,
    table: newTable,
    acceptRule: newAccept,
    stateNfaSets: dfa.stateNfaSets ? newStateNfaSets : undefined,
    stateLabels,
  };
}
