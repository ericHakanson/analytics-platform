---
title: Fort Island Analytics Publishing Platform
---

# Fort Island Analytics Publishing Platform

This repository is a fresh Evidence scaffold for Fort Island's reusable analytics publishing layer.

<Note status="info">
  Current focus: the platform foundation is in place; next work is template expansion for proof, campaign, and briefing assets.
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

## Scaffold status

The current foundation includes:

- a real Evidence runtime
- a Fort Island-specific theme
- shared publishing layout and reusable content blocks
- asset metadata and contract validation scripts
- curated sample contract sources for local development
- one working proof page backed by the `market_proof_overview` contract

## Planned route groups

- [Proof assets](proof/)
- [Campaign assets](campaigns/)
- [Client briefings](briefings/)

## Next implementation issues

- `FOR-255` implement the evergreen proof template
- `FOR-256` implement the campaign template
- `FOR-257` implement the client briefing template

## Governance

Codex review workflow, the Linear issue template, and required review evidence are documented in the repo under `docs/governance/`.
