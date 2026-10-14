# Engineering Decisions Log

This document records architectural, algorithmic, and design decisions made during the construction of LexiChat DFA.

## Decision 1: Alphabet Atom Partitioning Strategy
- Context: The full Unicode space spans 0 to 0x10FFFF (over 1.1 million code points). An uncompressed transition table matrix would be prohibitively large.
- Decision: Partition code points into interval-based equivalence classes ("atoms"). All character classes in our token specification decompose into unions of these disjoint atoms.
- Rationale: Reduces the DFA alphabet size to well under 80 atoms while retaining exact character matching fidelity and allowing fast O(log k) binary search classification with an O(1) ASCII lookup array.

## Decision 2: Dual Master DFA for Line-Start Rules
- Context: The `COMMAND` rule (`/<L>(<L>|<D>|_)*`) is active only at column 0 of a line (`startOfLine: true`), whereas inside messages `/` is treated as punctuation/symbol (`and/or`).
- Decision: Compile two master DFAs at startup: `dfaLineStart` (including all rules) and `dfa` (excluding `startOfLine` rules). The lexer loop selects the active DFA based on whether the current token starting position has column == 1.
- Rationale: Eliminates ad-hoc conditional logic inside the DFA transition loop, maintaining pure DFA execution semantics.

## Decision 3: Minimization Equivalence Dual-Engine
- Context: Moore partition refinement offers a step-by-step visual demonstration ideal for education, while Hopcroft provides optimal O(|Sigma| n log n) runtime performance.
- Decision: Implement both Moore and Hopcroft minimization algorithms from scratch. Hopcroft is used for engine startup and compilation, while Moore logs step partitions for the interactive Construction Lab. An automated test asserts that both produce isomorphic state counts.

## Decision 4: Panic Mode Recovery and Catch-All SYMBOL Token
- Context: Robust compiler lexers must never crash or loop infinitely on unexpected input.
- Decision: The specification provides a `SYMBOL` catch-all token for visible leftovers and `ERROR` for control codes. In addition, an engine-level panic mode recovery skips one code point if the DFA reaches a dead state without accepting, emitting an ERROR token.

## Decision 5: No Regular Expressions in Engine Core
- Context: Specification constraint forbids JavaScript RegExp, `.match()`, `.replace(/.../)`, or regex libraries in `src/engine/**`.
- Decision: All parsing, NFA generation, subset construction, minimization, and lexing are implemented purely using custom ASTs, graphs, and typed transition arrays. An automated test (`tests/no-regexp.test.ts`) verifies compliance.
