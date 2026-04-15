# ADR-003: Curated Data Contract Boundary

**Status:** Accepted
**Date:** 2026-04-14
**Issues:** FOR-261

## Context

The analytics publishing platform needs data to render its pages. That data originates in the Fort Island production database (PostgreSQL on Google Cloud), which is owned by the upstream data pipeline.

Two approaches were considered:

1. **Direct database access:** The publishing platform queries the production database directly at build time, using Evidence's PostgreSQL connector.
2. **Curated export approach:** The upstream pipeline produces curated CSV exports. The publishing platform reads those exports at build time, with no direct database connection.

## Decision

**The publishing platform reads only curated data exports. It has no direct database connection.**

The upstream pipeline is responsible for producing and maintaining curated export files (CSV format) that satisfy the publishing contracts defined in `contracts/publishing/`. The publishing platform reads those files at build time via the `EVIDENCE_VAR__contract_root` path.

## Rationale

- **Separation of concerns:** The pipeline decides what data is publication-ready. The publishing platform decides how to present it. These are distinct responsibilities and should not be coupled at query time.
- **No production credentials in the build environment:** Direct database access would require production database credentials to be present wherever a build runs. Curated exports eliminate this credential exposure.
- **Build stability:** A publishing build reads a snapshot of exports. It is not affected by live database changes, migrations, or query performance during the build window.
- **Contract enforcement:** Publishing contracts (defined in `contracts/publishing/`) specify exactly what columns the publishing platform expects. The pipeline must produce exports that satisfy those contracts. This boundary is explicit and testable.
- **Decoupled publish cycles:** The platform can be deployed independently of pipeline runs. A new build with old data is valid; a new build with refreshed exports updates the published pages.

## The contract boundary

Publishing contracts are JSON schemas in `contracts/publishing/`. Sample fixtures live in `data/contracts/csv/`. These fixtures enable local development without production exports.

At build time:
- `PUBLISHING_DATA_MODE=sample` → reads `data/contracts/csv/` (local development)
- `PUBLISHING_DATA_MODE=curated_export` → reads the directory at `EVIDENCE_VAR__contract_root` (production)

The publishing platform's queries reference `publishing_contracts.<contract_name>` and filter by `market_slug`. The Evidence source layer resolves that to a CSV file at the configured root.

## Consequences

- The publishing platform cannot query live database tables. Any data that needs to appear in published pages must go through the curated export pipeline.
- Contract schema changes require coordination between this repo and the upstream pipeline. See `docs/architecture/publishing-contracts.md` for versioning rules.
- Adding a new asset requires defining a publishing contract (schema + sample fixture) before the page can be developed locally.
- Build-time data freshness is determined by when the curated exports were produced, not when the build runs.

## Revisit triggers

- If real-time or near-real-time publishing is required (curated batch exports introduce a publication lag that is acceptable for the current use cases but may not be for future ones).
- If the export format changes from CSV to a different format (e.g., Parquet, database snapshot) — the Evidence source configuration would need updating.
- If the upstream pipeline is replaced with a system that cannot produce curated exports in the required format.
