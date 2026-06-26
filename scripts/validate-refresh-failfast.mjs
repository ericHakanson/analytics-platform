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
 *   2. The source connection carries a bounded `statement_timeout` so a
 *      runaway/hanging query fails in seconds, not at the job timeout. This is
 *      supplied via Evidence's per-source env override
 *      (`EVIDENCE_SOURCE__google_cloud_postgresql__options`), layered over the
 *      connection files at load time. It is deliberately NOT written into
 *      `connection.options.yaml`: that file is base64-encoded end-to-end, so a
 *      plaintext `options:` value makes the strict loader reject it and breaks
 *      every run (the FOR-591 regression this validator now guards against).
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

  // 2. Bounded statement_timeout applied to the source connection.
  //
  // The bound is supplied via Evidence's per-source env override
  // (`EVIDENCE_SOURCE__<name>__options`), which Evidence layers OVER the
  // connection files at load time. This is deliberately NOT done by rewriting
  // `connection.options.yaml`: every value in that file is base64-encoded
  // (Evidence base64-decodes each value via decodeBase64Deep), so writing a
  // plaintext `options:` value into it makes the loader reject the file at
  // "Loading plugins & sources" and breaks EVERY run (the FOR-591 regression).
  // The env override never touches the secret file, so the secret's exact bytes
  // (and quoting) are preserved. Assert the override is set with a positive,
  // libpq-valid `statement_timeout` bound.
  const optionsOverride = workflow.match(
    /EVIDENCE_SOURCE__google_cloud_postgresql__options:\s*'([^']*)'/
  );
  if (!optionsOverride) {
    fail(
      'the refresh job must set `EVIDENCE_SOURCE__google_cloud_postgresql__options` (Evidence per-source ' +
        'env override) to bound statement_timeout WITHOUT rewriting the base64-encoded connection.options.yaml ' +
        '(rewriting it with a plaintext `options:` value breaks the strict source loader — the FOR-591 regression).',
      errors
    );
  } else {
    const timeoutMatch = optionsOverride[1].match(/statement_timeout=(\d+)/);
    if (!timeoutMatch) {
      fail(
        'the `EVIDENCE_SOURCE__google_cloud_postgresql__options` override must include a ' +
          '`-c statement_timeout=<ms>` libpq flag so a runaway query fails fast.',
        errors
      );
    } else if (!(Number.parseInt(timeoutMatch[1], 10) > 0)) {
      fail(
        `the statement_timeout in the options override is non-positive (${timeoutMatch[1]}); ` +
          'a 0 value DISABLES the timeout in PostgreSQL — use a positive millisecond bound (e.g. 15000).',
        errors
      );
    }
  }

  // The connection-write step must write the secret VERBATIM and must NOT parse,
  // merge, or re-serialize the base64-encoded options file (which is what broke
  // the strict loader). Guard against a regression that reintroduces a rewrite.
  if (/merge-statement-timeout/.test(workflow)) {
    fail(
      'the daily-refresh workflow must NOT invoke a script that rewrites connection.options.yaml ' +
        '(e.g. merge-statement-timeout) — that re-serialized the base64-encoded secret file and broke ' +
        'the strict source loader. Supply statement_timeout via the EVIDENCE_SOURCE__ env override instead.',
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
