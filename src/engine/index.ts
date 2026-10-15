import { RuleDef, DFA, NFA, RegexNode, LexResult } from './types';
import { DEFAULT_RULES } from './lexer/rules';
import {
  Classifier,
  NAMED_CLASSES,
  buildClassifier,
  extractCharSetsFromAST,
} from './charclass';
import { parseRegex } from './regex/parser';
import { buildThompsonNFA, ThompsonStepLog } from './nfa/thompson';
import { combineNFAs } from './nfa/combine';
import { subsetConstruction, SubsetStepLog } from './dfa/subset';
import { minimizeMoore, MooreRoundLog } from './dfa/minimize-moore';
import { minimizeHopcroft } from './dfa/minimize-hopcroft';
import { matchFull as matchFullDfa } from './dfa/table';
import { Lexer, LexOptions } from './lexer/lexer';
import { EngineStats, PerRuleStat } from './analysis/stats';

export * from './types';
export * from './charclass';
export * from './regex/parser';
export * from './regex/pretty';
export * from './regex/toJsRegex';
export * from './nfa/thompson';
export * from './nfa/combine';
export * from './nfa/simulate';
export * from './dfa/subset';
export * from './dfa/minimize-moore';
export * from './dfa/minimize-hopcroft';
export * from './dfa/table';
export * from './dfa/simulate';
export * from './lexer/rules';
export * from './lexer/lexer';
export * from './lexer/postprocess';
export * from './lexer/symbols';
export * from './lexer/errors';
export * from './analysis/stats';
export * from './analysis/profile';

export interface ConstructionData {
  ast: RegexNode;
  nfa: NFA;
  thompsonLogs: ThompsonStepLog[];
  subsetLogs: SubsetStepLog[];
  mooreRounds: MooreRoundLog[];
  minDfa: DFA;
}

export interface Engine {
  lex: (text: string, opts?: LexOptions) => LexResult;
  stats: EngineStats;
  dfaFor: (target: number | 'master' | 'master-linestart') => DFA;
  construction: (target: number | 'master') => ConstructionData;
  matchFull: (dfa: DFA, text: string) => boolean;
  classifier: Classifier;
  rules: RuleDef[];
  dfaNormal: DFA;
  dfaLineStart: DFA;
}

export function buildEngine(rules: RuleDef[] = DEFAULT_RULES): Engine {
  const startTime = performance.now();

  // 1. Parse all rules to AST
  const asts = rules.map((r) => parseRegex(r.pattern, NAMED_CLASSES));

  // 2. Collect all character sets across all rule ASTs to build exact alphabet atoms
  const allSets = asts.flatMap((ast) => extractCharSetsFromAST(ast));
  const classifier = buildClassifier(NAMED_CLASSES, allSets);

  // 3. Build per-rule NFAs and DFAs
  const perRuleNfas: NFA[] = [];
  const perRuleDfas: DFA[] = [];
  const perRuleMinDfas: DFA[] = [];
  const perRuleConstruction: ConstructionData[] = [];
  const perRuleStats: PerRuleStat[] = [];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]!;
    const ast = asts[i]!;

    const { nfa, logs: thompsonLogs } = buildThompsonNFA(ast, classifier, rule.id);
    const { dfa: rawDfa, logs: subsetLogs } = subsetConstruction(nfa, classifier.numAtoms);
    const { dfa: mooreDfa, rounds: mooreRounds } = minimizeMoore(rawDfa);
    const minDfa = minimizeHopcroft(rawDfa);

    perRuleNfas.push(nfa);
    perRuleDfas.push(rawDfa);
    perRuleMinDfas.push(minDfa);

    perRuleConstruction.push({
      ast,
      nfa,
      thompsonLogs,
      subsetLogs,
      mooreRounds,
      minDfa,
    });

    perRuleStats.push({
      ruleId: rule.id,
      ruleName: rule.name,
      nfaStates: nfa.numStates,
      dfaStates: rawDfa.numStates,
      minDfaStates: minDfa.numStates,
    });
  }

  // 4. Combine into Master DFA (including startOfLine rules)
  const masterNfaLineStart = combineNFAs(perRuleNfas);
  const { dfa: masterDfaLineStartRaw, logs: masterSubsetLogs } = subsetConstruction(
    masterNfaLineStart,
    classifier.numAtoms
  );
  const { rounds: masterMooreRounds } = minimizeMoore(masterDfaLineStartRaw);
  const dfaLineStart = minimizeHopcroft(masterDfaLineStartRaw);

  // 5. Combine into Master Normal DFA (excluding startOfLine rules)
  const normalNfas = perRuleNfas.filter((_, idx) => !rules[idx]!.startOfLine);
  const masterNfaNormal = combineNFAs(normalNfas);
  const { dfa: masterDfaNormalRaw } = subsetConstruction(
    masterNfaNormal,
    classifier.numAtoms
  );
  const dfaNormal = minimizeHopcroft(masterDfaNormalRaw);

  const endTime = performance.now();
  const buildMs = Math.round((endTime - startTime) * 10) / 10;

  const tableBytes =
    dfaNormal.table.byteLength +
    dfaNormal.acceptRule.byteLength +
    dfaLineStart.table.byteLength +
    dfaLineStart.acceptRule.byteLength;

  const stats: EngineStats = {
    perRule: perRuleStats,
    master: {
      nfaStates: masterNfaLineStart.numStates,
      dfaStates: masterDfaLineStartRaw.numStates,
      minDfaStates: dfaLineStart.numStates,
      tableBytes,
    },
    atoms: classifier.numAtoms,
    buildMs,
  };

  const lexer = new Lexer(rules, classifier, dfaNormal, dfaLineStart);

  const masterConstruction: ConstructionData = {
    ast: { t: 'empty' }, // Master is combination of all rules
    nfa: masterNfaLineStart,
    thompsonLogs: [],
    subsetLogs: masterSubsetLogs,
    mooreRounds: masterMooreRounds,
    minDfa: dfaLineStart,
  };

  return {
    lex: (text: string, opts?: LexOptions) => lexer.lex(text, opts),
    stats,
    dfaFor: (target: number | 'master' | 'master-linestart') => {
      if (target === 'master') return dfaNormal;
      if (target === 'master-linestart') return dfaLineStart;
      return perRuleMinDfas[target] || dfaNormal;
    },
    construction: (target: number | 'master') => {
      if (target === 'master') return masterConstruction;
      return perRuleConstruction[target] || masterConstruction;
    },
    matchFull: (dfa: DFA, text: string) => matchFullDfa(dfa, text, classifier),
    classifier,
    rules,
    dfaNormal,
    dfaLineStart,
  };
}
