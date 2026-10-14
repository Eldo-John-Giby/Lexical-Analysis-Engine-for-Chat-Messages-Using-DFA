import { describe, it, expect } from 'vitest';
import { parseRegex } from '../src/engine/regex/parser';
import { buildClassifier, NAMED_CLASSES, singleCharSet } from '../src/engine/charclass';
import { buildThompsonNFA } from '../src/engine/nfa/thompson';
import { simulateNFA } from '../src/engine/nfa/simulate';
import { subsetConstruction } from '../src/engine/dfa/subset';
import { minimizeMoore } from '../src/engine/dfa/minimize-moore';
import { minimizeHopcroft } from '../src/engine/dfa/minimize-hopcroft';
import { matchFull } from '../src/engine/dfa/table';
import { simulateDFA } from '../src/engine/dfa/simulate';

describe('NFA and DFA Automata Machinery', () => {
  it('compiles (a|b)*abb into 4-state minimal DFA (classic textbook example)', () => {
    const ast = parseRegex('(a|b)*abb');
    const classifier = buildClassifier(NAMED_CLASSES, [singleCharSet('a'), singleCharSet('b')]);
    const { nfa, logs: thompsonLogs } = buildThompsonNFA(ast, classifier, 1);
    expect(nfa.numStates).toBeGreaterThan(0);
    expect(thompsonLogs.length).toBeGreaterThan(0);

    const { dfa: rawDfa, logs: subsetLogs } = subsetConstruction(nfa, classifier.numAtoms);
    expect(subsetLogs.length).toBeGreaterThan(0);

    const { dfa: mooreDfa, rounds: mooreRounds } = minimizeMoore(rawDfa);
    const hopcroftDfa = minimizeHopcroft(rawDfa);

    // Textbook: (a|b)*abb has exactly 4 states in its minimal DFA
    expect(mooreDfa.numStates).toBe(4);
    expect(hopcroftDfa.numStates).toBe(4);
    expect(mooreDfa.numStates).toBe(hopcroftDfa.numStates);
    expect(mooreRounds.length).toBeGreaterThan(0);

    // Acceptance tests
    const positiveWords = ['abb', 'aabb', 'babb', 'ababb', 'bbabb', 'aaabb'];
    const negativeWords = ['', 'a', 'b', 'ab', 'ba', 'abba', 'bba', 'abbb'];

    for (const w of positiveWords) {
      expect(simulateNFA(nfa, w, classifier)).toBe(true);
      expect(simulateDFA(rawDfa, w, classifier)).toBe(true);
      expect(matchFull(mooreDfa, w, classifier)).toBe(true);
      expect(matchFull(hopcroftDfa, w, classifier)).toBe(true);
    }

    for (const w of negativeWords) {
      expect(simulateNFA(nfa, w, classifier)).toBe(false);
      expect(simulateDFA(rawDfa, w, classifier)).toBe(false);
      expect(matchFull(mooreDfa, w, classifier)).toBe(false);
      expect(matchFull(hopcroftDfa, w, classifier)).toBe(false);
    }
  });

  it('compiles a*b* and verifies Moore == Hopcroft equivalence', () => {
    const ast = parseRegex('a*b*');
    const classifier = buildClassifier(NAMED_CLASSES, [singleCharSet('a'), singleCharSet('b')]);
    const { nfa } = buildThompsonNFA(ast, classifier, 2);
    const { dfa: rawDfa } = subsetConstruction(nfa, classifier.numAtoms);

    const { dfa: mooreDfa } = minimizeMoore(rawDfa);
    const hopcroftDfa = minimizeHopcroft(rawDfa);

    expect(mooreDfa.numStates).toBe(hopcroftDfa.numStates);

    const tests = [
      { text: '', expected: true },
      { text: 'a', expected: true },
      { text: 'b', expected: true },
      { text: 'aaabbb', expected: true },
      { text: 'ba', expected: false },
      { text: 'aba', expected: false },
    ];

    for (const { text, expected } of tests) {
      expect(simulateNFA(nfa, text, classifier)).toBe(expected);
      expect(matchFull(mooreDfa, text, classifier)).toBe(expected);
      expect(matchFull(hopcroftDfa, text, classifier)).toBe(expected);
    }
  });

  it('verifies DFA and NFA agree on random strings', () => {
    const ast = parseRegex('(0|1)*1(0|1)');
    const classifier = buildClassifier(NAMED_CLASSES, [singleCharSet('0'), singleCharSet('1')]);
    const { nfa } = buildThompsonNFA(ast, classifier, 1);
    const { dfa: rawDfa } = subsetConstruction(nfa, classifier.numAtoms);
    const hopcroftDfa = minimizeHopcroft(rawDfa);

    const chars = ['0', '1'];
    // Generate 100 test strings
    for (let i = 0; i < 100; i++) {
      const len = i % 8;
      let s = '';
      for (let j = 0; j < len; j++) {
        s += chars[(i + j * 3) % 2]!;
      }
      const nfaRes = simulateNFA(nfa, s, classifier);
      const dfaRes = matchFull(hopcroftDfa, s, classifier);
      expect(dfaRes).toBe(nfaRes);
    }
  });
});
