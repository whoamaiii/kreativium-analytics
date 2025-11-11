#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EN_DIR = path.join(ROOT, 'src', 'locales', 'en');
const NB_DIR = path.join(ROOT, 'src', 'locales', 'nb');

function listNamespaces(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

function readJson(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as unknown;
}

function flatten(obj: unknown, prefix = ''): Record<string, true> {
  const out: Record<string, true> = {};
  if (obj && typeof obj === 'object') {
    const o = obj as Record<string, unknown>;
    for (const [k, v] of Object.entries(o)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(out, flatten(v, key));
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

function diffKeys(en: Record<string, true>, nb: Record<string, true>) {
  const missing: string[] = [];
  const extra: string[] = [];
  for (const k of Object.keys(en)) if (!nb[k]) missing.push(k);
  for (const k of Object.keys(nb)) if (!en[k]) extra.push(k);
  return { missing, extra };
}

function main() {
  const enNamespaces = new Set(listNamespaces(EN_DIR));
  const nbNamespaces = new Set(listNamespaces(NB_DIR));

  const allNamespaces = new Set([...Array.from(enNamespaces), ...Array.from(nbNamespaces)]);

  let totalMissing = 0;
  let report = '';

  for (const ns of Array.from(allNamespaces).sort()) {
    const enPath = path.join(EN_DIR, `${ns}.json`);
    const nbPath = path.join(NB_DIR, `${ns}.json`);

    const en = fs.existsSync(enPath) ? flatten(readJson(enPath)) : {};
    const nb = fs.existsSync(nbPath) ? flatten(readJson(nbPath)) : {};

    const { missing, extra } = diffKeys(en, nb);
    totalMissing += missing.length;

    report += `Namespace: ${ns}\n`;
    report += `  Missing in nb (${missing.length}):${missing.length ? '\n    - ' + missing.join('\n    - ') : ' none'}\n`;
    report += `  Extra in nb (${extra.length}):${extra.length ? '\n    - ' + extra.join('\n    - ') : ' none'}\n\n`;
  }

  console.log(report.trim());

  if (totalMissing > 0) {
    console.error(`nb is missing ${totalMissing} keys present in en.`);
    process.exitCode = 1;
  }
}

main();
