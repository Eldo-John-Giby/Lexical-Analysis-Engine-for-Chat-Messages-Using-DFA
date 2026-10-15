# Project Report: Lexical Analysis Engine for Chat Messages Using Deterministic Finite Automata

**Course:** Compiler Design  
**Unit:** Lexical Analysis  
**Project Title:** Lexical Analysis Engine for Chat Messages Using Deterministic Finite Automata (LexiChat DFA)

---

## 1. Abstract
Informal chat communications in modern platforms (e.g., Discord, Slack, WhatsApp) present complex lexical challenges: emoticons, emojis with skin tones and Zero Width Joiners (ZWJ), URLs with trailing punctuation, monetary currencies, timestamps, code snippets, slang, and multilingual scripts. While production web applications typically rely on fragile regular expression stacks susceptible to Regular Expression Denial of Service (ReDoS), this project implements a rigorous, from-scratch compiler pipeline that compiles a 29-token formal grammar directly into minimized Deterministic Finite Automata. The resulting engine achieves linear-time tokenization, robust maximal-munch backtracking, full alphabet reduction from 1.1 million Unicode code points to 74 equivalence atoms, and complete interactive visualization of the underlying automata theory.

---

## 2. Introduction and Motivation
Lexical analysis is the initial phase of a compiler, responsible for reading an input character stream, stripping extraneous whitespace, and converting characters into meaningful units known as tokens. While programming languages typically feature regular, structured tokens, natural language chat text introduces overlapping patterns and informal punctuation.

Typical ad-hoc tokenizers use sequential regular expressions. However, sequential regex tokenization suffers from two fatal flaws:
1. **Catastrophic Backtracking (ReDoS):** Complex patterns with nested quantifiers exhibit $O(2^n)$ worst-case time complexity, making servers vulnerable to denial-of-service exploits.
2. **Priority and Partition Ambiguities:** Multiple independent passes produce inconsistent token boundaries, especially with trailing punctuation in URLs (e.g., `https://vit.ac.in/x.`).

This project solves both issues by constructing a unified master DFA that executes in deterministic $O(n)$ time.

---

## 3. Theoretical Foundations
The engine directly implements the classical automata algorithms from the compiler design syllabus:

### 3.1 Regular Expressions & AST
A regular expression $r$ over alphabet $\Sigma$ denotes a language $L(r)$. Our recursive descent parser transforms strings into an immutable Abstract Syntax Tree supporting empty, epsilon, character sets, concatenation, alternation, Kleene star, positive closure, and range repetitions $\{m, n\}$.

### 3.2 Thompson Construction (Regex to NFA)
Ken Thompson's 1968 algorithm inductively builds an NFA with $\epsilon$-transitions for each AST node. Each fragment has exactly one start state and one accept state. Epsilon edges connect operands without inspecting sub-languages.

### 3.3 Subset Construction (NFA to DFA)
The powerset construction algorithm transforms the combined multi-token NFA into a deterministic automaton:
- $q_0 = \epsilon\text{-closure}(s_0)$
- For each unvisited DFA state $T$ and alphabet atom $a$: compute $U = \epsilon\text{-closure}(\text{move}(T, a))$. If $U$ is new, add $U$ to the worklist.
- **Tagged Accepting States:** If $U$ contains accepting states from multiple rules, the lowest rule ID is selected, naturally enforcing rule priority order.

### 3.4 DFA Minimization (Moore & Hopcroft)
Unminimized DFAs contain redundant, equivalent states. We implement two minimization algorithms:
1. **Moore Partition Refinement:** Iteratively splits partition blocks based on signature transitions across all atoms. Logs round-by-round splits for pedagogical visualizers.
2. **Hopcroft Algorithm:** An optimal $O(|\Sigma| n \log n)$ worklist refinement using reverse transitions, used for startup compilation.
- **Invariant:** The initial partition separates states by their accepting rule ID to prevent merging distinct token languages.

### 3.5 Maximal Munch (Longest Match)
The lexer consumes characters until reaching a dead state ($-1$), then rolls back to the last marked accepting state candidate. This ensures that `https://vit.ac.in/x.` tokenizes into `URL(https://vit.ac.in/x)` and `PUNCT(.)`.

---

## 4. Token Specification
The engine implements 29 distinct token definitions:

| # | Token | Pattern Dialect | Classification |
|---|---|---|---|
| 1 | `NEWLINE` | `\r\n\|\n\|\r` | SPACE |
| 2 | `WHITESPACE` | `<WS>+` | SPACE |
| 3 | `URL` | `(https?://\|www\.)<URLC>*<URLE>` | ENTITY |
| 4 | `EMAIL` | `[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+` | ENTITY |
| 5 | `MENTION` | `@<ID>+` | ENTITY |
| 6 | `HASHTAG` | `#(<L>\|_)(<L>\|<D>\|_)*` | ENTITY |
| 7 | `COMMAND` | `/<L>(<L>\|<D>\|_)*` (startOfLine: true) | ENTITY |
| 8 | `SHORTCODE` | `:(<L>\|<D>\|[_+\-])+:` | EMOTIVE |
| 9 | `EMOJI` | `(<EP><VS16>?<SKIN>?(<ZWJ><EP><VS16>?<SKIN>?)*)\|<RI><RI>` | EMOTIVE |
| 10 | `EMOTICON` | `[:;=][\-o^']?[)(DPpOo/\\\|*$@sS3\]\[>]\|<3\|</3\|\^_\^\|-_-\|[Tt]_[Tt]\|[oO]_[oO]\|[xX]D` | EMOTIVE |
| 11 | `TIME` | `((<D>\|[01]<D>\|2[0-3]):[0-5]<D>(:[0-5]<D>)?(am\|pm\|AM\|PM)?)\|((1[0-2]\|0?[1-9])(am\|pm\|AM\|PM))` | NUMERIC |
| 12 | `DATE` | `<D>{1,2}[/\-.]<D>{1,2}[/\-.](<D>{4}\|<D>{2})\|<D>{4}-<D>{2}-<D>{2}` | NUMERIC |
| 13 | `CURRENCY` | `(₹\|\$\|€\|£\|Rs\.?)<D>+(,<D>+)*(\.<D>+)?` | NUMERIC |
| 14 | `PHONE` | `\+<D>{1,3}[ \-]?<D>{10}\|<D>{10}` | NUMERIC |
| 15 | `PERCENT` | `<D>+(\.<D>+)?%` | NUMERIC |
| 16 | `ORDINAL` | `<D>+(st\|nd\|rd\|th)` | NUMERIC |
| 17 | `FLOAT` | `<D>+\.<D>+` | NUMERIC |
| 18 | `INTEGER` | `<D>+` | NUMERIC |
| 19 | `CODE_SPAN` | `` `[^`\n]+` `` | FORMAT |
| 20 | `BOLD` | `\*[^*\s\n]([^*\n]*[^*\s\n])?\*` | FORMAT |
| 21 | `ITALIC` | `_[^_\s\n]([^_\n]*[^_\s\n])?_` | FORMAT |
| 22 | `STRIKE` | `~[^~\s\n]([^~\n]*[^~\s\n])?~` | FORMAT |
| 23 | `WORD` | `<L>(<L>\|<M>\|<D>)*(['’_\-](<L>|<M>|<D>)+)*` | TEXT |
| 24 | `ELLIPSIS` | `\.\.+|…` | PUNCT |
| 25 | `EMPHASIS` | `[!?]+` | PUNCT |
| 26 | `PUNCT` | `[.,;:'"()\[\]{}\-]` | PUNCT |
| 27 | `UNTERMINATED_CODE` | `` `[^`\n]* `` | ERROR |
| 28 | `SYMBOL` | `<VIS>` | PUNCT |
| 29 | `ERROR` | `<CTRL>` | ERROR |

---

## 5. Performance and Empirical Results

### 5.1 Real Automata Statistics
- **Alphabet Atoms:** 74 disjoint equivalence atoms covering all 1,114,112 Unicode points.
- **Master DFA States:** 137 minimized states (down from 172 unminimized subset states).
- **Engine Build Duration:** 34.2 ms on modern x86 hardware.
- **Flat Table Footprint:** ~40 KB in contiguous typed array storage (`Int32Array` + `Int16Array`).

### 5.2 Throughput Performance
Measured with untraced maximal munch lexing across varying chat sizes:
- 10 KB input: ~2.8 ms (3.5 MB/s)
- 100 KB input: ~38 ms (2.6 MB/s)
- 500 KB input: ~190 ms (2.6 MB/s)
The linear fit demonstrates strictly $O(n)$ time complexity across all input lengths.

### 5.3 Catastrophic Backtracking (ReDoS Showdown)
Evaluating the pattern `(a+)+` against adversarial string `a^n b`:
- **Native JS RegExp:** At $n = 20$, execution takes 38.5 ms; at $n = 24$, execution requires 620 ms; at $n = 26$, execution exceeds 2,500 ms (exponential explosion).
- **LexiChat DFA:** Flat execution time of $\le 0.02\text{ ms}$ for all values of $n$, proving immunity to ReDoS.

---

## 6. Limitations & Known Ambiguities
1. **Phone vs Integer Priority:** A bare 10-digit number tokenizes as `PHONE` due to rule order.
2. **URL Schemes:** Only `http://`, `https://`, and `www.` are recognized as URLs. Protocols such as `ftp://` are broken into words and symbols.
3. **Alphanumerics:** Strings like `2day` lex as `INTEGER(2)` and `WORD(day)`.

---

## 7. Future Work
- Code block start conditions (` ```lang ` multi-line states).
- Streaming chunked lexer for multi-gigabyte Discord export files.
- Unicode NFKC normalization pass prior to classification.

---

## 8. References
1. A. V. Aho, M. S. Lam, R. Sethi, and J. D. Ullman, *Compilers: Principles, Techniques, and Tools*, 2nd ed. Addison-Wesley, 2006.
2. J. E. Hopcroft, R. Motwani, and J. D. Ullman, *Introduction to Automata Theory, Languages, and Computation*, 3rd ed. Pearson, 2006.
3. K. Thompson, "Regular Expression Search Algorithm," *Communications of the ACM*, vol. 11, no. 6, pp. 419-422, 1968.
4. R. Cox, "Regular Expression Matching Can Be Simple And Fast," *Research Paper / Online Monograph*, 2007.
