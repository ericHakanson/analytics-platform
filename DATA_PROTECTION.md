# DATA PROTECTION — ABSOLUTE RULE FOR ALL AGENTS

**No agent may ever delete data without express, per-action approval from a human (Eric).**

This binds **every** automated agent — Claude, Codex, Gemini, anything deployed through OpenClaw,
and agents that do not exist yet — in **every** database, **every** environment, **every**
application, for **every** record type. There is **no** exception for "small," "obviously safe,"
"test," "temporary," or "cleanup" deletions. Cutting/deploying code on Eric's behalf is fine.
**Destroying data is not — ever — without his explicit, specific approval.**

## This repo (analytics-platform) — why the guardrail is a tripwire, not a workhorse

This repository is the Fort Island **Signals dashboard** — an [Evidence](https://evidence.dev)
publishing app. It is the *publishing layer*, not the data acquisition system, not the database,
and not the marketing site. It connects to the `real_estate` database **as a read-only reader
role** (least-privilege; the role it authenticates as lacks `DELETE`/`TRUNCATE`/`DROP` rights),
and it owns **no** migrations or DDL. Data acquisition, schema, and migrations live in other Fort
Island repos.

Because of that, **destructive SQL should NEVER legitimately appear in this repo.** The
data-deletion guardrail here is therefore a **tripwire**: if a PR ever introduces `DELETE FROM`,
`TRUNCATE`, `DROP …`, a destructive `ALTER`, or a dangerous shell command, that is almost
certainly a mistake (or worse), and the guardrail fails the PR so a human looks before it merges.
The same absolute policy still applies — no agent deletes data without express human approval.

## What counts as "delete" (all prohibited without human approval)
- SQL `DELETE`, `TRUNCATE`, `DROP` (table / schema / database / index / column), destructive `ALTER`.
- Destructive or "down" migrations that drop or clear data.
- Mass or unscoped `UPDATE` / overwrite that destroys existing values.
- Deleting GCS objects or buckets, Secret Manager secrets or versions, Cloud SQL instances or databases.
- Deleting data/log/archive files on disk (`rm`, `rm -rf`), or `git` history rewrites that drop data.

## What is fine (normal work, no special approval)
- Writing/cutting code; creating new files; building Evidence pages, components, and queries;
  read-only `SELECT` against the reader role; additive content.
- **Soft delete is the default** anywhere data is touched: set a `deleted_at` / `is_deleted`
  marker — never remove rows.

## If a deletion is genuinely needed
1. **STOP.** Do not perform it.
2. Propose it to the human with: exact target (db / table / rows / objects), the exact
   statement or command, the blast radius (row/object counts), and the reason.
3. Proceed **only** after explicit, specific human approval ("yes, delete X"). Never on a
   general, blanket, or implied go-ahead.
4. Prefer reversible: soft-delete, or take a backup/export first.

## Enforcement — defense in depth (Linear **FOR-512**)
This document is the policy layer. Across Fort Island it is backed by:
- **DB least-privilege (the real backstop):** the roles agents/apps connect as lack
  `DELETE`/`TRUNCATE`/`DROP`; destructive rights are isolated to a human-only role. (FOR-515)
  In this repo specifically, the Signals dashboard authenticates to `real_estate` as a
  **read-only reader role**.
- **GCP IAM + deletion-protection:** agent service accounts cannot delete instances/buckets/
  secrets; deletion-protection on. (FOR-516)
- **Claude Code harness deny-rules + PreToolUse hook** blocking destructive commands. (FOR-514)
- **CI tripwire** that fails destructive diffs unless an allowlisted human submits an
  **authenticated GitHub Review → Approve**, bound to the PR head SHA. (FOR-517, hardened in
  FOR-634; ported into this repo as `.github/workflows/data-delete-guardrail.yml` +
  `scripts/guardrails/`.)

## Approving a destructive change (FOR-634)

A PR that adds destructive SQL/shell is cleared **only** by an authenticated
GitHub *review* approval — there is **no** free-text trailer (the old
`DATA-DELETE-APPROVED:` marker was PR-author-controlled text and is removed).

- A reviewer uses **GitHub → Review → Approve**. The check allows the PR iff an
  **allowlisted login** has an `APPROVED` review whose `commit_id` **equals the
  PR head SHA** and no allowlisted login's latest review on that head is
  `CHANGES_REQUESTED`/`DISMISSED`. GitHub forbids self-approval, the login is
  authenticated, the head-SHA binding means a later push that adds a destructive
  op invalidates any prior approval, and a later Request-changes/dismiss revokes
  it (latest-review-per-reviewer wins). The check re-runs on review events, so
  the Approve flips it green without a new push (FOR-634).
- The allowlist is the protected repo Actions **variable**
  `DATA_DELETE_TRUSTED_APPROVERS` (comma-separated logins; repo-admin-only),
  with a trusted in-file fallback (`ericHakanson`) in
  `.github/workflows/data-delete-guardrail.yml`. The gate runs from the **base
  branch** via `pull_request_target` and never executes PR-head code, so a PR
  can't edit the allowlist/scanner/workflow that judges it (FOR-634 P1.3).
  `CODEOWNERS` can additionally code-own those paths (enforced once branch
  protection's "Require review from Code Owners" is on — operator step).
- Because this repo owns no migrations, a destructive **down-migration** should
  not occur here at all; if one ever did, it would be approved the same way (the
  reviewer Approves the PR — no trailer).
- **Self-approval caveat:** because GitHub blocks approving your own PR, a
  destructive PR authored by the *sole* allowlisted human needs a **second
  allowlisted approver** or a documented **break-glass** (temporarily add a
  second login, or run the change by hand outside CI per the steps above).
- The per-line `data-delete-allow` token is **only** for a genuine non-data
  false positive (a keyword in a comment/fixture) — never for real DDL/DML.

**When in doubt, do not delete. Ask.**
