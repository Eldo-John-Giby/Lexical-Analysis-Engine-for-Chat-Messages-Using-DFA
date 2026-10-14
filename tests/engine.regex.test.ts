import { describe, it, expect } from 'vitest';
import { parseRegex, RegexParseError } from '../src/engine/regex/parser';
import { prettyPrintRegex } from '../src/engine/regex/pretty';
import { compileToJsRegex, toJsRegexString } from '../src/engine/regex/toJsRegex';

// The 29 rule patterns from Section 6
const SECTION_6_PATTERNS = [
  '\\r\\n|\\n|\\r', // NEWLINE
  '<WS>+', // WHITESPACE
  '(https?://|www\\.)<URLC>*<URLE>', // URL
  '[A-Za-z0-9._%+\\-]+@[A-Za-z0-9\\-]+(\\.[A-Za-z0-9\\-]+)+', // EMAIL
  '@<ID>+', // MENTION
  '#(<L>|_)(<L>|<D>|_)*', // HASHTAG
  '/<L>(<L>|<D>|_)*', // COMMAND
  ':(<L>|<D>|[_+\\-])+:', // SHORTCODE
  '(<EP><VS16>?<SKIN>?(<ZWJ><EP><VS16>?<SKIN>?)*)|<RI><RI>', // EMOJI
  "[:;=][\\-o^']?[)(DPpOo/\\\\|*$@sS3\\]\\[>]|<3|</3|\\^_^|-_\\-|[Tt]_[Tt]|[oO]_[oO]|[xX]D", // EMOTICON
  '((<D>|[01]<D>|2[0-3]):[0-5]<D>(:[0-5]<D>)?(am|pm|AM|PM)?)|((1[0-2]|0?[1-9])(am|pm|AM|PM))', // TIME
  '<D>{1,2}[/\\-.]<D>{1,2}[/\\-.](<D>{4}|<D>{2})|<D>{4}-<D>{2}-<D>{2}', // DATE
  '(₹|\\$|€|£|Rs\\.?)<D>+(,<D>+)*(\\.<D>+)?', // CURRENCY
  '\\+<D>{1,3}[ \\-]?<D>{10}|<D>{10}', // PHONE
  '<D>+(\\.<D>+)?%', // PERCENT
  '<D>+(st|nd|rd|th)', // ORDINAL
  '<D>+\\.<D>+', // FLOAT
  '<D>+', // INTEGER
  '`[^`\\n]+`', // CODE_SPAN
  '\\*[^*\\s\\n]([^*\\n]*[^*\\s\\n])?\\*', // BOLD
  '_[^_\\s\\n]([^_\\n]*[^_\\s\\n])?_', // ITALIC
  '~[^~\\s\\n]([^~\\n]*[^~\\s\\n])?~', // STRIKE
  "<L>(<L>|<M>|<D>)*(['’_\\-](<L>|<M>|<D>)+)*", // WORD
  '\\.\\.+|…', // ELLIPSIS
  '[!?]+', // EMPHASIS
  '[.,;:\'"()\\[\\]{}\\-]', // PUNCT
  '`[^`\\n]*', // UNTERMINATED_CODE
  '<VIS>', // SYMBOL
  '<CTRL>', // ERROR
];

describe('Regex Parser and AST', () => {
  it('successfully parses all 29 rule patterns from Section 6', () => {
    for (const pattern of SECTION_6_PATTERNS) {
      expect(() => {
        const ast = parseRegex(pattern);
        expect(ast).toBeDefined();
      }).not.toThrow();
    }
  });

  it('produces readable errors with positions on invalid regexes', () => {
    // Unclosed group
    expect(() => parseRegex('(abc|def')).toThrowError(RegexParseError);
    try {
      parseRegex('(abc|def');
    } catch (e: any) {
      expect(e.message).toContain('Unclosed group');
      expect(e.position).toBe(0);
    }

    // Unclosed bracket class
    expect(() => parseRegex('[a-z')).toThrowError(RegexParseError);

    // Unknown named class
    expect(() => parseRegex('<UNKNOWN>')).toThrowError(RegexParseError);
    try {
      parseRegex('<UNKNOWN>');
    } catch (e: any) {
      expect(e.message).toContain("Unknown named class '<UNKNOWN>'");
    }

    // Invalid quantifier
    expect(() => parseRegex('a{abc}')).toThrowError(RegexParseError);
  });

  it('pretty prints AST correctly and retains language meaning', () => {
    const ast = parseRegex('(a|b)*abb');
    const printed = prettyPrintRegex(ast);
    expect(printed).toBe('(a|b)*abb');
  });

  it('compiles AST to valid JS RegExp via toJsRegex', () => {
    // ALLOWED-REGEXP: test oracle
    const ast = parseRegex('(a|b)*abb');
    const re = compileToJsRegex(ast);
    expect(re.test('ababb')).toBe(true);
    expect(re.test('aba')).toBe(false);
  });
});
