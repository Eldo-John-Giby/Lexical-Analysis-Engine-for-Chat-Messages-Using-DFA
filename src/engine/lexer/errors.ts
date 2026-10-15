import { Token } from '../types';

export function createErrorToken(
  type: string,
  lexeme: string,
  start: number,
  end: number,
  line: number,
  col: number,
  message: string,
  ruleId = 28
): Token {
  return {
    type,
    ruleId,
    kind: 'ERROR',
    lexeme,
    start,
    end,
    line,
    col,
    flags: [message],
  };
}
