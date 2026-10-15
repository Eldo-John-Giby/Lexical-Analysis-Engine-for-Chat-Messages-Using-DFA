export interface PerRuleStat {
  ruleId: number;
  ruleName: string;
  nfaStates: number;
  dfaStates: number;
  minDfaStates: number;
}

export interface MasterStat {
  nfaStates: number;
  dfaStates: number;
  minDfaStates: number;
  tableBytes: number;
}

export interface EngineStats {
  perRule: PerRuleStat[];
  master: MasterStat;
  atoms: number;
  buildMs: number;
}
