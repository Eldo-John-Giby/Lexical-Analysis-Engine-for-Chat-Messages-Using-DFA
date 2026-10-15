import * as fs from 'node:fs';
import { buildEngine } from '../src/engine/index';

function printHelp() {
  console.log(`
LexiChat CLI - Lexical Analysis Engine for Chat Messages Using DFA

Usage:
  npm run lex -- "<message>"
  npm run lex -- --json "<message>"
  npm run lex -- --trace "<message>"
  npm run lex -- --file <path> [--stats]
  npm run lex -- --help

Examples:
  npm run lex -- "hey @eldo check https://vit.ac.in/x. now!!!"
  npm run lex -- --trace "loooool :) <3"
  npm run lex -- --json "@everyone join"
`);
}

function run() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  let isJson = false;
  let isTrace = false;
  let showStats = false;
  let filePath: string | null = null;
  let text = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--json') {
      isJson = true;
    } else if (arg === '--trace') {
      isTrace = true;
    } else if (arg === '--stats') {
      showStats = true;
    } else if (arg === '--file') {
      filePath = args[++i] || null;
    } else if (!arg.startsWith('-')) {
      text = arg;
    }
  }

  if (filePath) {
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }
    text = fs.readFileSync(filePath, 'utf-8');
  }

  if (!text) {
    console.error('Error: No input text provided.');
    process.exit(1);
  }

  const engine = buildEngine();

  const t0 = performance.now();
  const res = engine.lex(text, { trace: isTrace });
  const t1 = performance.now();
  const elapsedMs = Math.round((t1 - t0) * 100) / 100;

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          tokens: res.tokens,
          errors: res.errors,
          symbols: Array.from(res.symbols.entries()).map(([k, v]) => ({ key: k, ...v })),
          trace: res.trace,
          timing: { elapsedMs, chars: text.length },
        },
        null,
        2
      )
    );
    return;
  }

  if (isTrace && res.trace) {
    console.log('\n--- DFA Trace Log (Maximal Munch Execution) ---');
    for (const ev of res.trace) {
      if (ev.t === 'begin') {
        console.log(`[BEGIN] pos=${ev.pos} startState=q${ev.startState}`);
      } else if (ev.t === 'step') {
        const accInfo = ev.accepting ? ` [ACCEPT rule=${ev.ruleId}]` : '';
        console.log(`  STEP pos=${ev.pos} read='${ev.ch}' (atom ${ev.atom}): q${ev.from} -> q${ev.to}${accInfo}`);
      } else if (ev.t === 'mark') {
        console.log(`  * MARK lastAccPos=${ev.pos} state=q${ev.state} rule=${ev.ruleId}`);
      } else if (ev.t === 'dead') {
        console.log(`  ! DEAD pos=${ev.pos} char='${ev.ch}' at state=q${ev.from}`);
      } else if (ev.t === 'backtrack') {
        console.log(`  <-- ROLLBACK ${ev.from} -> ${ev.to} (Maximal Munch rollback to last accepting state)`);
      } else if (ev.t === 'emit') {
        console.log(`[EMIT] ${ev.token.type}('${ev.token.lexeme}') pos=[${ev.token.start}..${ev.token.end}] flags=[${ev.token.flags.join(', ')}]`);
      } else if (ev.t === 'error') {
        console.log(`[ERROR] ${ev.message} at pos=${ev.pos}`);
      }
    }
  }

  console.log('\n--- Lexed Tokens ---');
  console.log(
    '#' +
      '\t' +
      'TYPE'.padEnd(16) +
      'KIND'.padEnd(10) +
      'LINE:COL'.padEnd(10) +
      'FLAGS'.padEnd(16) +
      'LEXEME'
  );
  console.log('-'.repeat(80));

  res.tokens.forEach((t, idx) => {
    const flagsStr = t.flags.join(', ');
    const lexemeDisplay = JSON.stringify(t.lexeme);
    console.log(
      `${idx + 1}\t${t.type.padEnd(16)}${t.kind.padEnd(10)}${`${t.line}:${t.col}`.padEnd(10)}${flagsStr.padEnd(16)}${lexemeDisplay}`
    );
  });

  if (showStats) {
    console.log('\n--- Performance & Engine Stats ---');
    console.log(`Input Length: ${text.length} characters`);
    console.log(`Tokens Emitted: ${res.tokens.length}`);
    console.log(`Errors: ${res.errors.length}`);
    console.log(`Lexing Duration: ${elapsedMs} ms`);
    console.log(`Throughput: ${((text.length / 1024 / 1024) / (elapsedMs / 1000)).toFixed(2)} MB/s`);
    console.log(`Master DFA States: ${engine.stats.master.minDfaStates}`);
    console.log(`Alphabet Atoms: ${engine.stats.atoms}`);
  }
}

run();
