# ADR-004: Modular Monolith — Single-Repo, All Asset Families

**Status:** Accepted
**Date:** 2026-04-14
**Issues:** FOR-261

## Context

The analytics publishing platform serves three asset families: evergreen proof pages, campaign assets, and client briefings. These families have distinct audiences, route groups, and CTA conventions, but share the same data pipeline, publishing contract layer, component library, and build toolchain.

The team needed to decide whether to organize these families into separate repositories or keep them in a single repository.

## Decision

**All asset families live in a single Evidence project repository (modular monolith).**

Route groups (`/proof/`, `/campaigns/`, `/briefings/`) are separate directory namespaces within `pages/`. Shared components, queries, contracts, and metadata conventions are shared across all families within the single repo.

## Rationale

- **Shared infrastructure:** All asset families depend on the same components (`PublishingPageShell`, shared content blocks), the same contract validation scripts, the same build pipeline, and the same environment variable conventions. Splitting into separate repos would require duplicating or cross-referencing all of this.
- **Deployment atomicity:** A single build produces all asset families. A deployment deploys all of them together. This eliminates cross-repo coordination overhead for shared changes (e.g., updating a shared component or a contract schema).
- **Low asset volume:** At the current scale (a handful of pages per family), the overhead of multiple repos is not justified.
- **Consistent governance:** A single codex review workflow, single Linear project, and single set of validation scripts govern all families. Splitting repos would require maintaining governance separately per family.

## Modularity within the monolith

Families remain independently navigable within the single repo:

- `pages/{family}/` — page routes
- `content/assets/{family}/` — asset metadata
- `queries/{family}/` — shared SQL templates
- `contracts/publishing/` — contract specs (not segmented by family; contracts are shared resources)

A new asset family can be added by creating a new route group and corresponding metadata and query directories. No restructuring of the repo is needed.

## Consequences

- All asset families are built and deployed together. There is no per-family independent deployment.
- A breaking change to the Evidence version, shared components, or build toolchain affects all families simultaneously.
- Teams working on different asset families will share a branch and merge history in the same repository.

## Revisit triggers

- If asset families need genuinely independent deployment cadences (e.g., briefing pages must deploy on a different schedule from proof pages with different credentials).
- If the repo grows to a scale where separate build caches or team-scoped CI is needed.
- If asset families diverge enough that they no longer share meaningful infrastructure.
