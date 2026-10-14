import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe('no-regexp in src/engine guard', () => {
  it('ensures no RegExp, .match, regex .replace, or regex literals appear in src/engine except marked ALLOWED-REGEXP', () => {
    const engineDir = path.resolve(__dirname, '../src/engine');
    const files = getAllFiles(engineDir);
    const violations: { file: string; line: number; text: string; reason: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      // If the file explicitly marks that it is an allowed regex module (e.g. test oracle)
      if (content.startsWith('// ALLOWED-REGEXP')) {
        continue;
      }
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (line.includes('ALLOWED-REGEXP')) {
          continue;
        }

        // Check for new RegExp
        if (/\bnew\s+RegExp\b/.test(line)) {
          violations.push({ file, line: i + 1, text: line.trim(), reason: 'RegExp constructor used' });
        }

        // Check for .match(
        if (/\.match\s*\(/.test(line)) {
          violations.push({ file, line: i + 1, text: line.trim(), reason: '.match(...) used' });
        }

        // Check for .replace( with regex literal
        if (/\.replace\s*\(\s*\/[^\n]+\//.test(line)) {
          violations.push({ file, line: i + 1, text: line.trim(), reason: '.replace(/.../) used' });
        }

        // Check for standalone regex literals like /abc/.test
        if (/(^|[^a-zA-Z0-9_$])\/[^\/\n]+\/[gimsuy]*\.(test|exec)\b/.test(line)) {
          violations.push({ file, line: i + 1, text: line.trim(), reason: 'regex literal used' });
        }
      }
    }

    if (violations.length > 0) {
      console.error('Violations found in src/engine:', violations);
    }
    expect(violations).toEqual([]);
  });
});
