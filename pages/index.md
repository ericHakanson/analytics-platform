---
title: Fort Island Analytics Publishing Platform
---

# Fort Island Analytics Publishing Platform

This repository is Fort Island's reusable analytics publishing layer, built on Evidence.

<Note status="info">
  Foundation and first template wave are complete. Current focus: channel packaging docs, ADR baseline, and next backlog from legacy examples.
</Note>

## Purpose

The platform turns curated real-estate signal datasets into reusable assets for:

- proof pages for the website
- campaign support pages
- client briefing pages
- repeatable market and signal narratives

## Architecture boundaries

- Database is the system of record.
- Acquisition stays upstream of this repo.
- Evidence owns narrative packaging and visual presentation.
- Squarespace remains the brand shell.
- HubSpot remains the conversion and campaign-distribution layer.
- Linear remains the canonical source of truth for requirements and QA.

## What is live

| Asset family | Route group | Status |
|---|---|---|
| Evergreen proof | [/proof/](proof/) | Live — Essex County example |
| Campaign | [/campaigns/](campaigns/) | Live — Middlesex County Q2 2026 |
| Client briefing | [/briefings/](briefings/) | Live — Essex + Middlesex weekly |

## What is in place

- Shared layout shell and reusable content blocks (`components/`)
- Shared SQL query templates (`queries/`)
- Asset metadata and contract validation (`npm run validate:metadata`, `npm run validate:contracts`)
- Curated sample contract sources for local development (`data/contracts/csv/`)
- Local development and publishing runbook (`docs/runbooks/local-development-and-publishing.md`)
- ADR-009: hosting and deployment model (`docs/architecture/adr-009-hosting-deployment-model.md`)

## Governance

Codex review workflow, the Linear issue template, and required review evidence are documented in the repo under `docs/governance/`.
