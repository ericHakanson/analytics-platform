import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

/**
 * FOR-591 — REAL `evidence sources --strict` regression test for the
 * Cloud SQL connection-options + statement_timeout fail-fast mechanism.
 *
 * Why this exists: the original FOR-591 guard (test-merge-statement-timeout.mjs)
 * only exercised the YAML merge with the same `yaml` npm package — it NEVER ran
 * `evidence sources --strict` against the produced file. So it could not catch
 * the regression that broke every nightly run for 9 days: the connection file
 * is base64-encoded end-to-end (Evidence base64-decodes every value via
 * decodeBase64Deep), so writing a *plaintext* `options:` value into it made the
 * strict source loader reject the file with
 *   ✖ Loading plugins & sources
 *   [ ! ] Error parsing connection.options.yaml file; .../google_cloud_postgresql
 * and exit 1 before any DB connect.
 *
 * This test actually runs `evidence sources --strict` against a LOCAL,
 * placeholder connection (host 127.0.0.1 — NEVER the real secret), built the
 * same way CI builds it, and asserts the run gets PAST "Loading plugins &
 * sources". A subsequent connect failure to the fake host is EXPECTED and
 * proves the parse/load step passed (a real DB is not needed). It runs both the
 * fix's env-override path AND, as a negative control, the broken plaintext-file
 * path (which must still be rejected at load) so the failure mode stays pinned.
 *
 * No test framework is installed in this repo; we use node:assert + a child
 * process. No real secret/credentials appear in any fixture or log.
 *
 * Run via `npm run test:strict-options` (wired into CI).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'sources', 'google_cloud_postgresql');
const connFile = path.join(sourceDir, 'connection.options.yaml');
const backupFile = connFile + '.test-backup';

const TIMEOUT_FLAG = '-c statement_timeout=15000';

// LOCAL placeholder ONLY — base64-encoded the way Evidence's loader expects
// (decodeBase64Deep base64-decodes every value). Never the real secret.
function b64(s) {
  return Buffer.from(s, 'utf8').toString('base64');
}
const PLACEHOLDER_LINES = [
  `host: ${b64('127.0.0.1')}`,
  'port: 5432',
  `database: ${b64('placeholder_db')}`,
  `user: ${b64('placeholder_user')}`,
  `password: ${b64('placeholder_pw')}`,
  'ssl:',
  '  rejectUnauthorized: false',
  '',
].join('\n');

/**
 * Run `evidence sources --strict` and capture combined stdout/stderr. A hard
 * timeout guards against any hang (the connect to a dead 127.0.0.1:5432 fails
 * fast with ECONNREFUSED, so this is belt-and-suspenders).
 * @param {Record<string,string>} extraEnv
 * @returns {Promise<{ out: string }>}
 */
function runStrictSources(extraEnv) {
  return new Promise((resolve) => {
    const child = spawn('npx', ['evidence', 'sources', '--strict'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        EVIDENCE_VAR__contract_root: './data/contracts/csv',
        PUBLISHING_DATA_MODE: 'sample',
        ...extraEnv,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (out += d.toString()));
    const killer = setTimeout(() => child.kill('SIGKILL'), 120000);
    child.on('exit', () => {
      clearTimeout(killer);
      resolve({ out });
    });
  });
}

const LOAD_OK = /✔ Loading plugins & sources/;
const LOAD_FAIL = /✖ Loading plugins & sources/;
const PARSE_ERR = /Error parsing connection\.options\.yaml file/;
// Getting to the connection test proves the parse/load phase passed.
const REACHED_CONNECT = /(\[Processing\] google_cloud_postgresql)|(Error connecting to datasource)|(ECONNREFUSED)/;

async function main() {
  // `connection.options.yaml` is gitignored (only connection.yaml is tracked),
  // so in a fresh CI checkout it does NOT exist. This test writes its own
  // placeholder, so a pre-existing file is not required. If a developer working
  // copy happens to have one, back it up and restore it; otherwise we created
  // the (gitignored) fixture and remove it on cleanup to leave the tree as-is.
  const connPreExisted = existsSync(connFile);
  if (connPreExisted) {
    copyFileSync(connFile, backupFile);
  }

  let passed = 0;
  try {
    console.log('evidence sources --strict connection-options tests:');

    // 1. THE FIX: secret file written verbatim (no options key) + statement_timeout
    //    supplied via the per-source env override. Must get PAST "Loading plugins".
    {
      writeFileSync(connFile, PLACEHOLDER_LINES, 'utf8');
      const { out } = await runStrictSources({
        EVIDENCE_SOURCE__google_cloud_postgresql__options: TIMEOUT_FLAG,
      });
      assert.match(out, LOAD_OK, `expected "✔ Loading plugins & sources"; got:\n${out}`);
      assert.doesNotMatch(out, PARSE_ERR, `must NOT hit the connection.options parse error:\n${out}`);
      assert.match(out, REACHED_CONNECT, `expected to reach the connection test (connect failure is fine):\n${out}`);
      passed += 1;
      console.log('  ✓ env-override statement_timeout: passes strict source loading (reaches connect)');
    }

    // 2. NEGATIVE CONTROL: writing a PLAINTEXT options value into the base64
    //    file (the broken FOR-591 mechanism) must STILL be rejected at load.
    //    This pins the failure mode so a future change can't silently reintroduce it.
    {
      writeFileSync(connFile, PLACEHOLDER_LINES + `options: '${TIMEOUT_FLAG}'\n`, 'utf8');
      const { out } = await runStrictSources({});
      assert.match(out, LOAD_FAIL, `a plaintext options value in the base64 file must fail loading; got:\n${out}`);
      assert.match(out, PARSE_ERR, `expected the connection.options parse error; got:\n${out}`);
      passed += 1;
      console.log('  ✓ plaintext options in base64 file: correctly rejected at strict source loading (regression pinned)');
    }

    console.log(`\n✓ all ${passed} strict-sources connection-options cases passed`);
  } finally {
    // Leave the working tree exactly as we found it. If a real file pre-existed,
    // restore it from the backup and remove the backup. Otherwise the file is the
    // gitignored fixture this test created — remove it (test-fixture cleanup of a
    // gitignored file, not a repo/data change).
    if (connPreExisted) {
      copyFileSync(backupFile, connFile);
      rmSync(backupFile, { force: true });
    } else {
      rmSync(connFile, { force: true });
    }
  }
}

main().catch((err) => {
  console.error('✗ strict-sources connection-options test failed:');
  console.error(err.message || err);
  process.exit(1);
});
