import { RegexNode, NFA, AtomId, CharSet } from '../types';
import { Classifier, charSetContains } from '../charclass';

export interface ThompsonStepLog {
  step: number;
  op: string;
  description: string;
  createdStates: number[];
  epsilonEdges: [number, number][];
  atomEdges: [number, AtomId, number][];
}

export interface ThompsonResult {
  nfa: NFA;
  logs: ThompsonStepLog[];
}

interface Fragment {
  start: number;
  accept: number;
}

export function buildThompsonNFA(
  node: RegexNode,
  classifier: Classifier,
  ruleId = 0
): ThompsonResult {
  let stateCounter = 0;
  const eps: number[][] = [];
  const trans: [AtomId, number][][] = [];
  const logs: ThompsonStepLog[] = [];
  let stepIndex = 0;

  function createState(): number {
    const s = stateCounter++;
    eps[s] = [];
    trans[s] = [];
    return s;
  }

  function addEps(from: number, to: number): void {
    eps[from]!.push(to);
  }

  function addTrans(from: number, atom: AtomId, to: number): void {
    trans[from]!.push([atom, to]);
  }

  // Pre-find matching atoms for a CharSet
  function getMatchingAtoms(set: CharSet): AtomId[] {
    const matching: AtomId[] = [];
    for (const atom of classifier.atoms) {
      // Check if any interval in atom's set intersects set
      for (const r of atom.charSet.ranges) {
        if (charSetContains(set, r.lo)) {
          matching.push(atom.id);
          break;
        }
      }
    }
    return matching;
  }

  function buildFragment(n: RegexNode): Fragment {
    switch (n.t) {
      case 'empty': {
        const start = createState();
        const accept = createState();
        // No transitions
        logs.push({
          step: ++stepIndex,
          op: 'empty',
          description: 'Construct empty language fragment (no transitions)',
          createdStates: [start, accept],
          epsilonEdges: [],
          atomEdges: [],
        });
        return { start, accept };
      }

      case 'eps': {
        const start = createState();
        const accept = createState();
        addEps(start, accept);
        logs.push({
          step: ++stepIndex,
          op: 'eps',
          description: `Construct epsilon transition: q${start} --ε--> q${accept}`,
          createdStates: [start, accept],
          epsilonEdges: [[start, accept]],
          atomEdges: [],
        });
        return { start, accept };
      }

      case 'set': {
        const start = createState();
        const accept = createState();
        const atoms = getMatchingAtoms(n.set);
        const atomEdges: [number, AtomId, number][] = [];
        for (const a of atoms) {
          addTrans(start, a, accept);
          atomEdges.push([start, a, accept]);
        }
        logs.push({
          step: ++stepIndex,
          op: 'set',
          description: `Construct symbol transition: q${start} --[${n.label}]--> q${accept} (${atoms.length} atoms)`,
          createdStates: [start, accept],
          epsilonEdges: [],
          atomEdges,
        });
        return { start, accept };
      }

      case 'cat': {
        const fragA = buildFragment(n.a);
        const fragB = buildFragment(n.b);
        addEps(fragA.accept, fragB.start);
        logs.push({
          step: ++stepIndex,
          op: 'concat',
          description: `Concatenation: link q${fragA.accept} --ε--> q${fragB.start}`,
          createdStates: [],
          epsilonEdges: [[fragA.accept, fragB.start]],
          atomEdges: [],
        });
        return { start: fragA.start, accept: fragB.accept };
      }

      case 'alt': {
        const fragA = buildFragment(n.a);
        const fragB = buildFragment(n.b);
        const start = createState();
        const accept = createState();
        addEps(start, fragA.start);
        addEps(start, fragB.start);
        addEps(fragA.accept, accept);
        addEps(fragB.accept, accept);
        logs.push({
          step: ++stepIndex,
          op: 'union',
          description: `Alternation: branch q${start} to q${fragA.start}, q${fragB.start}; merge to q${accept}`,
          createdStates: [start, accept],
          epsilonEdges: [
            [start, fragA.start],
            [start, fragB.start],
            [fragA.accept, accept],
            [fragB.accept, accept],
          ],
          atomEdges: [],
        });
        return { start, accept };
      }

      case 'star': {
        const inner = buildFragment(n.a);
        const start = createState();
        const accept = createState();
        addEps(start, inner.start);
        addEps(start, accept);
        addEps(inner.accept, inner.start);
        addEps(inner.accept, accept);
        logs.push({
          step: ++stepIndex,
          op: 'star',
          description: `Kleene star: loop around q${inner.start}..q${inner.accept}`,
          createdStates: [start, accept],
          epsilonEdges: [
            [start, inner.start],
            [start, accept],
            [inner.accept, inner.start],
            [inner.accept, accept],
          ],
          atomEdges: [],
        });
        return { start, accept };
      }

      case 'plus': {
        const inner = buildFragment(n.a);
        const start = createState();
        const accept = createState();
        addEps(start, inner.start);
        addEps(inner.accept, inner.start);
        addEps(inner.accept, accept);
        logs.push({
          step: ++stepIndex,
          op: 'plus',
          description: `Positive closure: loop back q${inner.accept} to q${inner.start}`,
          createdStates: [start, accept],
          epsilonEdges: [
            [start, inner.start],
            [inner.accept, inner.start],
            [inner.accept, accept],
          ],
          atomEdges: [],
        });
        return { start, accept };
      }

      case 'opt': {
        const inner = buildFragment(n.a);
        const start = createState();
        const accept = createState();
        addEps(start, inner.start);
        addEps(start, accept);
        addEps(inner.accept, accept);
        logs.push({
          step: ++stepIndex,
          op: 'optional',
          description: `Optional: bypass edge q${start} --ε--> q${accept}`,
          createdStates: [start, accept],
          epsilonEdges: [
            [start, inner.start],
            [start, accept],
            [inner.accept, accept],
          ],
          atomEdges: [],
        });
        return { start, accept };
      }

      case 'rep': {
        // Expand repetition
        const min = n.min;
        const max = n.max;

        if (min === 0 && max === null) {
          return buildFragment({ t: 'star', a: n.a });
        }
        if (min === 1 && max === null) {
          return buildFragment({ t: 'plus', a: n.a });
        }
        if (min === 0 && max === 1) {
          return buildFragment({ t: 'opt', a: n.a });
        }

        // Chain 'min' mandatory copies
        const copies: Fragment[] = [];
        for (let i = 0; i < min; i++) {
          copies.push(buildFragment(n.a));
        }

        if (max === null) {
          // Followed by star
          const starFrag = buildFragment({ t: 'star', a: n.a });
          copies.push(starFrag);
        } else {
          // Followed by (max - min) optional copies
          for (let i = 0; i < max - min; i++) {
            copies.push(buildFragment({ t: 'opt', a: n.a }));
          }
        }

        if (copies.length === 0) {
          return buildFragment({ t: 'eps' });
        }

        let curr = copies[0]!;
        for (let i = 1; i < copies.length; i++) {
          const nextFrag = copies[i]!;
          addEps(curr.accept, nextFrag.start);
          curr = { start: curr.start, accept: nextFrag.accept };
        }
        return curr;
      }
    }
  }

  const rootFrag = buildFragment(node);
  const acceptMap = new Map<number, number>();
  acceptMap.set(rootFrag.accept, ruleId);

  return {
    nfa: {
      numStates: stateCounter,
      start: rootFrag.start,
      eps,
      trans,
      accept: acceptMap,
    },
    logs,
  };
}
