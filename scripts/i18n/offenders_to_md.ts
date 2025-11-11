#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';

interface Offender {
  file: string;
  kind: 'JSXText' | 'JSXAttribute' | 'MessageAPI';
  detail: string;
  value: string;
  line: number;
  column: number;
  context?: string;
}

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'artifacts');
const INPUT_JSON = path.join(ARTIFACTS_DIR, 'i18n-offenders.json');
const OUTPUT_MD = path.join(ARTIFACTS_DIR, 'i18n-offenders.md');

type Classification = 'ui' | 'false-positive' | 'out-of-scope';

function suggestNamespace(file: string): string {
  const f = file.replace(/\\/g, '/');
  if (
    /components\/(Analytics|Analytics.*|.*Analytics|ProgressDashboard|ReportBuilder|DataQuality|Pattern|Trends|EChart|Chart)/i.test(
      f,
    )
  )
    return 'analytics';
  if (/components\/(.*Dashboard|Dashboard|layouts\/DashboardLayout)/i.test(f)) return 'dashboard';
  if (/(Student|profile-sections|StudentProfile|PremiumStudentCard)/i.test(f)) return 'student';
  if (/(Tracker|Tracking|Environmental|TimelineVisualization|QuickEntry|SmartDataEntry)/i.test(f))
    return 'tracking';
  if (/(Settings|LanguageSettings)/i.test(f)) return 'settings';
  return 'common';
}

function normalizeKeyPart(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join('_');
}

function suggestKey(file: string, value: string): string {
  const ns = suggestNamespace(file);
  const section = normalizeKeyPart(path.basename(file).replace(/\.(t|j)sx?$/i, ''));
  const purpose = normalizeKeyPart(value);
  return `${ns}.${section}.${purpose}`;
}

function classify(off: Offender): {
  ns: string;
  key: string;
  classification: Classification;
  note?: string;
} {
  const file = off.file;
  const ns = suggestNamespace(file);
  // Out-of-scope heuristics: developer-only logs and non-UI libs
  if (/\bsrc\/lib\//.test(file) && off.kind === 'MessageAPI') {
    return {
      ns,
      key: '',
      classification: 'out-of-scope',
      note: 'Developer-only log or non-UI message in lib/',
    };
  }
  if (
    /\bsrc\/(hooks|lib|contexts)\//.test(file) &&
    off.kind !== 'JSXAttribute' &&
    off.kind !== 'JSXText'
  ) {
    return { ns, key: '', classification: 'out-of-scope', note: 'Non-UI layer' };
  }
  // False positives: very short tokens, ids, or contexts that look like keys already
  if (/^[a-z0-9_.:-]{1,20}$/i.test(off.value)) {
    return {
      ns,
      key: '',
      classification: 'false-positive',
      note: 'Looks like an identifier or existing key',
    };
  }
  const key = suggestKey(file, off.value);
  return { ns, key, classification: 'ui' };
}

function toMarkdown(offenders: Offender[]): string {
  const byFile = new Map<string, Offender[]>();
  for (const o of offenders) {
    if (!byFile.has(o.file)) byFile.set(o.file, []);
    byFile.get(o.file)!.push(o);
  }

  let md = '# i18n Offenders Report\n\n';
  md += `Generated: ${new Date().toLocaleString()}\n\n`;
  md += `Found ${offenders.length} potential offenders across ${byFile.size} files.\n\n`;
  md += 'Key convention: feature.section.purpose — prefer nouns and verbs in present tense.\n\n';

  const nsBuckets: Record<string, { off: Offender; triage: ReturnType<typeof classify> }[]> =
    Object.create(null);
  const falsePos: { off: Offender; triage: ReturnType<typeof classify> }[] = [];
  const outOfScope: { off: Offender; triage: ReturnType<typeof classify> }[] = [];

  for (const o of offenders) {
    const triage = classify(o);
    if (triage.classification === 'false-positive') falsePos.push({ off: o, triage });
    else if (triage.classification === 'out-of-scope') outOfScope.push({ off: o, triage });
    else {
      if (!nsBuckets[triage.ns])
        nsBuckets[triage.ns] = [] as { off: Offender; triage: ReturnType<typeof classify> }[];
      nsBuckets[triage.ns].push({ off: o, triage });
    }
  }

  const namespaces = Object.keys(nsBuckets).sort();
  for (const ns of namespaces) {
    md += `## Namespace: ${ns}\n\n`;
    const items = nsBuckets[ns];
    // Group by file for readability
    const byFileNs = new Map<string, typeof items>();
    for (const it of items) {
      if (!byFileNs.has(it.off.file)) byFileNs.set(it.off.file, [] as typeof items);
      byFileNs.get(it.off.file)!.push(it);
    }
    for (const file of Array.from(byFileNs.keys()).sort()) {
      md += `### ${file}\n`;
      const list = byFileNs
        .get(file)!
        .sort((a, b) => a.off.line - b.off.line || a.off.column - b.off.column);
      for (const { off, triage } of list) {
        md +=
          `- [${off.line}:${off.column}] (${off.kind}) \`${off.value.replace(/`/g, '\\`')}\` \u2192 key: \`${triage.key}\`` +
          (off.detail ? ` — ${off.detail}` : '') +
          '\n';
        if (off.context) md += `  - context: \`${off.context.replace(/`/g, '\\`')}\`\n`;
      }
      md += '\n';
    }
  }

  if (falsePos.length) {
    md += '## False positives\n\n';
    for (const { off, triage } of falsePos.sort(
      (a, b) => a.off.file.localeCompare(b.off.file) || a.off.line - b.off.line,
    )) {
      md += `- ${off.file} [${off.line}:${off.column}] (${off.kind}) \`${off.value.replace(/`/g, '\\`')}\` — ${triage.note || ''}\n`;
    }
    md += '\n';
  }

  if (outOfScope.length) {
    md += '## Out of scope (non-UI / developer-only)\n\n';
    for (const { off, triage } of outOfScope.sort(
      (a, b) => a.off.file.localeCompare(b.off.file) || a.off.line - b.off.line,
    )) {
      md += `- ${off.file} [${off.line}:${off.column}] (${off.kind}) \`${off.value.replace(/`/g, '\\`')}\` — ${triage.note || ''}\n`;
    }
    md += '\n';
  }

  // Raw by file appendix
  md += '## Appendix: Offenders by file\n\n';
  const files = Array.from(byFile.keys()).sort();
  for (const file of files) {
    md += `### ${file}\n\n`;
    const list = byFile.get(file)!.sort((a, b) => a.line - b.line || a.column - b.column);
    for (const o of list) {
      md += `- [${o.line}:${o.column}] (${o.kind}) ${o.detail}: \`${o.value.replace(/`/g, '\\`')}\`\n`;
      if (o.context) {
        md += `  - context: \`${o.context.replace(/`/g, '\\`')}\`\n`;
      }
    }
    md += '\n';
  }

  if (!files.length) {
    md += 'No offenders found. Great job!\n';
  }

  return md;
}

function main() {
  if (!fs.existsSync(INPUT_JSON)) {
    throw new Error(`Missing ${path.relative(ROOT, INPUT_JSON)}. Run the scan first.`);
  }
  const raw = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf8')) as { offenders: Offender[] };
  const md = toMarkdown(raw.offenders || []);
  fs.writeFileSync(OUTPUT_MD, md, 'utf8');

  console.log(`Wrote Markdown report to ${path.relative(ROOT, OUTPUT_MD)}`);
}

main();
