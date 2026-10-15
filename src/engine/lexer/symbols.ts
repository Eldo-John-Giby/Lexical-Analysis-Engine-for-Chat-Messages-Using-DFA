import { Token, SymbolTable } from '../types';

export function createSymbolTable(): SymbolTable {
  return new Map();
}

const SYMBOL_TYPES = new Set([
  'MENTION',
  'HASHTAG',
  'URL',
  'EMAIL',
  'COMMAND',
  'SHORTCODE',
]);

export function recordSymbol(
  table: SymbolTable,
  token: Token
): void {
  if (!SYMBOL_TYPES.has(token.type)) return;

  const key = `${token.type}:${token.lexeme}`;
  const pos = { line: token.line, col: token.col, offset: token.start };

  const existing = table.get(key);
  if (existing) {
    existing.count++;
    existing.positions.push(pos);
  } else {
    table.set(key, {
      lexeme: token.lexeme,
      type: token.type,
      count: 1,
      firstPos: pos,
      positions: [pos],
    });
  }
}
