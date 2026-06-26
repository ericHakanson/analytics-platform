# Local hook install — commit-time destructive-SQL block

Linear **FOR-517** (epic FOR-512, hardened FOR-634). Policy of record:
[`DATA_PROTECTION.md`](../../DATA_PROTECTION.md).

This repo ports the **content-scanning** half of the data-deletion guardrail:
the CI tripwire (`.github/workflows/data-delete-guardrail.yml`) plus the
repo-agnostic scanner (`check_destructive_sql.py`). The CI workflow is the
**enforced** layer. This file describes the optional **local `commit-msg` hook**
that runs the same scanner at commit time so a destructive diff is caught before
it ever leaves your machine.

> The runtime Claude Code **PreToolUse** hook (Guardrail B / FOR-514,
> `pretooluse_block_destructive.py`) is a *separate* layer and is **not** part of
> this port — it lives in the operations repo and is installed user-globally
> there. **Eric installs harness hooks — an agent must not edit `settings.json`
> itself.**

## What the commit-msg hook blocks

It runs `check_destructive_sql.py --staged` over your staged diff and **blocks
the commit** if it finds any destructive operation:

- **SQL / DDL:** `DELETE FROM`, `TRUNCATE`, `DROP TABLE|DATABASE|SCHEMA|INDEX|VIEW|…`,
  destructive `ALTER TABLE … DROP COLUMN|CONSTRAINT`.
- **Dangerous shell:** `rm -rf` (recursive+force), `gcloud … delete`,
  `gcloud storage rm`, `gsutil rm`, `bq rm`, `dropdb`, git history rewrites
  (`git filter-branch`/`filter-repo`, `bfg`).

In this **read-only Signals dashboard** repo none of those should ever appear,
so the hook is a tripwire: a hit means a mistake. There is **no local override**
(a GitHub review can't exist at commit time) — approval for a genuinely needed
destructive change happens at **PR review time** in CI, where an allowlisted
human Approves the PR (see [`README.md`](./README.md) and
[`DATA_PROTECTION.md`](../../DATA_PROTECTION.md)). For a genuine non-data false
positive (a keyword in a comment/fixture), append `data-delete-allow` to that
line — never for real DDL/DML.

## Verify the scanner works first

```sh
python3 scripts/guardrails/check_destructive_sql.py --selftest
# → SELFTEST PASSED
```

## Install the local hook (optional; once per clone)

1. Create the hook script at `.githooks/commit-msg`:

```sh
mkdir -p .githooks
cat > .githooks/commit-msg <<'HOOK'
#!/usr/bin/env sh
# Block a commit whose staged diff adds destructive SQL / dangerous shell.
# No local override — approval happens at PR review time in CI. No-ops if
# python3 is absent (CI still enforces).
command -v python3 >/dev/null 2>&1 || exit 0
exec python3 "$(git rev-parse --show-toplevel)/scripts/guardrails/check_destructive_sql.py" \
  --staged --message-file "$1"
HOOK
chmod +x .githooks/commit-msg
```

2. Point git at the hooks directory:

```sh
git config core.hooksPath .githooks
```

Notes:
- The scanner takes `--message-file` for compatibility with the `commit-msg`
  hook contract; it is **not** scanned for an approval trailer (the free-text
  trailer is gone — approval is a GitHub review, FOR-634).
- Requires `python3` on PATH; if absent the hook no-ops and CI still enforces.
- The CI workflow (`data-delete-guardrail.yml`) is the authoritative gate; the
  local hook is a fast-feedback convenience only.
