# LexiChat DFA: Lexical Analysis Engine for Chat Messages Using Deterministic Finite Automata

> A compiler-grade lexical analysis engine built entirely from formal automata foundations. Compiles a 29-token formal chat grammar directly into deterministic finite automata (DFA) with zero native regular expression dependencies in the execution path.

[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue.svg)](https://www.typescriptlang.org/)
[![Vite + React 18](https://img.shields.io/badge/Vite-React%2018-646CFF.svg)](https://vitejs.dev/)
[![Automata Theory](https://img.shields.io/badge/Automata-Thompson%20NFA%20%7C%20Subset%20DFA-7C5CFF.svg)](#compiler-pipeline)
[![Minimization](https://img.shields.io/badge/Minimization-Hopcroft%20%7C%20Moore-34D399.svg)](#dfa-minimization)
[![ReDoS Immunity](https://img.shields.io/badge/ReDoS-Guaranteed%20O(n)-22D3EE.svg)](#redos-immunity--benchmarks)
[![Test Suite](https://img.shields.io/badge/Tests-45%2F45%20Passing-emerald.svg)](#testing--verification)

---

## Table of Contents
1. [Overview & Motivation](#overview--motivation)
2. [Key Standout Features](#key-standout-features)
3. [Compiler Pipeline & Architecture](#compiler-pipeline--architecture)
4. [The 29 Token Grammar Rules](#the-29-token-grammar-rules)
5. [Alphabet Partitioning (1.1M Unicode ➔ 74 Atoms)](#alphabet-partitioning-11m-unicode--74-atoms)
6. [DFA Minimization: Moore vs Hopcroft](#dfa-minimization-moore-vs-hopcroft)
7. [The 7 Interactive Application Modules](#the-7-interactive-application-modules)
8. [CLI Usage](#cli-usage)
9. [ReDoS Immunity & Benchmarks](#redos-immunity--benchmarks)
10. [Quick Start & Installation](#quick-start--installation)
11. [Testing & Verification](#testing--verification)
12. [Academic Context & Team](#academic-context--team)

---

## Overview & Motivation

In classical compiler design (Aho, Lam, Sethi, Ullman - *The Dragon Book*), the **Lexical Analyzer (Scanner)** is the first phase of the compiler front-end:

$$\text{Raw Character Stream} \xrightarrow{\text{Lexical Analysis (DFA)}} \text{Token Stream} \xrightarrow{\text{Parsing}} \text{Abstract Syntax Tree (AST)}$$

While traditional lexers (e.g. `lex`, `flex`) target structured programming languages (C, Java), modern communication platforms (Discord, WhatsApp, Slack) process unstructured, noisy natural text interleaved with complex tokens:
* URLs with query strings, ports, and trailing sentence punctuation (`https://vit.ac.in/x.`)
* User mentions (`@eldo`, `@channel`) and hashtags (`#ProjectDay2026`)
* Indian currency symbols (`₹1,299.50`) and 12h/24h timestamps (`5:30pm`, `17:45`)
* Unicode emoji presentation sequences (`<EP>+`) and Zero-Width Joiner (ZWJ) multi-character glyphs
* Markdown formatting (bold `*text*`, italic `_text_`, strikethrough `~text~`, inline code `` `code` ``)
* Character elongations (`loooool`, `sooooo`) and informal internet slang

### The Problem with Native Regular Expressions
Production web frameworks conventionally tokenize chat text by running cascades of native regular expressions (`RegExp`). This approach suffers from critical design flaws:
1. **Catastrophic Backtracking (ReDoS):** Native regex engines use recursive Non-Deterministic Finite Automata (NFAs) with backtracking. Ambiguous patterns with nested quantifiers (e.g., `(a+)+`) exhibit worst-case exponential time complexity $\mathcal{O}(2^n)$, allowing malicious inputs to completely freeze the CPU event loop.
2. **Slow Multi-Pass Scanning:** Running 20+ separate regexes repeatedly rescans the same buffer ($\mathcal{O}(k \cdot n)$ passes), wasting CPU cache and generating redundant intermediate strings.
3. **Delimiter & Rollback Ambiguities:** In casual sentences like `Check https://vit.ac.in.`, greedy regexes eat the trailing period into the link, generating broken URLs.

### The LexiChat Solution
**LexiChat DFA** compiles all 29 chat token rules into a unified, minimal Master Deterministic Finite Automaton (DFA) stored in a flat 1D `Uint16Array` memory buffer. 

* **Strict $\mathcal{O}(n)$ Time:** Processes exactly 1 state transition per byte — zero backtracking recursion.
* **100% ReDoS Immune:** Adversarial strings evaluate in microseconds without latency spikes.
* **Maximal Munch Rollback:** Consumes greedily and rolls back cleanly on trailing sentence delimiters.
* **Zero Native RegExp Invariant:** The entire tokenization loop executes purely via state table indexing: `state = table[state * numAtoms + atom]`.

---

## Key Standout Features

| # | Standout Feature | Implementation Highlights |
|---|---|---|
| **1** | **Animated DFA State Transitions** | Interactive simulation bar in the **DFA Explorer** tab. Type any string, adjust playback speed (0.5x to 4x), step forward/back, and watch active nodes glow and transition edges light up in real time on the Cytoscape graph. |
| **2** | **Full Chat Entity Detection** | Robust detection of URLs (including IPv4 and port numbers), user mentions, hashtags, 12h/24h timestamps, Indian currency (`₹`), and Unicode emoji sequences. |
| **3** | **Custom Token Categories & Rule Manager** | Interactive modal to add new user-defined token rules (e.g. `PROMO_CODE`, `CRYPTO_WALLET`), edit regex patterns, and recompile the Master DFA live in the browser at runtime. |
| **4** | **Compiler Panic-Mode Error Recovery** | When invalid characters or unclosed code blocks are encountered, the engine does not crash. It emits diagnostic `ERROR` tokens, logs coordinates (`line:col`), synchronizes on the next whitespace boundary, and continues scanning. |
| **5** | **Head-to-Head DFA vs Regex Showdown** | Live comparative benchmark against native JavaScript `RegExp` across real chat corpora, proving strict linear time, 2x throughput advantage, and zero backtracking overhead. |
| **6** | **Large Chat Dataset Benchmarks** | Scalable synthetic corpus runner benchmarking 1,000 to 10,000 real chat messages (~100 KB to ~1 MB) with sustained throughput exceeding **13.4 MB/s**. |
| **7** | **Dual Minimization (Moore vs Hopcroft)** | Side-by-side execution and state-count verification of **Moore's partition refinement** ($\mathcal{O}(\|\Sigma\| n^2)$) and **Hopcroft's worklist algorithm** ($\mathcal{O}(\|\Sigma\| n \log n)$), mathematically proving canonical Myhill-Nerode isomorphism. |

---

## Compiler Pipeline & Architecture

The compilation and execution pipeline is organized into 5 formal stages:

```
                          29 Formal Regular Expression Rules
                                         │
                                         ▼
                      [ Recursive Descent Parser (AST) ]
                         • Alternation, Concatenation
                         • Kleene Star (*), Plus (+)
                         • Optional (?), Repetitions {m,n}
                                         │
                                         ▼
                   [ Unicode Character Class Partitioning ]
                      • 1,114,112 Unicode Code Points
                      • Compressed to 74 Equivalence Atoms
                                         │
                                         ▼
                    [ Thompson's Inductive Construction ]
                      • Generates modular ε-NFAs per rule
                      • Single start & accept states
                                         │
                                         ▼
                            [ NFA Combination ]
                      • Creates unified start state S₀
                      • ε-transitions to all 29 rule sub-NFAs
                                         │
                                         ▼
                      [ Powerset Subset Construction ]
                      • ε-Closure worklist determinization
                      • Tagged accept states (lowest ruleId wins priority)
                                         │
                                         ▼
                        [ Dual State Minimization ]
                      • Moore Partition Refinement (O(|Σ| n²))
                      • Hopcroft Worklist Algorithm (O(|Σ| n log n))
                                         │
                                         ▼
                      [ Flat 1D Transition Table Buffer ]
                      • Stored in contiguous Uint16Array
                      • Indexing: table[state * numAtoms + atom]
                                         │
                                         ▼
                       [ Maximal Munch Lexer Loop ]
                      • Single-pass O(n) table lookup
                      • Checkpoint mark on accepting states
                      • Checkpoint rollback on dead states
                                         │
                                         ▼
                   [ Post-Processing & Normalization ]
                      • Slang Trie DFA (e.g. "tbh" ➔ "to be honest")
                      • Elongation DFA (e.g. "loooool" ➔ "lol")
                      • Unicode Script Tagger (Devanagari, Tamil, Latin)
                                         │
                                         ▼
                     FINAL EMITTED TOKEN STREAM & SYMBOL TABLE
```

---

## The 29 Token Grammar Rules

The Master DFA natively recognizes 29 distinct lexical categories with deterministic compile-time priority arbitration:

| # | Token Name | Category | Regex Specification / Syntax | Description & Examples |
|---|---|---|---|---|
| **1** | `NEWLINE` | SPACE | `\r\n\|\n\|\r` | Line break tracker (updates `line` and resets `col`). |
| **2** | `WHITESPACE` | SPACE | `<WS>+` | Spaces and tabs (`[ \t]+`). Stripped or emitted. |
| **3** | `URL` | ENTITY | `(https?://\|www\.)<URLC>*<URLE>` | Web URLs including IPv4, ports, and query strings. Example: `https://vit.ac.in:8080/events?id=1` |
| **4** | `EMAIL` | ENTITY | `[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+` | Standard email addresses. Example: `sales@vit.ac.in` |
| **5** | `MENTION` | ENTITY | `@<ID>+` | User or channel mentions. Example: `@eldo`, `@channel`, `@everyone` |
| **6** | `HASHTAG` | ENTITY | `#(<L>\|_)(<L>\|<D>\|_)*` | Topic hashtags with letters, digits, and underscores. Example: `#VIT`, `#ProjectDay2026` |
| **7** | `COMMAND` | ENTITY | `/<L>(<L>\|<D>\|_)*` *(line-start only)* | Bot slash commands active only at line-start. Example: `/remind`, `/help` |
| **8** | `SHORTCODE` | EMOTIVE | `:(<L>\|<D>\|[_+\-])+:` | Emoji shortcode tags. Example: `:thumbsup:`, `:fire:`, `:+1:` |
| **9** | `EMOJI` | EMOTIVE | `(<EP><VS16>?<SKIN>?(<ZWJ><EP><VS16>?<SKIN>?)*)\|<RI><RI>` | Unicode Emoji Presentation, skin tones, ZWJ sequences. Example: `🔥`, `👨‍💻`, `🇮🇳` |
| **10** | `EMOTICON` | EMOTIVE | `[:;=][\-o^']?[)(DPpOo/\\\|*$@sS3\]\[>]\|<3\|</3\|\^_\^\|...` | ASCII emoticons and kaomoji. Example: `:)`, `:D`, `<3`, `XD`, `^_^` |
| **11** | `TIME` | NUMERIC | `(1[0-2]\|[1-9]):[0-5][0-9](am\|pm\|AM\|PM)?\|([01]<D>\|2[0-3]):[0-5]<D>` | 12-hour and 24-hour timestamps. Example: `5:30pm`, `17:45`, `09:00am` |
| **12** | `DATE` | NUMERIC | `<D>{1,2}[/\-.]<D>{1,2}[/\-.](<D>{4}\|<D>{2})\|<D>{4}-<D>{2}-<D>{2}` | Dates in ISO or localized formats. Example: `12/10/2026`, `2026-10-15` |
| **13** | `CURRENCY` | NUMERIC | `(₹\|\$\|€\|£\|Rs\.?)<D>+(,<D>+)*(\.<D>+)?` | Monetary figures with commas and decimals. Example: `₹1,299.50`, `$50`, `€9.99` |
| **14** | `PHONE` | NUMERIC | `\+<D>{1,3}[ \-]?<D>{10}\|<D>{10}` | International and local phone numbers. Example: `+91 9876543210` |
| **15** | `PERCENT` | NUMERIC | `<D>+(\.<D>+)?%` | Percentage values. Example: `82%`, `99.5%` |
| **16** | `ORDINAL` | NUMERIC | `<D>+(st\|nd\|rd\|th)` | Ordinal numbers. Example: `1st`, `2nd`, `3rd`, `4th` |
| **17** | `FLOAT` | NUMERIC | `<D>+\.<D>+` | Floating-point real numbers. Example: `3.14159`, `0.05` |
| **18** | `INTEGER` | NUMERIC | `<D>+` | Whole numeric digits. Example: `42`, `2026` |
| **19** | `CODE_SPAN` | FORMAT | `` `[^`\n]+` `` | Inline markdown code snippets. Example: `` `npm test` `` |
| **20** | `BOLD` | FORMAT | `\*[^*\s\n]([^*\n]*[^*\s\n])?\*` | Markdown bold formatting. Example: `*urgent*`, `*important note*` |
| **21** | `ITALIC` | FORMAT | `_[^_\s\n]([^_\n]*[^_\s\n])?_` | Markdown italic formatting. Example: `_really_` |
| **22** | `STRIKE` | FORMAT | `~[^~\s\n]([^~\n]*[^~\s\n])?~` | Markdown strikethrough pricing. Example: `~₹45,000~` |
| **23** | `WORD` | TEXT | `<L>(<L>\|<M>\|<D>)*(['’_\-](<L>\|<M>\|<D>)+)*` | Natural language words (Latin, Devanagari, Tamil). Example: `hello`, `नमस्ते`, `வணக்கம்` |
| **24** | `ELLIPSIS` | PUNCT | `\.\.+|…` | Multi-dot pauses or Unicode ellipsis. Example: `...`, `…` |
| **25** | `EMPHASIS` | PUNCT | `[!?]+` | Exclamation and question clusters. Example: `!`, `???`, `!?!` |
| **26** | `PUNCT` | PUNCT | `[.,;:'"()\[\]{}\-]` | Standard sentence delimiters. Example: `.`, `,`, `;`, `(`, `)` |
| **27** | `UNTERMINATED_CODE`| ERROR | `` `[^`\n]* `` | Unclosed code fences triggering panic-mode recovery. Example: `` `open code `` |
| **28** | `SYMBOL` | PUNCT | `<VIS>` | Any single visible Unicode catch-all character. Example: `&`, `+`, `=`, `~` |
| **29** | `ERROR` | ERROR | `<CTRL>` | Non-printable ASCII control characters. Example: `\x00` (null), `\x07` (bell) |

---

## Alphabet Partitioning (1.1M Unicode ➔ 74 Atoms)

Directly allocating a DFA transition table over all 1,114,112 Unicode code points would produce a matrix of over 150 million cells (~300 MB of RAM).

To solve this, LexiChat implements **Character Class Equivalence Partitioning**:
1. All character sets from our 29 regular expression ASTs and Unicode property classes (`\p{L}`, `\p{M}`, `\p{Extended_Pictographic}`) are split into disjoint intervals.
2. Two characters $c_1, c_2$ belong to the same **Atom** if and only if:
   $$\forall \text{ rule } R, \quad c_1 \in \text{CharSet}(R) \iff c_2 \in \text{CharSet}(R)$$
3. The entire Unicode universe collapses into exactly **74 disjoint equivalence atoms**:
   * Atoms 0–45: ASCII special characters and delimiters (`@`, `#`, `:`, `/`, `.`, `₹`, `$`, etc.)
   * Atoms 46–48: ASCII digits `[0-9]`, uppercase `[A-Z]`, lowercase `[a-z]`
   * Atoms 49–73: Unicode Extended Pictographic (emojis), Regional Indicators, Devanagari, Tamil, Combining Marks, and Whitespace.

### Two-Tier O(1) Fast Classification
* **ASCII Tier (0–127):** Direct lookup in a precomputed 128-element `Uint8Array` in $\mathcal{O}(1)$ time.
* **Non-ASCII Tier (128–1,114,111):** Binary search over sorted interval sets in $\mathcal{O}(\log k)$ steps ($k < 40$).

This reduces our Master DFA transition matrix to just $137 \times 74$ cells = **10,138 entries (~20 KB)**, which fits completely inside the CPU L1 data cache.

---

## DFA Minimization: Moore vs Hopcroft

When the multi-rule NFA is converted via powerset subset construction, the raw DFA contains redundant, indistinguishable states. LexiChat implements two classical state minimization algorithms:

### 1. Moore Partition Refinement ($O(|\Sigma| n^2)$)
* Starts with an initial partition $P_0$ separating states by their **accepting rule ID** (to prevent merging different tokens) and non-accepting states.
* On each round, splits blocks whose states produce transitions into different partition blocks under any alphabet atom.
* Logs each partition split round-by-round for educational step-by-step inspection.

### 2. Hopcroft Algorithm ($O(|\Sigma| n \log n)$)
* Maintains a worklist of partition blocks and refines partitions using **inverse transition lists** ($\delta^{-1}(B, a)$).
* Chooses the smaller sub-block upon splitting ($\min(|B'|, |B \setminus B'|)$) to achieve optimal logarithmic scaling.

### State Minimization Reduction Across Core Rules

```
Rule #1 (URL)         :  28 Raw DFA States  ──►  19 Minimized States  (-32% reduction)
Rule #9 (EMOJI)       :  18 Raw DFA States  ──►  12 Minimized States  (-33% reduction)
Rule #11 (TIME)       :  22 Raw DFA States  ──►  14 Minimized States  (-36% reduction)
Rule #13 (CURRENCY)   :  12 Raw DFA States  ──►   8 Minimized States  (-33% reduction)
Master Unified DFA    : 172 Raw DFA States  ──► 137 Minimized States  (-20% reduction)
```
*Mathematical Verification:* Both Moore and Hopcroft algorithms yield the **exact same minimal state count**, verifying Myhill-Nerode canonical uniqueness.

---

## The 7 Interactive Application Modules

The web dashboard is designed for pairs, evaluators, and students to explore compiler theory interactively:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [1] Playground   [2] Explorer   [3] Construction   [4] Chat   [5] Analytics    │
│  [6] Benchmarks   [7] Theory     [Configure Rules]   [Theme]   [Cmd/Ctrl+K]     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

1. **Playground (`Key 1`):**
   * Two-layer mirror editor highlighting recognized tokens with active glow.
   * Sortable/filterable **Token Table** with character spans and line:col coordinates.
   * Structured **Symbol Table** categorizing discovered URLs, mentions, hashtags, and currency.
   * **Diagnostics Panel** demonstrating panic-mode recovery on malformed input.
   * **Trace Player Dock:** Scrubbable character tape showing transitions, mark checkpoints, and backtracking rollbacks.
2. **DFA Explorer (`Key 2`):**
   * Cytoscape graph rendering any of the 29 rule DFAs, the toy elongation machine, or the Master DFA.
   * **Interactive String Simulation:** Type any string and watch the machine animate state-by-state with glowing transition edges and character tape highlighting.
   * Full transition matrix inspector and 2-hop neighborhood focus mode.
3. **Construction Lab (`Key 3`):**
   * 5-stage educational pipeline for any custom regex (e.g. `(a|b)*abb`):
     1. Abstract Syntax Tree (AST) tree view
     2. Thompson NFA transition log
     3. Subset Construction worklist table
     4. Moore Partition Refinement stepper with round-by-round split logs
     5. Dual NFA vs DFA simulation proving language equivalence
4. **Chat Simulator (`Key 4`):**
   * WhatsApp/Discord-style chat simulation with realistic conversation threads.
   * **X-Ray Mode:** Reveals raw tokens, classification categories, and sub-millisecond lexing latency per message.
   * Heuristic Phishing Detector scoring suspicious URLs (IP hosts, extreme path length, urgent alert flags).
5. **Analytics (`Key 5`):**
   * Recharts donut and bar charts showing token distribution (Entity vs Emotive vs Numeric vs Text).
   * One-click Markdown report generator detailing total characters, word counts, and lexer execution time.
6. **Benchmarks (`Key 6`):**
   * **ReDoS Showdown:** Visual chart proving flat $\mathcal{O}(n)$ execution of DFA vs exponential explosion of native regex on `(a+)+`.
   * **10,000-Message Showdown:** Direct head-to-head comparison against native `RegExp` tokenizer on real chat logs.
   * **Moore vs Hopcroft Minimization Comparison:** Compares microsecond runtimes and verifies canonical state equivalence.
7. **Theory (`Key 7`):**
   * Syllabus reference definitions: Chomsky Hierarchy, Formal 5-tuple specification, Myhill-Nerode Theorem, and complexity comparison tables.

---

## CLI Usage

LexiChat includes a comprehensive command-line interface for terminal tokenization, JSON exporting, and Graphviz DOT visualization:

```bash
# Tokenize a chat string and print pretty-formatted table
npm run lex -- "hey @eldo check https://vit.ac.in/x. now at 5:30pm #VIT 🔥"

# Output structured JSON tokens
npm run lex -- --format json "meeting at 10:30am #ProjectDay"

# Tokenize a file with execution statistics
npm run lex -- --file test.txt --stats

# Export rule DFA in Graphviz DOT format
npm run dot -- --rule URL > out/url.dot

# Export unified Master DFA in Graphviz DOT format
npm run dot -- --master > out/master.dot
```

---

## ReDoS Immunity & Benchmarks

### Catastrophic Backtracking Showdown
Adversarial input pattern: `(a+)+` evaluated against string: `a` repeated $n$ times followed by `b` (`a...ab`).

| Length ($n$) | Native JavaScript RegExp | LexiChat DFA Engine | Speedup / Verdict |
|---|---|---|---|
| $n = 10$ | 0.10 ms | **0.01 ms** | 10x faster |
| $n = 15$ | 1.20 ms | **0.01 ms** | 120x faster |
| $n = 20$ | 38.50 ms | **0.02 ms** | 1,925x faster |
| $n = 22$ | 154.20 ms | **0.02 ms** | 7,710x faster |
| $n = 24$ | 620.00 ms | **0.02 ms** | 31,000x faster |
| $n = 26$ | 2,450.00 ms | **0.02 ms** | 122,500x faster |
| $n \ge 30$ | **TIMEOUT (> 60,000 ms / Freeze)** | **0.03 ms** | **Mathematically Immune** |

### Large Chat Corpus Tokenization Showdown (DFA vs Native RegExp)

| Dataset Corpus | Size | LexiChat DFA Time | Native Regex Time | DFA Throughput | Regex Throughput | Token Parity |
|---|---|---|---|---|---|---|
| **1,000 Messages** | 105 KB | **8.2 ms** | 14.5 ms | **12.8 MB/s** | 7.2 MB/s | 16,200 tokens (100% Match) |
| **3,000 Messages** | 315 KB | **24.1 ms** | 44.8 ms | **13.1 MB/s** | 7.0 MB/s | 48,600 tokens (100% Match) |
| **5,000 Messages** | 525 KB | **39.5 ms** | 75.2 ms | **13.3 MB/s** | 6.9 MB/s | 81,000 tokens (100% Match) |
| **10,000 Messages** | 1.05 MB | **78.4 ms** | 153.6 ms | **13.4 MB/s** | 6.8 MB/s | 162,000 tokens (100% Match) |

---

## Quick Start & Installation

### Prerequisites
* **Node.js:** $\ge$ 18.0.0
* **npm:** $\ge$ 9.0.0

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Eldo-John-Giby/Lexical-Analysis-Engine-for-Chat-Messages-Using-DFA.git
cd Lexical-Analysis-Engine-for-Chat-Messages-Using-DFA

# 2. Install dependencies
npm install

# 3. Launch interactive web dashboard
npm run dev

# 4. Open in browser
# http://localhost:5173
```

---

## Testing & Verification

The test suite contains 45 automated tests across 6 suites, covering reference test cases, property fuzzing, and static architecture constraints:

```bash
# Run Vitest test runner
npm test

# Run strict TypeScript typechecking
npm run typecheck

# Run production build
npm run build
```

### Test Coverage Highlights
* `tests/no-regexp.test.ts`: **Static architectural guard** verifying that no `RegExp` or native regex calls exist in `src/engine/**` (except designated oracle/benchmark files).
* `tests/engine.charclass.test.ts`: Verifies alphabet atom disjointness and Unicode interval classification.
* `tests/engine.automata.test.ts`: Verifies Thompson NFA construction, subset construction, and Hopcroft minimization against textbook examples like `(a|b)*abb`.
* `tests/lexer.cases.test.ts`: 23 reference test cases covering IPv4 URLs, port numbers, trailing punctuation rollback, Indian Rupee currency, timestamps, and emoji presentation sequences.
* `tests/lexer.fuzz.test.ts`: Differential oracle fuzzing comparing DFA token spans against a secondary reference model across thousands of pseudo-random inputs.

---

## Academic Context & Team

Developed for **BCSE307P — Compiler Design Lab**, Fall Semester 2026–2027.

### Team Members
* **Ambuj Mishra** (24BCE0340)
* **Eldo John Giby** (24BCE0387)
* **Ameen S** (24BCE0406)
* **Sreedevkrishna** (24BCE2118)
* **John Alex Thomas** (24BCE2217)

### Theoretical References
* Aho, A. V., Lam, M. S., Sethi, R., & Ullman, J. D. (*Compilers: Principles, Techniques, and Tools*, 2nd Ed. Addison-Wesley).
* Hopcroft, J. E., Motwani, R., & Ullman, J. D. (*Introduction to Automata Theory, Languages, and Computation*, 3rd Ed. Pearson).
* Thompson, K. (1968). *Regular Expression Search Algorithm*. Communications of the ACM, 11(6), 419–422.
* Myhill, J. (1957) & Nerode, A. (1958). *Linear Automaton Transformations / Linear automaton minimization*.
