# Environment And Config

This document defines the configuration pattern for local development and deployment-oriented publishing modes.

## Goals

- keep secrets and environment-specific paths out of content pages
- keep one stable contract source name across environments
- switch data roots by environment rather than rewriting templates
- fail fast when required configuration is missing

## Environment files

- `.env.example` is the tracked starting point
- `.env` is local-only and ignored by git

Evidence loads:

- `EVIDENCE_` variables for datasource and source-query behavior
- `VITE_` variables for page/runtime behavior

## Required variables

### Core mode selection

- `PUBLISHING_DATA_MODE`
  - allowed values: `sample`, `curated_export`
- `VITE_PUBLISHING_ENV`
  - examples: `local`, `staging`, `production`

### Contract-root variable

- `EVIDENCE_VAR__contract_root`
  - root directory used by curated contract source queries
  - local sample default: `./data/contracts/csv`

### Public and CTA variables

- `VITE_PUBLIC_SITE_BASE_URL`
- `VITE_HUBSPOT_FORM_BASE_URL`
- `VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE`

## Mode behavior

### `sample`

Use for local development and contract validation.

Expected behavior:

- reads curated sample exports from `data/contracts/csv`
- no production credentials required
- suitable for `npm run sources`, `npm run dev`, and `npm run build`

### `curated_export`

Use for deployment-style builds that point at curated export files produced upstream.

Expected behavior:

- same source name and same contract query names as local mode
- different `EVIDENCE_VAR__contract_root`
- no page or template changes required

## Failure behavior

The repo fails fast through `npm run validate:env`, which runs automatically before:

- `npm run sources`
- `npm run dev`
- `npm run build`
- `npm run preview`

Validation currently checks:

- required variables exist
- mode value is valid
- the configured contract-root directory exists
- required sample files exist when running in `sample` mode

## Hygiene rules

- do not hardcode contract file paths in pages
- do not hardcode deployment URLs in pages
- compose CTA links from environment variables
- keep source-query variable use centralized around the curated contract boundary
