import React from 'react';
import { useAppStore } from '../../state/store';
import {
  BookOpen,
  ArrowRight,
  CheckCircle,
  Cpu,
  Layers,
  Shield,
  Zap,
} from 'lucide-react';

export const TheoryPage: React.FC = () => {
  const { setCurrentTab } = useAppStore();

  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-[#0E1424] border border-[#1F2A4A] p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#7C5CFF] uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Compiler Design Theory & Reference</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#E6EAF5]">
            Formal Theory of Lexical Analysis Using Deterministic Finite Automata
          </h1>
          <p className="text-xs md:text-sm text-[#8A94B2] mt-1.5 max-w-3xl leading-relaxed">
            LexiChat DFA implements a from-scratch compiler pipeline converting regular expressions to
            minimal deterministic finite automata with maximal munch tokenization.
          </p>
        </div>

        <button
          onClick={() => setCurrentTab('construction')}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#7C5CFF] hover:bg-[#6846FF] text-white text-xs font-semibold transition-all shadow-lg shadow-[#7C5CFF]/25 whitespace-nowrap"
        >
          <span>Open Construction Lab</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* The 6 Pipeline Stages */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#E6EAF5] uppercase tracking-wider">
          The 6 Compiler Pipeline Stages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { step: '1', title: 'Token Rules', desc: 'Regex patterns in custom rule dialect' },
            { step: '2', title: 'AST Parser', desc: 'Recursive descent parsing to syntax trees' },
            { step: '3', title: 'Thompson NFA', desc: 'Fragment composition with epsilon transitions' },
            { step: '4', title: 'Subset DFA', desc: 'Epsilon-closure worklist subset construction' },
            { step: '5', title: 'Minimization', desc: 'Moore and Hopcroft partition refinement' },
            { step: '6', title: 'Maximal Munch', desc: 'Longest match rollback tokenization' },
          ].map((stage) => (
            <div
              key={stage.step}
              className="p-3.5 bg-[#0E1424] border border-[#1F2A4A] rounded-xl flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-mono font-bold text-[#7C5CFF]">Stage {stage.step}</span>
                <h3 className="text-xs font-semibold text-[#E6EAF5] mt-1">{stage.title}</h3>
                <p className="text-[11px] text-[#8A94B2] mt-1 leading-normal">{stage.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Theoretical Definitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-[#0E1424] border border-[#1F2A4A] rounded-xl space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#22D3EE] uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>Formal Mathematical Definitions</span>
          </div>

          <div className="space-y-2.5 text-xs text-[#8A94B2] leading-relaxed">
            <div>
              <strong className="text-[#E6EAF5]">Regular Expression:</strong> Inductively defined over alphabet &Sigma; via empty set &empty;, empty string &epsilon;, literal symbol, union (r|s), concatenation (rs), and Kleene star (r*).
            </div>
            <div>
              <strong className="text-[#E6EAF5]">Nondeterministic Finite Automaton (NFA):</strong> A 5-tuple N = (Q, &Sigma;, &delta;, q0, F) where &delta;: Q &times; (&Sigma; &cup; {'{&epsilon;}'}) &rarr; P(Q).
            </div>
            <div>
              <strong className="text-[#E6EAF5]">Deterministic Finite Automaton (DFA):</strong> A 5-tuple D = (Q, &Sigma;, &delta;, q0, F) where &delta;: Q &times; &Sigma; &rarr; Q is a deterministic function.
            </div>
            <div>
              <strong className="text-[#E6EAF5]">Alphabet Reduction into Atoms:</strong> Unicode contains 1,114,112 code points. We compute the exact partition of disjoint equivalence intervals ("atoms") such that all character classes in the token specification decompose into unions of atoms.
            </div>
          </div>
        </div>

        <div className="p-5 bg-[#0E1424] border border-[#1F2A4A] rounded-xl space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#34D399] uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Lexical Disambiguation & Maximal Munch</span>
          </div>

          <div className="space-y-2.5 text-xs text-[#8A94B2] leading-relaxed">
            <div>
              <strong className="text-[#E6EAF5]">Longest Match (Maximal Munch):</strong> The lexer scans forward until no transition exists in the DFA, then rewinds to the last visited accepting state candidate and emits that token.
            </div>
            <div>
              <strong className="text-[#E6EAF5]">Priority Tie-Breaking:</strong> When an input prefix can be accepted by multiple rules with the identical length, the rule declared earliest (lowest rule ID) takes precedence.
            </div>
            <div>
              <strong className="text-[#E6EAF5]">Tagged Accepting States:</strong> Every accepting DFA state stores its rule ID. During subset construction, the lowest rule ID in the NFA subset is selected.
            </div>
            <div>
              <strong className="text-[#E6EAF5]">Minimization Partition Invariant:</strong> The initial partition for Moore and Hopcroft minimization groups states by their accepting rule ID (not merely accept vs non-accept) to prevent distinct token types from merging.
            </div>
          </div>
        </div>
      </div>

      {/* Comparison: NFA vs DFA vs Backtracking Regex */}
      <div className="bg-[#0E1424] border border-[#1F2A4A] p-5 rounded-xl space-y-3">
        <h3 className="text-xs font-bold text-[#E6EAF5] uppercase tracking-wider">
          Comparison: NFA vs DFA vs Backtracking Regex Engines
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-[#141C33] text-[#8A94B2] border-b border-[#1F2A4A]">
              <tr>
                <th className="p-2.5">Feature</th>
                <th className="p-2.5">LexiChat DFA (Our Engine)</th>
                <th className="p-2.5">NFA Simulation</th>
                <th className="p-2.5">JS / PCRE Backtracking Regex</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2A4A]/50 text-xs">
              <tr>
                <td className="p-2.5 font-semibold text-[#E6EAF5]">Matching Time</td>
                <td className="p-2.5 text-[#34D399] font-medium">Guaranteed O(n) linear</td>
                <td className="p-2.5 text-[#8A94B2]">O(|Q| &times; n)</td>
                <td className="p-2.5 text-[#EF4444] font-medium">Worst-case O(2^n) exponential (ReDoS)</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#E6EAF5]">Backtracking</td>
                <td className="p-2.5 text-[#34D399]">No character backtracking (deterministic)</td>
                <td className="p-2.5 text-[#8A94B2]">No backtracking (set simulation)</td>
                <td className="p-2.5 text-[#EF4444]">Deep recursion on failure</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#E6EAF5]">Memory / States</td>
                <td className="p-2.5 text-[#8A94B2]">Precomputed flat transition array</td>
                <td className="p-2.5 text-[#8A94B2]">Active state set allocations</td>
                <td className="p-2.5 text-[#8A94B2]">Call stack memory</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#E6EAF5]">Grammar Inspectability</td>
                <td className="p-2.5 text-[#22D3EE] font-medium">100% visible states and transition table</td>
                <td className="p-2.5 text-[#8A94B2]">Graph visible</td>
                <td className="p-2.5 text-[#8A94B2]">Black-box C++ / bytecode VM</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Known Ambiguities & Design Limitations */}
      <div className="bg-[#0E1424] border border-[#1F2A4A] p-5 rounded-xl space-y-3">
        <h3 className="text-xs font-bold text-[#E6EAF5] uppercase tracking-wider">
          Known Ambiguities & Limitations by Design (Section 6.2)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#8A94B2]">
          <div className="p-3 bg-[#141C33]/50 border border-[#1F2A4A] rounded-lg">
            <strong className="text-[#E6EAF5]">1. 10-Digit Integers:</strong> Bare 10-digit numbers (e.g. 9876543210) lex as PHONE rather than INTEGER due to the rule order priority in chat parsing.
          </div>
          <div className="p-3 bg-[#141C33]/50 border border-[#1F2A4A] rounded-lg">
            <strong className="text-[#E6EAF5]">2. URL Schemes:</strong> URLs require http://, https://, or www. Other protocols like ftp:// are left as WORD and SYMBOLs by design.
          </div>
          <div className="p-3 bg-[#141C33]/50 border border-[#1F2A4A] rounded-lg">
            <strong className="text-[#E6EAF5]">3. Alphanumeric Compounds:</strong> "2day" lexes as INTEGER(2) + WORD(day).
          </div>
          <div className="p-3 bg-[#141C33]/50 border border-[#1F2A4A] rounded-lg">
            <strong className="text-[#E6EAF5]">4. Snake Case vs Italics:</strong> Underscores inside words are part of WORD (e.g. snake_case_name), while isolated _text_ is parsed as ITALIC.
          </div>
        </div>
      </div>
    </div>
  );
};
