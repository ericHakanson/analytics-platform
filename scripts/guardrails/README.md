# Data-deletion guardrails — Guardrail E (CI / pre-commit tripwire)

Part of the Fort Island data-deletion guardrails. Policy of record:
[`DATA_PROTECTION.md`](../../DATA_PROTECTION.md) at the repo root. Initiative:
Linear **FOR-512**, this layer is **FOR-517** (hardened in **FOR-634**).

## Why this is a tripwire in analytics-platform

This repo is the Fort Island **Signals dashboard** — an Evidence publishing app
that connects to the `real_estate` database **as a read-only reader role** and
owns **no** migrations or DDL. Destructive SQL should therefore **never**
legitimately appear in a PR here. This guardrail is a **tripwire**: if a diff
ever introduces a destructive operation, that is almost certainly a mistake, and
the check fails the PR so a human looks before it merges.

## What this catches

`check_destructive_sql.py` scans the **added lines** of a diff for destructive
operations and **fails** unless the PR carries an authenticated GitHub **review
approval** from an allowlisted human, bound to the PR head SHA (FOR-634).

Detected:

- **SQL / DDL:** `DELETE FROM`, `TRUNCATE`, `DROP TABLE|DATABASE|SCHEMA|INDEX|VIEW|…`,
  destructive `ALTER TABLE … DROP COLUMN|CONSTRAINT` (covers down-migrations).
- **Dangerous shell:** `rm -rf` of data paths, `gcloud … delete`,
  `gcloud storage rm`, `gsutil rm`, `bq rm`, `dropdb`, git history rewrites
  (`git filter-branch`/`filter-repo`, `bfg`).

This is **defense-in-depth**, not the backstop. The real enforcement is DB
least-privilege (Guardrail C / FOR-515) — the dashboard's reader role can't
delete — and the runtime PreToolUse hook (Guardrail B / FOR-514). This stops
deletion *code* from merging.

## How a destructive PR gets approved

There is **no** free-text trailer anymore. The old
`DATA-DELETE-APPROVED: <human> <reason>` marker was PR-author-controlled text —
an author could type it and self-approve. It is **removed** (FOR-634).

A destructive PR is allowed **iff** an **allowlisted human** submits an
**APPROVED GitHub review** whose `commit_id` equals the **PR head SHA**:

- **Authenticated** — the reviewer's login is verified by GitHub, not typed by
  the author. GitHub forbids approving your own PR.
- **Bound to the diff** — the head-SHA check means a later push that adds a
  destructive op invalidates a prior approval; the reviewer must re-approve the
  new head. A later **Request changes / dismiss** by an allowlisted login on the
  same head revokes a prior approval (latest-review-per-reviewer wins, FOR-634).
- **Re-runs on review** — the check also runs on `pull_request_review`
  (submitted/edited/dismissed), so submitting the required Approve flips an
  already-red check green without a new push (FOR-634).
- **Allowlist** — the protected repo Actions **variable**
  `DATA_DELETE_TRUSTED_APPROVERS` (comma-separated logins; admin-only). If unset,
  it falls back to the trusted in-file default `ericHakanson` in
  [`.github/workflows/data-delete-guardrail.yml`](../../.github/workflows/data-delete-guardrail.yml).
  Operator step: set it under Settings → Secrets and variables → Actions →
  Variables. The list is no longer PR-editable: the gate runs on
  `pull_request_target` from the base branch, so a PR can't change the workflow,
  the scanner, or the allowlist that judges it (FOR-634 P1.3).

So a reviewer **Approves the PR** (GitHub → Files/Conversation → Review →
Approve) instead of pasting a trailer. Prefer soft-delete (`deleted_at`) over
hard delete — though in this read-only dashboard repo a destructive op should
not arise in the first place.

> **Self-approval caveat:** GitHub blocks approving your own PR, so a destructive
> PR authored by the *sole* allowlisted human can't be self-cleared — it needs a
> second allowlisted approver, or a documented break-glass (see
> [`DATA_PROTECTION.md`](../../DATA_PROTECTION.md)).

False positive on a genuine **non-data** line (a keyword in a comment/fixture)?
Append the token `data-delete-allow` to that line and it will be skipped. Never
use it for real DDL/DML.

## Local hook (commit time)

Enable once per clone:

```sh
git config core.hooksPath .githooks
```

The `commit-msg` hook then scans your staged diff and **blocks the commit** if
it finds a destructive op. There is no local override (a GitHub review can't
exist at commit time) — approval happens at **PR review time** in CI, where an
allowlisted human Approves the PR. For a genuine non-data false positive, append
`data-delete-allow` to that line. Requires `python3` on PATH; if absent it
no-ops and CI still enforces.

> This repo doesn't ship a `.githooks/` directory by default (the local hook is
> optional); the CI workflow is the enforced layer. To wire the local hook,
> drop a `commit-msg` script that invokes
> `python3 scripts/guardrails/check_destructive_sql.py --staged --message-file "$1"`
> into `.githooks/` and run the `git config` above.

## CI

`.github/workflows/data-delete-guardrail.yml`:

- **selftest** job — runs `--selftest` on every trigger (proves the scanner works).
- **scan-diff** job — on PRs, queries the PR's reviews via `gh api`
  (`repos/.../pulls/<n>/reviews`, the default `GITHUB_TOKEN`, `pull-requests:
  read`), computes the boolean "an allowlisted login has an `APPROVED` review
  with `commit_id == head SHA`", and passes it to the scanner as
  `--approved-by-trusted-review`. All `uses:` actions are pinned to a full commit
  SHA and run with `persist-credentials: false`. The job runs on
  `pull_request_target` from the **base branch**, so the workflow, scanner, and
  allowlist that judge a PR are never the PR's own (untrusted) versions.

> The existing `ci.yml` (validate-refresh) is untouched — this guardrail is a
> separate, additional workflow.

## Test it

```sh
python3 scripts/guardrails/check_destructive_sql.py --selftest
```

The self-test is the committed fixture test. It covers the FOR-634 approval
matrix — destructive + no approval → FAIL; destructive + trusted-review → ALLOWED;
destructive + `data-delete-allow` on the line → ALLOWED; clean diff → PASS — plus
the shell patterns, the comment-bypass / false-positive cases, and that the
guardrail's own source isn't flagged. The review-API lookup itself can only be
fully exercised in CI; the scanner's flag handling is unit-tested here.
