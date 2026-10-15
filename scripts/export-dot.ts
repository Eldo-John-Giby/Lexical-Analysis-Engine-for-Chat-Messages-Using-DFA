import { buildEngine, DFA, AtomId } from '../src/engine/index';

function dfaToDot(dfa: DFA, title: string, atomLabels: string[], ruleName = ''): string {
  const lines: string[] = [];
  lines.push(`digraph "${title}" {`);
  lines.push('  rankdir=LR;');
  lines.push('  node [fontname="Helvetica", fontsize=11];');
  lines.push('  edge [fontname="Helvetica", fontsize=9];');
  lines.push('');

  // Hidden start arrow
  lines.push('  __start [shape=point, style=invis];');
  lines.push(`  __start -> q${dfa.start} [label="start"];`);

  // State nodes
  for (let s = 0; s < dfa.numStates; s++) {
    const isAccepting = dfa.acceptRule[s] !== undefined && dfa.acceptRule[s] !== -1;
    const ruleId = dfa.acceptRule[s];
    const shape = isAccepting ? 'doublecircle' : 'circle';
    const fillcolor = isAccepting ? '#E0F2FE' : '#FFFFFF';
    const label = isAccepting ? `q${s}\\n(rule ${ruleId})` : `q${s}`;
    lines.push(`  q${s} [shape=${shape}, style=filled, fillcolor="${fillcolor}", label="${label}"];`);
  }

  // Group transitions p -> q with list of atoms
  const edgeMap = new Map<string, AtomId[]>();
  for (let s = 0; s < dfa.numStates; s++) {
    for (let a = 0; a < dfa.numAtoms; a++) {
      const target = dfa.table[s * dfa.numAtoms + a]!;
      if (target !== -1) {
        const key = `${s}->${target}`;
        if (!edgeMap.has(key)) edgeMap.set(key, []);
        edgeMap.get(key)!.push(a);
      }
    }
  }

  for (const [key, atoms] of edgeMap.entries()) {
    const [from, to] = key.split('->');
    let label = '';
    if (atoms.length > 5) {
      label = `${atoms.length} symbols`;
    } else {
      label = atoms.map((a) => atomLabels[a] || `a${a}`).join(', ');
    }
    // Clean label for dot quotes
    label = label.replace(/"/g, '\\"');
    lines.push(`  q${from} -> q${to} [label="${label}"];`);
  }

  lines.push('}');
  return lines.join('\n');
}

function run() {
  const args = process.argv.slice(2);
  const engine = buildEngine();

  let targetRule: string | null = null;
  let isMaster = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--rule') {
      targetRule = args[++i] || null;
    } else if (args[i] === '--master') {
      isMaster = true;
    }
  }

  if (isMaster) {
    const dot = dfaToDot(
      engine.dfaNormal,
      'LexiChat Master DFA',
      engine.classifier.atomLabels,
      'master'
    );
    console.log(dot);
    return;
  }

  if (targetRule) {
    const rule = engine.rules.find(
      (r) => r.name.toLowerCase() === targetRule!.toLowerCase()
    );
    if (!rule) {
      console.error(`Rule '${targetRule}' not found. Available rules: ${engine.rules.map((r) => r.name).join(', ')}`);
      process.exit(1);
    }
    const dfa = engine.dfaFor(rule.id);
    const dot = dfaToDot(
      dfa,
      `Rule ${rule.name} DFA`,
      engine.classifier.atomLabels,
      rule.name
    );
    console.log(dot);
    return;
  }

  // Default to URL rule for quick demo
  const defaultRule = engine.rules.find((r) => r.name === 'URL')!;
  const dfa = engine.dfaFor(defaultRule.id);
  console.log(dfaToDot(dfa, 'Rule URL DFA', engine.classifier.atomLabels, 'URL'));
}

run();
