# ADR-002: Evidence as the Analytics Publishing Layer

**Status:** Accepted
**Date:** 2026-04-14
**Issues:** FOR-261

## Context

The analytics publishing platform needs to turn curated data exports into static pages that can be served to external audiences (website visitors, campaign targets, active clients). The tool must:

- render SQL query results as charts, tables, and metric callouts
- support Markdown-based page authoring
- produce a deployable static build from a data source
- allow shared layout components and reusable blocks
- integrate with environment variables for multi-environment builds

Alternatives considered included building a custom static site generator (Node.js/Next.js), using a BI tool export (Metabase, Looker Studio), or using a documentation platform (Notion, Gitbook).

## Decision

**Use Evidence (evidence.dev) as the analytics publishing layer.**

Evidence is a SQL-driven static site framework. Pages are authored in Markdown with embedded SQL blocks. The Evidence build processes those SQL blocks against the configured data source and produces a fully static SvelteKit output.

## Rationale

- **SQL-native authoring:** Pages embed queries directly. No ETL layer, no BI tool configuration, no data transformation outside the query.
- **Static output:** The build produces a static site. No server is needed to serve analytics pages. This matches the deployment model for a low-frequency curated-data publishing workflow.
- **Markdown authoring:** Page authors can write narrative text alongside data without leaving the repo.
- **SvelteKit interop:** Components and layout shells are standard SvelteKit/Svelte components. No proprietary rendering logic.
- **Environment variable support:** Evidence passes `EVIDENCE_VAR__*` variables into query context at build time, enabling the curated data contract boundary (see ADR-003).

## Consequences

- All analytics pages are authored in Evidence's Markdown + SQL format.
- Shared layout and content blocks are Svelte components in `components/`.
- Page rendering, chart output, and build artifacts are governed by the Evidence release version in `package.json`.
- Evidence version upgrades must be tested against the full page set before deploying to production.
- Evidence Studio (the managed hosting option) is a valid but optional deployment target — see ADR-009.

## Revisit triggers

- If Evidence drops support for the chart types or layout patterns the platform relies on.
- If a richer interactive experience (client-side filtering, user-specific data) is required — Evidence produces static pages and does not support server-side user context.
- If the Evidence build pipeline becomes incompatible with the curated export mount approach.
- If a significantly simpler or better-supported alternative emerges for SQL-to-static publishing.
