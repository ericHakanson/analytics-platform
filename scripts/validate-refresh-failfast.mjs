import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * FOR-591 — guard the daily-refresh fail-fast + alert invariants.
 *
 * The nightly `daily-refresh` workflow must fail FAST and LOUD on a broken
 * build instead of hanging silently. During FOR-589 a source-query error
 * (`permission denied for table properties`) made `evidence sources` hang to
 * the job's 20-min `timeout-minutes`; a timeout-kill concludes `cancelled`,
 * NOT `failed`, so the `if: failure()` alert step never fired and the
 * dashboard silently stopped updating for ~2 days with zero alerts.
 *
 * This validator statically asserts the three guards that prevent a
 * regression — it is the repo's `scripts/validate-*.mjs` analog of a unit
 * test (there is no Vitest/Jest harness here). Run via `npm run validate:refresh`.
 *
 *   1. The sources step uses `sources:strict` so a source-query error exits
 *      the step non-zero (does not swallow + continue with a stale manifest).
 *   2. The written connection options carry a bounded `statement_timeout` so a
 *      runaway/hanging query fails in seconds, not at the job timeout.
 *   3. The Linear alert step fires on `cancelled()` too — so even a genuine
 *      job-level timeout-kill (which concludes `cancelled`) still notifies.
 */

const repoRoot = process.cwd();
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'daily-refresh.yml');

function fail(message, errors) {
  errors.push(message);
}

function main() {
  const errors = [];

  if (!existsSync(workflowPath)) {
    console.error(`✗ daily-refresh workflow not found at ${path.relative(repoRoot, workflowPath)}`);
    process.exit(1);
  }

  const workflow = readFileSync(workflowPath, 'utf8');

  // 1. Fail-fast on source-query errors: strict sources, not the swallowing variant.
  if (!/run:\s*npm run sources:strict/.test(workflow)) {
    fail(
      'sources step must run `npm run sources:strict` so a source-query error exits non-zero ' +
        '(a plain `npm run sources` swallows the error and continues with a stale manifest, ' +
        'leading to the FOR-589 hang-to-timeout).',
      errors
    );
  }
  // Belt-and-suspenders: the non-strict invocation must not be the one wired into the step.
  if (/run:\s*npm run sources(?!:strict)\b/.test(workflow)) {
    fail(
      'sources step still invokes the non-strict `npm run sources` — use `npm run sources:strict`.',
      errors
    );
  }

  // 2. Bounded statement_timeout written into the connection options.
  if (!/statement_timeout=\d+/.test(workflow)) {
    fail(
      'connection options must set a bounded `statement_timeout` (libpq `-c statement_timeout=<ms>`) ' +
        'so a runaway/hanging source query fails in seconds rather than running to the job timeout.',
      errors
    );
  }

  // 3. Alert on cancelled() too, so a timeout-kill (concludes `cancelled`) still notifies.
  const alertGuard = workflow.match(/if:\s*cancelled\(\)\s*\|\|\s*failure\(\)/);
  if (!alertGuard) {
    fail(
      'the Linear alert step must gate on `if: cancelled() || failure()` — a `failure()`-only gate ' +
        'silently skips the alert when the job is killed by `timeout-minutes` (concludes `cancelled`).',
      errors
    );
  }

  if (errors.length > 0) {
    console.error('✗ daily-refresh fail-fast invariants violated:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log('✓ daily-refresh fail-fast + alert invariants hold (sources:strict, statement_timeout, cancelled()||failure()).');
}

main();
