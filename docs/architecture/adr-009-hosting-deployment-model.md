# ADR-009: Hosting and Deployment Model

**Status:** Accepted
**Date:** 2026-04-14
**Issues:** FOR-262, FOR-263

## Context

The analytics publishing platform is an Evidence project that produces a static site from curated data contracts. Decisions are needed about:

- how developers author and test templates locally
- how production builds are produced
- where the static output is hosted
- how Evidence Studio fits relative to self-hosted options
- what Squarespace and HubSpot own, and what they do not

This ADR captures those decisions so downstream work — embedding in Squarespace, HubSpot CTA links, CDN configuration — has a single source of truth.

## Decision Modes

### 1. Local authoring mode

**Purpose:** develop and test templates without production credentials.

- Run `npm run dev` with `PUBLISHING_DATA_MODE=sample`.
- Reads curated sample exports from `data/contracts/csv/`.
- `EVIDENCE_VAR__contract_root` defaults to `./data/contracts/csv` (set in `.env` copied from `.env.example`).
- No production data access required.
- `VITE_PUBLIC_SITE_BASE_URL` defaults to `http://localhost:3000`.
- `VITE_PUBLISHING_ENV` is `local`.

This mode is sufficient for all template work, query authoring, component development, and contract validation.

### 2. Production build mode

**Purpose:** produce the deployable static output from actual curated exports.

- Run `npm run build` with `PUBLISHING_DATA_MODE=curated_export`.
- `EVIDENCE_VAR__contract_root` points to the curated export directory produced upstream (not `./data/contracts/csv`).
- `VITE_PUBLIC_SITE_BASE_URL` is set to the production domain.
- `VITE_PUBLISHING_ENV` is `production` (or `staging` for pre-release).
- `npm run validate:env` runs automatically before `evidence build`.
- Output is written to `.evidence/template/.svelte-kit/output` (Evidence's standard build artifact path).

No page, query, or contract files change between local authoring mode and production build mode. Only environment variables differ.

### 3. Hosted production deployment

**Purpose:** serve the static build output to external users.

The static output from step 2 is deployed to a hosting environment. Valid targets include:

- **CDN + object storage** (e.g., S3 + CloudFront, GCS + Cloud CDN)
- **Static hosting platforms** (e.g., Vercel, Netlify)
- **Node adapter** (if a server-side rendering adapter is enabled in SvelteKit)

Once deployed, the canonical URL structure is:

```
{VITE_PUBLIC_SITE_BASE_URL}/proof/{market_slug}/{asset_slug}
{VITE_PUBLIC_SITE_BASE_URL}/campaigns/{market_slug}/{asset_slug}
{VITE_PUBLIC_SITE_BASE_URL}/briefings/{market_slug}/{asset_slug}
```

These paths correspond directly to the `pages/` route structure. The `VITE_PUBLIC_SITE_BASE_URL` value in the production build must match the domain where the static output is served. Absolute links in pages and CTA handoffs will break if this value is wrong.

### 4. Evidence Studio (optional hosted deployment)

Evidence Studio is Anthropic's managed, cloud-hosted Evidence platform. It is one valid option for the hosted production deployment target.

Evidence Studio is suitable for this workload if the curated export path (`EVIDENCE_VAR__contract_root`) can be mounted or fetched at build time within the Studio build pipeline. It does not change:

- templates
- queries
- contracts
- asset metadata

If Evidence Studio's build environment cannot mount the curated export directory, a self-hosted option (Vercel, Netlify, S3+CloudFront, etc.) is the fallback. The template layer is indifferent to this choice.

## Decision

**The analytics publishing platform is deployment-target-agnostic at the template layer.**

The hosting target (Evidence Studio, Vercel, Netlify, S3+CloudFront, or other) affects:

- CI/CD plumbing (build trigger, secret injection, deploy step)
- The `EVIDENCE_VAR__contract_root` value at build time

The hosting target does NOT affect:

- `pages/` — route and template files
- `queries/` — contract-bound query logic
- `components/` — shared layout and publishing blocks
- `contracts/` — publishing contract specs and schemas
- `content/` — asset metadata and authoring inputs

## Rejected options

### Host analytics pages inside Squarespace

Rejected. Squarespace is the brand shell and discovery surface. It does not serve Evidence static output. Squarespace pages link to or embed hosted analytics URLs but do not own the analytics hosting infrastructure.

### Host analytics pages inside HubSpot

Rejected. HubSpot is the CTA and campaign-distribution layer. Analytics asset CTAs hand off traffic to HubSpot. HubSpot does not render or host analytics pages.

## Ownership boundaries

| Layer | Owner | Role |
|---|---|---|
| Analytics publishing platform | This repo + hosting target | Produces and serves analytics pages |
| Squarespace | Brand / marketing team | Brand shell; links or embeds analytics URLs |
| HubSpot | Marketing ops | Receives CTA handoffs from analytics pages; owns campaign tracking and forms |
| Evidence (tool) | Evidence / Anthropic | Framework; generates static site from `.md` pages |
| Evidence Studio (optional) | Anthropic (managed) | Optional managed hosting for Evidence projects |

## URL strategy

The production base URL is set once via `VITE_PUBLIC_SITE_BASE_URL` at build time. All absolute links within the platform are composed from this variable. The value must not be hardcoded in pages or query files.

Route structure mirrors the `pages/` directory:

- `/proof/{market_slug}/{asset_slug}` — evergreen proof assets
- `/campaigns/{market_slug}/{asset_slug}` — time-bound campaign assets
- `/briefings/{market_slug}/{asset_slug}` — client pipeline briefings

Slug conventions are defined in `docs/architecture/asset-conventions.md`.

## Consequences

- Operators choosing a new hosting target need to update CI/CD plumbing and environment variable injection only. No template work is required.
- `VITE_PUBLIC_SITE_BASE_URL` must be validated as part of the production build checklist (it is already required by `npm run validate:env`).
- Evidence Studio adoption is a CI/CD configuration task, not an architecture task.
- Squarespace and HubSpot integration docs must reference the analytics platform's hosted URL, not localhost or a staging URL.
