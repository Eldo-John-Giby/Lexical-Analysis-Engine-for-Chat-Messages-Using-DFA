export type AtomId = number;

export interface Interval {
  lo: number;
  hi: number;
}

export interface CharSet {
  ranges: Interval[]; // normalized, sorted, non-overlapping
}

export type TokenKind =
  | 'TEXT'
  | 'ENTITY'
  | 'EMOTIVE'
  | 'NUMERIC'
  | 'FORMAT'
  | 'PUNCT'
  | 'SPACE'
  | 'ERROR';

export interface RuleDef {
  id: number;
  name: string;
  pattern: string;
  kind: TokenKind;
  startOfLine?: boolean;
  isError?: boolean;
  message?: string;
  color: string; // for UI
  description: string;
  examples: string[];
}

export type RegexNode =
  | { t: 'empty' }
  | { t: 'eps' }
  | { t: 'set'; set: CharSet; label: string }
  | { t: 'cat'; a: RegexNode; b: RegexNode }
  | { t: 'alt'; a: RegexNode; b: RegexNode }
  | { t: 'star'; a: RegexNode }
  | { t: 'plus'; a: RegexNode }
  | { t: 'opt'; a: RegexNode }
  | { t: 'rep'; a: RegexNode; min: number; max: number | null };

export interface NFA {
  numStates: number;
  start: number;
  eps: number[][]; // eps[s] = list of targets reachable on epsilon
  trans: [AtomId, number][][]; // trans[s] = list of [atomId, targetState]
  accept: Map<number, number>; // nfaState -> ruleId
}

export interface DFA {
  numStates: number;
  numAtoms: number;
  start: number;
  table: Int32Array; // state * numAtoms + atom, -1 = dead
  acceptRule: Int16Array; // -1 = not accepting, >=0 = ruleId
  stateNfaSets?: number[][]; // for subset visualization: dfaState -> sorted NFA state ids
  stateLabels?: string[]; // q0, q1... (stable BFS order)
}

export interface Token {
  type: string;
  ruleId: number;
  kind: TokenKind;
  lexeme: string;
  start: number; // UTF-16 start offset
  end: number; // UTF-16 end offset
  line: number; // 1-based
  col: number; // 1-based
  flags: string[]; // ELONGATED, ALL_CAPS, SLANG, BROADCAST, etc.
}

export type TraceEvent =
  | { t: 'begin'; pos: number; startState: number }
  | {
      t: 'step';
      pos: number;
      ch: string;
      atom: AtomId;
      from: number;
      to: number;
      accepting: boolean;
      ruleId: number;
    }
  | { t: 'mark'; pos: number; state: number; ruleId: number } // last accepting update
  | { t: 'dead'; pos: number; ch: string; from: number }
  | { t: 'backtrack'; from: number; to: number } // maximal munch rollback
  | { t: 'emit'; token: Token }
  | { t: 'error'; pos: number; message: string };

export interface LexResult {
  tokens: Token[];
  errors: Token[];
  symbols: SymbolTable;
  trace?: TraceEvent[];
}

export interface SymbolEntry {
  lexeme: string;
  type: string;
  count: number;
  firstPos: { line: number; col: number; offset: number };
  positions: { line: number; col: number; offset: number }[];
}

export type SymbolTable = Map<string, SymbolEntry>;
