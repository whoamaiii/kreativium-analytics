/*
  Guardrail: prevent double-lazy pattern where React.lazy dynamically imports from components/lazy/*
  Usage: tsx scripts/validate-lazy-imports.ts
*/
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

function walk(dir: string, acc: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, acc);
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
      acc.push(full);
    }
  }
  return acc;
}

const files = walk(SRC_DIR);

const offenders: { file: string; line: number; snippet: string }[] = [];

const pattern = /React\.lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*['"](?:@\/)?components\/lazy\//g;

for (const abs of files) {
  const rel = path.relative(SRC_DIR, abs);
  const content = fs.readFileSync(abs, 'utf8');
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(content)) !== null) {
    const upto = content.slice(0, match.index);
    const line = upto.split(/\r?\n/).length;
    const snippet = content.split(/\r?\n/).slice(line - 1, line + 1).join('\n');
    offenders.push({ file: rel, line, snippet });
  }
}

if (offenders.length > 0) {
  console.error('[validate-lazy-imports] Found double-lazy usages importing from components/lazy/* via React.lazy:');
  for (const o of offenders) {
    console.error(` - ${o.file}:${o.line}`);
    console.error(o.snippet);
    console.error('');
  }
  process.exit(1);
}

console.log('[validate-lazy-imports] OK: no double-lazy usages detected.');

