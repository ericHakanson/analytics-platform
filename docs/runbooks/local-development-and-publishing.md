# Local Development and Publishing Runbook

This runbook covers the full operator workflow: bootstrapping locally, running validation, producing a production build, and understanding the publish cycle.

For a compact reference of all environment variables and their allowed values, see `docs/runbooks/environment-and-config.md`. This runbook supplements that document and provides step-by-step procedures.

For hosting and deployment architecture decisions, see `docs/architecture/adr-009-hosting-deployment-model.md`.

---

## 1. Bootstrap local development

### Prerequisites

- Node.js >= 18.0.0
- npm >= 7.0.0

### Steps

**1a. Clone the repo and enter the directory.**

```bash
git clone <repo-url>
cd analytics-platform
```

**1b. Copy the example environment file.**

```bash
cp .env.example .env
```

`.env.example` is tracked and sets all required variables to safe local defaults (sample mode, localhost URLs). `.env` is gitignored. Do not commit `.env`.

**1c. Install dependencies.**

```bash
npm install
```

**1d. Validate the environment.**

```bash
npm run validate:env
```

This confirms all required variables are present, the mode value is valid, and the contract-root directory exists. It also checks that required sample CSV files are in place when running in `sample` mode.

**1e. Build local source artifacts.**

```bash
npm run sources
```

This runs `validate:env` first, then processes Evidence datasource definitions under `sources/`.

**1f. Start the dev server.**

```bash
npm run dev
```

This opens the Evidence dev server at `http://localhost:3000` (or the port Evidence selects). Hot reload is active.

**1g. (Optional) Validate asset metadata and contracts.**

```bash
npm run validate:metadata
npm run validate:contracts
```

These do not affect the dev server and can be run independently at any time.

---

## 2. Environment variables

All required variables must be present in `.env` (or injected by the CI/CD environment). `npm run validate:env` fails fast if any are missing or invalid.

### `PUBLISHING_DATA_MODE`

Controls which data root the curated contract source queries use.

| Value | Meaning |
|---|---|
| `sample` | Read from `data/contracts/csv/`. No production credentials needed. Use for local development. |
| `curated_export` | Read from the directory specified by `EVIDENCE_VAR__contract_root`. Use for production builds. |

### `VITE_PUBLISHING_ENV`

Identifies the publishing environment. Used by pages for conditional behavior and labeling.

Example values: `local`, `staging`, `production`.

### `EVIDENCE_VAR__contract_root`

The root directory Evidence source queries use to locate contract CSV files.

- Local sample default: `./data/contracts/csv`
- Production: an absolute path to the curated export directory produced upstream

This variable does not need to be a URL. It is a filesystem path resolved at build time.

### `VITE_PUBLIC_SITE_BASE_URL`

The base URL for the hosted analytics platform. Used to compose absolute links within pages and CTA handoffs.

- Local default: `http://localhost:3000`
- Production: the domain where the static build output is served (e.g., `https://analytics.fortisland.com`)

This must match the actual hosting domain. Absolute links break if it is wrong.

### `VITE_HUBSPOT_FORM_BASE_URL`

The HubSpot form URL that analytics CTA buttons point to. Analytics pages hand off traffic to HubSpot — they do not own the form.

Example: `https://go.fortisland.example/request-briefing`

### `VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE`

The UTM source value injected into HubSpot CTA links. Identifies the analytics platform as the traffic source in HubSpot campaign attribution.

Example: `fortisland-signals`

---

## 3. Running validation checks

### Validate environment

```bash
npm run validate:env
```

Checks: required variables exist, `PUBLISHING_DATA_MODE` is a valid value, `EVIDENCE_VAR__contract_root` directory exists, required sample CSV files exist (in `sample` mode).

This runs automatically before `npm run sources`, `npm run dev`, `npm run build`, and `npm run preview`. You do not need to run it separately in those flows.

### Validate asset metadata

```bash
npm run validate:metadata
```

Checks: every file under `content/assets/` is valid JSON, satisfies `contracts/publishing/asset-metadata.schema.json`, has consistent slug and folder naming, and has metric keys that resolve against `contracts/publishing/metric-registry.json`.

Run this after editing or adding asset metadata files under `content/assets/`.

### Validate publishing contracts

```bash
npm run validate:contracts
```

Checks: contract spec and sample fixture files under `contracts/` and `data/contracts/` satisfy their schemas.

Run this after updating contract schemas or sample fixture files.

---

## 4. Producing a production build

### Steps

**4a. Configure the production environment.**

In CI/CD or in a local `.env` override, set:

```bash
PUBLISHING_DATA_MODE=curated_export
VITE_PUBLISHING_ENV=production
EVIDENCE_VAR__contract_root=/path/to/curated/exports
VITE_PUBLIC_SITE_BASE_URL=https://analytics.fortisland.com
VITE_HUBSPOT_FORM_BASE_URL=https://go.fortisland.com/request-briefing
VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE=fortisland-signals
```

Replace the example domain and paths with the actual production values.

**4b. Run the build.**

```bash
npm run build
```

`npm run build` runs `npm run sources` first (which itself runs `validate:env`), then runs the Evidence build. This order ensures source artifacts are always present and current before Evidence processes pages. Build output lands in `.evidence/template/.svelte-kit/output`.

Do not skip `npm run sources` by running `evidence build` directly — pages that depend on source queries will silently produce broken output if sources have not been generated.

**4c. Deploy the output.**

Copy or sync the build output to the hosting target (S3, Vercel, Netlify, Evidence Studio, etc.). The specific deploy command depends on the chosen hosting target.

After deployment, the platform is accessible at `VITE_PUBLIC_SITE_BASE_URL`.

---

## 5. The publish cycle

A normal publish cycle has four steps:

1. **Curated exports arrive.** The upstream data pipeline produces updated contract CSV files (e.g., `market_proof_overview.csv`, `campaign_snapshot.csv`, `client_pipeline_briefing.csv`).

2. **Contract root is updated.** `EVIDENCE_VAR__contract_root` in the build environment is pointed at the new export directory (or the files are refreshed in place at the existing path).

3. **Build runs.** `npm run build` with `PUBLISHING_DATA_MODE=curated_export` and the production environment variables. Source generation runs automatically as the first step of `npm run build`. No template, query, or contract changes are needed for a routine refresh.

4. **Static output is deployed.** The new build output replaces the previous deployment at the hosting target. External users see the refreshed analytics pages.

No coordination with Squarespace or HubSpot is needed for a routine data refresh. Their links point to stable `VITE_PUBLIC_SITE_BASE_URL` URLs that persist across deployments.

---

## 6. Squarespace and HubSpot — ownership boundaries

### Squarespace

Squarespace is the brand shell and discovery surface. It does NOT host analytics assets.

Squarespace pages may:
- Link to analytics URLs at `VITE_PUBLIC_SITE_BASE_URL`
- Embed analytics pages via iframe where the CMS supports it

Squarespace does not:
- Serve Evidence static output
- Own or control the analytics publishing build pipeline
- Receive CTA handoffs from analytics pages

### HubSpot

HubSpot is the CTA and campaign-distribution layer. It does NOT render analytics pages.

HubSpot:
- Receives traffic from CTA buttons on analytics pages (the CTA URL is `VITE_HUBSPOT_FORM_BASE_URL` with UTM params from `VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE`)
- Owns forms, lead routing, and campaign attribution
- Is the terminal destination for outbound CTAs from the analytics platform

HubSpot does not:
- Host or render analytics pages
- Own the analytics build pipeline
- Control what data appears in analytics pages

For full CTA destination rules by asset family, UTM attribution conventions, URL composition patterns, and anti-patterns, see `docs/integrations/hubspot-cta-conventions.md`.

For approved Squarespace link-out, teaser, and embed patterns — and what Squarespace must not own — see `docs/integrations/squarespace-integration.md`.

---

## 7. Maintenance expectations

### Routine data refresh

1. Receive updated curated export files from the upstream data pipeline.
2. Update `EVIDENCE_VAR__contract_root` to point at the new exports (or refresh files in place).
3. Run `npm run validate:contracts` to confirm fixture alignment.
4. Run `npm run build` in production mode. Source generation runs automatically as the first step — no separate `npm run sources` call is needed.
5. Deploy the new static output.

### Template or component changes

1. Make changes in `pages/`, `components/`, or `queries/`.
2. Test locally with `npm run dev` in `sample` mode.
3. Run `npm run validate:metadata` and `npm run validate:contracts`.
4. Merge to the main branch.
5. Trigger a production build and deploy.

### Contract schema changes

Contract changes require coordination with the upstream data pipeline. See `docs/architecture/publishing-contracts.md` for versioning rules. After a contract schema update:

1. Update the sample fixture in `data/contracts/` to match.
2. Update asset metadata files that reference the changed contract version.
3. Run `npm run validate:contracts` and `npm run validate:metadata`.
4. Confirm the upstream export matches the new schema before running a production build.

### Adding a new asset

1. Create the asset metadata file under `content/assets/{family}/{market_slug}/{asset_slug}.json`.
2. Create the corresponding page under `pages/{route_group}/{market_slug}/{asset_slug}.md`.
3. Run `npm run validate:metadata` to confirm the metadata file is valid.
4. Follow the lifecycle state rules in `docs/architecture/asset-conventions.md`: start at `draft`, progress through `in_review` and `approved` before setting `published`.

---

## 8. Troubleshooting

### `npm run validate:env` fails

**Missing variable:** Add the variable to `.env`. All required variables are listed in section 2 above and in `docs/runbooks/environment-and-config.md`.

**Invalid `PUBLISHING_DATA_MODE`:** Only `sample` and `curated_export` are valid values. Check for typos or trailing whitespace.

**`EVIDENCE_VAR__contract_root` directory does not exist:** Create the directory or correct the path. In `sample` mode it defaults to `./data/contracts/csv`, which must exist and contain the expected CSV files.

**Required sample CSV missing:** In `sample` mode, `validate:env` checks that the expected CSV files are present in `EVIDENCE_VAR__contract_root`. If a file is missing, check `data/contracts/csv/` and ensure the fixture was not accidentally deleted. Fixtures are tracked in git.

---

### `npm run sources` fails

Sources runs `validate:env` first. If sources fails, check the validate:env output first. If the env check passes but sources still fails, check for malformed Evidence datasource definitions under `sources/`.

---

### `npm run dev` shows no data or blank charts

**Sources not generated:** Run `npm run sources` before `npm run dev`. The dev server does not generate sources automatically on first run.

**Wrong `PUBLISHING_DATA_MODE`:** In local development, `PUBLISHING_DATA_MODE` must be `sample`. If it is set to `curated_export` and `EVIDENCE_VAR__contract_root` points to a non-existent or empty directory, queries will return no rows.

**CSV fixture empty or mismatched schema:** If a query references a column that does not exist in the sample CSV, Evidence will render the chart with no data. Check the sample fixture in `data/contracts/csv/` against the contract schema in `contracts/publishing/`.

---

### `npm run build` produces a build but pages show error or no data

**Sources not current:** `npm run build` runs `npm run sources` automatically, but if `PUBLISHING_DATA_MODE=curated_export` and `EVIDENCE_VAR__contract_root` is wrong or empty, queries will return no rows. Verify the path and that the export files are present.

**`VITE_PUBLIC_SITE_BASE_URL` wrong:** If absolute links in the built output are broken (e.g., CTA buttons go to localhost), check that `VITE_PUBLIC_SITE_BASE_URL` is set to the correct production domain.

---

### `npm run validate:metadata` fails

**Schema violation:** Check the error output for which field failed. The schema is at `contracts/publishing/asset-metadata.schema.json`. Common issues: missing required fields, invalid `lifecycle_state` value, metric key not found in `contracts/publishing/metric-registry.json`.

**Slug/folder mismatch:** The asset slug in the metadata file must match the filename and the directory it lives in. Check `docs/architecture/asset-conventions.md` for naming rules.

---

### `npm run validate:contracts` fails

**Sample fixture does not match schema:** The fixture in `data/contracts/csv/` must satisfy the corresponding contract schema in `contracts/publishing/`. If the schema was updated but the fixture was not, update the fixture.

---

### Evidence dev server port conflict

If `http://localhost:3000` is already in use, Evidence will pick the next available port and print the URL in the terminal output. Check the terminal for the actual URL after `npm run dev`.

---

### Build output location

The production build output is at `.evidence/template/.svelte-kit/output`. This directory is gitignored. If you need to inspect the built output locally, run `npm run build` and look there.
