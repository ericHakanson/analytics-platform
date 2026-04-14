# Codex Review Workflow

This document operationalizes `FOR-248`.

## Linear issue template

Every implementation issue must include these sections before work starts:

```md
## Problem statement

## Business rationale

## Objective

## Scope

## Dependencies

## Acceptance criteria

## Definition of done
```

## Required review evidence

Every issue handed to Codex for review must include:

- changed files or branch/PR reference
- validation commands run
- data contracts touched
- documentation updated
- assumptions and limitations

## Codex review checklist

Codex should reject the issue if any of the following is missing or violated:

- The implementation does not match the issue objective.
- Acceptance criteria are not fully satisfied.
- The change weakens the curated-data boundary.
- The change creates one-off page logic where a reusable pattern is expected.
- Squarespace is given analytics ownership.
- HubSpot is given page-rendering responsibility.
- Documentation is missing for operator-facing behavior changes.
- The issue record would be unclear to a future reader without chat replay.

## Definition of done enforcement

An issue is only done when:

- implementation is complete
- acceptance criteria are satisfied
- validation steps are recorded
- documentation is updated where needed
- assumptions or limitations are captured
- Codex review passes

## Defect and debt rules

- Defects found during review must become Linear issues.
- Temporary exceptions must create follow-up debt issues before the parent issue closes.
- Architecture-impacting changes must reference an ADR or explicit decision record in Linear.
- Chat alone does not count as a decision log.

## Anti-patterns to reject

- "We'll document it later."
- "This page is special, so I cloned one and tweaked it."
- "The raw table is easier for now." without an explicit exception.
- "Squarespace can own this logic."
- "Let's add a service for this." before the modular-monolith seams are exhausted.
