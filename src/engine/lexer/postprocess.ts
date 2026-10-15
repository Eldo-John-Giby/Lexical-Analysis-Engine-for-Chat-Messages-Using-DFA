import { Token, DFA } from '../types';
import { SLANG_LEXICON } from '../../data/slang';

// --- Lexicon Trie DFA ---

export interface TrieNode {
  isWord: boolean;
  children: Map<number, number>; // codePoint -> stateId
}

export function buildSlangTrieDFA(): {
  states: TrieNode[];
  isSlang: (word: string) => boolean;
} {
  const nodes: TrieNode[] = [{ isWord: false, children: new Map() }];

  for (const word of SLANG_LEXICON) {
    let curr = 0;
    const lower = word.toLowerCase();
    for (let i = 0; i < lower.length; i++) {
      const cp = lower.codePointAt(i)!;
      let next = nodes[curr]!.children.get(cp);
      if (next === undefined) {
        next = nodes.length;
        nodes.push({ isWord: false, children: new Map() });
        nodes[curr]!.children.set(cp, next);
      }
      curr = next;
    }
    nodes[curr]!.isWord = true;
  }

  const isSlang = (word: string): boolean => {
    let curr = 0;
    const lower = word.toLowerCase();
    for (let i = 0; i < lower.length; i++) {
      const cp = lower.codePointAt(i)!;
      const next = nodes[curr]!.children.get(cp);
      if (next === undefined) return false;
      curr = next;
    }
    return nodes[curr]!.isWord;
  };

  return { states: nodes, isSlang };
}

// --- Elongation DFA ---
// Tracks run-length of identical characters; accepts when any run >= 3

export function buildToyElongationDFA(): DFA {
  // Toy alphabet: 0='a', 1='b', 2='c', 3=other
  // States:
  // 0: start (no char seen)
  // 1: 'a' x1, 2: 'a' x2
  // 3: 'b' x1, 4: 'b' x2
  // 5: 'c' x1, 6: 'c' x2
  // 7: 'other' x1, 8: 'other' x2
  // 9: absorbing accept (elongated >= 3)
  const numStates = 10;
  const numAtoms = 4;
  const table = new Int32Array(numStates * numAtoms);
  const acceptRule = new Int16Array(numStates);
  table.fill(-1);
  acceptRule.fill(-1);
  acceptRule[9] = 0; // accepting

  // Fill transitions
  for (let s = 0; s < numStates; s++) {
    for (let a = 0; a < numAtoms; a++) {
      if (s === 9) {
        table[s * numAtoms + a] = 9; // absorbing
      } else {
        const charBase = a * 2 + 1;
        if (s === charBase) {
          // 2nd repetition
          table[s * numAtoms + a] = charBase + 1;
        } else if (s === charBase + 1) {
          // 3rd repetition -> accept
          table[s * numAtoms + a] = 9;
        } else {
          // Switch to new char
          table[s * numAtoms + a] = charBase;
        }
      }
    }
  }

  return {
    numStates,
    numAtoms,
    start: 0,
    table,
    acceptRule,
    stateLabels: [
      'start',
      'a_1',
      'a_2',
      'b_1',
      'b_2',
      'c_1',
      'c_2',
      'other_1',
      'other_2',
      'elongated_accept',
    ],
  };
}

export function isElongated(text: string): boolean {
  if (text.length < 3) return false;
  let lastCp = -1;
  let count = 0;

  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i)!;
    if (cp === lastCp) {
      count++;
      if (count >= 3) return true;
    } else {
      lastCp = cp;
      count = 1;
    }
    i += cp > 0xffff ? 2 : 1;
  }
  return false;
}

// --- Script Detection ---

export function detectScript(text: string): 'LATIN' | 'DEVANAGARI' | 'TAMIL' | 'OTHER' {
  let hasDevanagari = false;
  let hasTamil = false;
  let hasLatin = false;

  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i)!;
    if (cp >= 0x0900 && cp <= 0x097f) hasDevanagari = true;
    else if (cp >= 0x0b80 && cp <= 0x0bff) hasTamil = true;
    else if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) hasLatin = true;
    i += cp > 0xffff ? 2 : 1;
  }

  if (hasDevanagari) return 'DEVANAGARI';
  if (hasTamil) return 'TAMIL';
  if (hasLatin) return 'LATIN';
  return 'OTHER';
}

// --- Post-Process Engine ---

const { isSlang } = buildSlangTrieDFA();

export function postProcessToken(token: Token): Token {
  const flags: string[] = [...token.flags];

  if (token.type === 'WORD') {
    // 1. Slang check
    if (isSlang(token.lexeme)) {
      flags.push('SLANG');
    }

    // 2. Elongation check
    if (isElongated(token.lexeme)) {
      flags.push('ELONGATED');
    }

    // 3. All caps check (length >= 2, all A-Z)
    if (token.lexeme.length >= 2) {
      let allUpper = true;
      let hasLetter = false;
      for (let i = 0; i < token.lexeme.length; i++) {
        const c = token.lexeme.charCodeAt(i);
        if (c >= 65 && c <= 90) {
          hasLetter = true;
        } else if (c >= 97 && c <= 122) {
          allUpper = false;
          break;
        }
      }
      if (allUpper && hasLetter) {
        flags.push('ALL_CAPS');
      }
    }

    // 4. Script detection
    flags.push(detectScript(token.lexeme));
  } else if (token.type === 'MENTION') {
    // 5. Broadcast mention
    const lower = token.lexeme.toLowerCase();
    if (lower === '@everyone' || lower === '@here' || lower === '@channel') {
      flags.push('BROADCAST');
    }
  }

  token.flags = flags;
  return token;
}
