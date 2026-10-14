import { DFA, AtomId } from '../types';
import { pruneUnreachableAndDead } from './table';

export interface MooreSplitReason {
  stateA: number;
  stateB: number;
  atom: AtomId;
  reason: string;
}

export interface MooreRoundLog {
  round: number;
  partition: number[][]; // blocks of state IDs
  splits: MooreSplitReason[];
}

export interface MooreResult {
  dfa: DFA;
  rounds: MooreRoundLog[];
}

export function minimizeMoore(inputDfa: DFA): MooreResult {
  const dfa = pruneUnreachableAndDead(inputDfa);
  const { numStates, numAtoms, start, table, acceptRule } = dfa;

  if (numStates <= 1) {
    return {
      dfa,
      rounds: [{ round: 0, partition: [[0]], splits: [] }],
    };
  }

  // 1. Initial partition by accepting ruleId (-1 for non-accepting, ruleId for accepting)
  const initialGroups = new Map<number, number[]>();
  for (let s = 0; s < numStates; s++) {
    const key = acceptRule[s]!;
    if (!initialGroups.has(key)) {
      initialGroups.set(key, []);
    }
    initialGroups.get(key)!.push(s);
  }

  let partition: number[][] = Array.from(initialGroups.values()).filter((g) => g.length > 0);

  // Map each state to its current block index
  const stateBlock = new Int32Array(numStates);
  for (let b = 0; b < partition.length; b++) {
    for (const s of partition[b]!) {
      stateBlock[s] = b;
    }
  }

  const rounds: MooreRoundLog[] = [
    {
      round: 0,
      partition: partition.map((b) => [...b]),
      splits: [],
    },
  ];

  let roundNum = 0;
  let changed = true;

  while (changed) {
    changed = false;
    roundNum++;
    const nextPartition: number[][] = [];
    const splits: MooreSplitReason[] = [];

    for (const block of partition) {
      if (block.length <= 1) {
        nextPartition.push(block);
        continue;
      }

      // Group states in block by their transition signature: (targetBlock for each atom)
      const subGroups = new Map<string, number[]>();
      const repState = block[0]!;

      for (const s of block) {
        let sig = '';
        for (let a = 0; a < numAtoms; a++) {
          const target = table[s * numAtoms + a]!;
          const targetBlock = target === -1 ? -1 : stateBlock[target]!;
          sig += `${targetBlock},`;
        }

        if (!subGroups.has(sig)) {
          subGroups.set(sig, []);
          if (s !== repState) {
            // Find which atom caused the split between repState and s
            for (let a = 0; a < numAtoms; a++) {
              const repTarget = table[repState * numAtoms + a]!;
              const repBlock = repTarget === -1 ? -1 : stateBlock[repTarget]!;
              const sTarget = table[s * numAtoms + a]!;
              const sBlock = sTarget === -1 ? -1 : stateBlock[sTarget]!;
              if (repBlock !== sBlock) {
                splits.push({
                  stateA: repState,
                  stateB: s,
                  atom: a,
                  reason: `q${repState} transitions to block ${repBlock} on atom ${a}, while q${s} transitions to block ${sBlock}`,
                });
                break;
              }
            }
          }
        }
        subGroups.get(sig)!.push(s);
      }

      if (subGroups.size > 1) {
        changed = true;
      }
      for (const sub of subGroups.values()) {
        nextPartition.push(sub);
      }
    }

    partition = nextPartition;
    for (let b = 0; b < partition.length; b++) {
      for (const s of partition[b]!) {
        stateBlock[s] = b;
      }
    }

    rounds.push({
      round: roundNum,
      partition: partition.map((b) => [...b]),
      splits,
    });
  }

  // Build minimized DFA
  // Re-order blocks so start state block is state 0
  const startBlockIdx = stateBlock[start]!;
  const orderedBlocks: number[][] = [partition[startBlockIdx]!];
  for (let b = 0; b < partition.length; b++) {
    if (b !== startBlockIdx) {
      orderedBlocks.push(partition[b]!);
    }
  }

  const newNumStates = orderedBlocks.length;
  const blockToNewState = new Int32Array(newNumStates);
  const oldStateToNewState = new Int32Array(numStates);

  for (let newS = 0; newS < newNumStates; newS++) {
    for (const oldS of orderedBlocks[newS]!) {
      oldStateToNewState[oldS] = newS;
    }
  }

  const newTable = new Int32Array(newNumStates * numAtoms);
  newTable.fill(-1);
  const newAccept = new Int16Array(newNumStates);
  const newStateNfaSets: number[][] = [];

  for (let newS = 0; newS < newNumStates; newS++) {
    const repOld = orderedBlocks[newS]![0]!;
    newAccept[newS] = acceptRule[repOld]!;

    // Merge NFA sets if available
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
        newTable[newS * numAtoms + a] = oldStateToNewState[targetOld]!;
      }
    }
  }

  const stateLabels = Array.from({ length: newNumStates }, (_, i) => `q${i}`);

  return {
    dfa: {
      numStates: newNumStates,
      numAtoms,
      start: 0,
      table: newTable,
      acceptRule: newAccept,
      stateNfaSets: dfa.stateNfaSets ? newStateNfaSets : undefined,
      stateLabels,
    },
    rounds,
  };
}
