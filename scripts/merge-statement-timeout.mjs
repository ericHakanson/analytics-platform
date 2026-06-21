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
 * This script ENFORCES the effective `statement_timeout` to be EXACTLY the
 * required bound (the `<timeoutMs>` arg), regardless of any pre-existing value:
 *   (a) no `options` key            -> set it to `-c statement_timeout=<ms>`
 *   (b) existing `options`, no timeout -> append `-c statement_timeout=<ms>`
 *   (c) existing `statement_timeout` (ANY value, incl. `0` = DISABLED/unbounded
 *       in PostgreSQL, or an excessive value) -> STRIP it and set `<ms>`.
 *       All other tokens (e.g. `-c application_name=evidence`) are preserved.
 *
 * Why replace, not no-op-if-present: an existing `statement_timeout=0` disables
 * the bound entirely (libpq treats 0 as "no timeout"), and an excessive value
 * (e.g. 30000 > the 20-min-protecting bound) defeats the fail-fast goal. The
 * only predictable, single-source-of-truth behaviour is to force exactly <ms>.
 *
 * FAIL CLOSED: if the file can't be parsed as a flat YAML mapping, or `options`
 * is present but not a scalar string, we exit non-zero rather than run the
 * refresh with an unbounded connection. After writing we RE-PARSE and verify the
 * effective `statement_timeout` is a positive integer <= <ms>; otherwise we
 * exit non-zero. A failed run alerts; a silent unbounded run is exactly the
 * FOR-589 failure mode we're closing.
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

// Strip every `-c statement_timeout=<x>` token (in either the `-c key=value`
// or `-cstatement_timeout=value` libpq spelling) from an existing options
// string, preserving all OTHER tokens (e.g. `-c application_name=evidence`).
// Returns the remaining options string (may be empty), with whitespace tidied.
function stripStatementTimeout(optionsStr) {
  return optionsStr
    // `-c statement_timeout=...` (space between -c and the setting)
    .replace(/-c\s+statement_timeout=\S+/g, ' ')
    // `-cstatement_timeout=...` (no space — also valid libpq syntax)
    .replace(/-cstatement_timeout=\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const existing = doc.options;

let merged;
if (existing === undefined || existing === null || existing === '') {
  // (a) no existing options
  merged = timeoutFlag;
} else if (typeof existing === 'string') {
  // (b)/(c) ENFORCE exactly the required bound: drop any pre-existing
  // statement_timeout token(s) — including `=0` (disabled) or an excessive
  // value — then set our own. Other tokens are preserved.
  const rest = stripStatementTimeout(existing);
  merged = rest === '' ? timeoutFlag : `${rest} ${timeoutFlag}`;
  if (/statement_timeout=/.test(existing)) {
    console.log(
      `✓ replaced pre-existing statement_timeout in connection options ` +
        `(was ${JSON.stringify(existing)}) -> enforcing ${timeoutMs}ms`
    );
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

// Re-read + verify the EFFECTIVE bound is present, a positive integer, and
// <= the required bound. This is the "guarantee" the workflow comment promises:
// if for any reason the merge didn't land (or left an `=0`/excessive value),
// fail the step instead of proceeding unbounded.
const verify = parse(readFileSync(connFile, 'utf8'));
if (!verify || typeof verify.options !== 'string') {
  die('post-write verification failed: `options` is not a string in the written file — fail closed.');
}
const match = verify.options.match(/statement_timeout=(\d+)/);
if (!match) {
  die('post-write verification failed: statement_timeout is not present in the written options — fail closed.');
}
// There must be exactly one statement_timeout token after enforcement.
const occurrences = (verify.options.match(/statement_timeout=/g) || []).length;
if (occurrences !== 1) {
  die(
    `post-write verification failed: expected exactly one statement_timeout token, found ${occurrences} ` +
      `in ${JSON.stringify(verify.options)} — fail closed.`
  );
}
const effective = Number.parseInt(match[1], 10);
if (!Number.isInteger(effective) || effective <= 0 || effective > timeoutMs) {
  die(
    `post-write verification failed: effective statement_timeout is ${match[1]} ` +
      `(must be a positive integer <= ${timeoutMs}) — fail closed.`
  );
}

console.log(`✓ connection options bound with statement_timeout: options=${JSON.stringify(verify.options)}`);
