// Detect unused exports across the project and write reports to artifacts/
// Notes:
// - Lightweight static analysis using TypeScript compiler API (no extra deps)
// - Handles named, default, and re-exports; best-effort module resolution
// - Excludes tests, stories, config, declaration files, and barrel index files

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const SRC_DIR = path.join(projectRoot, 'src');
const ARTIFACTS_DIR = path.join(projectRoot, 'artifacts');
const JSON_REPORT = path.join(ARTIFACTS_DIR, 'unused-exports-top.json');
const MD_REPORT = path.join(ARTIFACTS_DIR, 'unused-exports-top.md');
const DEAD_CODE_METRICS = path.join(ARTIFACTS_DIR, 'dead-code-metrics.json');

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Files that we exclude from being considered as providers of unused exports
const EXCLUDE_EXPORT_FILE_PATTERNS = [
  /(^|\/)index\.(ts|tsx|js|jsx)$/i,
  /(^|\/)main\.(ts|tsx|js|jsx)$/i,
  /(^|\/)vite\.config\.(ts|js)$/i,
  /(^|\/)vitest\.config\.(ts|js)$/i,
  /(^|\/)eslint\.config\.(ts|js)$/i,
  /(^|\/)postcss\.config\.(ts|js)$/i,
  /(^|\/)tailwind\.config\.(ts|js)$/i,
  /(^|\/)playwright\.config\.(ts|js)$/i,
  /(^|\/)tsconfig\.[^/]*\.json$/i,
  /\.(stories|story)\.(ts|tsx|js|jsx)$/i,
  /\.(test|spec)\.(ts|tsx|js|jsx)$/i,
  /(^|\/)tests\//i,
  /\.d\.(ts|cts|mts)$/i,
  /\.(js|jsx|ts|tsx)\.map$/i,
  // Allowlist directories with dynamic imports or dev-only components
  // NOTE: Do not exclude all pages or analytics-panels globally; keep dev and lazy stubs excluded only
  /(^|\/)src\/components\/dev\//i,
  /(^|\/)src\/components\/lazy\//i,
];

// Explicit allowlist for files/exports we intentionally keep even if currently unused
// These are typically dev-only utilities, POCs, or optional features.
// Paths are relative to project root and normalized with forward slashes.
const ALLOWLIST_FILES = [
  'src/hooks/usePerformanceMonitor.ts',
  'src/components/Visualization3D.poc.stub.tsx',
];

// Files we skip entirely when scanning source/imports
const EXCLUDE_SCAN_DIR_PATTERNS = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)coverage(\/|$)/,
  /(^|\/)artifacts(\/|$)/,
  /(^|\/)public(\/|$)/,
];

function normalizePath(p) {
  return p.split(path.sep).join('/');
}

function isExcludedByPattern(filePath, patterns) {
  const normalized = normalizePath(filePath);
  return patterns.some((re) => re.test(normalized));
}

function hasKeepPragma(sourceText) {
  // File-level pragma to keep exports/files out of unused-exports reports
  // Usage: add a top-level comment in the file: `/* @unused-exports-keep */`
  return /@unused-exports-keep/.test(sourceText);
}

function isAllowlistedFile(absFilePath, sourceText) {
  const rel = normalizePath(path.relative(projectRoot, absFilePath));
  if (ALLOWLIST_FILES.includes(rel)) return true;
  if (sourceText && hasKeepPragma(sourceText)) return true;
  return false;
}

async function ensureDirExists(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function readAllSourceFiles(rootDir) {
  /** @type {string[]} */
  const files = [];

  async function walk(current) {
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const normalized = normalizePath(abs);
      if (EXCLUDE_SCAN_DIR_PATTERNS.some((re) => re.test(normalized))) continue;
      if (entry.isDirectory()) {
        await walk(abs);
      } else {
        // Skip source maps outright
        if (entry.name.endsWith('.map')) continue;
        const ext = path.extname(entry.name);
        if (SOURCE_EXTENSIONS.includes(ext)) {
          files.push(abs);
        }
      }
    }
  }

  await walk(rootDir);
  return files;
}

function createSourceFile(filePath, text) {
  const scriptKind = filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : filePath.endsWith('.ts')
    ? ts.ScriptKind.TS
    : filePath.endsWith('.jsx')
    ? ts.ScriptKind.JSX
    : ts.ScriptKind.JS;
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);
}

function isTypeOnlyNode(node) {
  const typeKinds = new Set([
    ts.SyntaxKind.TypeAliasDeclaration,
    ts.SyntaxKind.InterfaceDeclaration,
  ]);
  return typeKinds.has(node.kind);
}

function hasExportModifier(node) {
  return !!(node.modifiers && node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

function tryResolveModule(fromFile, moduleSpecifier) {
  // Returns absolute path of the module file if it exists, otherwise null
  let spec = moduleSpecifier;
  if (!spec) return null;

  if (spec.startsWith('@/')) {
    spec = path.join(SRC_DIR, spec.slice(2));
  } else if (spec.startsWith('.')) {
    spec = path.resolve(path.dirname(fromFile), spec);
  } else if (spec.startsWith('/')) {
    spec = path.resolve(spec);
  } else {
    // External module (react, echarts, etc.)
    return null;
  }

  const candidates = [
    spec,
    `${spec}.ts`,
    `${spec}.tsx`,
    `${spec}.js`,
    `${spec}.jsx`,
    path.join(spec, 'index.ts'),
    path.join(spec, 'index.tsx'),
    path.join(spec, 'index.js'),
    path.join(spec, 'index.jsx'),
  ];

  for (const c of candidates) {
    try {
      const st = fs.statSync(c);
      if (st.isFile()) return path.resolve(c);
    } catch {
      // ignore
    }
  }
  return null; // no candidate exists
}

/**
 * Parse exports and imports
 * @param {string[]} files
 */
async function analyze(files) {
  /** @type {Record<string, Array<{name: string, kind: string, typeOnly: boolean, isDefault?: boolean, isReExport?: boolean}>>} */
  const fileToExports = {};
  /** @type {Record<string, Set<string>|'ALL'>} */
  const fileToUsedExports = {};
  /** @type {Set<string>} */
  const usedExternalModules = new Set();

  for (const file of files) {
    const sourceText = await fsp.readFile(file, 'utf8');
    const sf = createSourceFile(file, sourceText);
    const keepAll = isAllowlistedFile(file, sourceText);

    // Collect exports in this file (skip excluded exporters or allowlisted files)
    if (!isExcludedByPattern(file, EXCLUDE_EXPORT_FILE_PATTERNS) && !keepAll) {
      ts.forEachChild(sf, (node) => {
        // export default ...
        if (
          node.kind === ts.SyntaxKind.ExportAssignment &&
          // Not `export =`, but `export default expr` (in TS AST it's ExportAssignment with isExportEquals flag)
          node.isExportEquals !== true
        ) {
          fileToExports[file] ??= [];
          fileToExports[file].push({ name: 'default', kind: 'default', typeOnly: false, isDefault: true });
          return;
        }

        // export declarations with specifiers or re-exports
        if (ts.isExportDeclaration(node)) {
          const isTypeOnly = !!node.isTypeOnly;
          const moduleSpecifier = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
            ? node.moduleSpecifier.text
            : null;

          if (node.exportClause && ts.isNamedExports(node.exportClause)) {
            const elements = node.exportClause.elements;
            for (const el of elements) {
              const exportedName = el.name.getText(sf);
              const isReExport = !!moduleSpecifier;
              fileToExports[file] ??= [];
              fileToExports[file].push({ name: exportedName, kind: 're-export', typeOnly: isTypeOnly, isReExport });

              // Mark original module's export as used when re-exporting
              if (moduleSpecifier) {
              const resolved = tryResolveModule(file, moduleSpecifier);
              if (resolved) {
                  if (fileToUsedExports[resolved] !== 'ALL') {
                    const set = (fileToUsedExports[resolved] ??= new Set());
                    set.add(el.propertyName ? el.propertyName.getText(sf) : exportedName);
                  }
              }
              }
            }
          } else if (!node.exportClause && moduleSpecifier) {
            // export * from '...'
            const resolved = tryResolveModule(file, moduleSpecifier);
            if (resolved) {
              fileToUsedExports[resolved] = 'ALL';
            }
          }
          return;
        }

        // Named exports with modifiers (functions, consts, classes, enums, interfaces/types)
        if (hasExportModifier(node)) {
          // Handle `export default function/class` declarations
          const hasDefaultModifier = !!(node.modifiers && node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword));
          if (hasDefaultModifier) {
            if (ts.isFunctionDeclaration(node)) {
              fileToExports[file] ??= [];
              fileToExports[file].push({ name: 'default', kind: 'default-function', typeOnly: false, isDefault: true });
              return;
            }
            if (ts.isClassDeclaration(node)) {
              fileToExports[file] ??= [];
              fileToExports[file].push({ name: 'default', kind: 'default-class', typeOnly: false, isDefault: true });
              return;
            }
          }
          let name = null;
          let kind = null;
          if (ts.isFunctionDeclaration(node) && node.name) {
            name = node.name.getText(sf);
            kind = 'function';
          } else if (ts.isClassDeclaration(node) && node.name) {
            name = node.name.getText(sf);
            kind = 'class';
          } else if (ts.isEnumDeclaration(node) && node.name) {
            name = node.name.getText(sf);
            kind = 'enum';
          } else if (ts.isInterfaceDeclaration(node) && node.name) {
            name = node.name.getText(sf);
            kind = 'interface';
          } else if (ts.isTypeAliasDeclaration(node) && node.name) {
            name = node.name.getText(sf);
            kind = 'type';
          } else if (ts.isVariableStatement(node)) {
            kind = 'const';
            for (const decl of node.declarationList.declarations) {
              if (ts.isIdentifier(decl.name)) {
                const vname = decl.name.getText(sf);
                fileToExports[file] ??= [];
                fileToExports[file].push({ name: vname, kind, typeOnly: false });
              }
            }
            return;
          }

          if (name && kind) {
            fileToExports[file] ??= [];
            fileToExports[file].push({ name, kind, typeOnly: isTypeOnlyNode(node) });
          }
          return;
        }
      });
    } else if (keepAll) {
      // Treat allowlisted files as if all of their exports are used
      fileToUsedExports[file] = 'ALL';
    }

    // Collect imports used by this file (recursive traversal)
    function visit(node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : null;
        if (moduleSpecifier) {
          const resolved = tryResolveModule(file, moduleSpecifier);
          if (!resolved) {
            // External dependency usage
            const topLevel = moduleSpecifier.startsWith('@')
              ? moduleSpecifier.split('/').slice(0, 2).join('/')
              : moduleSpecifier.split('/')[0];
            usedExternalModules.add(topLevel);
          } else {
            if (!node.importClause) {
              // import 'polyfill'; ignore
            } else {
              const importClause = node.importClause;
              if (importClause.name) {
                // default import used
                if (fileToUsedExports[resolved] !== 'ALL') {
                  const set = (fileToUsedExports[resolved] ??= new Set());
                  set.add('default');
                }
              }
              if (importClause.namedBindings) {
                if (ts.isNamespaceImport(importClause.namedBindings)) {
                  // import * as ns from 'module' -> consider all exports as used
                  fileToUsedExports[resolved] = 'ALL';
                } else if (ts.isNamedImports(importClause.namedBindings)) {
                  for (const el of importClause.namedBindings.elements) {
                    const importedName = el.propertyName ? el.propertyName.getText(sf) : el.name.getText(sf);
                    if (fileToUsedExports[resolved] !== 'ALL') {
                      const set = (fileToUsedExports[resolved] ??= new Set());
                      set.add(importedName);
                    }
                  }
                }
              }
            }
          }
        }
      }
      // Detect dynamic imports: import('module')
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const [arg] = node.arguments;
        if (arg && ts.isStringLiteral(arg)) {
          const mod = arg.text;
        const resolved = tryResolveModule(file, mod);
        if (!resolved) {
            const topLevel = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
            usedExternalModules.add(topLevel);
        } else {
          fileToUsedExports[resolved] = 'ALL';
          }
        }
      }
      // Detect require('module') in CJS contexts
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
        const [arg] = node.arguments;
        if (arg && ts.isStringLiteral(arg)) {
          const mod = arg.text;
          const resolved = tryResolveModule(file, mod);
          if (!resolved) {
            const topLevel = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
            usedExternalModules.add(topLevel);
          } else {
            fileToUsedExports[resolved] = 'ALL';
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }

  return { fileToExports, fileToUsedExports, usedExternalModules };
}

function computeUnused({ fileToExports, fileToUsedExports }) {
  /** @type {Array<{file: string, exportName: string, exportKind: string}>} */
  const unused = [];

  for (const [file, exports] of Object.entries(fileToExports)) {
    const used = fileToUsedExports[file];
    if (used === 'ALL') continue;
    const usedSet = used ? new Set(used) : new Set();
    for (const ex of exports) {
      if (ex.typeOnly) continue; // skip type-only exports
      const name = ex.isDefault ? 'default' : ex.name;
      if (!name) continue;
      if (!usedSet.has(name)) {
        unused.push({ file: normalizePath(path.relative(projectRoot, file)), exportName: name, exportKind: ex.kind });
      }
    }
  }

  // Sort by file then by exportKind then name
  unused.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.exportKind !== b.exportKind) return a.exportKind.localeCompare(b.exportKind);
    return a.exportName.localeCompare(b.exportName);
  });

  return unused;
}

function buildSummaryByFile(unused) {
  /** @type {Record<string, {count: number, exports: Array<{name: string, kind: string}>}>} */
  const byFile = {};
  for (const u of unused) {
    const bucket = (byFile[u.file] ??= { count: 0, exports: [] });
    bucket.count += 1;
    bucket.exports.push({ name: u.exportName, kind: u.exportKind });
  }
  return byFile;
}

async function writeReports({ allFiles, fileToExports, unused, usedExternalModules }) {
  await ensureDirExists(ARTIFACTS_DIR);

  const summaryByFile = buildSummaryByFile(unused);
  const totalExports = Object.values(fileToExports).reduce((acc, arr) => acc + arr.length, 0);

  const json = {
    generatedAt: new Date().toISOString(),
    root: normalizePath(projectRoot),
    totalFilesScanned: allFiles.length,
    totalExports,
    unusedExportsCount: unused.length,
    unusedExports: unused,
    summaryByFile,
    notes: [
      'Heuristic analysis. Re-exports and dynamic usage may not be fully captured.',
      'Excluded index files, tests, stories, and common config/entry files from unused-export consideration.',
    ],
  };

  await fsp.writeFile(JSON_REPORT, JSON.stringify(json, null, 2), 'utf8');

  // Markdown report
  const lines = [];
  lines.push('# Unused Exports Report');
  lines.push('');
  lines.push(`Generated: ${json.generatedAt}`);
  lines.push(`Files scanned: ${json.totalFilesScanned}`);
  lines.push(`Total exports: ${json.totalExports}`);
  lines.push(`Unused exports: ${json.unusedExportsCount}`);
  lines.push('');

  if (unused.length === 0) {
    lines.push('No unused exports found.');
  } else {
    let currentFile = '';
    for (const u of unused) {
      if (u.file !== currentFile) {
        currentFile = u.file;
        lines.push('');
        lines.push(`## ${currentFile}`);
      }
      lines.push(`- ${u.exportKind}: ${u.exportName}`);
    }
  }

  await fsp.writeFile(MD_REPORT, lines.join('\n') + '\n', 'utf8');

  // Also emit consolidated dead-code metrics for CI/reporting parity
  await writeDeadCodeMetrics({ allFiles, fileToExports, summaryByFile, usedExternalModules });
}

async function writeDeadCodeMetrics({ allFiles, fileToExports, summaryByFile, usedExternalModules }) {
  // Read package.json for dependency lists
  const pkgJsonPath = path.join(projectRoot, 'package.json');
  /** @type {{ dependencies?: Record<string,string>, devDependencies?: Record<string,string> }} */
  const pkg = JSON.parse(await fsp.readFile(pkgJsonPath, 'utf8'));

  const depNames = Object.keys(pkg.dependencies || {});
  const devDepNames = Object.keys(pkg.devDependencies || {});

  // Compute used deps from collected external imports
  const usedDeps = new Set(usedExternalModules);

  // Heuristics: mark runner-only/dev-only deps as used based on config and scripts
  try {
    // Vitest environment detection: include jsdom if configured
    const vitestConfigPath = path.join(projectRoot, 'vitest.config.ts');
    const vitestConfigJsPath = path.join(projectRoot, 'vitest.config.js');
    const vitestConfigTsxPath = path.join(projectRoot, 'vitest.config.tsx');
    const vitestConfigCandidates = [vitestConfigPath, vitestConfigJsPath, vitestConfigTsxPath];
    for (const candidate of vitestConfigCandidates) {
      try {
        const content = fs.readFileSync(candidate, 'utf8');
        if (/environment\s*:\s*['"]jsdom['"]/i.test(content)) {
          usedDeps.add('jsdom');
          break;
        }
      } catch { /* ignore */ }
    }

    // Allowlist runner-only devDeps often used without direct imports
    const runnerOnlyAllowlist = ['@testing-library/dom'];
    for (const name of runnerOnlyAllowlist) usedDeps.add(name);

    // Include tools referenced in npm scripts as used devDeps
    try {
      const pkgText = await fsp.readFile(pkgJsonPath, 'utf8');
      const pkgFull = JSON.parse(pkgText);
      const scriptsSection = pkgFull.scripts || {};
      const joined = Object.values(scriptsSection).join('\n');
      const toolToPkg = [
        { pattern: /eslint\b/, name: 'eslint' },
        { pattern: /prettier\b/, name: 'prettier' },
        { pattern: /tsx\b/, name: 'tsx' },
        { pattern: /postcss\b/, name: 'postcss' },
      ];
      for (const { pattern, name } of toolToPkg) {
        if (pattern.test(joined)) usedDeps.add(name);
      }

      // Config-file implied tools
      const postcssConfigCandidates = ['postcss.config.js', 'postcss.config.cjs', 'postcss.config.ts'].map((f) => path.join(projectRoot, f));
      if (postcssConfigCandidates.some((p) => fs.existsSync(p))) {
        usedDeps.add('postcss');
        usedDeps.add('autoprefixer');
      }
    } catch { /* ignore */ }
  } catch { /* ignore */ }

  // Unused dependencies present in package.json but never imported anywhere
  const unusedDependencies = depNames.filter((d) => !usedDeps.has(d));

  // For devDependencies, scan non-source project files as well for import usage
  const projectFiles = await readAllProjectFiles(projectRoot);
  const devUsed = await collectExternalModuleUsage(projectFiles);
  const devRunnerUsed = new Set(devUsed);
  // Vitest jsdom environment
  try {
    const candidates = ['vitest.config.ts','vitest.config.js','vitest.config.tsx'].map(f => path.join(projectRoot, f));
    for (const c of candidates) {
      try {
        const content = fs.readFileSync(c, 'utf8');
        if (/environment\s*:\s*['\"]jsdom['\"]/i.test(content)) {
          devRunnerUsed.add('jsdom');
          break;
        }
      } catch {}
    }
  } catch {}
  // Runner allowlist
  ['@testing-library/dom'].forEach((name) => devRunnerUsed.add(name));
  // Tools inferred from scripts/configs
  try {
    const pkgFull = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const joined = Object.values(pkgFull.scripts || {}).join('\n');
    const toolPatterns = [
      [/eslint\b/i, 'eslint'],
      [/prettier\b/i, 'prettier'],
      [/postcss\b/i, 'postcss'],
      [/tsx\b/i, 'tsx'],
    ];
    for (const [pattern, name] of toolPatterns) if (pattern.test(joined)) devRunnerUsed.add(name);
    const postcssConfigs = ['postcss.config.js','postcss.config.cjs','postcss.config.ts'].map(f => path.join(projectRoot, f));
    if (postcssConfigs.some((p) => fs.existsSync(p))) {
      devRunnerUsed.add('postcss');
      devRunnerUsed.add('autoprefixer');
    }
  } catch {}
  const unusedDevDependencies = devDepNames.filter((d) => !devRunnerUsed.has(d));

  // Approximate unused files as those whose every export is unused
  /** @type {Array<{file: string, loc: number}>} */
  const unusedFiles = [];
  for (const [file, exports] of Object.entries(fileToExports)) {
    const rel = normalizePath(path.relative(projectRoot, file));
    const summary = summaryByFile[rel];
    if (summary && summary.count === exports.length) {
      const text = await fsp.readFile(file, 'utf8');
      const loc = text.split('\n').length;
      unusedFiles.push({ file: rel, loc });
    }
  }

  const totalSrcFiles = allFiles.length;
  const totalSrcLoc = await sumLoc(allFiles);
  const deadCodePercentByFiles = totalSrcFiles > 0 ? Number(((unusedFiles.length / totalSrcFiles) * 100).toFixed(2)) : 0;

  const metrics = {
    totalSrcFiles,
    totalSrcLoc,
    unusedFilesCount: unusedFiles.length,
    unusedFilesLoc: unusedFiles.reduce((acc, f) => acc + f.loc, 0),
    deadCodePercentByFiles,
    unusedExportsCount: Object.values(summaryByFile).reduce((acc, s) => acc + s.count, 0),
    unusedExportsFiles: Object.keys(summaryByFile).length,
    unusedDependencies,
    unusedDevDependencies,
    unusedFiles,
  };

  await fsp.writeFile(DEAD_CODE_METRICS, JSON.stringify(metrics, null, 2), 'utf8');
}

async function sumLoc(files) {
  let total = 0;
  for (const f of files) {
    try {
      const t = await fsp.readFile(f, 'utf8');
      total += t.split('\n').length;
    } catch {
      // ignore
    }
  }
  return total;
}

async function readAllProjectFiles(rootDir) {
  /** @type {string[]} */
  const files = [];

  const EXCLUDE_DIRS = [
    /(^|\/)node_modules(\/|$)/,
    /(^|\/)dist(\/|$)/,
    /(^|\/)coverage(\/|$)/,
    /(^|\/)artifacts(\/|$)/,
    /(^|\/)public(\/|$)/,
  ];

  async function walk(current) {
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const normalized = normalizePath(abs);
      if (EXCLUDE_DIRS.some((re) => re.test(normalized))) continue;
      if (entry.isDirectory()) {
        await walk(abs);
      } else {
        if (entry.name.endsWith('.map')) continue;
        const ext = path.extname(entry.name);
        if (SOURCE_EXTENSIONS.includes(ext) || /\.(mjs|cjs|json)$/i.test(entry.name)) {
          files.push(abs);
        }
      }
    }
  }

  await walk(rootDir);
  return files;
}

async function collectExternalModuleUsage(files) {
  /** @type {Set<string>} */
  const used = new Set();
  for (const file of files) {
    try {
      const sourceText = await fsp.readFile(file, 'utf8');
      const sf = createSourceFile(file, sourceText);
      ts.forEachChild(sf, (node) => {
        if (ts.isImportDeclaration(node)) {
          const mod = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : null;
          if (!mod) return;
        const resolved = tryResolveModule(file, mod);
        if (!resolved) {
            const topLevel = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
            used.add(topLevel);
        }
        }
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          const [arg] = node.arguments;
          if (arg && ts.isStringLiteral(arg)) {
            const mod = arg.text;
            const resolved = tryResolveModule(file, mod);
            if (!resolved) {
              const topLevel = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
              used.add(topLevel);
            }
          }
        }
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
          const [arg] = node.arguments;
          if (arg && ts.isStringLiteral(arg)) {
            const mod = arg.text;
            const resolved = tryResolveModule(file, mod);
            if (!resolved) {
              const topLevel = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
              used.add(topLevel);
            }
          }
        }
      });
    } catch {
      // ignore parse errors in non-TS/JS files
    }
  }
  return used;
}

async function main() {
  const start = Date.now();
  const allFiles = await readAllSourceFiles(SRC_DIR);
  const { fileToExports, fileToUsedExports, usedExternalModules } = await analyze(allFiles);
  const unused = computeUnused({ fileToExports, fileToUsedExports });
  await writeReports({ allFiles, fileToExports, unused, usedExternalModules });
  const ms = Date.now() - start;
   
  console.log(`Unused exports analysis complete in ${ms} ms. Report: ${normalizePath(path.relative(projectRoot, JSON_REPORT))}`);
}

main().catch((err) => {
   
  console.error('Unused exports analysis failed:', err);
  process.exitCode = 1;
});


