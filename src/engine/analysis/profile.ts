import { Token, TokenKind } from '../types';

export interface ChatProfile {
  totalTokens: number;
  uniqueTokens: number;
  errorCount: number;
  avgTokenLength: number;
  emojiCount: number;
  slangCount: number;
  elongatedCount: number;
  allCapsCount: number;
  emphasisCount: number;
  typeCounts: Record<string, number>;
  kindCounts: Record<TokenKind, number>;
  topLexemes: { lexeme: string; count: number; type: string }[];
}

export function profileTokens(tokens: Token[]): ChatProfile {
  const typeCounts: Record<string, number> = {};
  const kindCounts: Record<TokenKind, number> = {
    TEXT: 0,
    ENTITY: 0,
    EMOTIVE: 0,
    NUMERIC: 0,
    FORMAT: 0,
    PUNCT: 0,
    SPACE: 0,
    ERROR: 0,
  };

  const lexemeCounts = new Map<string, { count: number; type: string }>();
  let totalLength = 0;
  let emojiCount = 0;
  let slangCount = 0;
  let elongatedCount = 0;
  let allCapsCount = 0;
  let emphasisCount = 0;
  let errorCount = 0;

  for (const t of tokens) {
    totalLength += t.lexeme.length;
    typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    kindCounts[t.kind] = (kindCounts[t.kind] || 0) + 1;

    const lower = t.lexeme.toLowerCase();
    const entry = lexemeCounts.get(lower);
    if (entry) {
      entry.count++;
    } else {
      lexemeCounts.set(lower, { count: 1, type: t.type });
    }

    if (t.type === 'EMOJI') emojiCount++;
    if (t.type === 'EMPHASIS') emphasisCount++;
    if (t.kind === 'ERROR') errorCount++;

    if (t.flags.includes('SLANG')) slangCount++;
    if (t.flags.includes('ELONGATED')) elongatedCount++;
    if (t.flags.includes('ALL_CAPS')) allCapsCount++;
  }

  const topLexemes = Array.from(lexemeCounts.entries())
    .map(([lexeme, data]) => ({ lexeme, count: data.count, type: data.type }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalTokens: tokens.length,
    uniqueTokens: lexemeCounts.size,
    errorCount,
    avgTokenLength: tokens.length > 0 ? totalLength / tokens.length : 0,
    emojiCount,
    slangCount,
    elongatedCount,
    allCapsCount,
    emphasisCount,
    typeCounts,
    kindCounts,
    topLexemes,
  };
}
