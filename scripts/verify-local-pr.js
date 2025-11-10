#!/usr/bin/env node
/*
  Verifies local readiness of the PR without pushing anything.
  Checks for:
   - Required files exist and contain expected markers
   - Lint and typecheck pass

  Usage:
    npm run prepare-local-pr
*/

import fs from 'fs';
import { spawnSync } from 'child_process';

const requiredFiles = [
  '.github/drafts/feat-runtime-analytics.md',
  'docs/PR_BLOCKERS.md',
  'CHANGELOG_UNRELEASED.md',
  'docs/PR_CHECKLIST.md',
];

const markers = [
  {
    file: '.github/drafts/feat-runtime-analytics.md',
    includes: ['Status: BLOCKED', 'Task 2', 'Task 5'],
  },
  { file: 'docs/PR_BLOCKERS.md', includes: ['Status: BLOCKED', 'Task 2', 'Task 5'] },
  { file: 'CHANGELOG_UNRELEASED.md', includes: ['Unreleased', 'analyticsConfig'] },
];

function fail(msg) {
  console.error(`\n[prepare-local-pr] ${msg}`);
  process.exit(1);
}

function checkFiles() {
  console.log('[prepare-local-pr] Checking required files...');
  let missing = [];
  for (const p of requiredFiles) {
    if (!fs.existsSync(p)) missing.push(p);
  }
  if (missing.length) {
    fail(`Missing required files:\n- ${missing.join('\n- ')}`);
  }
}

function checkMarkers() {
  console.log('[prepare-local-pr] Validating file contents...');
  for (const { file, includes } of markers) {
    const content = fs.readFileSync(file, 'utf8');
    for (const needle of includes) {
      if (!content.includes(needle)) {
        fail(`File ${file} must include: ${needle}`);
      }
    }
  }
}

function run(cmd, args) {
  console.log(`[prepare-local-pr] Running: ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) fail(`${cmd} ${args.join(' ')} failed with code ${res.status}`);
}

function main() {
  checkFiles();
  checkMarkers();

  // Quality gates
  run('npm', ['run', '--silent', 'lint']);
  run('npm', ['run', '--silent', 'typecheck']);
  // docs lint is optional but recommended; don't fail if script missing
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (pkg.scripts && pkg.scripts['docs:lint']) {
    try {
      run('npm', ['run', '--silent', 'docs:lint']);
    } catch (e) {
      fail('docs:lint failed');
    }
  }

  console.log(
    '\n[prepare-local-pr] All checks passed. Ready to open or merge when blockers are resolved.',
  );
}

main();
