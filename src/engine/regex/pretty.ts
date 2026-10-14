import { RegexNode } from '../types';

export function prettyPrintRegex(node: RegexNode, precedence = 0): string {
  // Precedence levels: 0 = alt, 1 = cat, 2 = repeat, 3 = atom
  switch (node.t) {
    case 'empty':
      return '∅';
    case 'eps':
      return 'ε';
    case 'set':
      if (node.label.length === 3 && node.label.startsWith("'") && node.label.endsWith("'")) {
        const ch = node.label[1]!;
        if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) {
          return ch;
        }
      }
      return node.label;
    case 'alt': {
      const s = `${prettyPrintRegex(node.a, 0)}|${prettyPrintRegex(node.b, 0)}`;
      return precedence > 0 ? `(${s})` : s;
    }
    case 'cat': {
      const s = `${prettyPrintRegex(node.a, 1)}${prettyPrintRegex(node.b, 1)}`;
      return precedence > 1 ? `(${s})` : s;
    }
    case 'star': {
      const s = `${prettyPrintRegex(node.a, 2)}*`;
      return precedence > 2 ? `(${s})` : s;
    }
    case 'plus': {
      const s = `${prettyPrintRegex(node.a, 2)}+`;
      return precedence > 2 ? `(${s})` : s;
    }
    case 'opt': {
      const s = `${prettyPrintRegex(node.a, 2)}?`;
      return precedence > 2 ? `(${s})` : s;
    }
    case 'rep': {
      const q =
        node.min === node.max
          ? `{${node.min}}`
          : node.max === null
          ? `{${node.min},}`
          : `{${node.min},${node.max}}`;
      const s = `${prettyPrintRegex(node.a, 2)}${q}`;
      return precedence > 2 ? `(${s})` : s;
    }
  }
}
