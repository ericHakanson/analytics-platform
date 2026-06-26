#!/usr/bin/env python3
"""Guardrail E — destructive-SQL / dangerous-command tripwire (Linear FOR-517).

Part of the Fort Island data-deletion guardrails (epic FOR-512). See
DATA_PROTECTION.md at the repo root for the policy of record.

What it does
------------
Scans the ADDED lines of a diff (staged changes, a commit range, or a diff fed
on stdin) for destructive SQL/DDL and dangerous shell. If it finds any, the
check FAILS unless the change is approved by an authenticated GitHub *review*
approval from an allowlisted human (computed by CI and passed in via
``--approved-by-trusted-review true``).

The old free-text ``DATA-DELETE-APPROVED: <human> <reason>`` trailer is GONE
(FOR-634): a PR author could type it themselves and self-approve a destructive
op. Approval now requires a GitHub Review → Approve by an allowlisted login,
bound to the PR head SHA — GitHub forbids self-approval and the login is
authenticated. CI does the review-API lookup; this scanner just consumes the
boolean. The per-line ``data-delete-allow`` token remains ONLY for genuine
non-data false positives (a keyword in a comment/fixture), never for real
DDL/DML.

This is a defense-in-depth layer, NOT the backstop. The real enforcement is
database least-privilege (Guardrail C / FOR-515) and the runtime PreToolUse
hook (Guardrail B / FOR-514). This catches deletion *code* before it merges.

No third-party dependencies — runs on any Python 3.8+ (dev macs + GH runners).

Usage
-----
    # staged changes (used by the commit-msg hook; no review signal locally, so
    # a destructive diff is blocked — approval happens at PR review time in CI)
    check_destructive_sql.py --staged --message-file <path>

    # a commit range (used by CI), with the authenticated review signal
    check_destructive_sql.py --base origin/main --head HEAD \
        --approved-by-trusted-review true

    # an arbitrary diff
    git diff | check_destructive_sql.py --diff-file -

    # built-in self-test (no git needed; used by CI + as the fixture test)
    check_destructive_sql.py --selftest

Exit codes: 0 = clean or approved; 2 = destructive change without approval;
3 = usage/runtime error.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Path-level scan exclusion — DELIBERATELY EMPTY (FOR-634 P1.3).
#
# Previously this blanket-excluded the guardrail's own paths (scripts/guardrails/,
# DATA_PROTECTION.md, .github/workflows/data-delete*) so the scanner would not
# flag its own source. That was a hole: a PR could hide real destructive SQL in
# any of those "trusted" paths and the scanner would skip it. We now scan EVERY
# path. The few legitimate keyword mentions in this script, the policy doc, and
# the workflow are suppressed line-by-line with the `data-delete-allow` token
# (see LINE_ALLOW_TOKEN) — which is precise and visible in review, unlike a
# blanket path skip. Kept as an (empty) tuple so the plumbing/tests still hold.
# ---------------------------------------------------------------------------
SKIP_PATH_SUBSTRINGS: tuple[str, ...] = ()

# A per-line escape hatch: an added line carrying this token is not scanned.
# Use sparingly, for documentation/fixtures that must mention the keywords.
LINE_ALLOW_TOKEN = "data-delete-allow"

# ---------------------------------------------------------------------------
# Destructive patterns. Each entry: (name, compiled-regex). Matched against the
# added line with surrounding whitespace normalized. Case-insensitive.
# ---------------------------------------------------------------------------
_SQL_PATTERNS = [
    ("DELETE FROM", re.compile(r"\bDELETE\s+FROM\b", re.IGNORECASE)),
    ("TRUNCATE", re.compile(r"\bTRUNCATE\b", re.IGNORECASE)),
    (
        "DROP <object>",
        re.compile(
            r"\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW|MATERIALIZED\s+VIEW|"
            r"SEQUENCE|TYPE|FUNCTION|TRIGGER|ROLE|COLUMN|CONSTRAINT)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "destructive ALTER (DROP COLUMN/CONSTRAINT)",
        re.compile(
            r"\bALTER\s+TABLE\b.*\bDROP\s+(COLUMN|CONSTRAINT)\b", re.IGNORECASE
        ),
    ),
]

_SHELL_PATTERNS = [
    ("gcloud ... delete", re.compile(r"\bgcloud\b[^\n]*\bdelete\b", re.IGNORECASE)),
    ("gcloud storage rm", re.compile(r"\bgcloud\s+storage\s+rm\b", re.IGNORECASE)),
    ("gsutil rm", re.compile(r"\bgsutil\s+(-\S+\s+)*rm\b", re.IGNORECASE)),
    ("bq rm", re.compile(r"\bbq\s+rm\b", re.IGNORECASE)),
    ("dropdb", re.compile(r"\bdropdb\b", re.IGNORECASE)),
    ("git history rewrite", re.compile(r"\bgit\s+filter-(branch|repo)\b", re.IGNORECASE)),
    ("git filter-repo / bfg", re.compile(r"\bbfg\b|\bfilter-repo\b", re.IGNORECASE)),
]

_RM_RE = re.compile(r"\brm\b\s+((?:--?[A-Za-z]+\s+)+)", re.IGNORECASE)


def _is_dangerous_rm(line: str) -> bool:
    """True for `rm` invocations whose flag cluster has both -r and -f.

    Catches `rm -rf`, `rm -fr`, `rm -r -f`, `rm --recursive --force`. Ignores
    benign `rm -i file` / `rm -f file` (single-file deletes, not mass wipes).
    """
    for m in _RM_RE.finditer(line):
        letters = re.sub(r"[-\s]", "", m.group(1)).lower()
        if "r" in letters and "f" in letters:
            return True
    return False


def line_violations(line: str) -> list[str]:
    """Return the names of every destructive pattern matched by `line`.

    Matched as a UNION over the raw text, a whitespace-canonicalized form,
    and a comment-stripped + canonicalized form (FOR-584: a SQL comment
    between keywords — "DELETE /*x*/ FROM" — defeated plain regex scanning).
    Extra variants can only ADD detections, never remove one. The stripper is
    string-literal-aware, so comment markers inside quoted literals stay
    literal and do not create new false positives. Unlike the runtime hook
    (whose input is a shell command), diff lines are code where a top-level
    quote IS the literal — so no quoted-region expansion happens here.
    """
    if LINE_ALLOW_TOKEN in line:
        return []
    candidates = [line, _canonical(line), _canonical(_scan_sql(line)[0])]
    hits = [name for name, rx in _SQL_PATTERNS if any(rx.search(c) for c in candidates)]
    hits += [name for name, rx in _SHELL_PATTERNS if any(rx.search(c) for c in candidates)]
    if any(_is_dangerous_rm(c) for c in candidates):
        hits.append("rm -rf")
    return hits


# ---------------------------------------------------------------------------
# Diff parsing
# ---------------------------------------------------------------------------
@dataclass
class Violation:
    path: str
    lineno: int  # line number within the diff text (for pointing the author at it)
    line: str
    patterns: list[str]


def _path_is_skipped(path: str) -> bool:
    p = path.lower()
    return any(s in p for s in SKIP_PATH_SUBSTRINGS)


def _canonical(text: str) -> str:
    """Collapse continuations + whitespace runs so split keywords rejoin."""
    text = text.replace("\\\n", " ")
    return re.sub(r"\s+", " ", text)


def _scan_sql(text: str) -> tuple[str, list[str]]:
    """Lex `text` SQL-style: strip comments, collect quoted-region contents.

    Returns (stripped, regions). FOR-584: a comment between keywords
    ("DELETE /*x*/ FROM") defeated plain regex scanning.

    stripped — `text` with SQL comments replaced by a single space. Line
      comments (-- … end-of-line) keep their trailing newline so line-aware
      callers still see line structure; block comments (/* … */) nest,
      PostgreSQL-style; an unterminated block comment runs to end-of-text
      (such SQL cannot execute, so nothing real is lost). Comment markers
      inside single- or double-quoted regions (with '' / "" doubling) are
      literal text and are NOT stripped.

    regions — the content of every top-level quoted region, in order, so
      callers can scan SQL that arrives inside a shell-quoted argument
      (psql -c 'DELETE …'). An unterminated region runs to end-of-text.
    """
    out: list[str] = []
    regions: list[str] = []
    region: list[str] = []
    i, n = 0, len(text)
    quote = ""  # active string delimiter ("" = none)
    depth = 0   # block-comment nesting depth
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if depth:
            if ch == "/" and nxt == "*":
                depth += 1
                i += 2
            elif ch == "*" and nxt == "/":
                depth -= 1
                i += 2
                if depth == 0:
                    out.append(" ")
            else:
                i += 1
            continue
        if quote:
            if ch == quote:
                if nxt == quote:  # doubled quote: literal, stay in string
                    out.append(ch + nxt)
                    region.append(ch + nxt)
                    i += 2
                    continue
                out.append(ch)  # closing delimiter
                regions.append("".join(region))
                region = []
                quote = ""
                i += 1
                continue
            out.append(ch)
            region.append(ch)
            i += 1
            continue
        if ch in ("'", '"'):
            quote = ch
            out.append(ch)
            i += 1
            continue
        if ch == "/" and nxt == "*":
            depth = 1
            i += 2
            continue
        if ch == "-" and nxt == "-":
            out.append(" ")
            j = text.find("\n", i)
            if j == -1:
                break
            i = j  # keep the newline
            continue
        out.append(ch)
        i += 1
    if quote and region:  # unterminated string: still scan what we saw
        regions.append("".join(region))
    return "".join(out), regions


def scan_diff(diff_text: str) -> list[Violation]:
    """Find destructive patterns in the ADDED lines of a unified diff.

    Two passes per run of consecutive added lines:
      1. each added line on its own (precise line numbers), and
      2. the lines JOINED + canonicalized — so a statement whose keywords are
         split across lines ("+DELETE" / "+FROM x", continuation backslashes)
         cannot slip through per-line scanning (Codex QA finding, FOR-517).
    """
    violations: list[Violation] = []
    current_path = ""
    skipped = False
    block: list[tuple[int, str]] = []  # consecutive added lines (lineno, text)

    def flush_block() -> None:
        if not block:
            return
        start, _ = block[0]
        # exclude per-line-allowed lines from the joined scan too
        scannable = [t for _, t in block if LINE_ALLOW_TOKEN not in t]
        # Join RAW (newlines intact): line_violations canonicalizes itself,
        # and the comment stripper must see real newlines first — otherwise
        # a "-- …" line comment would swallow the following lines (FOR-584).
        joined = "\n".join(scannable)
        block_hits = line_violations(joined)
        per_line_hits = {h for _, t in block for h in line_violations(t)}
        new_hits = [h for h in block_hits if h not in per_line_hits]
        if new_hits:
            snippet = _canonical(joined).strip()
            if len(snippet) > 160:
                snippet = snippet[:157] + "..."
            violations.append(
                Violation(current_path, start, f"[joined lines] {snippet}", new_hits)
            )
        block.clear()

    for i, raw in enumerate(diff_text.splitlines(), start=1):
        if raw.startswith("+++ "):
            flush_block()
            # "+++ b/path/to/file" — strip the b/ prefix; /dev/null means delete.
            target = raw[4:].strip()
            current_path = target[2:] if target.startswith("b/") else target
            skipped = _path_is_skipped(current_path)
            continue
        if raw.startswith("diff --git") or raw.startswith("--- "):
            flush_block()
            continue
        if raw.startswith("+") and not raw.startswith("+++"):
            if skipped:
                continue
            added = raw[1:]
            block.append((i, added))
            hits = line_violations(added)
            if hits:
                violations.append(Violation(current_path, i, added.strip(), hits))
            continue
        # context line, hunk header, or removed line ends the added-run
        flush_block()
    flush_block()
    return violations


# ---------------------------------------------------------------------------
# Diff gathering
# ---------------------------------------------------------------------------
def _git(args: list[str]) -> str:
    res = subprocess.run(
        ["git", *args], capture_output=True, text=True, check=False
    )
    if res.returncode != 0:
        sys.stderr.write(res.stderr)
        raise SystemExit(3)
    return res.stdout


def gather_diff(args: argparse.Namespace) -> str:
    if args.diff_file:
        if args.diff_file == "-":
            return sys.stdin.read()
        with open(args.diff_file, "r", encoding="utf-8", errors="replace") as fh:
            return fh.read()
    if args.base or args.head:
        base = args.base or "HEAD"
        head = args.head or "HEAD"
        # three-dot: changes on head since the merge-base with base.
        return _git(["diff", "--unified=0", f"{base}...{head}"])
    # default: staged changes
    return _git(["diff", "--cached", "--unified=0"])


# ---------------------------------------------------------------------------
# Authenticated-review evaluation (FOR-634 P1.2)
#
# Pure, side-effect-free logic so it is unit-testable WITHOUT live GitHub. CI
# fetches all reviews (paginated) and the head SHA, then calls
# evaluate_trusted_approval(...) below. Rules:
#   * A reviewer's EFFECTIVE decision is their latest review among the DECISIVE
#     states only (APPROVED / CHANGES_REQUESTED / DISMISSED), by submitted_at.
#     COMMENTED and PENDING reviews do NOT change a reviewer's standing decision
#     (GitHub semantics — FOR-634 round-2 P1.2): if A submits CHANGES_REQUESTED
#     then later a comment-only review, A's change-request is STILL active. So we
#     ignore non-decisive states when reducing.
#   * A later CHANGES_REQUESTED/DISMISSED by the same login revokes an earlier
#     APPROVED (it is the more recent decisive state).
#   * Only reviews whose commit_id == head SHA count (binds approval to the exact
#     reviewed diff; a later push that adds a destructive op drops the binding).
#   * Allowlist is case-insensitive logins.
#   * PASS iff some allowlisted approver's effective (head-SHA) decision is
#     APPROVED AND no allowlisted approver's effective (head-SHA) decision is
#     CHANGES_REQUESTED or DISMISSED.
# ---------------------------------------------------------------------------

# Review states that constitute a reviewer's standing decision. COMMENTED and
# PENDING are explicitly NOT decisive: a comment-only review leaves the
# reviewer's prior APPROVED / CHANGES_REQUESTED in force (GitHub semantics).
DECISIVE_STATES = ("APPROVED", "CHANGES_REQUESTED", "DISMISSED")
@dataclass(frozen=True)
class Review:
    """One GitHub PR review, reduced to the fields the gate needs."""

    login: str
    state: str          # APPROVED | CHANGES_REQUESTED | DISMISSED | COMMENTED | ...
    commit_id: str      # SHA the review was submitted against
    submitted_at: str   # ISO-8601; lexical sort == chronological for UTC 'Z'


def parse_approvers(raw: str) -> set[str]:
    """Comma/whitespace-separated logins → lowercased set (order-insensitive)."""
    return {tok for tok in re.split(r"[,\s]+", raw.lower()) if tok}


def latest_review_per_reviewer(reviews: list[Review]) -> dict[str, Review]:
    """Reduce to each reviewer's most recent DECISIVE review by submitted_at.

    Only APPROVED / CHANGES_REQUESTED / DISMISSED count toward a reviewer's
    standing decision; COMMENTED and PENDING are skipped (FOR-634 round-2 P1.2)
    so a later comment-only review does NOT erase an earlier change-request or
    approval. Reviews with an empty submitted_at sort first (oldest). Ties keep
    the last one seen in input order (GitHub returns reviews chronologically).
    """
    latest: dict[str, Review] = {}
    for r in sorted(reviews, key=lambda r: r.submitted_at or ""):
        login = r.login.lower()
        if not login:
            continue
        if r.state not in DECISIVE_STATES:
            continue  # COMMENTED/PENDING never change the standing decision
        latest[login] = r  # later submitted_at overwrites earlier
    return latest


def evaluate_trusted_approval(
    reviews: list[Review], head_sha: str, approvers: set[str]
) -> bool:
    """True iff an allowlisted login's LATEST review approves the head SHA and no
    allowlisted login's latest review requests changes / is dismissed.

    Only the reviewer's single latest review counts (so a later
    CHANGES_REQUESTED revokes an earlier APPROVED), and only when it targets the
    exact head SHA (so a new push invalidates a prior approval).
    """
    if not head_sha:
        return False
    latest = latest_review_per_reviewer(reviews)
    approved = False
    for login, review in latest.items():
        if login not in approvers:
            continue
        if review.commit_id != head_sha:
            # Their latest opinion is about a different (stale) diff — it neither
            # grants nor revokes approval of the current head.
            continue
        if review.state in ("CHANGES_REQUESTED", "DISMISSED"):
            return False  # an allowlisted human is actively blocking head
        if review.state == "APPROVED":
            approved = True
    return approved


def reviews_from_api_tsv(tsv: str) -> list[Review]:
    """Parse the `login\\tstate\\tcommit_id\\tsubmitted_at` TSV emitted by the CI
    `gh api --jq` step into Review records. Blank lines are ignored.
    """
    out: list[Review] = []
    for raw in tsv.splitlines():
        if not raw.strip():
            continue
        parts = raw.split("\t")
        while len(parts) < 4:
            parts.append("")
        login, state, commit_id, submitted_at = parts[:4]
        out.append(Review(login, state, commit_id, submitted_at))
    return out


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------
def report(violations: list[Violation], approved: bool) -> int:
    if not violations:
        print("✓ data-delete guardrail: no destructive SQL/commands in diff.")
        return 0
    sys.stderr.write(
        "\n✗ DATA-DELETE GUARDRAIL: destructive operation(s) detected in this change:\n\n"
    )
    for v in violations:
        loc = v.path or "(unknown file)"
        sys.stderr.write(f"  {loc}: {', '.join(v.patterns)}\n")
        sys.stderr.write(f"      + {v.line}\n")
    if approved:
        sys.stderr.write(
            "\n→ Authenticated trusted-review approval present (an allowlisted human\n"
            "  APPROVED this PR at its head SHA). Allowed.\n"
        )
        return 0
    sys.stderr.write(
        "\nThis change deletes or can destroy data. Per DATA_PROTECTION.md "
        "(FOR-512),\nan agent may NOT delete data without express human approval.\n\n"
        "This now requires an APPROVED review from an allowlisted human, bound to\n"
        "the PR head SHA (a free-text trailer no longer works). A reviewer must use\n"
        "GitHub Review → Approve; a later push that adds a destructive op\n"
        "invalidates a prior approval.\n\n"
        "Prefer soft-delete (deleted_at) over hard delete. If a line is a genuine\n"
        f"non-data false positive (a keyword in a comment/fixture), append the\n"
        f"token '{LINE_ALLOW_TOKEN}' to that line — never use it for real DDL/DML.\n"
    )
    return 2


# ---------------------------------------------------------------------------
# Self-test (doubles as the committed fixture test — no git/pytest needed)
# ---------------------------------------------------------------------------
_SELFTEST_DIFF_BAD = """diff --git a/sql/migrations/004_drop.sql b/sql/migrations/004_drop.sql
--- /dev/null
+++ b/sql/migrations/004_drop.sql
@@ -0,0 +1,2 @@
+-- clean up old table
+DROP TABLE recent_sales;
"""

_SELFTEST_DIFF_SHELL = """diff --git a/scripts/cleanup.sh b/scripts/cleanup.sh
--- /dev/null
+++ b/scripts/cleanup.sh
@@ -0,0 +1,3 @@
+rm -rf /data/exports
+gcloud sql instances delete recently-sold-postgres
+gsutil -m rm gs://bucket/data
"""

_SELFTEST_DIFF_CLEAN = """diff --git a/app/service.py b/app/service.py
--- /dev/null
+++ b/app/service.py
@@ -0,0 +1,2 @@
+def soft_delete(row):
+    row.deleted_at = now()
"""

# A real destructive keyword on a line carrying the per-line escape hatch. This
# token is ONLY for genuine non-data false positives (a keyword in a doc/fixture
# that happens to read like DDL); it must suppress detection on that line.
_SELFTEST_DIFF_ALLOW_TOKEN = """diff --git a/docs/examples.md b/docs/examples.md
--- /dev/null
+++ b/docs/examples.md
@@ -0,0 +1,1 @@
+Example only, not run: DROP TABLE recent_sales;  data-delete-allow
"""

# FOR-634 P1.3: guardrail paths are NO LONGER blanket-skipped — a PR could hide
# real destructive SQL in scripts/guardrails/ otherwise. A legitimate keyword in
# the guardrail's own source must instead carry the per-line `data-delete-allow`
# token (precise + visible in review). With the token: clean. Without it (next
# fixture): flagged even though the path is the guardrail itself.
_SELFTEST_DIFF_GUARDRAIL_PATH_ALLOWED = """diff --git a/scripts/guardrails/check_destructive_sql.py b/scripts/guardrails/check_destructive_sql.py
--- /dev/null
+++ b/scripts/guardrails/check_destructive_sql.py
@@ -0,0 +1,1 @@
+    ("DELETE FROM", re.compile(r"DELETE FROM"))  # data-delete-allow
"""

# Same guardrail path, but the destructive keyword has NO per-line token. Now
# that path-skipping is gone, this MUST be flagged — proving a PR cannot smuggle
# destructive SQL into an "excluded" guardrail path.
_SELFTEST_DIFF_GUARDRAIL_PATH_FLAGGED = """diff --git a/scripts/guardrails/check_destructive_sql.py b/scripts/guardrails/check_destructive_sql.py
--- /dev/null
+++ b/scripts/guardrails/check_destructive_sql.py
@@ -0,0 +1,1 @@
+    cursor.execute("DELETE FROM recent_sales")
"""

# Keywords split across consecutive added lines (Codex QA finding, FOR-517):
# per-line scanning sees "DELETE" and "FROM ..." separately and missed both.
_SELFTEST_DIFF_SPLIT = """diff --git a/sql/migrations/005_split.sql b/sql/migrations/005_split.sql
--- /dev/null
+++ b/sql/migrations/005_split.sql
@@ -0,0 +1,4 @@
+DELETE
+FROM listings WHERE id = 1;
+DROP
+TABLE recent_sales;
"""

# Split across lines but separated by a context line — two distinct added runs;
# neither run contains a full destructive statement, so this must stay clean.
_SELFTEST_DIFF_SPLIT_CLEAN = """diff --git a/app/notes.py b/app/notes.py
--- /dev/null
+++ b/app/notes.py
@@ -0,0 +1,3 @@
+mode = "delete"
 unchanged_context_line
+target = "from_legacy"
"""

# SQL comments between keywords (FOR-584, architect-reproduced bypass): block
# comments, comment-glued TRUNCATE, and nested comments must not hide a
# destructive statement from the scanner.
_SELFTEST_DIFF_COMMENT_BYPASS = """diff --git a/sql/migrations/006_bypass.sql b/sql/migrations/006_bypass.sql
--- /dev/null
+++ b/sql/migrations/006_bypass.sql
@@ -0,0 +1,4 @@
+DELETE /*x*/ FROM listings WHERE id = 1;
+DROP /*x*/ TABLE recent_sales;
+TRUNCATE/*x*/ listings;
+DELETE /* a /* b */ c */ FROM audit_log;
"""

# Line-comment interleaving across added lines: per-line scanning sees
# "DELETE -- …" and "FROM …" separately; only the joined scan — with comments
# stripped BEFORE whitespace canonicalization — rejoins the statement.
_SELFTEST_DIFF_COMMENT_SPLIT = """diff --git a/sql/migrations/007_interleave.sql b/sql/migrations/007_interleave.sql
--- /dev/null
+++ b/sql/migrations/007_interleave.sql
@@ -0,0 +1,2 @@
+DELETE -- step one
+FROM events;
"""

# FOR-584 negatives: comment markers inside string literals are literal text;
# soft-delete code with inline comments stays clean; an unterminated block
# comment swallowing the keywords leaves SQL no engine can execute. None of
# these may false-positive. (Last line stays last: its unterminated comment
# swallows the rest of the joined block by design.)
_SELFTEST_DIFF_COMMENT_CLEAN = """diff --git a/sql/seeds/008_notes.sql b/sql/seeds/008_notes.sql
--- /dev/null
+++ b/sql/seeds/008_notes.sql
@@ -0,0 +1,5 @@
+INSERT INTO audit (note) VALUES ('delete /* old */ from cache');
+UPDATE listings SET deleted_at = now() /* soft delete */ WHERE id = 1;
+-- we archive rows; nothing is removed by this seed
+SELECT 'deleted_at from audit';
+DELETE /* never terminated FROM nowhere
"""


def selftest() -> int:
    failures = []

    def check(name, cond):
        status = "ok" if cond else "FAIL"
        print(f"  [{status}] {name}")
        if not cond:
            failures.append(name)

    bad = scan_diff(_SELFTEST_DIFF_BAD)
    check("DROP TABLE is detected", any("DROP" in p for v in bad for p in v.patterns))
    check("destructive + no approval → FAIL", report(bad, approved=False) == 2)
    check(
        "destructive + trusted-review approval → ALLOWED",
        report(bad, approved=True) == 0,
    )

    shell = scan_diff(_SELFTEST_DIFF_SHELL)
    names = {p for v in shell for p in v.patterns}
    check("rm -rf detected", "rm -rf" in names)
    check("gcloud ... delete detected", "gcloud ... delete" in names)
    check("gsutil rm detected", "gsutil rm" in names)

    clean = scan_diff(_SELFTEST_DIFF_CLEAN)
    check("soft-delete code is clean", clean == [])

    check(
        "guardrail path WITH data-delete-allow token is clean",
        scan_diff(_SELFTEST_DIFF_GUARDRAIL_PATH_ALLOWED) == [],
    )
    check(
        "guardrail path WITHOUT token is still flagged (no blanket path skip)",
        any(
            "DELETE FROM" in v.patterns
            for v in scan_diff(_SELFTEST_DIFF_GUARDRAIL_PATH_FLAGGED)
        ),
    )

    split = scan_diff(_SELFTEST_DIFF_SPLIT)
    split_names = {p for v in split for p in v.patterns}
    check("split-line DELETE/FROM caught via joined scan", "DELETE FROM" in split_names)
    check("split-line DROP/TABLE caught via joined scan", any("DROP" in n for n in split_names))
    check("split tokens in separate added runs stay clean", scan_diff(_SELFTEST_DIFF_SPLIT_CLEAN) == [])

    bypass = scan_diff(_SELFTEST_DIFF_COMMENT_BYPASS)
    bypass_names = {p for v in bypass for p in v.patterns}
    check("block-comment DELETE/FROM caught", "DELETE FROM" in bypass_names)
    check("block-comment DROP/TABLE caught", any("DROP" in n for n in bypass_names))
    check("comment-glued TRUNCATE caught", "TRUNCATE" in bypass_names)
    check(
        "nested block comment DELETE/FROM caught (own violation)",
        sum(1 for v in bypass if "DELETE FROM" in v.patterns) >= 2,
    )
    interleaved = scan_diff(_SELFTEST_DIFF_COMMENT_SPLIT)
    check(
        "line-comment-interleaved DELETE/FROM caught via joined scan",
        "DELETE FROM" in {p for v in interleaved for p in v.patterns},
    )
    check(
        "comment markers inside literals / soft-delete comments stay clean",
        scan_diff(_SELFTEST_DIFF_COMMENT_CLEAN) == [],
    )

    # Approval matrix (FOR-634): the free-text trailer is gone — approval is the
    # authenticated `approved` boolean computed by CI from a GitHub review.
    check(
        "destructive + data-delete-allow on the line → ALLOWED",
        scan_diff(_SELFTEST_DIFF_ALLOW_TOKEN) == [],
    )
    check(
        "clean diff → PASS regardless of approval flag",
        report(scan_diff(_SELFTEST_DIFF_CLEAN), approved=False) == 0,
    )
    check(
        "DATA-DELETE-APPROVED trailer path is gone (free text never approves)",
        "has_approval" not in globals() and "APPROVAL_RE" not in globals(),
    )
    check("benign 'rm -f file' not flagged", not _is_dangerous_rm("rm -f /tmp/x"))
    check("'rm -r -f' flagged", _is_dangerous_rm("rm -r -f /data"))

    # -------------------------------------------------------------------------
    # Approval LIFECYCLE against the factored review-eval logic (FOR-634 closing
    # note). Proves the gate exercises the destructive-change approval lifecycle
    # — not just that the scanner detects DDL. No live GitHub needed.
    # -------------------------------------------------------------------------
    HEAD = "headsha111"
    STALE = "oldsha000"
    APPROVERS = parse_approvers("ericHakanson, secondReviewer")

    def gate(reviews):
        # destructive diff is fixed; the gate's verdict is the whole story.
        return report(bad, approved=evaluate_trusted_approval(reviews, HEAD, APPROVERS))

    # 1) destructive diff + NO approval → FAIL
    check("lifecycle: destructive + no reviews → FAIL", gate([]) == 2)

    # 2) + latest approval by an allowlisted login on head SHA → PASS
    approved_head = [Review("ericHakanson", "APPROVED", HEAD, "2026-06-19T10:00:00Z")]
    check("lifecycle: allowlisted APPROVED on head → PASS", gate(approved_head) == 0)

    # 3) + a LATER CHANGES_REQUESTED by that login on the same SHA → FAIL
    approved_then_blocked = [
        Review("ericHakanson", "APPROVED", HEAD, "2026-06-19T10:00:00Z"),
        Review("ericHakanson", "CHANGES_REQUESTED", HEAD, "2026-06-19T11:00:00Z"),
    ]
    check(
        "lifecycle: later CHANGES_REQUESTED on same SHA revokes APPROVED → FAIL",
        gate(approved_then_blocked) == 2,
    )

    # 3b) order independence: even if the API returns them out of order, the
    # latest-by-submitted_at reduction still revokes.
    blocked_then_approved_input_order = [
        Review("ericHakanson", "CHANGES_REQUESTED", HEAD, "2026-06-19T11:00:00Z"),
        Review("ericHakanson", "APPROVED", HEAD, "2026-06-19T10:00:00Z"),
    ]
    check(
        "lifecycle: latest-wins is submitted_at-based, not input order → FAIL",
        gate(blocked_then_approved_input_order) == 2,
    )

    # 4) + approval by a NON-allowlisted login → FAIL
    outsider_approved = [Review("randomDev", "APPROVED", HEAD, "2026-06-19T10:00:00Z")]
    check("lifecycle: non-allowlisted APPROVED → FAIL", gate(outsider_approved) == 2)

    # 5) + approval on a STALE (non-head) SHA → FAIL
    approved_stale = [Review("ericHakanson", "APPROVED", STALE, "2026-06-19T10:00:00Z")]
    check("lifecycle: APPROVED on stale (non-head) SHA → FAIL", gate(approved_stale) == 2)

    # Extra: a DISMISSED latest review on head also revokes; and a second
    # allowlisted approver's fresh APPROVED on head does NOT override another
    # allowlisted human who is actively requesting changes on head.
    dismissed_head = [Review("ericHakanson", "DISMISSED", HEAD, "2026-06-19T12:00:00Z")]
    check("lifecycle: latest DISMISSED on head → FAIL", gate(dismissed_head) == 2)
    one_blocks_one_approves = [
        Review("ericHakanson", "CHANGES_REQUESTED", HEAD, "2026-06-19T10:00:00Z"),
        Review("secondReviewer", "APPROVED", HEAD, "2026-06-19T11:00:00Z"),
    ]
    check(
        "lifecycle: any allowlisted CHANGES_REQUESTED on head blocks → FAIL",
        gate(one_blocks_one_approves) == 2,
    )
    # A reviewer whose latest is APPROVED on head plus an earlier stale
    # CHANGES_REQUESTED (different SHA) → PASS (the stale block doesn't count).
    stale_block_then_head_approve = [
        Review("ericHakanson", "CHANGES_REQUESTED", STALE, "2026-06-19T09:00:00Z"),
        Review("ericHakanson", "APPROVED", HEAD, "2026-06-19T10:00:00Z"),
    ]
    check(
        "lifecycle: stale CHANGES_REQUESTED + fresh head APPROVED → PASS",
        gate(stale_block_then_head_approve) == 0,
    )
    # TSV round-trip (the exact shape CI feeds in) evaluates identically.
    tsv = (
        "ericHakanson\tAPPROVED\t%s\t2026-06-19T10:00:00Z\n"
        "ericHakanson\tCHANGES_REQUESTED\t%s\t2026-06-19T11:00:00Z\n"
    ) % (HEAD, HEAD)
    check(
        "lifecycle: CI TSV round-trip parses + revokes → FAIL",
        evaluate_trusted_approval(reviews_from_api_tsv(tsv), HEAD, APPROVERS) is False,
    )
    check(
        "lifecycle: empty head SHA never approves",
        evaluate_trusted_approval(approved_head, "", APPROVERS) is False,
    )

    # -------------------------------------------------------------------------
    # FOR-634 round-2 P1.2: a later COMMENTED/PENDING review must NOT erase a
    # reviewer's standing decision. Only decisive states (APPROVED /
    # CHANGES_REQUESTED / DISMISSED) form the effective decision.
    # -------------------------------------------------------------------------
    # (a) A CHANGES_REQUESTED, then A COMMENTED (same head), plus B APPROVED on
    #     head → FAIL: A's change-request is still active; the comment doesn't
    #     clear it.
    a_blocks_then_comments_b_approves = [
        Review("ericHakanson", "CHANGES_REQUESTED", HEAD, "2026-06-19T10:00:00Z"),
        Review("ericHakanson", "COMMENTED", HEAD, "2026-06-19T11:00:00Z"),
        Review("secondReviewer", "APPROVED", HEAD, "2026-06-19T12:00:00Z"),
    ]
    check(
        "P1.2: later COMMENTED does NOT erase a CHANGES_REQUESTED → FAIL",
        gate(a_blocks_then_comments_b_approves) == 2,
    )
    # (b) A APPROVED, then A COMMENTED → still PASS (comment leaves approval
    #     standing).
    a_approves_then_comments = [
        Review("ericHakanson", "APPROVED", HEAD, "2026-06-19T10:00:00Z"),
        Review("ericHakanson", "COMMENTED", HEAD, "2026-06-19T11:00:00Z"),
    ]
    check(
        "P1.2: later COMMENTED does NOT erase an APPROVED → PASS",
        gate(a_approves_then_comments) == 0,
    )
    # (c) A PENDING-only review on head is non-decisive → never approves.
    a_pending_only = [Review("ericHakanson", "PENDING", HEAD, "2026-06-19T10:00:00Z")]
    check(
        "P1.2: PENDING-only review is non-decisive → FAIL",
        gate(a_pending_only) == 2,
    )

    print()
    if failures:
        print(f"SELFTEST FAILED: {len(failures)} case(s): {', '.join(failures)}")
        return 1
    print("SELFTEST PASSED")
    return 0


# ---------------------------------------------------------------------------
def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--staged", action="store_true", help="scan staged changes (default)")
    ap.add_argument("--base", help="base ref for a range scan (e.g. origin/main)")
    ap.add_argument("--head", help="head ref for a range scan (default HEAD)")
    ap.add_argument("--diff-file", help="read unified diff from file ('-' = stdin)")
    ap.add_argument(
        "--message-file",
        help="commit-message file (accepted for the local commit-msg hook; "
        "no longer scanned for an approval trailer — approval is a GitHub review)",
    )
    ap.add_argument(
        "--approved-by-trusted-review",
        default="false",
        help="authenticated signal from CI: 'true' iff an allowlisted GitHub login "
        "has an APPROVED review whose commit_id == the PR head SHA",
    )
    ap.add_argument(
        "--eval-reviews",
        metavar="TSV_FILE",
        help="evaluate the trusted-review gate (FOR-634 P1.2). Reads a "
        "login<TAB>state<TAB>commit_id<TAB>submitted_at TSV ('-' = stdin) of ALL "
        "PR reviews, reduces to each reviewer's latest, and prints 'true'/'false'. "
        "Requires --head and --approvers. Exit 0 always (the boolean is on stdout).",
    )
    ap.add_argument(
        "--approvers",
        default="",
        help="comma/whitespace-separated allowlist of GitHub logins (for "
        "--eval-reviews)",
    )
    ap.add_argument("--selftest", action="store_true", help="run built-in tests and exit")
    args = ap.parse_args(argv)

    if args.selftest:
        return selftest()

    if args.eval_reviews is not None:
        if args.eval_reviews == "-":
            tsv = sys.stdin.read()
        else:
            with open(args.eval_reviews, "r", encoding="utf-8", errors="replace") as fh:
                tsv = fh.read()
        ok = evaluate_trusted_approval(
            reviews_from_api_tsv(tsv),
            (args.head or "").strip(),
            parse_approvers(args.approvers),
        )
        print("true" if ok else "false")
        return 0

    diff_text = gather_diff(args)
    violations = scan_diff(diff_text)
    approved = str(args.approved_by_trusted_review).strip().lower() == "true"
    return report(violations, approved)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
