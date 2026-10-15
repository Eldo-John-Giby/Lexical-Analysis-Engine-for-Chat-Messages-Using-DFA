import {
  RuleDef,
  Token,
  TraceEvent,
  LexResult,
  DFA,
  AtomId,
} from '../types';
import { Classifier } from '../charclass';
import { postProcessToken } from './postprocess';
import { createSymbolTable, recordSymbol } from './symbols';
import { createErrorToken } from './errors';

export interface LexOptions {
  trace?: boolean;
}

export class Lexer {
  constructor(
    public readonly rules: RuleDef[],
    public readonly classifier: Classifier,
    public readonly dfaNormal: DFA,
    public readonly dfaLineStart: DFA
  ) {}

  lex(text: string, options: LexOptions = {}): LexResult {
    const doTrace = options.trace ?? false;
    const tokens: Token[] = [];
    const errors: Token[] = [];
    const symbols = createSymbolTable();
    const trace: TraceEvent[] = [];

    const n = text.length;
    let pos = 0;
    let currentLine = 1;
    let currentCol = 1;

    const numAtoms = this.classifier.numAtoms;

    while (pos < n) {
      const isStartOfLine = currentCol === 1;
      const activeDfa = isStartOfLine ? this.dfaLineStart : this.dfaNormal;
      const table = activeDfa.table;
      const acceptRule = activeDfa.acceptRule;

      let state = activeDfa.start;
      let lastAcc = -1;
      let lastAccPos = -1;
      let i = pos;

      if (doTrace) {
        trace.push({ t: 'begin', pos, startState: state });
      }

      while (i < n) {
        const cp = text.codePointAt(i)!;
        const cpLen = cp > 0xffff ? 2 : 1;
        const atom = this.classifier.classify(cp);

        const next = table[state * numAtoms + atom]!;
        if (next === -1) {
          if (doTrace) {
            trace.push({
              t: 'dead',
              pos: i,
              ch: text.slice(i, i + cpLen),
              from: state,
            });
          }
          break;
        }

        const prevState = state;
        state = next;
        i += cpLen;

        const isAcc = acceptRule[state] !== -1;
        const accRuleId = acceptRule[state]!;

        if (doTrace) {
          trace.push({
            t: 'step',
            pos: i,
            ch: text.slice(i - cpLen, i),
            atom,
            from: prevState,
            to: state,
            accepting: isAcc,
            ruleId: accRuleId,
          });
        }

        if (isAcc) {
          lastAcc = accRuleId;
          lastAccPos = i;
          if (doTrace) {
            trace.push({
              t: 'mark',
              pos: i,
              state,
              ruleId: accRuleId,
            });
          }
        }
      }

      // If no accepting state was encountered: panic-mode recovery
      if (lastAcc === -1) {
        const errCp = text.codePointAt(pos)!;
        const errLen = errCp > 0xffff ? 2 : 1;
        const errLexeme = text.slice(pos, pos + errLen);

        const errToken = createErrorToken(
          'ERROR',
          errLexeme,
          pos,
          pos + errLen,
          currentLine,
          currentCol,
          'Unexpected character (panic mode skip)'
        );

        tokens.push(errToken);
        errors.push(errToken);

        if (doTrace) {
          trace.push({
            t: 'error',
            pos,
            message: `Panic mode: skipped unexpected char '${errLexeme}'`,
          });
        }

        // Advance position and update line/col
        if (errLexeme === '\n') {
          currentLine++;
          currentCol = 1;
        } else if (errLexeme === '\r') {
          currentLine++;
          currentCol = 1;
        } else {
          currentCol++;
        }
        pos += errLen;
        continue;
      }

      // Maximal munch rollback
      if (lastAccPos < i && doTrace) {
        trace.push({
          t: 'backtrack',
          from: i,
          to: lastAccPos,
        });
      }

      const lexeme = text.slice(pos, lastAccPos);
      const rule = this.rules[lastAcc]!;

      let token: Token = {
        type: rule.name,
        ruleId: rule.id,
        kind: rule.kind,
        lexeme,
        start: pos,
        end: lastAccPos,
        line: currentLine,
        col: currentCol,
        flags: rule.message ? [rule.message] : [],
      };

      // Run post-processing (flags, elongation, slang, script, etc.)
      token = postProcessToken(token);

      tokens.push(token);
      recordSymbol(symbols, token);

      if (token.kind === 'ERROR') {
        errors.push(token);
      }

      if (doTrace) {
        trace.push({ t: 'emit', token });
      }

      // Advance line and column counters across the emitted lexeme
      for (let idx = 0; idx < lexeme.length; ) {
        const c = lexeme.codePointAt(idx)!;
        const cLen = c > 0xffff ? 2 : 1;
        if (c === 10) {
          // \n
          currentLine++;
          currentCol = 1;
        } else if (c === 13) {
          // \r
          if (idx + 1 < lexeme.length && lexeme.charCodeAt(idx + 1) === 10) {
            // \r\n will be handled on \n
          } else {
            currentLine++;
            currentCol = 1;
          }
        } else {
          currentCol++;
        }
        idx += cLen;
      }

      pos = lastAccPos;
    }

    return {
      tokens,
      errors,
      symbols,
      trace: doTrace ? trace : undefined,
    };
  }
}
