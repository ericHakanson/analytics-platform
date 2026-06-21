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
 *      runaway/hanging query fails in seconds, not at the job timeout. The
 *      workflow delegates this to `scripts/merge-statement-timeout.mjs`, which
 *      MERGES the bound into any pre-existing `options` value (a plain
 *      "add `options:` only when absent" guard is bypassed whenever the secret
 *      already carries an unrelated `options:` key) and fails closed otherwise.
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
  //
  // The bound must ALWAYS apply, even when the secret already carries an
  // `options:` key for an unrelated setting. The workflow delegates this to
  // `scripts/merge-statement-timeout.mjs`, which MERGES `-c statement_timeout`
  // into whatever `options` value exists and fails closed otherwise. Assert:
  //   (a) the workflow invokes the merge script with a positive timeout, and
  //   (b) the merge script exists and contains the merge + fail-closed logic.
  // (The old check looked for a literal `statement_timeout=15000` in the YAML;
  // that no longer holds now that the value is computed by the merge script, so
  // we verify the script that guarantees the bound instead.)
  const mergeInvocation = workflow.match(
    /node\s+scripts\/merge-statement-timeout\.mjs\s+"\$CONN_FILE"\s+(\d+)/
  );
  if (!mergeInvocation) {
    fail(
      'the connection-write step must invoke `node scripts/merge-statement-timeout.mjs "$CONN_FILE" <ms>` ' +
        'so the bound is MERGED into any existing `options` value (a plain "add options: only when absent" ' +
        'guard is bypassed whenever the secret already carries an unrelated `options:` key).',
      errors
    );
  } else if (!(Number.parseInt(mergeInvocation[1], 10) > 0)) {
    fail(
      `merge-statement-timeout is invoked with a non-positive timeout (${mergeInvocation[1]}); ` +
        'pass a positive millisecond bound (e.g. 15000).',
      errors
    );
  }

  const mergeScriptPath = path.join(repoRoot, 'scripts', 'merge-statement-timeout.mjs');
  if (!existsSync(mergeScriptPath)) {
    fail(
      'scripts/merge-statement-timeout.mjs is missing — it is what guarantees the statement_timeout bound ' +
        'is merged into the written connection options.',
      errors
    );
  } else {
    const mergeScript = readFileSync(mergeScriptPath, 'utf8');
    // The script must actually emit a libpq statement_timeout flag...
    if (!/statement_timeout=/.test(mergeScript)) {
      fail(
        'scripts/merge-statement-timeout.mjs must build a `-c statement_timeout=<ms>` libpq flag.',
        errors
      );
    }
    // ...append to (merge with) an existing options value rather than only set-when-absent...
    if (!/existing/.test(mergeScript) || !/timeoutFlag/.test(mergeScript)) {
      fail(
        'scripts/merge-statement-timeout.mjs must MERGE the timeout into any existing `options` value ' +
          '(not just set it when absent).',
        errors
      );
    }
    // ...and fail closed (process.exit(1) / die) on an unexpected format.
    if (!/process\.exit\(1\)/.test(mergeScript)) {
      fail(
        'scripts/merge-statement-timeout.mjs must fail closed (exit non-zero) on an unexpected connection ' +
          'format rather than silently running with an unbounded connection.',
        errors
      );
    }
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
