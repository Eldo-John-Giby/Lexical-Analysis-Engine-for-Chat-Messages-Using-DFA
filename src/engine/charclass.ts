import { Interval, CharSet, AtomId } from './types';
import {
  UNICODE_LETTER_RANGES,
  UNICODE_MARK_RANGES,
  UNICODE_EP_RANGES,
} from './unicode-tables.generated';

export const MAX_CODE_POINT = 0x10FFFF;

// --- Interval Set Operations ---

export function normalizeIntervals(intervals: readonly Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.lo - b.lo);
  const result: Interval[] = [];

  let current = { lo: sorted[0]!.lo, hi: sorted[0]!.hi };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]!;
    if (next.lo <= current.hi + 1) {
      if (next.hi > current.hi) {
        current.hi = next.hi;
      }
    } else {
      result.push(current);
      current = { lo: next.lo, hi: next.hi };
    }
  }
  result.push(current);
  return result;
}

export function createCharSet(intervals: readonly Interval[]): CharSet {
  return { ranges: normalizeIntervals(intervals) };
}

export function singleCharSet(ch: string | number): CharSet {
  const cp = typeof ch === 'string' ? ch.codePointAt(0)! : ch;
  return { ranges: [{ lo: cp, hi: cp }] };
}

export function charRangeSet(lo: string | number, hi: string | number): CharSet {
  const loCp = typeof lo === 'string' ? lo.codePointAt(0)! : lo;
  const hiCp = typeof hi === 'string' ? hi.codePointAt(0)! : hi;
  if (loCp > hiCp) return { ranges: [] };
  return { ranges: [{ lo: loCp, hi: hiCp }] };
}

export function unionCharSets(...sets: readonly CharSet[]): CharSet {
  const allRanges: Interval[] = [];
  for (const s of sets) {
    for (const r of s.ranges) {
      allRanges.push(r);
    }
  }
  return { ranges: normalizeIntervals(allRanges) };
}

export function intersectCharSets(a: CharSet, b: CharSet): CharSet {
  const result: Interval[] = [];
  let i = 0;
  let j = 0;

  while (i < a.ranges.length && j < b.ranges.length) {
    const ra = a.ranges[i]!;
    const rb = b.ranges[j]!;

    const lo = Math.max(ra.lo, rb.lo);
    const hi = Math.min(ra.hi, rb.hi);

    if (lo <= hi) {
      result.push({ lo, hi });
    }

    if (ra.hi < rb.hi) {
      i++;
    } else {
      j++;
    }
  }

  return { ranges: result };
}

export function notCharSet(a: CharSet, maxCp = MAX_CODE_POINT): CharSet {
  const result: Interval[] = [];
  let curr = 0;

  for (const r of a.ranges) {
    if (r.lo > curr) {
      result.push({ lo: curr, hi: Math.min(r.lo - 1, maxCp) });
    }
    curr = Math.max(curr, r.hi + 1);
    if (curr > maxCp) break;
  }

  if (curr <= maxCp) {
    result.push({ lo: curr, hi: maxCp });
  }

  return { ranges: result };
}

export function minusCharSets(a: CharSet, b: CharSet): CharSet {
  return intersectCharSets(a, notCharSet(b));
}

export function charSetContains(set: CharSet, cp: number): boolean {
  let low = 0;
  let high = set.ranges.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const r = set.ranges[mid]!;
    if (cp >= r.lo && cp <= r.hi) return true;
    if (cp < r.lo) high = mid - 1;
    else low = mid + 1;
  }
  return false;
}

// Helper to build set from string characters
export function stringCharsSet(chars: string): CharSet {
  const intervals: Interval[] = [];
  for (let i = 0; i < chars.length; ) {
    const cp = chars.codePointAt(i)!;
    intervals.push({ lo: cp, hi: cp });
    i += cp > 0xffff ? 2 : 1;
  }
  return createCharSet(intervals);
}

// --- Named Character Classes (Section 5.5) ---

export const CLASS_L = createCharSet(UNICODE_LETTER_RANGES);
export const CLASS_M = createCharSet(UNICODE_MARK_RANGES);
export const CLASS_D = charRangeSet('0', '9');
export const CLASS_WS = createCharSet([
  { lo: 0x20, hi: 0x20 }, // space
  { lo: 0x09, hi: 0x09 }, // tab
  { lo: 0x00a0, hi: 0x00a0 }, // non-breaking space
]);
export const CLASS_NL = createCharSet([
  { lo: 0x0a, hi: 0x0a }, // \n
  { lo: 0x0d, hi: 0x0d }, // \r
]);
export const CLASS_CTRL = createCharSet([
  { lo: 0x00, hi: 0x08 },
  { lo: 0x0b, hi: 0x0c },
  { lo: 0x0e, hi: 0x1f },
  { lo: 0x7f, hi: 0x7f },
]);
export const CLASS_ID = unionCharSets(
  charRangeSet('a', 'z'),
  charRangeSet('A', 'Z'),
  CLASS_D,
  singleCharSet('_')
);
export const CLASS_EP = createCharSet(UNICODE_EP_RANGES);
export const CLASS_ZWJ = singleCharSet(0x200d);
export const CLASS_VS16 = singleCharSet(0xfe0f);
export const CLASS_SKIN = charRangeSet(0x1f3fb, 0x1f3ff);
export const CLASS_RI = charRangeSet(0x1f1e6, 0x1f1ff);
export const CLASS_VIS = notCharSet(unionCharSets(CLASS_WS, CLASS_NL, CLASS_CTRL));

// URLC: any char except whitespace, control, <, >, ", `
export const CLASS_URLC = minusCharSets(
  CLASS_VIS,
  stringCharsSet('<>"`')
);

// URLE: URLC minus . , ! ? ; : ) ] ' * _ ~
export const CLASS_URLE = minusCharSets(
  CLASS_URLC,
  stringCharsSet('.,!?;:)]\'*_~')
);

export const NAMED_CLASSES: Record<string, CharSet> = {
  L: CLASS_L,
  M: CLASS_M,
  D: CLASS_D,
  WS: CLASS_WS,
  NL: CLASS_NL,
  CTRL: CLASS_CTRL,
  ID: CLASS_ID,
  EP: CLASS_EP,
  ZWJ: CLASS_ZWJ,
  VS16: CLASS_VS16,
  SKIN: CLASS_SKIN,
  RI: CLASS_RI,
  URLC: CLASS_URLC,
  URLE: CLASS_URLE,
  VIS: CLASS_VIS,
};

// --- Atom Classifier System ---

export interface Atom {
  id: AtomId;
  label: string;
  charSet: CharSet;
}

export interface Classifier {
  atoms: Atom[];
  numAtoms: number;
  classify: (cp: number) => AtomId;
  atomForChar: (ch: string) => AtomId;
  atomLabels: string[];
  asciiLookup: Uint16Array;
  // All sorted contiguous intervals covering 0..MAX_CODE_POINT
  intervals: { lo: number; hi: number; atomId: AtomId }[];
}

/**
 * Builds the atom partition from a list of base CharSets.
 * Ensures the atoms partition 0..0x10FFFF completely and without overlap.
 */
export function buildClassifier(classes: Record<string, CharSet>): Classifier {
  // 1. Gather all cut boundaries
  const boundarySet = new Set<number>();
  boundarySet.add(0);
  boundarySet.add(MAX_CODE_POINT + 1);

  for (const set of Object.values(classes)) {
    for (const r of set.ranges) {
      if (r.lo >= 0 && r.lo <= MAX_CODE_POINT + 1) boundarySet.add(r.lo);
      if (r.hi + 1 >= 0 && r.hi + 1 <= MAX_CODE_POINT + 1) boundarySet.add(r.hi + 1);
    }
  }

  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
  const classEntries = Object.entries(classes);

  // 2. Compute signature for each elementary interval
  // Signature maps to an integer atom ID
  const sigToAtomId = new Map<string, AtomId>();
  const atomIntervalsMap = new Map<AtomId, Interval[]>();
  const atomSigMap = new Map<AtomId, string>();
  let nextAtomId = 0;

  const elementaryIntervals: { lo: number; hi: number; atomId: AtomId }[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const lo = boundaries[i]!;
    const hi = boundaries[i + 1]! - 1;
    if (lo > hi) continue;

    // Sample the midpoint to determine class membership
    const sample = lo;
    let sig = '';
    for (let c = 0; c < classEntries.length; c++) {
      const isMember = charSetContains(classEntries[c]![1], sample);
      if (isMember) {
        sig += `${c},`;
      }
    }

    let atomId = sigToAtomId.get(sig);
    if (atomId === undefined) {
      atomId = nextAtomId++;
      sigToAtomId.set(sig, atomId);
      atomIntervalsMap.set(atomId, []);
      atomSigMap.set(atomId, sig);
    }

    atomIntervalsMap.get(atomId)!.push({ lo, hi });
    elementaryIntervals.push({ lo, hi, atomId });
  }

  // 3. Compact elementary intervals (merge adjacent intervals with same atomId)
  const mergedIntervals: { lo: number; hi: number; atomId: AtomId }[] = [];
  if (elementaryIntervals.length > 0) {
    let curr = { ...elementaryIntervals[0]! };
    for (let i = 1; i < elementaryIntervals.length; i++) {
      const next = elementaryIntervals[i]!;
      if (next.atomId === curr.atomId && next.lo === curr.hi + 1) {
        curr.hi = next.hi;
      } else {
        mergedIntervals.push(curr);
        curr = { ...next };
      }
    }
    mergedIntervals.push(curr);
  }

  // 4. Precompute ASCII fast lookup array (0..255)
  const asciiLookup = new Uint16Array(256);
  let intervalIdx = 0;
  for (let cp = 0; cp < 256; cp++) {
    while (
      intervalIdx < mergedIntervals.length &&
      mergedIntervals[intervalIdx]!.hi < cp
    ) {
      intervalIdx++;
    }
    asciiLookup[cp] = mergedIntervals[intervalIdx]!.atomId;
  }

  // 5. Binary search classification for code points >= 256
  const classify = (cp: number): AtomId => {
    if (cp < 256) {
      return asciiLookup[cp]!;
    }
    let low = 0;
    let high = mergedIntervals.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const r = mergedIntervals[mid]!;
      if (cp >= r.lo && cp <= r.hi) {
        return r.atomId;
      }
      if (cp < r.lo) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return 0; // fallback (should never occur since 0..MAX_CODE_POINT is partitioned)
  };

  const atomForChar = (ch: string): AtomId => {
    const cp = ch.codePointAt(0);
    return cp !== undefined ? classify(cp) : 0;
  };

  // 6. Build human-readable atom labels
  const atoms: Atom[] = [];
  const atomLabels: string[] = [];

  for (let aId = 0; aId < nextAtomId; aId++) {
    const rawIntervals = atomIntervalsMap.get(aId) || [];
    const charSet = createCharSet(rawIntervals);

    // Determine representative label
    let label = `atom_${aId}`;
    const sig = atomSigMap.get(aId) || '';
    const classIndices = sig
      .split(',')
      .filter(Boolean)
      .map((s) => parseInt(s, 10));

    // Priority ordering for labels
    const priorityOrder = ['ZWJ', 'VS16', 'SKIN', 'RI', 'EP', 'D', 'NL', 'WS', 'CTRL', 'L', 'M', 'ID', 'URLE', 'URLC', 'VIS'];
    let namedLabel: string | null = null;
    if (classIndices.length > 0) {
      const names = classIndices.map((idx) => classEntries[idx]![0]);
      for (const p of priorityOrder) {
        if (names.includes(p)) {
          namedLabel = p;
          break;
        }
      }
    }

    if (namedLabel && ['ZWJ', 'VS16', 'SKIN', 'RI', 'EP'].includes(namedLabel)) {
      label = namedLabel;
    } else if (charSet.ranges.length === 1 && charSet.ranges[0]!.lo === charSet.ranges[0]!.hi) {
      const cp = charSet.ranges[0]!.lo;
      if (cp >= 32 && cp <= 126) {
        label = `'${String.fromCharCode(cp)}'`;
      } else if (cp === 10) {
        label = '\\n';
      } else if (cp === 13) {
        label = '\\r';
      } else if (cp === 9) {
        label = '\\t';
      } else if (namedLabel) {
        label = namedLabel;
      } else {
        label = `U+${cp.toString(16).toUpperCase()}`;
      }
    } else if (namedLabel) {
      label = namedLabel;
    } else {
      label = 'other';
    }

    atoms.push({ id: aId, label, charSet });
    atomLabels.push(label);
  }

  return {
    atoms,
    numAtoms: nextAtomId,
    classify,
    atomForChar,
    atomLabels,
    asciiLookup,
    intervals: mergedIntervals,
  };
}
