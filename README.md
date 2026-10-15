# LexiChat DFA

> **Lexical Analysis Engine for Chat Messages Using Deterministic Finite Automata**  
> *A from-scratch compiler pipeline implementing regular expressions, Thompson NFAs, subset construction, Hopcroft minimization, and maximal-munch tokenization.*

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-React%2018-646CFF.svg)](https://vitejs.dev/)
[![Automata](https://img.shields.io/badge/Automata-DFA%20%7C%20NFA-7C5CFF.svg)](#architecture)
[![ReDoS](https://img.shields.io/badge/ReDoS-Immune-34D399.svg)](#redos-showdown)
[![Tests](https://img.shields.io/badge/Tests-45%20Passed-success.svg)](#testing)

---

## Highlights

- **From-Scratch Compiler Pipeline:** Pure TypeScript engine that transforms regex ASTs into Thompson NFAs, determinizes them via powerset subset construction, minimizes them using Hopcroft and Moore partition algorithms, and executes maximal munch tokenization.
- **Zero Regex in Lexing Path:** No `RegExp`, `String.match`, `split`, or lexer generators (`flex`, `moo`) are used in the lexer. Verified by automated static test guards.
- **Alphabet Reduction to Atoms:** Compresses the 1,114,112 Unicode points into 74 disjoint equivalence atoms, shrinking the master transition table matrix to ~40 KB.
- **Interactive Trace Player:** Scrubbable character tape displaying real-time state transitions, last-accept markers, and animated rollbacks on trailing punctuation.
- **Construction Lab:** 5-step visualizer for any regular expression: AST &rarr; Thompson NFA &rarr; Subset Table &rarr; Moore Minimization &rarr; Dual Simulation.
- **ReDoS Immunity Proof:** Demonstrates mathematical immunity to catastrophic backtracking on ambiguous patterns like `(a+)+`.
- **Chat Simulator & Risk Meter:** Simulates realistic chat conversations with live X-ray token views and heuristic security scoring.

---

## Architecture

```
Token Rules (29 rules in Section 6)
       │
       ▼
Recursive Descent Parser ───► AST (Abstract Syntax Tree)
                                 │
                                 ▼
                     Thompson NFA Construction
                     (One fragment per rule, tagged accepts)
                                 │
                                 ▼
                         NFA Combination
                         (New start state with ε-transitions)
                                 │
                                 ▼
                    Subset Construction (Powerset)
                    (Tagged accepting states, lowest ruleId wins)
                                 │
                                 ▼
                     Hopcroft DFA Minimization
                     (Initial partition by ruleId)
                                 │
                                 ▼
                       Flat Transition Table
                      (Int32Array: state * |Σ| + atom)
                                 │
                                 ▼
                    Maximal Munch Lexer Loop
                    (Longest match + rollback to last mark)
                                 │
                                 ▼
                   Post-Processing (Trie & Elongation DFAs)
                                 │
                                 ▼
               Tokens + Symbol Table + Diagnostic Errors
```

---

## Quick Start

### Prerequisites
- Node.js &ge; 18
- npm &ge; 9

### Installation & Launch

```bash
# Clone the repository
git clone https://github.com/Eldo-John-Giby/Lexical-Analysis-Engine-for-Chat-Messages-Using-DFA.git
cd Lexical-Analysis-Engine-for-Chat-Messages-Using-DFA

# Install dependencies
npm install

# Start development server
npm run dev

# Run full test suite (45 tests: unit, fuzz, cases, guards)
npm test

# Build production bundle
npm run build
```

---

## CLI Usage

LexiChat includes a command-line interface for terminal tokenization, tracing, and Graphviz exports:

```bash
# Lex a message and display pretty token table
npm run lex -- "hey @eldo check https://vit.ac.in/x. now!!!"

# Inspect step-by-step DFA execution trace
npm run lex -- --trace "loooool :) <3"

# Output structured JSON
npm run lex -- --json "@everyone join the hackathon"

# Benchmark a file with throughput statistics
npm run lex -- --file test.txt --stats

# Export rule DFA in Graphviz DOT format
npm run dot -- --rule URL > url.dot

# Export full Master DFA in Graphviz DOT format
npm run dot -- --master > master.dot
```

---

## Token Grammar Specification

The engine tokenizes 29 formal lexical categories:
1. `NEWLINE` (`\r\n|\n|\r`)
2. `WHITESPACE` (`<WS>+`)
3. `URL` (`(https?://|www\.)<URLC>*<URLE>`)
4. `EMAIL` (`[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+`)
5. `MENTION` (`@<ID>+`)
6. `HASHTAG` (`#(<L>|_)(<L>|<D>|_)*`)
7. `COMMAND` (`/<L>(<L>|<D>|_)*`, line start only)
8. `SHORTCODE` (`:(<L>|<D>|[_+\-])+:`)
9. `EMOJI` (`(<EP><VS16>?<SKIN>?(<ZWJ><EP><VS16>?<SKIN>?)*)|<RI><RI>`)
10. `EMOTICON` (`[:;=][\-o^']?[)(DPpOo/\\|*$@sS3\]\[>]|<3|</3|\^_^|-_\|...`)
11. `TIME` (`5:30pm`, `17:45`, `5pm`)
12. `DATE` (`12/10/2026`, `2026-10-14`)
13. `CURRENCY` (`₹1,299.50`, `$50`, `€9.99`, `Rs.500`)
14. `PHONE` (`+91 9876543210`, `9876543210`)
15. `PERCENT` (`82%`)
16. `ORDINAL` (`1st`, `2nd`, `3rd`, `4th`)
17. `FLOAT` (`3.14`)
18. `INTEGER` (`42`)
19. `CODE_SPAN` (`` `code` ``)
20. `BOLD` (`*urgent*`)
21. `ITALIC` (`_really_`)
22. `STRIKE` (`~nope~`)
23. `WORD` (English, Contractions, Devanagari, Tamil)
24. `ELLIPSIS` (`...`, `…`)
25. `EMPHASIS` (`!`, `?`, `!!!`)
26. `PUNCT` (`. , ; : ( ) [ ] { } -`)
27. `UNTERMINATED_CODE` (`` `open ``)
28. `SYMBOL` (`<VIS>` single char catch-all)
29. `ERROR` (`<CTRL>` control characters)

---

## Documentation

- [Full Project Report](docs/REPORT.md): Comprehensive academic report with real numbers and theoretical foundations.
- [Viva Preparation Guide](docs/VIVA.md): 30 likely compiler design viva questions and answers.
- [3-Minute Demo Script](docs/DEMO_SCRIPT.md): Timed presentation walkthrough.
- [System Architecture](docs/ARCHITECTURE.md): Detailed module blueprints.
- [Engineering Decisions](docs/DECISIONS.md): Architectural decisions log.

---

## Authors & Acknowledgments

Built for the **Compiler Design** course unit on **Lexical Analysis**.
Reference implementations conform to:
- Aho, Lam, Sethi, Ullman (*Compilers: Principles, Techniques, and Tools*)
- Hopcroft, Motwani, Ullman (*Introduction to Automata Theory, Languages, and Computation*)
- Ken Thompson (1968, *Regular Expression Search Algorithm*)
