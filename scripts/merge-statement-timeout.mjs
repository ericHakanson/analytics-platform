import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';

/**
 * FOR-591 — always bind a server-side statement_timeout on the daily-refresh
 * Cloud SQL connection, MERGING it into any pre-existing libpq `options` value.
 *
 * The connection file (`sources/google_cloud_postgresql/connection.options.yaml`)
 * is written from the EVIDENCE_CONNECTION_OPTIONS_YAML secret at CI time. The
 * `@evidence-dev/postgres` connector forwards the `options` field straight to
 * libpq as extra `-c key=value` server settings.
 *
 * A naive "only add `options:` when the key is absent" guard is BYPASSED the
 * moment the secret already carries an `options:` key for ANY unrelated setting
 * (e.g. `-c application_name=evidence`): the timeout would then never be set and
 * a runaway query could hang `evidence sources` to the job's 20-min timeout
 * (which concludes `cancelled`, not `failed`, silently skipping the alert).
 *
 * This script makes the bound ALWAYS apply:
 *   (a) no `options` key            -> set it to `-c statement_timeout=<ms>`
 *   (b) existing `options` value    -> append `-c statement_timeout=<ms>` to it
 *   (c) timeout already present      -> no-op (idempotent; not double-added)
 *
 * FAIL CLOSED: if the file can't be parsed as a flat YAML mapping, or `options`
 * is present but not a scalar string, we exit non-zero rather than run the
 * refresh with an unbounded connection. A failed run alerts; a silent
 * unbounded run is exactly the FOR-589 failure mode we're closing.
 *
 * Usage: node scripts/merge-statement-timeout.mjs <connFile> <timeoutMs>
 */

function die(message) {
  console.error(`✗ merge-statement-timeout: ${message}`);
  process.exit(1);
}

const [, , connFile, timeoutMsRaw] = process.argv;

if (!connFile) {
  die('missing <connFile> argument');
}
const timeoutMs = Number.parseInt(timeoutMsRaw ?? '', 10);
if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
  die(`invalid <timeoutMs> argument: ${JSON.stringify(timeoutMsRaw)} (expected a positive integer)`);
}

if (!existsSync(connFile)) {
  die(`connection file not found: ${connFile}`);
}

const raw = readFileSync(connFile, 'utf8');

// An empty/whitespace-only file means the secret wasn't populated — treat the
// mapping as empty and set `options` fresh (case (a)).
let doc;
try {
  doc = raw.trim() === '' ? {} : parse(raw);
} catch (err) {
  die(`could not parse ${connFile} as YAML (fail closed rather than run unbounded): ${err.message}`);
}

// Must be a flat object mapping (e.g. `options: '...'`, `application_name: ...`).
if (doc === null || doc === undefined) {
  doc = {};
}
if (typeof doc !== 'object' || Array.isArray(doc)) {
  die(
    `${connFile} did not parse to a YAML mapping (got ${Array.isArray(doc) ? 'a sequence' : typeof doc}); ` +
      'cannot safely merge statement_timeout — fail closed.'
  );
}

const timeoutFlag = `-c statement_timeout=${timeoutMs}`;
const existing = doc.options;

let merged;
if (existing === undefined || existing === null || existing === '') {
  // (a) no existing options
  merged = timeoutFlag;
} else if (typeof existing === 'string') {
  // (c) idempotent: a statement_timeout is already configured -> leave it.
  if (/(^|\s)-c\s+statement_timeout=/.test(existing) || /statement_timeout=/.test(existing)) {
    merged = existing;
    console.log(
      `✓ statement_timeout already present in connection options; leaving as-is: ${JSON.stringify(existing)}`
    );
  } else {
    // (b) append to whatever is there.
    merged = `${existing.trimEnd()} ${timeoutFlag}`;
  }
} else {
  // `options` present but not a scalar string (e.g. a nested map) — unexpected
  // format for libpq options; fail closed rather than guess.
  die(
    `${connFile} has an \`options\` key that is not a string (got ${typeof existing}); ` +
      'cannot safely merge statement_timeout — fail closed.'
  );
}

doc.options = merged;

writeFileSync(connFile, stringify(doc), 'utf8');

// Re-read + verify the bound is actually present in the written file. This is
// the "guarantee" the workflow comment promises: if for any reason the merge
// didn't land, fail the step instead of proceeding unbounded.
const verify = parse(readFileSync(connFile, 'utf8'));
if (!verify || typeof verify.options !== 'string' || !/statement_timeout=/.test(verify.options)) {
  die('post-write verification failed: statement_timeout is not present in the written options — fail closed.');
}

console.log(`✓ connection options bound with statement_timeout: options=${JSON.stringify(verify.options)}`);
