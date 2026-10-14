import { CharSet, RegexNode } from '../types';
import {
  NAMED_CLASSES,
  CLASS_NL,
  CLASS_WS,
  CLASS_D,
  CLASS_ID,
  createCharSet,
  singleCharSet,
  charRangeSet,
  unionCharSets,
  notCharSet,
} from '../charclass';
import { empty, eps, setNode, cat, alt, rep } from './ast';

export class RegexParseError extends Error {
  constructor(message: string, public position: number) {
    super(`Regex parse error at pos ${position}: ${message}`);
    this.name = 'RegexParseError';
  }
}

export function parseRegex(
  pattern: string,
  namedClasses: Record<string, CharSet> = NAMED_CLASSES
): RegexNode {
  let pos = 0;
  const len = pattern.length;

  function peek(): string {
    return pos < len ? pattern[pos]! : '';
  }

  function next(): string {
    return pos < len ? pattern[pos++]! : '';
  }

  function eof(): boolean {
    return pos >= len;
  }

  // Parses: alt := concat ('|' concat)*
  function parseAlt(): RegexNode {
    let node = parseConcat();
    while (peek() === '|') {
      next(); // consume '|'
      const right = parseConcat();
      node = alt(node, right);
    }
    return node;
  }

  // Parses: concat := repeat*
  function parseConcat(): RegexNode {
    const list: RegexNode[] = [];
    while (!eof()) {
      const ch = peek();
      if (ch === '|' || ch === ')') {
        break;
      }
      list.push(parseRepeat());
    }

    if (list.length === 0) {
      return eps();
    }
    let res = list[0]!;
    for (let i = 1; i < list.length; i++) {
      res = cat(res, list[i]!);
    }
    return res;
  }

  // Parses: repeat := atom ('*' | '+' | '?' | '{' m (',' n?)? '}')?
  function parseRepeat(): RegexNode {
    const node = parseAtom();
    const ch = peek();

    if (ch === '*') {
      next();
      return rep(node, 0, null);
    }
    if (ch === '+') {
      next();
      return rep(node, 1, null);
    }
    if (ch === '?') {
      next();
      return rep(node, 0, 1);
    }
    if (ch === '{') {
      const startPos = pos;
      next(); // consume '{'
      let num1Str = '';
      while (!eof() && peek() >= '0' && peek() <= '9') {
        num1Str += next();
      }
      if (num1Str.length === 0) {
        throw new RegexParseError("Expected number in quantifier '{m}'", startPos);
      }
      const m = parseInt(num1Str, 10);
      let n: number | null = m;

      if (peek() === ',') {
        next(); // consume ','
        let num2Str = '';
        while (!eof() && peek() >= '0' && peek() <= '9') {
          num2Str += next();
        }
        if (num2Str.length === 0) {
          n = null; // {m,}
        } else {
          n = parseInt(num2Str, 10); // {m,n}
        }
      }

      if (peek() !== '}') {
        throw new RegexParseError("Expected '}' closing quantifier", pos);
      }
      next(); // consume '}'
      return rep(node, m, n);
    }

    return node;
  }

  // Parses: atom := literal | '.' | '(' alt ')' | '[' '^'? item+ ']' | '<' NAME '>' | '\' escape
  function parseAtom(): RegexNode {
    if (eof()) {
      throw new RegexParseError('Unexpected end of pattern, expected atom', pos);
    }

    const ch = peek();

    // Group: '(' alt ')'
    if (ch === '(') {
      const startPos = pos;
      next(); // consume '('
      const inner = parseAlt();
      if (peek() !== ')') {
        throw new RegexParseError("Unclosed group, expected ')'", startPos);
      }
      next(); // consume ')'
      return inner;
    }

    // Dot: any char except \r and \n
    if (ch === '.') {
      next();
      return setNode(notCharSet(CLASS_NL), '.');
    }

    // Named class: '<' NAME '>'
    if (ch === '<') {
      let lookahead = pos + 1;
      let validName = false;
      let name = '';
      if (
        lookahead < len &&
        ((pattern[lookahead]! >= 'a' && pattern[lookahead]! <= 'z') ||
          (pattern[lookahead]! >= 'A' && pattern[lookahead]! <= 'Z') ||
          pattern[lookahead] === '_')
      ) {
        validName = true;
        while (lookahead < len && pattern[lookahead] !== '>') {
          const c = pattern[lookahead]!;
          if (
            (c >= 'a' && c <= 'z') ||
            (c >= 'A' && c <= 'Z') ||
            (c >= '0' && c <= '9') ||
            c === '_'
          ) {
            name += c;
            lookahead++;
          } else {
            validName = false;
            break;
          }
        }
        if (validName && lookahead < len && pattern[lookahead] === '>') {
          if (!namedClasses[name]) {
            throw new RegexParseError(`Unknown named class '<${name}>'`, pos);
          }
          pos = lookahead + 1;
          return setNode(namedClasses[name]!, `<${name}>`);
        }
      }

      // If not a named class, treat '<' as a literal character
      next();
      return setNode(singleCharSet('<'), "'<'");
    }

    // Character class: '[' '^'? item+ ']'
    if (ch === '[') {
      return parseBracketClass();
    }

    // Escaped character: '\' escape
    if (ch === '\\') {
      return parseEscapeAtom();
    }

    // Single character literal
    // If it's a metacharacter like '*', '+', '?', ')', '|', throw error
    if (ch === '*' || ch === '+' || ch === '?' || ch === ')') {
      throw new RegexParseError(`Unexpected metacharacter '${ch}'`, pos);
    }

    next();
    return setNode(singleCharSet(ch), `'${ch}'`);
  }

  function parseEscapeAtom(): RegexNode {
    next(); // consume '\'
    if (eof()) {
      throw new RegexParseError("Dangling '\\' at end of pattern", pos - 1);
    }
    const ch = next();

    if (ch === 'n') return setNode(singleCharSet(10), '\\n');
    if (ch === 'r') return setNode(singleCharSet(13), '\\r');
    if (ch === 't') return setNode(singleCharSet(9), '\\t');
    if (ch === 's') return setNode(unionCharSets(CLASS_WS, CLASS_NL), '\\s');
    if (ch === 'd') return setNode(CLASS_D, '\\d');
    if (ch === 'w') return setNode(CLASS_ID, '\\w');

    if (ch === 'u') {
      const codePoint = parseUnicodeEscape();
      return setNode(singleCharSet(codePoint), `\\u${codePoint.toString(16)}`);
    }

    // Literal escaped character (e.g. \., \*, \+, \/, \-, etc.)
    return setNode(singleCharSet(ch), `'${ch}'`);
  }

  function parseUnicodeEscape(): number {
    if (peek() === '{') {
      next(); // consume '{'
      let hex = '';
      while (!eof() && peek() !== '}') {
        hex += next();
      }
      if (peek() !== '}') {
        throw new RegexParseError("Unclosed unicode escape '\\u{...}'", pos);
      }
      next(); // consume '}'
      const cp = parseInt(hex, 16);
      if (isNaN(cp)) {
        throw new RegexParseError(`Invalid hex in '\\u{${hex}}'`, pos);
      }
      return cp;
    }

    // Exactly 4 hex digits: \uXXXX
    let hex = '';
    for (let i = 0; i < 4; i++) {
      if (eof()) throw new RegexParseError("Incomplete 4-digit unicode escape '\\uXXXX'", pos);
      hex += next();
    }
    const cp = parseInt(hex, 16);
    if (isNaN(cp)) {
      throw new RegexParseError(`Invalid hex in '\\u${hex}'`, pos);
    }
    return cp;
  }

  function parseBracketClass(): RegexNode {
    const startPos = pos;
    next(); // consume '['

    let negated = false;
    if (peek() === '^') {
      negated = true;
      next(); // consume '^'
    }

    const sets: CharSet[] = [];
    let label = negated ? '[^' : '[';

    // Inside bracket: item+
    while (!eof()) {
      if (peek() === ']' && sets.length > 0) {
        break;
      }

      // Check for <NAME>
      if (peek() === '<') {
        let lookahead = pos + 1;
        let validName = false;
        let name = '';
        if (
          lookahead < len &&
          ((pattern[lookahead]! >= 'a' && pattern[lookahead]! <= 'z') ||
            (pattern[lookahead]! >= 'A' && pattern[lookahead]! <= 'Z') ||
            pattern[lookahead] === '_')
        ) {
          validName = true;
          while (lookahead < len && pattern[lookahead] !== '>') {
            const c = pattern[lookahead]!;
            if (
              (c >= 'a' && c <= 'z') ||
              (c >= 'A' && c <= 'Z') ||
              (c >= '0' && c <= '9') ||
              c === '_'
            ) {
              name += c;
              lookahead++;
            } else {
              validName = false;
              break;
            }
          }
          if (validName && lookahead < len && pattern[lookahead] === '>' && namedClasses[name]) {
            pos = lookahead + 1;
            sets.push(namedClasses[name]!);
            label += `<${name}>`;
            continue;
          }
        }
      }

      // Check for item or range: char | char '-' char
      const itemStart = parseBracketItem();
      if (peek() === '-' && pos + 1 < len && pattern[pos + 1] !== ']') {
        next(); // consume '-'
        const itemEnd = parseBracketItem();
        sets.push(charRangeSet(itemStart, itemEnd));
        label += `${String.fromCodePoint(itemStart)}-${String.fromCodePoint(itemEnd)}`;
      } else {
        sets.push(singleCharSet(itemStart));
        label += String.fromCodePoint(itemStart);
      }
    }

    if (peek() !== ']') {
      throw new RegexParseError("Unclosed character class, expected ']'", startPos);
    }
    next(); // consume ']'
    label += ']';

    if (sets.length === 0) {
      return empty();
    }

    let combined = unionCharSets(...sets);
    if (negated) {
      combined = notCharSet(combined);
    }
    return setNode(combined, label);
  }

  function parseBracketItem(): number {
    if (eof()) {
      throw new RegexParseError("Unfinished character class", pos);
    }
    const ch = next();
    if (ch === '\\') {
      if (eof()) throw new RegexParseError("Dangling escape inside '[]'", pos);
      const esc = next();
      if (esc === 'n') return 10;
      if (esc === 'r') return 13;
      if (esc === 't') return 9;
      if (esc === 's') return 32; // representative whitespace
      if (esc === 'u') return parseUnicodeEscape();
      return esc.codePointAt(0)!;
    }
    return ch.codePointAt(0)!;
  }

  const result = parseAlt();
  if (!eof()) {
    throw new RegexParseError(`Unexpected character '${peek()}'`, pos);
  }
  return result;
}
