# LexiChat DFA: Lexical Analysis Engine for Chat Messages (Build Plan)

> **Audience:** an autonomous coding agent (Antigravity). This file is the ONLY input you receive. It is fully self-contained. Build everything described here, end to end, in the order given in Section 14.
> **Course context:** Compiler Design, Unit "Lexical Analysis". Project title: *Lexical Analysis Engine for Chat Messages Using Deterministic Finite Automata*.
> **Quality bar:** this must look and feel like a polished product AND be theoretically rigorous. A professor should be able to open it, type a chat message, and watch a real DFA consume it character by character.

---

## 0. Instructions to the agent (read first)

1. Work through the phases in Section 14 in order. Finish each phase's acceptance criteria before moving on.
2. After every phase: run `npm run typecheck && npm test && npm run build`. All must pass. Then commit (`git commit -m "phase N: <name>"`).
3. For every UI phase, use the browser to open the dev server, take screenshots, and verify the visuals against Section 10. Fix visual bugs before moving on.
4. Do NOT ask the user questions. Where this plan is ambiguous, pick the option that is simpler to implement AND better for the demo, and record the decision in `docs/DECISIONS.md`.
5. Never fake the engine. Every token shown in the UI must come from the real DFA that the app builds at runtime from the rule definitions. No hardcoded token outputs, no hidden use of `RegExp` for lexing (see Section 2).
6. Keep code strict-TypeScript, small modules, heavy comments on the automata algorithms (they are the "answer key" for a viva).
7. Never use em dashes in UI copy or docs. Plain, confident English.

---

## 1. Project summary

**LexiChat** is a web app (plus a CLI) that implements a complete lexical analyzer for informal chat text (WhatsApp/Discord/Slack style): mentions, hashtags, URLs, emails, emojis, emoticons, shortcodes, times, dates, currency, phone numbers, inline formatting, slang, elongated words, and more.

The core is a **from-scratch regex-to-DFA compiler pipeline**:

```
token rules (regex dialect)
   -> parser -> AST
   -> Thompson NFA (per rule, tagged)
   -> combine with new start state (epsilon)
   -> subset construction -> master DFA (tagged accepting states)
   -> DFA minimization (Moore + Hopcroft, cross-checked)
   -> flat transition table
   -> maximal-munch lexer with backtracking to last accepting state
   -> tokens + errors + symbol table + analytics
```

The UI makes every stage **visible and animated**: regex trees, NFAs, subset-construction steps, minimization rounds, the final DFA graph, and a step-through trace player that shows the automaton eating a chat message one character at a time.

### Goals
- Correct, fast, deterministic lexing of chat text (linear time on typical input).
- Visualize every theoretical concept from the syllabus.
- Demonstrate things normal regex engines cannot: guaranteed O(n) matching (no ReDoS), visible state machines, formal proofs by test.
- Be demo-ready in 3 minutes and viva-ready.

### Non-goals
- No parser/semantic analysis. No sentiment ML. No backend server.

---

## 2. Non-negotiable constraints

1. **No lexer generators or regex engines in the lexing path.** Forbidden for tokenization: `lex`, `flex`, `moo`, `nearley`, `ohm`, `chevrotain`, any regex-to-automata library, and JS `RegExp`/`String.match`/`split`/`replace`.
2. **Allowed uses of `RegExp`:** only (a) in `scripts/gen-unicode-tables.ts` to generate Unicode range tables at build time via `\p{...}`, (b) in the test oracle and the Benchmarks page as the thing being compared against. Mark these with the comment `// ALLOWED-REGEXP: <reason>`. Add an ESLint rule/test (`tests/no-regexp.test.ts`) that greps `src/engine/**` and fails if `RegExp`, `.match(`, `.replace(` with regex, or `/.../` literals appear.
3. **Everything runs client-side.** No server. Deployable as static files.
4. The engine package (`src/engine`) must have **zero React/DOM imports** so it is usable from the CLI and Web Workers.
5. The master DFA is built **once at startup** (target < 150 ms) and cached in memory.

---

## 3. Tech stack (decided, do not debate)

| Concern | Choice |
|---|---|
| Build | Vite + React 18 + TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`) |
| Styling | Tailwind CSS + CSS variables for theme tokens |
| State | Zustand |
| Animation | Framer Motion (UI) + requestAnimationFrame (trace player) |
| Graph rendering | Cytoscape.js + `cytoscape-dagre` (DFA/NFA graphs, class-based highlighting) |
| Charts | Recharts |
| Icons | lucide-react |
| Fonts | Inter (UI), JetBrains Mono (code/lexemes), via `@fontsource` packages (bundled, no CDN) |
| Tests | Vitest + fast-check (property tests) |
| E2E smoke | Playwright (one smoke spec) |
| CLI | `tsx` script `scripts/cli.ts` |
| Workers | Web Worker for benchmarks and large-input lexing |
| Deploy | Static build; GitHub Pages or Vercel config included |

Package scripts required: `dev`, `build`, `preview`, `typecheck`, `test`, `lint`, `lex` (CLI), `dot` (export DFA as Graphviz DOT), `gen:unicode`.

---

## 4. Repository structure

```
lexichat-dfa/
  plan.md                      (this file, copy it in)
  README.md
  docs/
    DECISIONS.md  REPORT.md  VIVA.md  DEMO_SCRIPT.md  ARCHITECTURE.md
  scripts/
    gen-unicode-tables.ts      (ALLOWED-REGEXP: build-time range generation)
    cli.ts                     (npm run lex -- "msg")
    export-dot.ts
  src/
    engine/                    (pure TS, no DOM)
      charclass.ts             interval sets, atoms, classifier
      unicode-tables.generated.ts
      regex/
        ast.ts  parser.ts  pretty.ts  toJsRegex.ts (tests only)
      nfa/
        thompson.ts  combine.ts  simulate.ts
      dfa/
        subset.ts  minimize-moore.ts  minimize-hopcroft.ts  table.ts  simulate.ts
      lexer/
        rules.ts               (THE token specification, Section 6)
        lexer.ts               (maximal munch + trace)
        postprocess.ts         (flags, lexicon trie DFA, elongation DFA)
        symbols.ts             (symbol table)
        errors.ts
      analysis/
        stats.ts  profile.ts
      index.ts
    workers/
      bench.worker.ts  lex.worker.ts
    state/
      store.ts
    ui/
      App.tsx  theme.css
      layout/    (TopBar, TabNav, CommandPalette)
      pages/     (Playground, Explorer, ConstructionLab, ChatSim, Analytics, Benchmarks, Theory)
      components/ (CodeEditor, TokenChips, TokenTable, SymbolTable, DfaGraph, TracePlayer,
                   TransitionTable, RegexTree, SubsetStepper, MinimizeStepper, ChatBubble,
                   Donut, Heatmap, StatCard, ...)
    data/
      presets.ts               (sample chats)
      slang.ts                 (lexicon)
  tests/
    engine.*.test.ts  lexer.cases.test.ts  lexer.fuzz.test.ts  no-regexp.test.ts
  e2e/smoke.spec.ts
```

---

## 5. Formal theory spec (the engine must literally implement this)

### 5.1 Definitions (put these in the Theory page and REPORT.md)
- **Regular expression** over alphabet Sigma defined inductively: empty, epsilon, symbol, union `r|s`, concatenation `rs`, Kleene star `r*`. Derived: `r+`, `r?`, `r{m,n}`, character classes.
- **NFA** `N = (Q, Sigma, delta, q0, F)` with `delta: Q x (Sigma U {eps}) -> P(Q)`.
- **DFA** `D = (Q, Sigma, delta, q0, F)` with `delta: Q x Sigma -> Q` (partial; missing transitions go to an implicit dead state, drawn only on request).
- **Alphabet reduction:** Unicode is huge, so Sigma is the set of **atoms** (Section 5.2). The DFA is over atoms, not raw code points.
- **Tagged accepting states:** each accepting DFA state stores `ruleId`; when a subset contains NFA accepts of several rules, choose the **lowest ruleId** (rule order = priority, same as `lex`).
- **Maximal munch:** from the current position run the DFA as far as it can go, remember the last accepting position, then roll back to it and emit that token.
- **Equivalence for minimization:** the initial partition is by **accepting ruleId** (NOT just accept vs non-accept), otherwise tokens would merge incorrectly.

### 5.2 Alphabet atoms (critical design point)
1. Every character class is an **interval set** (sorted, non-overlapping `[lo, hi]` code point ranges).
2. Collect every boundary used by every class in `rules.ts`. Sweep them to produce a **partition of 0..0x10FFFF into atoms** such that every class is a union of atoms.
3. `classify(codePoint) -> atomId` via binary search over atom boundaries (O(log k)); precompute a direct lookup `Uint16Array(256)` for ASCII.
4. Each atom gets a human label (for graph edges): derived by finding the smallest set of named classes covering it (e.g. `letter`, `digit`, `[.]`, `@`, `emoji`, `other`).
5. Edge labels in graphs merge all atoms going `p -> q` into one comma-separated label, collapsing big sets to class names.

### 5.3 Algorithms to implement (with step logging for the visualizers)
- **Parser:** recursive descent for the rule dialect (Section 5.4) -> AST.
- **Thompson construction:** one fragment per AST node, epsilon edges. Log each construction step.
- **Epsilon-closure + subset construction:** worklist algorithm. Log every step as `{ T: Set<nfaState>, symbol: atom, move: Set, closure: Set, result: dfaStateId, isNew: boolean }`.
- **Minimization:** implement BOTH **Moore partition refinement** (logs each round, used by the visualizer) and **Hopcroft** (used at runtime for speed). A test asserts both give identical state counts and equivalent languages on all rule DFAs and the master DFA.
- **Transition table:** flat `Int32Array`, index `state * numAtoms + atom`, `-1` = dead. Accepting info in `Int16Array acceptRule[state]` (`-1` = non accepting).
- **Unreachable and dead state pruning** before minimization.

### 5.4 Rule dialect (own regex syntax)
```
alt      := concat ('|' concat)*
concat   := repeat+
repeat   := atom ('*' | '+' | '?' | '{' m (',' n?)? '}')?
atom     := literal | '.' | '(' alt ')' | '[' '^'? item+ ']' | '<' NAME '>' | '\' escape
item     := char | char '-' char | '<' NAME '>' | '\' escape
escape   := n r t \ . | * + ? ( ) [ ] { } < > ^ $ - ' " ` ~ # @ / : and \uXXXX \u{XXXXX}
```
- `.` means any char except `\n` and `\r`.
- `<NAME>` references a named class from `charclass.ts`.
- Class difference is supported in the config via TS helpers (`minus(a,b)`, `union(...)`, `not(a)`), not in the dialect.

### 5.5 Named classes (define in `charclass.ts`)
| Name | Meaning |
|---|---|
| `L` | Unicode Letter (generated from `\p{L}`) |
| `M` | Unicode combining Mark (`\p{M}`), needed for Devanagari/Tamil words |
| `D` | `[0-9]` |
| `WS` | space, tab, U+00A0 |
| `NL` | `\r`, `\n` |
| `CTRL` | C0 controls except tab/newline, plus DEL |
| `ID` | `[A-Za-z0-9_]` |
| `EP` | Extended_Pictographic with code point > 0xFF (excludes (c) (r) TM digits) |
| `ZWJ` | U+200D |
| `VS16` | U+FE0F |
| `SKIN` | U+1F3FB to U+1F3FF |
| `RI` | Regional indicators U+1F1E6 to U+1F1FF |
| `URLC` | any char except whitespace, control, `<`, `>`, `"`, `` ` `` |
| `URLE` | `URLC` minus `. , ! ? ; : ) ] ' * _ ~` (a URL may not END with these) |
| `VIS` | any char that is not WS, NL, CTRL |

---

## 6. Token specification (`src/engine/lexer/rules.ts`)

Rule order IS priority (lower index wins ties on equal match length). Longest match always wins first. `startOfLine: true` means the rule is only active at column 0 of a line (implemented as a lexer start-condition flag, not inside the DFA).

| # | Token | Pattern (rule dialect) | Notes |
|---|---|---|---|
| 1 | `NEWLINE` | `\r\n\|\n\|\r` | line/col tracking |
| 2 | `WHITESPACE` | `<WS>+` | |
| 3 | `URL` | `(https?://\|www\.)<URLC>*<URLE>` | trailing `.,!?)` excluded: classic backtracking demo |
| 4 | `EMAIL` | `[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+` | beats MENTION by longest match |
| 5 | `MENTION` | `@<ID>+` | `@everyone`, `@here` flagged `BROADCAST` in post-processing |
| 6 | `HASHTAG` | `#(<L>\|_)(<L>\|<D>\|_)*` | no all-digit hashtags |
| 7 | `COMMAND` | `/<L>(<L>\|<D>\|_)*` | `startOfLine: true` |
| 8 | `SHORTCODE` | `:(<L>\|<D>\|[_+\-])+:` | `:thumbsup:` |
| 9 | `EMOJI` | `(<EP><VS16>?<SKIN>?(<ZWJ><EP><VS16>?<SKIN>?)*)\|<RI><RI>` | handles ZWJ sequences, skin tones, flags |
| 10 | `EMOTICON` | `[:;=][\-o^']?[)(DPpOo/\\\|*$@sS3\]\[>]\|<3\|</3\|\^_\^\|-_-\|[Tt]_[Tt]\|[oO]_[oO]\|[xX]D` | eyes limited to `: ; =` to avoid false positives like `(item 8)` |
| 11 | `TIME` | `((<D>\|[01]<D>\|2[0-3]):[0-5]<D>(:[0-5]<D>)?(am\|pm\|AM\|PM)?)\|((1[0-2]\|0?[1-9])(am\|pm\|AM\|PM))` | `5:30pm`, `17:45`, `5pm` |
| 12 | `DATE` | `<D>{1,2}[/\-.]<D>{1,2}[/\-.](<D>{4}\|<D>{2})\|<D>{4}-<D>{2}-<D>{2}` | |
| 13 | `CURRENCY` | `(₹\|\$\|€\|£\|Rs\.?)<D>+(,<D>+)*(\.<D>+)?` | `₹1,299.50` |
| 14 | `PHONE` | `\+<D>{1,3}[ \-]?<D>{10}\|<D>{10}` | any bare 10-digit number is a PHONE (documented ambiguity) |
| 15 | `PERCENT` | `<D>+(\.<D>+)?%` | |
| 16 | `ORDINAL` | `<D>+(st\|nd\|rd\|th)` | |
| 17 | `FLOAT` | `<D>+\.<D>+` | |
| 18 | `INTEGER` | `<D>+` | |
| 19 | `CODE_SPAN` | `` `[^`\n]+` `` | |
| 20 | `BOLD` | `\*[^*\s\n]([^*\n]*[^*\s\n])?\*` | `*urgent*` |
| 21 | `ITALIC` | `_[^_\s\n]([^_\n]*[^_\s\n])?_` | `_really_` |
| 22 | `STRIKE` | `~[^~\s\n]([^~\n]*[^~\s\n])?~` | |
| 23 | `WORD` | `<L>(<L>\|<M>\|<D>)*(['’_\-](<L>\|<M>\|<D>)+)*` | `don't`, `snake_case`, `covid19`, Hinglish, Devanagari, Tamil |
| 24 | `ELLIPSIS` | `\.\.+\|…` | |
| 25 | `EMPHASIS` | `[!?]+` | `!!!`, `?!?` |
| 26 | `PUNCT` | `[.,;:'"()\[\]{}\-]` | |
| 27 | `UNTERMINATED_CODE` | `` `[^`\n]* `` | kind=ERROR, message "unterminated code span" |
| 28 | `SYMBOL` | `<VIS>` (single char) | catch-all for visible leftovers like `& + = < > / \` |
| 29 | `ERROR` | `<CTRL>` | invalid control char, kind=ERROR |

Because `SYMBOL` is a catch-all, the only true lexical errors are control characters and unterminated code spans. Additionally the lexer has a **panic-mode fallback**: if no DFA path accepts at all (cannot happen with SYMBOL, but must be implemented and unit-tested using a custom rule set), emit one `ERROR` for one code point and continue.

### 6.1 Token kinds (for coloring and stats)
`TEXT` (WORD), `ENTITY` (MENTION, HASHTAG, COMMAND, URL, EMAIL), `EMOTIVE` (EMOJI, SHORTCODE, EMOTICON), `NUMERIC` (INTEGER, FLOAT, PERCENT, ORDINAL, CURRENCY, PHONE, TIME, DATE), `FORMAT` (BOLD, ITALIC, STRIKE, CODE_SPAN), `PUNCT` (PUNCT, ELLIPSIS, EMPHASIS, SYMBOL), `SPACE` (WHITESPACE, NEWLINE), `ERROR`.

### 6.2 Known ambiguities (list them in the Theory page, they impress)
1. 10-digit integers lex as `PHONE` (priority rule).
2. `ftp://x` is not a URL (only `http(s)` and `www.`); `:/` may lex as an EMOTICON. Show as "limitations by design".
3. `2day` lexes as `INTEGER` + `WORD`.
4. `_` inside a word is part of the WORD, so `snake_case_name` is one token, while `_text_` alone is ITALIC.

---

## 7. Engine design

### 7.1 Core types (`src/engine/types.ts`)
```ts
export type AtomId = number;
export interface Interval { lo: number; hi: number }
export interface CharSet { ranges: Interval[] }            // normalized, sorted

export interface RuleDef {
  id: number; name: string; pattern: string;
  kind: TokenKind; startOfLine?: boolean;
  isError?: boolean; message?: string;
  color: string;                                          // for UI
  description: string; examples: string[];
}

export type RegexNode =
  | { t: 'empty' } | { t: 'eps' }
  | { t: 'set'; set: CharSet; label: string }
  | { t: 'cat'; a: RegexNode; b: RegexNode }
  | { t: 'alt'; a: RegexNode; b: RegexNode }
  | { t: 'star'; a: RegexNode } | { t: 'plus'; a: RegexNode } | { t: 'opt'; a: RegexNode }
  | { t: 'rep'; a: RegexNode; min: number; max: number | null };

export interface NFA {
  numStates: number; start: number;
  eps: number[][];                        // eps[s] = list of targets
  trans: Map<number, [AtomId, number][]>[]| ...; // choose an efficient structure
  accept: Map<number, number>;            // nfaState -> ruleId
}

export interface DFA {
  numStates: number; numAtoms: number; start: number;
  table: Int32Array;                      // state*numAtoms + atom, -1 = dead
  acceptRule: Int16Array;                 // -1 = not accepting
  stateNfaSets?: number[][];              // for subset visualization
  stateLabels?: string[];                 // q0, q1... (stable naming, BFS order from start)
}

export interface Token {
  type: string; ruleId: number; kind: TokenKind;
  lexeme: string; start: number; end: number;           // UTF-16 indices
  line: number; col: number;                            // 1-based
  flags: string[];                                      // ELONGATED, ALL_CAPS, SLANG, BROADCAST...
}

export type TraceEvent =
  | { t: 'begin'; pos: number; startState: number }
  | { t: 'step'; pos: number; ch: string; atom: AtomId; from: number; to: number; accepting: boolean; ruleId: number }
  | { t: 'mark'; pos: number; state: number; ruleId: number }      // last accepting update
  | { t: 'dead'; pos: number; ch: string; from: number }
  | { t: 'backtrack'; from: number; to: number }                   // maximal munch rollback
  | { t: 'emit'; token: Token }
  | { t: 'error'; pos: number; message: string };
```
Use code points (not UTF-16 units) when stepping; store UTF-16 indices in tokens for easy slicing in the UI.

### 7.2 Lexer loop (maximal munch, pseudocode, implement exactly)
```
pos = 0
while pos < n:
  state = start; lastAcc = -1; lastAccPos = -1; i = pos
  trace.begin(pos)
  while i < n:
    cp = codePointAt(i); atom = classify(cp)
    next = table[state*A + atom]
    if next == -1: trace.dead(i); break
    state = next; i += len(cp)
    trace.step(...)
    if acceptRule[state] != -1:
       // honor startOfLine: skip rule if rule.startOfLine && column(pos) != 0
       lastAcc = acceptRule[state]; lastAccPos = i; trace.mark(...)
  if lastAcc == -1: panic: emit ERROR for one code point; pos += len; continue
  if lastAccPos < i: trace.backtrack(i -> lastAccPos)
  emit token(pos, lastAccPos, rule = lastAcc); pos = lastAccPos
```
**startOfLine handling:** implement by compiling startOfLine rules into a **second DFA** (`dfaLineStart`) containing ALL rules, while the normal `dfa` excludes them. At column 0 use `dfaLineStart`, otherwise `dfa`. Both are built at startup. Show both in the Explorer.
**Tracing is optional:** `lex(text, { trace: false })` is the fast path with no allocations per char beyond tokens.

### 7.3 Post-processing (still DFAs, still no regex)
Run on emitted tokens, adds `flags`:
1. **Lexicon trie DFA:** compile `data/slang.ts` (lol, brb, omg, idk, tbh, imo, fyi, btw, asap, ngl, smh, bro, bruh, yaar, bhai, scene, pls, plz, thx, gm, gn, ttyl, ikr, irl, ...) into a trie, then convert to a DFA over lowercase atoms. A WORD that the lexicon DFA accepts gets flag `SLANG`. Point out in UI: "a trie is a DFA".
2. **Elongation DFA:** generated programmatically. Accepts words containing any letter repeated 3+ times. States = `(lastLetter, runLength 1..3)` plus an absorbing accept state. Flag `ELONGATED`. Because the full machine is large (~80 states), the Explorer shows a **toy alphabet** version ({a,b,c,other}) as an illustrative diagram and the real one as statistics.
3. **All caps:** WORD length >= 2, every letter uppercase (via classifier tables), flag `ALL_CAPS`.
4. **Broadcast:** MENTION lexeme equals `@everyone` or `@here` (a keyword DFA too) -> `BROADCAST`.
5. **Script detection:** per WORD, flag `LATIN`, `DEVANAGARI`, `TAMIL`, or `OTHER` from atom classes.

### 7.4 Symbol table (`symbols.ts`)
Compiler-style symbol table built during lexing for `MENTION`, `HASHTAG`, `URL`, `EMAIL`, `COMMAND`, `SHORTCODE`: `{ lexeme, type, count, firstPos, positions[] }`. Show in UI. (Direct tie to the syllabus.)

### 7.5 Error handling
- Errors are tokens of `kind: ERROR` with a message, never exceptions.
- Strategy: **panic mode recovery** (skip to a synchronizing point: here, one code point or until the end of the line for unterminated code span). Document this as the chosen strategy.
- UI shows red squiggles, an Errors panel, and a toast on first error.

### 7.6 Public API (`src/engine/index.ts`)
```ts
buildEngine(rules?: RuleDef[]): Engine            // builds everything, returns stats
engine.lex(text, opts?): { tokens, errors, symbols, trace? }
engine.stats: { perRule: {nfaStates, dfaStates, minDfaStates}[], master: {...}, atoms: number, buildMs: number }
engine.dfaFor(ruleId | 'master' | 'master-linestart'): DFA
engine.construction(ruleId | 'master'): { ast, nfa, subsetLog, moorRounds, minDfa }   // for the Construction Lab
engine.matchFull(dfa, text): boolean              // used by Benchmarks
```

---

## 8. Reference test corpus (must pass, put in `tests/lexer.cases.test.ts`)

Format: input -> sequence of `TYPE(lexeme)` ignoring WHITESPACE.

1. `hey @eldo check https://vit.ac.in/x. now!!!` -> `WORD(hey) MENTION(@eldo) WORD(check) URL(https://vit.ac.in/x) PUNCT(.) WORD(now) EMPHASIS(!!!)`  (URL trailing dot proves backtracking)
2. `meet at 5:30pm tmrw` -> `WORD(meet) WORD(at) TIME(5:30pm) WORD(tmrw)`
3. `loooool :) <3` -> `WORD(loooool)[ELONGATED] EMOTICON(:)) EMOTICON(<3)`
4. `mail me: abc.def@vit.ac.in` -> `WORD(mail) WORD(me) PUNCT(:) EMAIL(abc.def@vit.ac.in)`
5. `price ₹1,299.50 only` -> `WORD(price) CURRENCY(₹1,299.50) WORD(only)`
6. `call +91 9876543210` -> `WORD(call) PHONE(+91 9876543210)`
7. `use \`git push\` now` -> `WORD(use) CODE_SPAN(\`git push\`) WORD(now)`
8. `*urgent* _really_ ~nope~` -> `BOLD(*urgent*) ITALIC(_really_) STRIKE(~nope~)`
9. `don't stop` -> `WORD(don't) WORD(stop)`
10. `#ProjectDay2026 is live` -> `HASHTAG(#ProjectDay2026) WORD(is) WORD(live)`
11. `12/10/2026 and 2026-10-14` -> `DATE(12/10/2026) WORD(and) DATE(2026-10-14)`
12. `😂🔥 👍🏽 👨‍💻 🇮🇳` -> `EMOJI(😂) EMOJI(🔥) EMOJI(👍🏽) EMOJI(👨‍💻) EMOJI(🇮🇳)`
13. `@everyone join` -> `MENTION(@everyone)[BROADCAST] WORD(join)`
14. line-start `/poll Lunch?` -> `COMMAND(/poll) WORD(Lunch) EMPHASIS(?)`; but `and/or` -> `WORD(and) SYMBOL(/) WORD(or)`
15. `` `oops `` -> `ERROR(UNTERMINATED_CODE)`
16. `bro THIS is sooooo good lol` -> `WORD(bro)[SLANG] WORD(THIS)[ALL_CAPS] WORD(is) WORD(sooooo)[ELONGATED] WORD(good) WORD(lol)[SLANG]`
17. `aaa.bbb@c` -> shows EMAIL does not match (needs TLD): `WORD(aaa) PUNCT(.) WORD(bbb) SYMBOL(@)` ... then `WORD(c)`; verify what the DFA actually gives and keep the test consistent with the rules, explain in comment.
18. `82% done, 3rd try` -> `PERCENT(82%) WORD(done) PUNCT(,) ORDINAL(3rd) WORD(try)`
19. Hinglish: `bhai kal 5pm pe milte hain 🔥` -> `WORD(bhai)[SLANG] WORD(kal) TIME(5pm) WORD(pe) WORD(milte) WORD(hain) EMOJI(🔥)`
20. Devanagari/Tamil: `नमस्ते दोस्त` and `வணக்கம் நண்பா` -> each is two WORD tokens (verifies the `M` class).
21. `(item 8)` -> `PUNCT(() WORD(item) INTEGER(8) PUNCT())` (proves `8)` is not an emoticon)
22. Empty string, only spaces, only newlines, 100k-char input.

### 8.1 Property/fuzz tests (fast-check)
- **Partition property:** concatenating all token lexemes reproduces the input exactly (no gaps, no overlaps) for any random string.
- **Oracle differential test:** `toJsRegex` converts each rule AST into a sticky JS RegExp; the oracle takes the longest match with lowest-index tie-break at each position. Engine tokens must equal oracle tokens on 5000 random strings from a chat-biased alphabet (letters, digits, `@#:/.,!?*_~\`` space, emoji, Devanagari). Mark with `// ALLOWED-REGEXP: test oracle`.
- **Minimization equivalence:** minimized DFA and unminimized DFA agree on 10k random strings, per rule and for master. Moore state count == Hopcroft state count.
- **Determinism:** same input twice gives identical tokens and trace.
- **Linear time:** lexing 2^k repeated copies of a message scales roughly linearly (assert ratio of times within a generous bound).

---

## 9. Sample chats (`src/data/presets.ts`)

Ship these presets (selectable from a dropdown, loaded into Playground and Chat Simulator). Write them as realistic multi-message conversations.
1. **"Hackathon night"**: Hinglish banter, mentions, hashtags, times, URLs, emoji, `@everyone`.
2. **"Study group"**: dates, ordinals, code spans, commands (`/remind`), percentages, shortcodes.
3. **"Marketplace"**: currency, phone numbers, emails, URLs, bold/strike pricing.
4. **"Phishing attempt"**: suspicious URLs (IP-style host, long path), urgency caps, `!!!`, fake phone, broadcast mention (used by the "Risk signals" widget, Section 10.6).
5. **"Gen Z chaos"**: elongation, slang, emoticons, ZWJ emoji, ALL CAPS, ellipses.
6. **"Multilingual"**: English + Devanagari + Tamil + emoji.
7. **"Stress test"**: generated 20k-char chaos string (for Benchmarks).
8. **"Error lab"**: control chars, unterminated code spans, weird symbols.

---

## 10. UI / UX specification

Single-page app with top tab navigation. Dark theme by default with a light toggle. Every page must have an empty state, a loading state (engine build is fast but show a skeleton), and be responsive down to tablet width (mobile = graceful degradation, not a priority).

### 10.1 Global shell
- **Top bar:** logo "LexiChat" with a small animated DFA glyph (3 nodes, a pulsing token moving along edges), engine status pill ("Engine ready: 29 rules, 142 DFA states, built in 38 ms" from real stats), theme toggle, command palette button.
- **Tabs:** Playground, Automata Explorer, Construction Lab, Chat Simulator, Analytics, Benchmarks, Theory.
- **Command palette (Ctrl/Cmd+K):** jump to pages, load presets, toggle theme, export JSON, run benchmark.
- **Keyboard shortcuts** shown in a `?` modal: Space play/pause trace, Left/Right step, `[` `]` speed, `T` toggle trace dock, `1..7` switch tabs.
- Page transitions with Framer Motion (fade + 8px slide). Subtle animated gradient mesh background (CSS only, low cost).

### 10.2 Playground (the hero page)
Layout: left column editor, right column results, bottom dock trace player.
1. **Editor:** multi-line, monospaced, with **live token highlighting** (mirror-div overlay technique: transparent textarea above a div that renders each token as a colored background span). Tooltip on hover: token type, lexeme, rule pattern, start/end, flags. Red wavy underline for ERROR tokens. Debounced 0ms (engine is fast); optionally lex in worker above 50k chars.
2. **Token chips strip:** the token stream rendered as colored chips with type labels, animated in (stagger). Click a chip to select it everywhere (editor selection, table row, trace jump).
3. **Token table:** virtualized, sortable, filterable by type/kind, search box; columns: #, type, lexeme, line:col, length, flags, rule id. Copy as JSON/CSV buttons.
4. **Symbol table panel:** mentions/hashtags/URLs/emails/commands with counts and first positions (hover highlights occurrences in editor).
5. **Errors panel:** list of lexical errors with message, position, recovery action taken ("panic mode: skipped 1 character").
6. **Rendered preview toggle:** "How Discord would render it": mentions as blue pills, hashtags colored, URLs as links (not clickable), emoji big, bold/italic/strike applied, code spans in mono boxes. Tokens remain the source of truth.
7. **Trace player dock** (see 10.3), collapsible.
8. **Presets dropdown** and "Randomize message" button (generates a chat-like string from templates).

### 10.3 Trace Player (the wow component, `TracePlayer.tsx`)
Shows the DFA consuming the **currently selected token** (or the whole message token by token). Built from `TraceEvent[]`, fully scrubbable (precompute events, index = playhead).
- **Character tape:** each code point in its own cell (monospace, emoji-safe). Cells show the atom label beneath (`letter`, `digit`, `@`, ...). A glowing **read head** moves along; consumed cells fill with the token's color; the current lexeme start is bracketed.
- **Mini DFA graph (Cytoscape):** only the relevant subgraph (states visited in this trace plus 1 hop neighbors) to keep it readable, with a toggle "show full master DFA". Current state glows; the edge just taken pulses and a small particle travels along it; visited states get a trail fade.
- **State badge:** `q17` with accepting marker and rule name (`accepts: URL`).
- **Last-accept pin:** a pin icon sits on the tape at the last accepting position and updates on `mark` events.
- **Backtrack animation:** on `dead` the read head flashes red, then rewinds along the tape to the pin with a rubber-band animation and the caption "Maximal munch: rolled back 1 char to last accepting state". This must be visually unmistakable.
- **Emit animation:** the finished token slides up into the token chips strip.
- **Controls:** play/pause, step back, step forward, speed (0.25x to 8x), scrubber timeline with event ticks (green = accept mark, red = dead/backtrack), "jump to next backtrack", loop.
- **Narration line:** a one-sentence live caption per event: "Read `@`: q0 -> q9 (mention prefix)". Generated from events.
- **Transition table sync:** a collapsible `TransitionTable` where the active `(state, atom)` cell highlights.

### 10.4 Automata Explorer
- **Selector:** choose any token rule, `master`, `master (line start)`, `elongation toy DFA`, or `slang trie DFA`.
- **Graph view (Cytoscape + dagre):** nodes `q0..qn`, start arrow, accepting states as double circles colored by rule, edges with merged atom labels, curved self loops, dead state hidden by default (toggle). Zoom/pan, fit button, node drag, hover shows the NFA state set (subset construction origin) in a side panel.
- **Master DFA readability:** cluster/color nodes by the rule they lead to; "focus mode": click a state to dim everything beyond 2 hops; a search box "go to state"; minimap.
- **Stats cards:** NFA states, DFA states, minimized states, edges, atoms, build time, table memory (bytes).
- **Transition table tab:** full matrix with sticky headers, accepting rows tinted, empty cells dim, hover highlights row/col.
- **Export:** PNG, SVG, DOT, JSON, transition table CSV.
- **Heatmap overlay toggle:** color states by visit counts from the last lexed message (Section 10.6).

### 10.5 Construction Lab (the "compiler theory" showpiece)
A guided, animated, 5-step pipeline for ANY rule or any **user-typed regex** (text input with live parse errors):
1. **Regex -> AST:** tree diagram (custom SVG or Cytoscape tree layout), nodes animate in by parse order, with the grammar production that created each node.
2. **AST -> Thompson NFA:** build the NFA fragment by fragment (step button / auto-play), epsilon edges dashed and gray, new states fade in. Show the standard Thompson fragment diagram in a sidebar for the operator currently being applied.
3. **NFA -> DFA (subset construction):** left = NFA with the current subset highlighted; right = DFA being drawn; below = the **step table** (`T`, symbol, `move(T,a)`, `eps-closure`, `new/existing state`). Row-by-row playback.
4. **DFA minimization:** Moore rounds: show the partition as colored groups of states in each round, with the splitting reason ("q3 and q5 differ on `digit`"). Final: merged states animate together; counter "17 -> 9 states".
5. **Run it:** type a test string, watch the final DFA accept/reject (reuses TracePlayer).
- **Compare toggle:** NFA simulation vs DFA simulation side by side on the same string (NFA shows the *set* of active states, DFA a single state). Great for explaining why DFAs are deterministic and fast.
- A "Why this works" collapsible explaining each step in 3 to 4 lines.

### 10.6 Chat Simulator
- A realistic chat window (bubbles, avatars with initials, timestamps, typing indicator). User picks a preset conversation or types as "You". Messages are lexed **as they are sent** (live, with a small "lexing... 0.04 ms" badge).
- Each message bubble can toggle **"X-ray mode"**: tokens appear as colored chips with types over the message text.
- Side panel: **Live token feed** (scrolling log), **Symbol table** (cumulative across the conversation: who got mentioned most, trending hashtags, links shared), and **Risk signals** widget (computed ONLY from tokens, clearly labeled "heuristic, not ML"): urgency caps count, `EMPHASIS` density, broadcast mentions, URLs whose host is a raw IP or has >3 subdomains or a path longer than 60 chars, PHONE + CURRENCY co-occurrence. Shows a 0 to 100 meter with the contributing tokens listed. Use the "Phishing attempt" preset to demo.
- "Replay conversation" button that animates messages arriving with typing indicators.
- Everything on this page consumes the real `engine.lex` output.

### 10.7 Analytics
- **Stat cards:** total tokens, unique tokens, avg tokens/message, emoji density, error rate, avg lexing time.
- **Charts (Recharts):** token type donut, tokens per message bar, kind stacked bar per message, top-N lexemes bar, character class histogram (atoms hit), token length distribution.
- **DFA state-visit heatmap:** graph of the master DFA with node color = visit frequency for the current corpus. Legend + "hottest states" list with the lexeme prefixes that led there.
- **Message profile cards:** per message: caps ratio, elongation count, emoji count, emphasis density, slang count, shown as a small radar chart.
- Data source selector: current Playground text, Chat Simulator conversation, or preset corpus. Export as JSON and as a Markdown report.

### 10.8 Benchmarks (the "why DFA" page)
Run inside Web Workers with progress bars and a cancel button.
1. **Throughput:** lex inputs of 1 KB, 10 KB, 100 KB, 1 MB, 5 MB (generated from presets). Line chart of time vs size with a linear-fit line and R^2. Show chars/sec and MB/s. Target: > 20 MB/s untraced on a modern laptop (report actual number honestly).
2. **ReDoS showdown:** pattern `(a+)+` full-match against `aaaa...ab` for n = 10..30. Series A: native JS RegExp (`^(a+)+$`) with a 2 s timeout per run (kill the worker when exceeded and mark "timed out"). Series B: our engine compiles the same pattern in the rule dialect and runs `matchFull`. Chart on a log scale: exponential vs flat. Big caption: "Same language, DFA never backtracks." This is a key wow slide.
3. **Build cost:** table of regex -> DFA build time and state counts for each rule and master (before/after minimization).
4. **Optional correctness panel:** a button "Run differential fuzz test (2000 strings)" that runs the oracle comparison in a worker and shows pass/fail and any counterexample.

### 10.9 Theory page
Static but beautiful (cards + diagrams): the 6 pipeline stages, definitions from 5.1, token table with regexes, ambiguity list from 6.2, complexity table (build: subset construction worst case exponential, typical small; run: O(n) transitions plus maximal-munch rollback worst case O(n^2) on adversarial inputs, mention and demo with a pathological rule set in the Explorer as "adversarial example"), comparison NFA vs DFA vs backtracking regex, and glossary. Include a "Try it" link from each concept to the relevant page.

### 10.10 Visual QA checklist (verify by screenshots)
- No layout overflow at 1280, 1440 and 1920 widths.
- Graph nodes and labels never overlap badly; edges labeled legibly (min 11px).
- Colors meet contrast on dark and light themes.
- Animations run at 60fps on the 2k-char sample.

---

## 11. Design system

- **Vibe:** dark, high-contrast, "developer tool meets sci-fi lab". Glass panels (`backdrop-blur`, 1px border `rgba(255,255,255,0.08)`), generous spacing, 12px radius, soft glows for active elements.
- **Base colors (dark):** background `#070A12`, surface `#0E1424`, surface-2 `#141C33`, border `#1F2A4A`, text `#E6EAF5`, muted `#8A94B2`, accent `#7C5CFF` (violet), accent-2 `#22D3EE` (cyan), success `#34D399`, warn `#FBBF24`, danger `#F87171`.
- **Light theme:** invert sensibly, keep the same accents.
- **Token colors (use consistently in editor, chips, tables, graphs, charts):**

| Kind / Token | Color |
|---|---|
| WORD | `#94A3B8` |
| MENTION | `#60A5FA` |
| HASHTAG | `#A78BFA` |
| URL | `#22D3EE` |
| EMAIL | `#2DD4BF` |
| COMMAND | `#F472B6` |
| EMOJI / SHORTCODE / EMOTICON | `#FBBF24` / `#F59E0B` / `#FCD34D` |
| TIME / DATE | `#34D399` / `#4ADE80` |
| CURRENCY / PHONE | `#FB923C` / `#F97316` |
| INTEGER / FLOAT / PERCENT / ORDINAL | `#86EFAC` family |
| BOLD / ITALIC / STRIKE / CODE_SPAN | `#E879F9` / `#C084FC` / `#FB7185` / `#38BDF8` |
| PUNCT / ELLIPSIS / EMPHASIS / SYMBOL | `#64748B` / `#64748B` / `#F43F5E` / `#475569` |
| ERROR | `#EF4444` (with wavy underline) |

- **Typography:** Inter for UI, JetBrains Mono for lexemes, tape, tables. Tabular numerals for stats.
- **Motion:** 150 to 250 ms eases, spring for chips. Respect `prefers-reduced-motion` (turn particle/rewind animations into instant highlights).
- **Accessibility:** all interactive controls keyboard reachable, ARIA labels on tape cells and controls, color is never the only signal (token type text labels too).

---

## 12. CLI (`scripts/cli.ts`)

```
npm run lex -- "hey @eldo check https://x.com/a. now!!!"        # pretty table of tokens
npm run lex -- --json "..."                                     # JSON output
npm run lex -- --trace "..."                                    # prints the DFA trace events
npm run lex -- --file chat.txt --stats                          # stats + timing
npm run dot -- --rule URL > url.dot                             # Graphviz DOT export
npm run dot -- --master > master.dot
```
Colored terminal output (ANSI) is a plus.

---

## 13. Performance & engineering requirements

- Engine build < 150 ms; lexing 1 MB untraced < 100 ms (measure; if slower, optimize table layout/ASCII fast path, record numbers in REPORT.md).
- Atoms count target < 80. If higher, merge atoms that never differ in any rule.
- Memory: master table size reported in UI.
- No per-character object allocation on the untraced path; reuse typed arrays.
- Large input (>200k chars): lex in a worker, show progress.
- Graph rendering cap: if a graph has > 400 nodes, default to focus mode and warn.
- Error boundaries around each page; a crashed visualizer must not take down the app.

---

## 14. Phased build plan (execute in order)

### Phase 0: Scaffold
- [ ] Vite + React + TS + Tailwind + Zustand + Vitest + fast-check + ESLint + Prettier.
- [ ] Folder structure from Section 4, base theme, empty pages with tab nav.
- [ ] `no-regexp.test.ts` guard in place.
- **Accept:** `npm run dev` shows shell with tabs; all scripts exist and pass.

### Phase 1: Character classes and atoms
- [ ] `gen-unicode-tables.ts` generating `L, M, EP, ...` range tables into `unicode-tables.generated.ts`.
- [ ] Interval set ops (union, minus, not, normalize), named classes, atom partitioning, classifier with ASCII fast path, atom labels.
- **Accept:** unit tests for set ops, atom partition covers 0..0x10FFFF exactly once, classifier correct for sample chars (a, Z, 5, ए, த, 😂, ZWJ).

### Phase 2: Regex parser and AST
- [ ] Parser for the dialect in 5.4 with precise error messages (position + expected token).
- [ ] AST pretty-printer, `toJsRegex` for the oracle (tests only).
- **Accept:** parses every rule in Section 6; invalid regexes produce readable errors; round-trip pretty-print tests.

### Phase 3: NFA and DFA machinery
- [ ] Thompson construction with step logging, combine rules, NFA simulation.
- [ ] Subset construction with step logging and stable BFS state naming.
- [ ] Moore minimization with per-round log, Hopcroft for runtime, dead/unreachable pruning, tagged-accept initial partition.
- [ ] Flat transition table, DFA `matchFull`.
- **Accept:** classic textbook examples pass (`(a|b)*abb` -> 4 state minimal DFA; `a*b*` etc.); Moore == Hopcroft counts; DFA == NFA on random strings.

### Phase 4: The lexer
- [ ] `rules.ts` with all 29 rules, colors, descriptions, examples.
- [ ] Maximal munch lexer with trace, line/col tracking, startOfLine second DFA, panic recovery, symbol table, post-processing (lexicon trie DFA, elongation DFA, caps, broadcast, script).
- [ ] CLI.
- **Accept:** all Section 8 cases pass; partition property passes; build and lex timing recorded.

### Phase 5: Test hardening
- [ ] Oracle differential fuzz (5000 strings), minimization equivalence, determinism, linear-time test, 100k-char input.
- **Accept:** `npm test` green; any engine bug found is fixed in the engine, not papered over in tests.

### Phase 6: Playground UI
- [ ] Editor with live highlighting overlay, tooltips, chips strip, token table, symbol table, errors panel, rendered preview, presets.
- **Accept:** typing updates everything instantly; clicking chip/row/token syncs selection; screenshots verified.

### Phase 7: Automata Explorer + DfaGraph
- [ ] Cytoscape DFA renderer with merged edge labels, accept coloring, focus mode, search, minimap, stats, transition table, exports.
- **Accept:** every rule DFA renders cleanly; master DFA usable via focus mode; PNG/SVG/DOT export works.

### Phase 8: Trace Player
- [ ] Tape, mini graph, read head, particle animation, last-accept pin, backtrack rewind, emit animation, controls, scrubber, narration, table sync, keyboard shortcuts.
- **Accept:** the `https://vit.ac.in/x. now` trace visibly rolls back one char at the dot; scrubbing backward works; reduced-motion mode works.

### Phase 9: Construction Lab
- [ ] AST tree view, Thompson stepper, subset construction stepper with table, Moore minimization stepper, run-it step, NFA vs DFA comparison, user-typed regex input with live errors.
- **Accept:** `(a|b)*abb` walkthrough is correct at every step and matches textbook figures; typing an invalid regex shows an inline error without crashing.

### Phase 10: Chat Simulator
- [ ] Chat UI, presets, live lexing, X-ray mode, live feed, cumulative symbol table, risk signals widget, replay.
- **Accept:** phishing preset yields a high risk meter with listed reasons; all data traces to `engine.lex`.

### Phase 11: Analytics
- [ ] Stat cards, charts, state-visit heatmap on DFA graph, per-message radar, exports (JSON + Markdown report).
- **Accept:** switching the data source updates all charts; heatmap highlights match the trace for a known string.

### Phase 12: Benchmarks
- [ ] Worker-based throughput, ReDoS showdown with timeout/kill, build-cost table, fuzz panel.
- **Accept:** ReDoS chart shows native RegExp blowing up (or timing out) while the DFA stays flat; throughput chart has a linear fit.

### Phase 13: Theory page, polish, accessibility
- [ ] Theory page, command palette, shortcuts modal, error boundaries, empty/loading states, light theme, reduced motion, favicon, meta tags, 404 handling.
- [ ] Visual QA checklist (10.10) executed with screenshots.
- **Accept:** no console errors; Lighthouse accessibility >= 90 on Playground.

### Phase 14: Docs and delivery
- [ ] `README.md` (what it is, GIF/screenshots, how to run, architecture diagram, scripts).
- [ ] `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`.
- [ ] `docs/REPORT.md`: full project report using REAL numbers from the engine (state counts before/after minimization per rule, build times, throughput, ReDoS results). Outline: Abstract; Introduction and motivation; Related concepts (regex, NFA, DFA, Thompson, subset construction, minimization, maximal munch); Token specification; Design and implementation; Visualization design; Testing methodology and results; Performance analysis; Limitations and ambiguities; Future work (start conditions for code blocks, Unicode normalization, streaming lexer, LLM-free spam heuristics, lexer-to-parser handoff); Conclusion; References (Aho/Lam/Sethi/Ullman "Compilers: Principles, Techniques, and Tools", Hopcroft/Motwani/Ullman, Thompson 1968, Cox "Regular Expression Matching Can Be Simple And Fast").
- [ ] `docs/VIVA.md`: 30 likely viva questions with crisp answers (NFA vs DFA, why subset construction can blow up, why minimize, how ties are resolved, what maximal munch is and its worst case, why no backtracking means no ReDoS, difference between lexeme/token/pattern, how errors are handled, why atoms instead of raw Unicode, what the symbol table is, how start conditions work, etc.).
- [ ] `docs/DEMO_SCRIPT.md`: a timed 3 minute demo (see below).
- [ ] Production build verified; deploy config (`vite.config.ts` base option, `vercel.json` or GitHub Pages workflow).
- **Accept:** fresh clone -> `npm i && npm run dev` works; `npm run build && npm run preview` works; all docs exist.

### Demo script outline (`docs/DEMO_SCRIPT.md` must expand this)
1. (0:00) Playground: paste "Hackathon night" preset; tokens light up. Point out `@everyone`, URL, emoji ZWJ.
2. (0:40) Trace player on `https://vit.ac.in/x.`; show the rollback at the dot ("maximal munch").
3. (1:10) Explorer: show URL DFA, then master DFA focus mode; "this DFA was built from regex by our own compiler".
4. (1:40) Construction Lab: `(a|b)*abb` AST -> NFA -> subset table -> minimization.
5. (2:15) Chat Simulator: phishing preset, risk meter, symbol table.
6. (2:40) Benchmarks: ReDoS showdown, "regex engine hangs, our DFA is flat".
7. (2:55) Close: "Every token you saw came from a DFA we generated ourselves."

---

## 15. Definition of Done (the "wow" checklist)

- [ ] All Section 8 test cases and fuzz tests pass; `npm run build` clean; zero TypeScript errors, zero console errors.
- [ ] No `RegExp` in `src/engine` (enforced by test).
- [ ] Every stage of regex -> NFA -> DFA -> minimized DFA -> lexing is visualized and steppable.
- [ ] The backtrack/rollback animation exists and is obvious.
- [ ] ReDoS showdown works and tells a clear story.
- [ ] Hinglish, Devanagari, Tamil and ZWJ emoji lex correctly.
- [ ] Engine status pill shows REAL stats; REPORT.md quotes REAL numbers.
- [ ] CLI works for lex, trace, and DOT export.
- [ ] README has screenshots; demo script fits in 3 minutes.
- [ ] It looks stunning in both themes.

---

## 16. Risks and pre-decided mitigations

| Risk | Decision |
|---|---|
| Master DFA graph too large to read | Cluster by rule, focus mode with 2-hop neighborhood, per-rule DFAs as the primary teaching view, minimap |
| Subset construction blowup on user-typed regex in the Lab | Cap at 2000 DFA states with a friendly message |
| Emoji/ZWJ complexity | Use generated `EP` tables plus explicit ZWJ/VS16/SKIN/RI classes; test the sample set in case 12 |
| Surrogate pairs and UTF-16 indexing bugs | Iterate by code point, store UTF-16 offsets in tokens, add tests with astral characters |
| Maximal munch worst case O(n^2) | Document it, demonstrate with an adversarial rule set, note linear in practice for chat text |
| Cytoscape performance with animation | Animate via class toggles and a single overlay canvas/SVG for particles, not per-element style churn |
| `8)` / `:/` style false positives | Restrict emoticon eyes, document residual ambiguities in Theory page |
| Time sink on perfection | Build in the phase order; Phases 0 to 5 (engine) are mandatory first, never skip tests |

---

*End of plan. Build it fully, verify it visually, and make it impossible to ignore.*
