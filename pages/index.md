---
title: Fort Island Analytics Publishing Platform
---

# Fort Island Analytics Publishing Platform

This repository is a fresh Evidence scaffold for Fort Island's reusable analytics publishing layer.

<Note status="info">
  Current focus: establish the publishing foundation, governance model, and repo structure before signal-specific templates are implemented.
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

The initial scaffold includes:

- a real Evidence runtime
- a Fort Island-specific theme
- placeholder directories for pages, components, contracts, content, queries, docs, and scripts
- a curated sample contract source for local development

## Planned route groups

- [Proof assets](proof/)
- [Campaign assets](campaigns/)
- [Client briefings](briefings/)

## Immediate next issues

- `FOR-250` define folder structure, naming conventions, and asset metadata schema
- `FOR-251` implement environment and config pattern
- `FOR-252` define curated publishing data contract for v1

## Governance

Codex review workflow, the Linear issue template, and required review evidence are documented in the repo under `docs/governance/`.
