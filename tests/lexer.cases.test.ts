import { describe, it, expect } from 'vitest';
import { buildEngine } from '../src/engine/index';
import { Token } from '../src/engine/types';

describe('Lexer Reference Test Corpus (Section 8)', () => {
  const engine = buildEngine();

  // Helper to format tokens ignoring whitespace/newline
  function nonSpace(tokens: Token[]): { type: string; lexeme: string; flags: string[] }[] {
    return tokens
      .filter((t) => t.type !== 'WHITESPACE' && t.type !== 'NEWLINE')
      .map((t) => ({ type: t.type, lexeme: t.lexeme, flags: t.flags }));
  }

  it('Case 1: URL trailing dot backtracking demo', () => {
    const res = engine.lex('hey @eldo check https://vit.ac.in/x. now!!!');
    const tokens = nonSpace(res.tokens);

    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'WORD(hey)',
      'MENTION(@eldo)',
      'WORD(check)',
      'URL(https://vit.ac.in/x)',
      'PUNCT(.)',
      'WORD(now)',
      'EMPHASIS(!!!)',
    ]);
  });

  it('Case 2: Times', () => {
    const res = engine.lex('meet at 5:30pm tmrw');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'WORD(meet)',
      'WORD(at)',
      'TIME(5:30pm)',
      'WORD(tmrw)',
    ]);
  });

  it('Case 3: Elongation and Emoticons', () => {
    const res = engine.lex('loooool :) <3');
    const tokens = nonSpace(res.tokens);

    expect(tokens[0]!.type).toBe('WORD');
    expect(tokens[0]!.lexeme).toBe('loooool');
    expect(tokens[0]!.flags).toContain('ELONGATED');

    expect(tokens[1]!.type).toBe('EMOTICON');
    expect(tokens[1]!.lexeme).toBe(':)');

    expect(tokens[2]!.type).toBe('EMOTICON');
    expect(tokens[2]!.lexeme).toBe('<3');
  });

  it('Case 4: Email with punctuation prefix', () => {
    const res = engine.lex('mail me: abc.def@vit.ac.in');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'WORD(mail)',
      'WORD(me)',
      'PUNCT(:)',
      'EMAIL(abc.def@vit.ac.in)',
    ]);
  });

  it('Case 5: Currency amounts', () => {
    const res = engine.lex('price ₹1,299.50 only');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'WORD(price)',
      'CURRENCY(₹1,299.50)',
      'WORD(only)',
    ]);
  });

  it('Case 6: Phone numbers', () => {
    const res = engine.lex('call +91 9876543210');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'WORD(call)',
      'PHONE(+91 9876543210)',
    ]);
  });

  it('Case 7: Code spans', () => {
    const res = engine.lex('use `git push` now');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'WORD(use)',
      'CODE_SPAN(`git push`)',
      'WORD(now)',
    ]);
  });

  it('Case 8: Markdown formatting bold, italic, strike', () => {
    const res = engine.lex('*urgent* _really_ ~nope~');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'BOLD(*urgent*)',
      'ITALIC(_really_)',
      'STRIKE(~nope~)',
    ]);
  });

  it('Case 9: Contractions in words', () => {
    const res = engine.lex("don't stop");
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      "WORD(don't)",
      'WORD(stop)',
    ]);
  });

  it('Case 10: Hashtags', () => {
    const res = engine.lex('#ProjectDay2026 is live');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'HASHTAG(#ProjectDay2026)',
      'WORD(is)',
      'WORD(live)',
    ]);
  });

  it('Case 11: Dates', () => {
    const res = engine.lex('12/10/2026 and 2026-10-14');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'DATE(12/10/2026)',
      'WORD(and)',
      'DATE(2026-10-14)',
    ]);
  });

  it('Case 12: Emojis with skin tones, ZWJ sequences, and regional flags', () => {
    const res = engine.lex('😂🔥 👍🏽 👨‍💻 🇮🇳');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'EMOJI(😂)',
      'EMOJI(🔥)',
      'EMOJI(👍🏽)',
      'EMOJI(👨‍💻)',
      'EMOJI(🇮🇳)',
    ]);
  });

  it('Case 13: Broadcast mentions', () => {
    const res = engine.lex('@everyone join');
    const tokens = nonSpace(res.tokens);
    expect(tokens[0]!.type).toBe('MENTION');
    expect(tokens[0]!.lexeme).toBe('@everyone');
    expect(tokens[0]!.flags).toContain('BROADCAST');
    expect(tokens[1]!.type).toBe('WORD');
    expect(tokens[1]!.lexeme).toBe('join');
  });

  it('Case 14: Line-start COMMAND vs mid-line slash symbol', () => {
    const lineStartRes = engine.lex('/poll Lunch?');
    const tokens1 = nonSpace(lineStartRes.tokens);
    expect(tokens1.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'COMMAND(/poll)',
      'WORD(Lunch)',
      'EMPHASIS(?)',
    ]);

    const midLineRes = engine.lex('and/or');
    const tokens2 = nonSpace(midLineRes.tokens);
    expect(tokens2.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'WORD(and)',
      'SYMBOL(/)',
      'WORD(or)',
    ]);
  });

  it('Case 15: Unterminated code span emits ERROR', () => {
    const res = engine.lex('`oops');
    expect(res.tokens[0]!.type).toBe('UNTERMINATED_CODE');
    expect(res.tokens[0]!.kind).toBe('ERROR');
  });

  it('Case 16: Slang, ALL_CAPS, and Elongation flags', () => {
    const res = engine.lex('bro THIS is sooooo good lol');
    const tokens = nonSpace(res.tokens);
    expect(tokens[0]!.lexeme).toBe('bro');
    expect(tokens[0]!.flags).toContain('SLANG');

    expect(tokens[1]!.lexeme).toBe('THIS');
    expect(tokens[1]!.flags).toContain('ALL_CAPS');

    expect(tokens[2]!.lexeme).toBe('is');

    expect(tokens[3]!.lexeme).toBe('sooooo');
    expect(tokens[3]!.flags).toContain('ELONGATED');

    expect(tokens[4]!.lexeme).toBe('good');

    expect(tokens[5]!.lexeme).toBe('lol');
    expect(tokens[5]!.flags).toContain('SLANG');
  });

  it('Case 17: Email requiring TLD', () => {
    // Shows EMAIL does not match without TLD.
    // 'aaa.bbb@c' lexes as WORD(aaa) PUNCT(.) WORD(bbb) followed by MENTION(@c) because @c matches @<ID>+.
    const res = engine.lex('aaa.bbb@c');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'WORD(aaa)',
      'PUNCT(.)',
      'WORD(bbb)',
      'MENTION(@c)',
    ]);
  });

  it('Case 18: Percentages and Ordinals', () => {
    const res = engine.lex('82% done, 3rd try');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'PERCENT(82%)',
      'WORD(done)',
      'PUNCT(,)',
      'ORDINAL(3rd)',
      'WORD(try)',
    ]);
  });

  it('Case 19: Hinglish message', () => {
    const res = engine.lex('bhai kal 5pm pe milte hain 🔥');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'WORD(bhai)',
      'WORD(kal)',
      'TIME(5pm)',
      'WORD(pe)',
      'WORD(milte)',
      'WORD(hain)',
      'EMOJI(🔥)',
    ]);
    expect(tokens[0]!.flags).toContain('SLANG');
  });

  it('Case 20: Devanagari and Tamil script words', () => {
    const devRes = engine.lex('नमस्ते दोस्त');
    const devTokens = nonSpace(devRes.tokens);
    expect(devTokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'WORD(नमस्ते)',
      'WORD(दोस्त)',
    ]);
    expect(devTokens[0]!.flags).toContain('DEVANAGARI');

    const tamRes = engine.lex('வணக்கம் நண்பா');
    const tamTokens = nonSpace(tamRes.tokens);
    expect(tamTokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'WORD(வணக்கம்)',
      'WORD(நண்பா)',
    ]);
    expect(tamTokens[0]!.flags).toContain('TAMIL');
  });

  it('Case 21: (item 8) proves 8) is not an emoticon', () => {
    const res = engine.lex('(item 8)');
    const tokens = nonSpace(res.tokens);
    expect(tokens.map((t) => `${t.type}(${t.lexeme})`)).toEqual([
      'PUNCT(()',
      'WORD(item)',
      'INTEGER(8)',
      'PUNCT())',
    ]);
  });

  it('Case 22: Empty string, spaces only, newlines only, large 100k input', () => {
    expect(engine.lex('').tokens).toEqual([]);

    const spaces = engine.lex('   \t  ');
    expect(spaces.tokens.length).toBe(1);
    expect(spaces.tokens[0]!.type).toBe('WHITESPACE');

    const nls = engine.lex('\n\r\n\n');
    expect(nls.tokens.length).toBe(3);

    const largeInput = 'hey @eldo check https://vit.ac.in/x. now!!! '.repeat(2500); // 107k chars
    const start = performance.now();
    const largeRes = engine.lex(largeInput, { trace: false });
    const dur = performance.now() - start;

    expect(largeRes.tokens.length).toBeGreaterThan(15000);
    console.log(`Lexed 107k chars in ${dur.toFixed(2)} ms (${((largeInput.length / 1024 / 1024) / (dur / 1000)).toFixed(2)} MB/s)`);
  });

  it('Partition Property: concatenating all lexemes exactly reproduces input', () => {
    const samples = [
      'hey @eldo check https://vit.ac.in/x. now!!! meet at 5:30pm ₹1,299.50 #VIT loooool :)',
      'selling ~₹45,000~ ₹38,500 only! call +91 9876543210 or mail seller.deals@vit.ac.in',
      '/poll Lunch? `git push` *urgent* _really_ ~nope~ don\'t stop 12/10/2026',
      '😂🔥 👍🏽 👨‍💻 🇮🇳 @everyone bro THIS is sooooo good lol... 82% done, 3rd try',
      'नमस्ते दोस्त வணக்கம் நண்பா (item 8) and/or `unterminated',
    ];

    for (const s of samples) {
      const res = engine.lex(s);
      const reconstructed = res.tokens.map((t) => t.lexeme).join('');
      expect(reconstructed).toBe(s);
    }
  });
});
