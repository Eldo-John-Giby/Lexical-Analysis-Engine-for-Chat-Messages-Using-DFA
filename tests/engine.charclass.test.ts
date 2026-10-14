import { describe, it, expect } from 'vitest';
import {
  normalizeIntervals,
  unionCharSets,
  intersectCharSets,
  minusCharSets,
  notCharSet,
  createCharSet,
  singleCharSet,
  charRangeSet,
  buildClassifier,
  NAMED_CLASSES,
  MAX_CODE_POINT,
} from '../src/engine/charclass';

describe('Interval Set Operations', () => {
  it('normalizes and merges overlapping and adjacent intervals', () => {
    const raw = [
      { lo: 5, hi: 10 },
      { lo: 1, hi: 3 },
      { lo: 4, hi: 6 },
      { lo: 13, hi: 15 },
      { lo: 12, hi: 12 },
    ];
    const normalized = normalizeIntervals(raw);
    expect(normalized).toEqual([
      { lo: 1, hi: 10 },
      { lo: 12, hi: 15 },
    ]);
  });

  it('unions character sets correctly', () => {
    const setA = createCharSet([{ lo: 10, hi: 20 }]);
    const setB = createCharSet([{ lo: 21, hi: 30 }, { lo: 40, hi: 50 }]);
    const u = unionCharSets(setA, setB);
    expect(u.ranges).toEqual([
      { lo: 10, hi: 30 },
      { lo: 40, hi: 50 },
    ]);
  });

  it('intersects character sets correctly', () => {
    const setA = createCharSet([{ lo: 10, hi: 25 }, { lo: 30, hi: 40 }]);
    const setB = createCharSet([{ lo: 20, hi: 35 }]);
    const inter = intersectCharSets(setA, setB);
    expect(inter.ranges).toEqual([
      { lo: 20, hi: 25 },
      { lo: 30, hi: 35 },
    ]);
  });

  it('computes difference (minus) correctly', () => {
    const setA = createCharSet([{ lo: 10, hi: 50 }]);
    const setB = createCharSet([{ lo: 20, hi: 30 }]);
    const diff = minusCharSets(setA, setB);
    expect(diff.ranges).toEqual([
      { lo: 10, hi: 19 },
      { lo: 31, hi: 50 },
    ]);
  });

  it('computes complement (not) correctly', () => {
    const setA = createCharSet([{ lo: 10, hi: 20 }]);
    const notA = notCharSet(setA, 30);
    expect(notA.ranges).toEqual([
      { lo: 0, hi: 9 },
      { lo: 21, hi: 30 },
    ]);
  });
});

describe('Atom Partitioning and Classifier', () => {
  const classifier = buildClassifier(NAMED_CLASSES);

  it('partitions 0..0x10FFFF without gaps or overlaps', () => {
    expect(classifier.intervals.length).toBeGreaterThan(0);
    expect(classifier.intervals[0]!.lo).toBe(0);
    expect(classifier.intervals[classifier.intervals.length - 1]!.hi).toBe(MAX_CODE_POINT);

    for (let i = 0; i < classifier.intervals.length - 1; i++) {
      const cur = classifier.intervals[i]!;
      const next = classifier.intervals[i + 1]!;
      expect(next.lo).toBe(cur.hi + 1);
    }
  });

  it('has atom count within budget (< 80)', () => {
    console.log(`Named classes atom count: ${classifier.numAtoms}`);
    expect(classifier.numAtoms).toBeLessThan(80);
  });

  it('correctly classifies sample characters', () => {
    // Sample characters from syllabus: a, Z, 5, ए, த, 😂, ZWJ
    const atom_a = classifier.atomForChar('a');
    const atom_Z = classifier.atomForChar('Z');
    const atom_5 = classifier.atomForChar('5');
    const atom_e = classifier.atomForChar('ए'); // Devanagari E (U+090F)
    const atom_ta = classifier.atomForChar('த'); // Tamil Ta (U+0BA4)
    const atom_joy = classifier.classify(0x1F602); // 😂
    const atom_zwj = classifier.classify(0x200D); // ZWJ

    // Verify 'a' and 'Z' belong to letter atom
    expect(classifier.atoms[atom_a]!.label).toMatch(/L|ID/);
    expect(classifier.atoms[atom_Z]!.label).toMatch(/L|ID/);

    // Verify '5' belongs to digit atom
    expect(classifier.atoms[atom_5]!.label).toBe('D');

    // Verify Indic letters belong to L
    expect(classifier.atoms[atom_e]!.label).toMatch(/L/);
    expect(classifier.atoms[atom_ta]!.label).toMatch(/L/);

    // Verify Emoji belongs to EP
    expect(classifier.atoms[atom_joy]!.label).toBe('EP');

    // Verify ZWJ belongs to ZWJ
    expect(classifier.atoms[atom_zwj]!.label).toBe('ZWJ');
  });

  it('ASCII lookup matches binary search classify exactly', () => {
    for (let cp = 0; cp < 256; cp++) {
      expect(classifier.asciiLookup[cp]).toBe(classifier.classify(cp));
    }
  });
});
