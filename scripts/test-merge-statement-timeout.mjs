import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { parse } from 'yaml';

/**
 * FOR-591 — executable tests for scripts/merge-statement-timeout.mjs.
 *
 * Codex round 2: the *static* validator (validate-refresh-failfast.mjs) checks
 * for the presence of merge/fail-closed code but could not catch P2.1 — that an
 * existing `statement_timeout=0` (PostgreSQL = disabled) or an excessive value
 * was accepted as-is. These tests exercise the script against real fixtures and
 * assert the EFFECTIVE bound, so a regression fails CI instead of slipping past
 * a pattern match. Run via `npm run test:merge-timeout`.
 *
 * No test framework is installed in this repo; we use node:assert + temp files.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, 'merge-statement-timeout.mjs');
const BOUND = 15000;

const workDir = mkdtempSync(path.join(tmpdir(), 'merge-timeout-test-'));
let passed = 0;

function runMerge(connContents) {
  const connFile = path.join(
    workDir,
    `conn-${Math.random().toString(36).slice(2)}.options.yaml`
  );
  writeFileSync(connFile, connContents, 'utf8');
  let result;
  try {
    const stdout = execFileSync('node', [scriptPath, connFile, String(BOUND)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    result = { code: 0, stdout, file: readFileSync(connFile, 'utf8') };
  } catch (err) {
    result = {
      code: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
      // file may still exist (write may have happened before a verify failure)
      file: safeRead(connFile),
    };
  }
  return result;
}

function safeRead(p) {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function effectiveTimeout(fileContents) {
  const doc = parse(fileContents);
  assert.ok(doc && typeof doc.options === 'string', 'options must be a string');
  const matches = [...doc.options.matchAll(/statement_timeout=(\d+)/g)];
  assert.equal(matches.length, 1, `expected exactly one statement_timeout token, got ${matches.length} in ${JSON.stringify(doc.options)}`);
  return { value: Number.parseInt(matches[1] ? matches[1][1] : matches[0][1], 10), options: doc.options };
}

function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('merge-statement-timeout enforcement tests:');

// 1. no options -> 15000 added
test('no options -> statement_timeout=15000', () => {
  const r = runMerge('host: db\nport: 5432\n');
  assert.equal(r.code, 0, `expected success, got code ${r.code}: ${r.stderr ?? ''}`);
  const { value } = effectiveTimeout(r.file);
  assert.equal(value, BOUND);
});

// 2. existing unrelated options -> 15000 added, others kept
test('unrelated options preserved + 15000 added', () => {
  const r = runMerge("options: '-c application_name=evidence'\n");
  assert.equal(r.code, 0, `expected success, got code ${r.code}: ${r.stderr ?? ''}`);
  const { value, options } = effectiveTimeout(r.file);
  assert.equal(value, BOUND);
  assert.match(options, /-c application_name=evidence/, 'unrelated token must be preserved');
});

// 3. existing statement_timeout=0 (disabled) -> replaced with 15000
test('statement_timeout=0 (disabled) -> replaced with 15000', () => {
  const r = runMerge("options: '-c statement_timeout=0'\n");
  assert.equal(r.code, 0, `expected success, got code ${r.code}: ${r.stderr ?? ''}`);
  const { value } = effectiveTimeout(r.file);
  assert.equal(value, BOUND, 'a disabled (0) timeout must be replaced, not accepted');
});

// 4. existing statement_timeout=30000 (excessive) -> replaced with 15000
test('statement_timeout=30000 (excessive) -> replaced with 15000', () => {
  const r = runMerge("options: '-c statement_timeout=30000'\n");
  assert.equal(r.code, 0, `expected success, got code ${r.code}: ${r.stderr ?? ''}`);
  const { value } = effectiveTimeout(r.file);
  assert.equal(value, BOUND, 'an excessive timeout must be replaced, not accepted');
});

// 5. existing statement_timeout=5000 -> replaced with exactly 15000 (single source of truth)
test('statement_timeout=5000 -> replaced with exactly 15000', () => {
  const r = runMerge("options: '-c statement_timeout=5000'\n");
  assert.equal(r.code, 0, `expected success, got code ${r.code}: ${r.stderr ?? ''}`);
  const { value } = effectiveTimeout(r.file);
  assert.equal(value, BOUND, 'we enforce exactly the bound regardless of pre-existing value');
});

// 5b. existing statement_timeout alongside an unrelated token -> replaced, other kept
test('statement_timeout=0 + application_name -> 15000, app_name kept', () => {
  const r = runMerge("options: '-c application_name=evidence -c statement_timeout=0'\n");
  assert.equal(r.code, 0, `expected success, got code ${r.code}: ${r.stderr ?? ''}`);
  const { value, options } = effectiveTimeout(r.file);
  assert.equal(value, BOUND);
  assert.match(options, /-c application_name=evidence/, 'unrelated token must survive the strip');
});

// 6. malformed / non-mapping -> fail closed (exit 1)
test('YAML sequence (non-mapping) -> fail closed (exit 1)', () => {
  const r = runMerge('- a\n- b\n');
  assert.equal(r.code, 1, 'a non-mapping document must fail closed');
});

test('options is a nested map (not a string) -> fail closed (exit 1)', () => {
  const r = runMerge('options:\n  nested: true\n');
  assert.equal(r.code, 1, 'a non-string options must fail closed');
});

test('unparseable YAML -> fail closed (exit 1)', () => {
  const r = runMerge('options: "unterminated\n  : : :\n');
  assert.equal(r.code, 1, 'unparseable YAML must fail closed');
});

// Cleanup
rmSync(workDir, { recursive: true, force: true });

console.log(`\n✓ all ${passed} merge-statement-timeout cases passed`);
