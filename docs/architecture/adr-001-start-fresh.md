# ADR-001: Start Fresh Rather Than Migrate Legacy Dashboards

**Status:** Accepted
**Date:** 2026-04-14
**Issues:** FOR-261

## Context

Fort Island operated a set of internal Evidence Studio dashboards querying the production database directly. Those dashboards used the legacy Evidence template syntax (`{% %}` Jinja-style blocks), direct `google_cloud_postgresql_public_*` table references, and had no publishing contract layer, no asset metadata, and no separation between internal ops views and external-audience views.

The team needed to decide whether to migrate those dashboards to the new publishing platform or start fresh.

The legacy dashboards are documented in `docs/legacy_dashboard_examples/` and were triaged in `docs/legacy_dashboard_examples/triage.md`.

## Decision

**Start fresh with a new Evidence project rather than migrating the legacy dashboards.**

The legacy dashboards are not migrated into this repo. They are retained as reference material in `docs/legacy_dashboard_examples/` only.

## Rationale

- The legacy dashboards mixed internal ops views (pipeline health, enrichment queues, mailing operations) with external-audience views. Migration would have required large-scale surgery to separate those concerns.
- The legacy template syntax (`{% %}`) is incompatible with the current Evidence release. A migration would require a complete rewrite anyway.
- The legacy dashboards queried the database directly. The new platform's design principle — curated data contracts — is a deliberate architecture improvement, not a constraint imposed by migration.
- Starting fresh allowed the publishing contracts, asset metadata schema, and shared component library to be designed correctly from the beginning rather than reverse-engineered from existing pages.

## Consequences

- The legacy dashboards continue to serve internal ops needs through whatever tooling the upstream pipeline provides. This repo does not replace or maintain them.
- New external-audience assets are designed against publishing contracts, not against legacy queries.
- Legacy examples inform the backlog (see `docs/legacy_dashboard_examples/triage.md`) but do not constrain the implementation approach.

## Revisit triggers

- If the legacy internal dashboards need to be hosted alongside publishing assets, a separate route group or sub-project would be needed.
- If a significant volume of legacy pages needs to be migrated (e.g., 50+ pages), the cost of starting fresh vs. migration should be re-evaluated.
