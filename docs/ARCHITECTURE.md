# LexiChat DFA: System Architecture

## Overview

LexiChat DFA is a production-grade lexical analysis engine designed specifically for informal chat text. It implements a complete from-scratch compiler pipeline without relying on lexer generators (`flex`, `moo`) or native regular expression engines in its lexing path.

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

## Core Modules

### 1. Alphabet Reduction & Classifier (`src/engine/charclass.ts`)
The Unicode standard defines over 1.1 million code points (0x000000 to 0x10FFFF). Storing an uncompressed matrix would require gigabytes of memory.
- Interval set operations (`normalize`, `union`, `intersect`, `minus`, `not`) compute non-overlapping ranges.
- The boundary sweeper intersects all character class ranges across the 29 token rules to produce disjoint equivalence classes ("atoms").
- Classification uses an $O(1)$ precomputed `Uint16Array(256)` lookup table for ASCII and an $O(\log k)$ binary search for astral code points.

### 2. Regular Expression AST & Parser (`src/engine/regex/`)
- Pure recursive descent parser for the rule dialect.
- Handles alternations (`|`), concatenations, repetitions (`*`, `+`, `?`, `{m,n}`), character classes (`[...]`), negated classes (`[^...]`), named classes (`<NAME>`), and escapes.
- Yields immutable AST nodes with precise syntax error locations.

### 3. Thompson NFA Builder (`src/engine/nfa/`)
- Inductive fragment generation with explicit $\epsilon$-transitions.
- Preserves composition logs for visualization in the Construction Lab.
- `combineNFAs` merges all rule NFAs into a unified multi-token NFA with tagged accepting states.

### 4. Subset Construction & DFA Minimization (`src/engine/dfa/`)
- Worklist powerset construction converting NFA states to deterministic states.
- Priority tie-breaking: when a subset contains accepting states from multiple rules, the lowest rule index takes precedence.
- Dual minimization algorithms:
  - **Moore Partition Refinement**: Logs round-by-round partition splits for visual step-through.
  - **Hopcroft Algorithm**: Runs in $O(|\Sigma| n \log n)$ time for fast startup.
- Unreachable and dead states are pruned prior to minimization.

### 5. Maximal Munch Lexer (`src/engine/lexer/`)
- Forward scanning consumes input code points until a dead state is encountered.
- Remembers the position of the last accepting state candidate.
- Backtracks to the last marked position, emitting the longest valid token.
- Dual-DFA architecture: uses `dfaLineStart` when column == 1 (activating `COMMAND`), and `dfaNormal` otherwise.
- Panic-mode recovery skips unexpected characters on unhandled inputs, guaranteeing termination and complete coverage.

### 6. Post-Processing Pipeline (`src/engine/lexer/postprocess.ts`)
- **Slang Trie DFA**: Compiles a slang lexicon into a trie DFA.
- **Elongation DFA**: Detects character run-lengths &ge; 3.
- Script classification for Latin, Devanagari, and Tamil words.
- All-caps urgency detection and broadcast mention flagging (`@everyone`, `@here`).
