// ALLOWED-REGEXP: test oracle
import { RegexNode, CharSet } from '../types';

export function charSetToJsRegex(set: CharSet): string {
  if (set.ranges.length === 0) return '(?!)';

  const parts: string[] = [];
  for (const r of set.ranges) {
    if (r.lo === r.hi) {
      parts.push(escapeCharForClass(r.lo));
    } else {
      parts.push(`${escapeCharForClass(r.lo)}-${escapeCharForClass(r.hi)}`);
    }
  }
  return `[${parts.join('')}]`;
}

function escapeCharForClass(cp: number): string {
  if (cp === 10) return '\\n';
  if (cp === 13) return '\\r';
  if (cp === 9) return '\\t';
  if (cp === 0x5c) return '\\\\';
  if (cp === 0x2d) return '\\-';
  if (cp === 0x5d) return '\\]';
  if (cp === 0x5e) return '\\^';
  if (cp >= 32 && cp <= 126) {
    return String.fromCharCode(cp);
  }
  return `\\u{${cp.toString(16)}}`;
}

export function toJsRegexString(node: RegexNode): string {
  switch (node.t) {
    case 'empty':
      return '(?!)';
    case 'eps':
      return '(?:)';
    case 'set':
      return charSetToJsRegex(node.set);
    case 'alt':
      return `(?:${toJsRegexString(node.a)}|${toJsRegexString(node.b)})`;
    case 'cat':
      return `${toJsRegexString(node.a)}${toJsRegexString(node.b)}`;
    case 'star':
      return `(?:${toJsRegexString(node.a)})*`;
    case 'plus':
      return `(?:${toJsRegexString(node.a)})+`;
    case 'opt':
      return `(?:${toJsRegexString(node.a)})?`;
    case 'rep': {
      const q =
        node.min === node.max
          ? `{${node.min}}`
          : node.max === null
          ? `{${node.min},}`
          : `{${node.min},${node.max}}`;
      return `(?:${toJsRegexString(node.a)})${q}`;
    }
  }
}

export function compileToJsRegex(node: RegexNode, flags = 'u'): RegExp {
  // ALLOWED-REGEXP: test oracle
  return new RegExp(toJsRegexString(node), flags);
}
