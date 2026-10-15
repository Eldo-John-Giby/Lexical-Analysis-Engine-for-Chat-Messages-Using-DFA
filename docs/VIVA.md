# Compiler Design Viva Preparation: 30 Questions & Crisp Answers

**Project:** Lexical Analysis Engine for Chat Messages Using DFA (LexiChat DFA)

---

### Q1: What is the primary role of a lexical analyzer in a compiler?
**A:** The lexical analyzer (lexer) reads the raw input character stream, strips irrelevant whitespace and comments, correlates error locations, and produces a sequence of tokens for the parser.

### Q2: What is the formal difference between a lexeme, a token, and a pattern?
**A:**
- **Pattern:** The formal grammatical rule or regular expression defining what can match (e.g., `[0-9]+`).
- **Token:** The abstract syntactic category with attributes emitted to the compiler (e.g., `<INTEGER, 42>`).
- **Lexeme:** The concrete substring of characters in the source text that matched the pattern (e.g., `"42"`).

### Q3: What is the difference between an NFA and a DFA?
**A:**
- An **NFA** (Nondeterministic Finite Automaton) can have $\epsilon$-transitions (state transitions without consuming an input symbol) and multiple transitions from a single state on the same symbol.
- A **DFA** (Deterministic Finite Automaton) has exactly one transition per symbol from any state and zero $\epsilon$-transitions.

### Q4: Why can we not use a DFA directly without Thomson's construction first?
**A:** Converting arbitrary regular expressions with nested loops and alternations directly into a DFA is complex. Thompson's algorithm provides an inductive, modular composition from AST nodes into an NFA in $O(m)$ time, which can then be determinized systematically via subset construction.

### Q5: How does Thompson's construction work?
**A:** It creates base fragments for literal symbols and $\epsilon$, then recursively composes them:
- **Concatenation:** Links the accept state of fragment A to the start state of fragment B with an $\epsilon$-transition.
- **Alternation:** Creates a new start state branching via $\epsilon$ to both alternatives, and merges both accept states into a new accept state via $\epsilon$.
- **Kleene Star:** Adds loopback and bypass $\epsilon$-transitions around the inner fragment.

### Q6: What is the $\epsilon$-closure of a state?
**A:** The $\epsilon$-closure of state $s$ is the set of all NFA states reachable from $s$ by traversing zero or more $\epsilon$-transitions alone.

### Q7: Why can subset construction experience exponential state blowup in the worst case?
**A:** A set of $n$ NFA states has $2^n$ possible subsets. Pathological regular expressions like $(a|b)^*a(a|b)^{n-1}$ require remembering the character $n$ positions in the past, forcing $2^n$ distinct subsets in the DFA.

### Q8: Why does subset construction remain small in practical lexers?
**A:** Real programming language and chat tokens are localized: tokens do not require deep unbounded lookahead dependencies across multiple wildcards. In LexiChat, our 29 rules yield fewer than 180 DFA states before minimization.

### Q9: Why is DFA minimization necessary?
**A:** Subset construction frequently produces redundant states that recognize identical remaining languages. Minimization reduces the number of states to the unique minimum, shrinking table memory and maximizing cache locality.

### Q10: How does Moore's partition refinement algorithm minimize a DFA?
**A:** It begins with an initial partition grouping states by their accepting token rule (plus non-accepting states). In each round, it splits groups whose members transition into different partition blocks on any input symbol, repeating until no group splits.

### Q11: What is the time complexity of Hopcroft's minimization algorithm versus Moore's?
**A:** Moore's algorithm takes $O(|\Sigma| \cdot n^2)$ worst-case time. Hopcroft's algorithm improves this to $O(|\Sigma| \cdot n \log n)$ by maintaining a worklist of partition splitters and always splitting with the smaller half.

### Q12: Why must the initial partition in lexer minimization group states by rule ID rather than simply accept vs non-accept?
**A:** If states accepting different token types (e.g., `TIME` and `FLOAT`) were grouped together, minimization would merge them if their outgoing transitions matched, destroying token identity.

### Q13: What is "Maximal Munch" (longest match)?
**A:** The lexical convention that when multiple valid prefix tokens can match, the lexer consumes the longest possible match before emitting a token.

### Q14: How does LexiChat implement maximal munch with backtracking?
**A:** It steps through the DFA remembering the last visited accepting state and its position (`lastAccPos`). When a dead state ($-1$) is encountered, it rolls back the tape to `lastAccPos` and emits that token.

### Q15: What is the classic demonstration of maximal munch backtracking?
**A:** The input `https://vit.ac.in/x. now`. The URL pattern accepts `https://vit.ac.in/x`, then reads `.` and continues into `URLC`, but encounters a dead state on space. It rolls back 1 character to the dot, emitting `URL(https://vit.ac.in/x)` followed by `PUNCT(.)`.

### Q16: What is the worst-case time complexity of maximal munch, and why?
**A:** $O(n^2)$ on adversarial rule sets (e.g., rule $A = a^k b$, rule $B = a$, tested on input $a^N$). The lexer reads $N$ characters, fails, rolls back to position 1, emits $B$, and repeats. In practice, natural chat grammars exhibit linear $O(n)$ time.

### Q17: How are rule priority ties broken?
**A:** When two rules match the exact same longest length, the rule listed earlier in the specification (lower rule index) wins. This is baked into subset construction: each DFA state stores the minimum rule ID among its constituent NFA states.

### Q18: What is ReDoS (Regular Expression Denial of Service)?
**A:** Vulnerability in backtracking regex engines (like PCRE or JS `RegExp`) where nested ambiguous quantifiers like `(a+)+` against non-matching input like `aaaa...b` cause exponential recursive backtracking ($O(2^n)$), freezing the CPU thread.

### Q19: Why is a DFA completely immune to ReDoS?
**A:** A DFA maintains exactly ONE active state at every character transition. It never backtracks through past characters to try alternative branches. Transition lookup is strictly $O(1)$, guaranteeing $O(n)$ total time for input length $n$.

### Q20: Why did we reduce the Unicode alphabet into "atoms"?
**A:** Unicode spans 0 to 0x10FFFF ($1,114,112$ code points). A direct transition table matrix of $150 \text{ states} \times 1.1\text{M symbols} \times 4\text{ bytes}$ would consume ~670 MB of RAM. Sweeping class boundaries partitions the entire universe into 74 disjoint equivalence atoms, shrinking table size to ~40 KB.

### Q21: How does the atom classifier classify characters so quickly?
**A:** It uses an $O(1)$ direct array lookup (`asciiLookup[256]`) for ASCII characters (which comprise 99% of typical chat text) and an $O(\log k)$ binary search over sorted intervals for code points $\ge 256$.

### Q22: What is the compiler Symbol Table?
**A:** A data structure that stores identifiers, handles, hashtags, and links encountered during translation, recording frequency counts, scopes, and source code locations.

### Q23: How are start conditions (like line-start COMMAND) handled without violating pure DFA execution?
**A:** By pre-compiling two master DFAs: `dfaLineStart` (including `COMMAND`) and `dfaNormal` (excluding it). The lexer chooses `dfaLineStart` if column == 1, and `dfaNormal` otherwise.

### Q24: What is Panic Mode Error Recovery in a lexer?
**A:** When the DFA reaches a dead state without having visited any accepting state, panic mode recovery discards the current character, emits a descriptive `ERROR` diagnostic token, and resumes scanning at the next character.

### Q25: How does the Slang Lexicon detection work?
**A:** It compiles a list of slang terms (`lol`, `brb`, `tbh`, `bhai`, `yaar`) into a prefix Trie. Since a Trie is a formal acyclic DFA, word acceptance is tested in $O(m)$ time where $m$ is the word length.

### Q26: How does the Elongation DFA work?
**A:** It tracks character run-lengths. State transitions count consecutive identical code points: run-length 1 &rarr; run-length 2 &rarr; absorbing accept state at run-length 3.

### Q27: How does LexiChat support Indic scripts like Devanagari and Tamil?
**A:** By including the Unicode `\p{M}` (combining marks) character class in the `WORD` definition: `<L>(<L>|<M>|<D>)*`. This ensures vowels and conjunct marks (e.g. `म + ् + त + े`) stay bonded into single word tokens.

### Q28: How does the engine handle surrogate pairs and astral code points (e.g., emojis)?
**A:** It iterates by Unicode code points (`codePointAt`) rather than UTF-16 code units, while storing UTF-16 character offsets in emitted tokens for slice operations in web editors.

### Q29: What is the partition property of a lexical analyzer?
**A:** The property that concatenating all emitted token lexemes reproduces the original input string byte-for-byte and character-for-character without gaps or overlaps.

### Q30: What are the main memory benefits of flat transition tables?
**A:** Storing state transitions in contiguous typed arrays (`Int32Array`) enables direct index calculation (`state * numAtoms + atom`), maximizing CPU cache line hits and avoiding JavaScript object garbage collection overhead.
