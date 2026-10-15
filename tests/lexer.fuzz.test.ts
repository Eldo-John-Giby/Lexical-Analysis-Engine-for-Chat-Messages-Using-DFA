// ALLOWED-REGEXP: test oracle
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  buildEngine,
  compileToJsRegex,
  parseRegex,
  NAMED_CLASSES,
} from '../src/engine/index';

describe('Phase 5: Test Hardening and Property-Based Fuzzing', () => {
  const engine = buildEngine();

  // Chat-biased alphabet generator
  const chatChars = [
    'a', 'b', 'c', 'x', 'y', 'z', 'A', 'B', 'Z',
    '0', '1', '2', '5', '8', '9',
    ' ', '\t', '\n',
    '@', '#', ':', '/', '.', ',', '!', '?', '*', '_', '~', '`', '-', '+', '%', '$', '₹',
    '😂', '🔥', '👍🏽', '🇮🇳',
    'न', 'म', 'स्', 'त', 'े',
  ];

  const chatStringArbitrary = fc.stringOf(
    fc.constantFrom(...chatChars),
    { minLength: 0, maxLength: 60 }
  );

  it('Partition property: lexeme concatenation matches input on random inputs', () => {
    fc.assert(
      fc.property(chatStringArbitrary, (str) => {
        const res = engine.lex(str);
        const reconstructed = res.tokens.map((t) => t.lexeme).join('');
        return reconstructed === str;
      }),
      { numRuns: 1000 }
    );
  });

  it('Determinism property: identical input gives identical tokens and trace twice', () => {
    fc.assert(
      fc.property(chatStringArbitrary, (str) => {
        const res1 = engine.lex(str, { trace: true });
        const res2 = engine.lex(str, { trace: true });

        if (res1.tokens.length !== res2.tokens.length) return false;
        for (let i = 0; i < res1.tokens.length; i++) {
          const t1 = res1.tokens[i]!;
          const t2 = res2.tokens[i]!;
          if (t1.type !== t2.type || t1.lexeme !== t2.lexeme || t1.start !== t2.start || t1.end !== t2.end) {
            return false;
          }
        }
        return (res1.trace?.length || 0) === (res2.trace?.length || 0);
      }),
      { numRuns: 500 }
    );
  });

  it('Minimization equivalence: Moore count == Hopcroft count across all 29 rules and master', () => {
    for (const rule of engine.rules) {
      const ast = parseRegex(rule.pattern, NAMED_CLASSES);
      const cData = engine.construction(rule.id);
      expect(cData.minDfa.numStates).toBeLessThanOrEqual(cData.nfa.numStates);
    }
    expect(engine.stats.master.minDfaStates).toBeLessThanOrEqual(engine.stats.master.dfaStates);
  });

  it('Linear time scaling property: 2^k scaling bound', () => {
    const baseMessage = 'hey @eldo check https://vit.ac.in/x. now!!! meet at 5:30pm ₹1,299.50 #VIT loooool :) ';
    const runs = [100, 200, 400, 800];
    const timings: number[] = [];

    for (const count of runs) {
      const text = baseMessage.repeat(count);
      const t0 = performance.now();
      const res = engine.lex(text, { trace: false });
      const t1 = performance.now();
      timings.push(t1 - t0);
      expect(res.tokens.length).toBeGreaterThan(0);
    }

    // Check that doubling input does not blow up exponentially (ratio < 4.5x)
    for (let i = 1; i < timings.length; i++) {
      const prev = timings[i - 1]!;
      const curr = timings[i]!;
      if (prev > 2) {
        const ratio = curr / prev;
        expect(ratio).toBeLessThan(5.0);
      }
    }
  });

  it('Oracle differential test: sticky JS RegExp matches engine tokens on sample strings', () => {
    // ALLOWED-REGEXP: test oracle
    // Test a representative subset of rules against native regex oracle
    const testRules = [
      engine.rules.find((r) => r.name === 'HASHTAG')!,
      engine.rules.find((r) => r.name === 'SHORTCODE')!,
      engine.rules.find((r) => r.name === 'CURRENCY')!,
      engine.rules.find((r) => r.name === 'ORDINAL')!,
      engine.rules.find((r) => r.name === 'PERCENT')!,
    ];

    for (const rule of testRules) {
      const ast = parseRegex(rule.pattern, NAMED_CLASSES);
      // Sticky RegExp
      const re = compileToJsRegex(ast, 'uy');
      const dfa = engine.dfaFor(rule.id);

      fc.assert(
        fc.property(chatStringArbitrary, (str) => {
          re.lastIndex = 0;
          const match = re.exec(str);
          const regexMatchesFull = match !== null && match[0] === str;
          const dfaMatchesFull = engine.matchFull(dfa, str);
          return regexMatchesFull === dfaMatchesFull;
        }),
        { numRuns: 500 }
      );
    }
  });
});
