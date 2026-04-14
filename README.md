# Analytics Platform

Fort Island's analytics publishing platform starts here as a fresh Evidence project.

This repository is the publishing layer, not the data acquisition system, not the database, and not the marketing site. It is responsible for turning curated real-estate signal datasets into reusable assets for:

- website proof
- campaign support
- client briefings
- repeatable market and signal pages

## Architecture stance

- Evidence is the analytics publishing layer.
- Curated data contracts are the boundary into this repo.
- Squarespace remains the brand shell and discovery surface.
- HubSpot remains the CTA, form, and campaign-distribution layer.
- Linear is the source of truth for requirements, acceptance criteria, and QA state.

## Repo shape

```text
pages/         Route-level Evidence pages
components/    Shared layout and publishing blocks
queries/       Shared query logic and contract-specific query helpers
content/       Asset metadata, copy fragments, and authoring inputs
contracts/     Publishing contract specs and schemas
data/          Local sample datasets and static contract fixtures
docs/          Runbooks, governance, and integration guidance
scripts/       Publishing and validation helpers
sources/       Evidence datasource definitions
static/        Static assets served by the published app
```

Asset metadata conventions live in:

- `docs/architecture/asset-conventions.md`
- `contracts/publishing/asset-metadata.schema.json`
- `content/assets/`

Publishing data contracts live in:

- `docs/architecture/publishing-contracts.md`
- `contracts/publishing/metric-registry.json`
- `contracts/publishing/*.schema.json`
- `data/contracts/`

## Local development

1. Copy the example environment file for local sample-data mode:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Validate environment and config:

```bash
npm run validate:env
```

4. Build local source artifacts:

```bash
npm run sources
```

5. Start the Evidence dev server:

```bash
npm run dev
```

6. Validate asset metadata examples and future asset files:

```bash
npm run validate:metadata
```

7. Validate publishing-contract definitions and sample fixtures:

```bash
npm run validate:contracts
```

The current local mode uses curated sample contract exports so the project can boot cleanly without production credentials.

Template imports should use the stable aliases exposed through SvelteKit and Evidence:

- `$lib/...` for shared Svelte components under `components/`
- `$content/...` for authoring metadata and content files under `content/`

## Config modes

- `sample` mode reads local curated exports from `data/contracts/csv`.
- `curated_export` mode points the same contract source at a deployment-style export directory.

Current environment and config rules live in:

- `docs/runbooks/environment-and-config.md`

## Governance

- Architecture and delivery spec lives in the Analytics Platform Linear project.
- Codex review workflow and issue template guidance is mirrored in [docs/governance/codex-review-workflow.md](docs/governance/codex-review-workflow.md).
- No implementation should start without a Linear issue with explicit acceptance criteria.
