#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

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
const SRC_DIR = path.join(ROOT, 'src');
const ARTIFACTS_DIR = path.join(ROOT, 'artifacts');
const OUTPUT_JSON = path.join(ARTIFACTS_DIR, 'i18n-offenders.json');

const ATTR_NAMES = new Set([
  'placeholder',
  'title',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'alt',
]);

const MESSAGE_FN_NAMES = new Set([
  // common message APIs
  'toast',
  'notify',
  'notification',
  'alert',
  'confirm',
  'prompt',
  // shadcn/sonner
  'success',
  'error',
  'warning',
  'info',
]);

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isSourceFile(file: string): boolean {
  return /(\.tsx?|\.jsx)$/.test(file) && !file.endsWith('.d.ts');
}

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  // requested exclusions
  '__tests__',
  'tests',
  '__mocks__',
  'mocks',
  'mock',
  '__snapshots__',
  'snapshots',
  'stories',
  'story',
  'docs',
  'examples',
  'demo',
  'locales', // translation resource folders
]);

function isExcludedFile(filePath: string): boolean {
  const base = path.basename(filePath);
  if (/\.(test|spec|stories)\.(t|j)sx?$/i.test(base)) return true;
  if (/\.snap$/i.test(base)) return true;
  return false;
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(current, e.name);
      if (e.isDirectory()) {
        // skip excluded dirs
        if (EXCLUDED_DIRS.has(e.name)) continue;
        stack.push(p);
      } else if (e.isFile() && isSourceFile(p) && !isExcludedFile(p)) {
        out.push(p);
      }
    }
  }
  return out;
}

function getLineAndCol(sf: ts.SourceFile, pos: number) {
  const { line, character } = sf.getLineAndCharacterOfPosition(pos);
  return { line: line + 1, column: character + 1 };
}

function getContext(sf: ts.SourceFile, pos: number): string {
  const start = Math.max(0, pos - 80);
  const end = Math.min(sf.text.length, pos + 80);
  return sf.text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function isLikelyTranslatable(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  // ignore pure punctuation and numbers
  if (/^[0-9\s.,:;!?()[\]{}+\-/*\\'"`~#@%^&|<>]+$/.test(trimmed)) return false;
  // ignore interpolation braces (likely already dynamic)
  if (/[{][^}]*[}]/.test(trimmed)) return false;
  // ignore i18n keys pattern like ns:key
  if (/^[a-z0-9_.-]+:[a-z0-9_.-]+$/i.test(trimmed)) return false;
  return true;
}

function scanFile(filePath: string): Offender[] {
  const text = fs.readFileSync(filePath, 'utf8');
  const scriptKind =
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);
  const offenders: Offender[] = [];

  const importedMessageFns = new Set<string>();
  let hasSonnerToast = false;

  function record(node: ts.Node, kind: Offender['kind'], detail: string, value: string) {
    const { line, column } = getLineAndCol(sf, node.getStart());
    offenders.push({
      file: path.relative(ROOT, filePath),
      kind,
      detail,
      value,
      line,
      column,
      context: getContext(sf, node.getStart()),
    });
  }

  // collect imports to better detect message APIs
  sf.forEachChild((node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.importClause &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const mod = node.moduleSpecifier.text;
      if (mod === 'sonner' || mod.includes('toast')) {
        hasSonnerToast = true;
      }
      if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const el of node.importClause.namedBindings.elements) {
          importedMessageFns.add(el.name.text);
        }
      }
    }
  });

  function visit(node: ts.Node) {
    // JSXText
    if (ts.isJsxText(node)) {
      const value = node.getText();
      if (isLikelyTranslatable(value)) {
        record(node, 'JSXText', 'Static JSX text node', value.trim());
      }
    }

    // JSXAttribute literals
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText();
      const attrName = name.toLowerCase();
      if (ATTR_NAMES.has(attrName) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) {
          const value = node.initializer.text;
          if (isLikelyTranslatable(value)) {
            record(node.initializer, 'JSXAttribute', `Static ${attrName} attribute`, value);
          }
        }
        // Also catch jsx expression with string literal: placeholder={"Text"}
        if (
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          ts.isStringLiteral(node.initializer.expression)
        ) {
          const value = node.initializer.expression.text;
          if (isLikelyTranslatable(value)) {
            record(
              node.initializer.expression,
              'JSXAttribute',
              `Static ${attrName} attribute`,
              value,
            );
          }
        }
      }
    }

    // Calls to common message APIs
    if (ts.isCallExpression(node)) {
      let calleeName: string | undefined;
      const exp = node.expression;
      if (ts.isIdentifier(exp)) {
        calleeName = exp.text;
      } else if (ts.isPropertyAccessExpression(exp)) {
        calleeName = exp.name.text; // toast.success("...")
      }

      if (calleeName && MESSAGE_FN_NAMES.has(calleeName)) {
        const firstArg = node.arguments[0];
        if (firstArg && ts.isStringLiteral(firstArg) && isLikelyTranslatable(firstArg.text)) {
          record(firstArg, 'MessageAPI', `Message API call: ${calleeName}()`, firstArg.text);
        }
      }

      // special-case for sonner: toast("..."), toast.success("..."), etc.
      if (hasSonnerToast) {
        const firstArg = node.arguments[0];
        if (firstArg && ts.isStringLiteral(firstArg) && isLikelyTranslatable(firstArg.text)) {
          if (ts.isIdentifier(exp) && exp.text === 'toast') {
            record(firstArg, 'MessageAPI', 'sonner toast()', firstArg.text);
          }
          if (ts.isPropertyAccessExpression(exp) && exp.expression.getText() === 'toast') {
            record(firstArg, 'MessageAPI', `sonner toast.${exp.name.getText()}()`, firstArg.text);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return offenders;
}

function main() {
  ensureDir(ARTIFACTS_DIR);
  const files = listFiles(SRC_DIR);
  const all: Offender[] = [];
  for (const f of files) {
    try {
      const res = scanFile(f);
      all.push(...res);
    } catch (e) {
      // ignore parse errors but note file context
      all.push({
        file: path.relative(ROOT, f),
        kind: 'MessageAPI',
        detail: 'ParseError',
        value: String(e instanceof Error ? e.message : e),
        line: 0,
        column: 0,
      });
    }
  }
  fs.writeFileSync(
    OUTPUT_JSON,
    JSON.stringify({ generatedAt: new Date().toISOString(), offenders: all }, null, 2),
  );

  console.log(`Wrote ${all.length} offenders to ${path.relative(ROOT, OUTPUT_JSON)}`);
}

main();
