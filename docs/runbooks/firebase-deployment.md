# Firebase Deployment Runbook

Deploying the Evidence analytics dashboard to Firebase Hosting at `signals.fortisland.me`.

## Architecture

```
Cloud SQL (PostgreSQL) → evidence sources → npm run build:production → ./build → firebase deploy → signals.fortisland.me
```

The build is fully static — Evidence materializes all SQL queries at build time and ships parquet + pre-rendered HTML. Firebase Hosting serves static files only; no server-side compute.

## Prerequisites

### One-time setup

1. **Install Firebase CLI**
   ```sh
   npm install -g firebase-tools
   ```

2. **Authenticate**
   ```sh
   firebase login
   ```

3. **Create the Firebase project** (if not done)
   - Go to console.firebase.google.com
   - Create project `fortisland-signals` (or update `.firebaserc` to match your project ID)

4. **Connect custom domain** in Firebase Hosting console
   - Add `signals.fortisland.me`
   - Follow DNS verification steps (Firebase will provide TXT + A records)
   - DNS propagation can take up to 24 hours

5. **Ensure `connection.options.yaml` is present locally**
   ```sh
   ls sources/google_cloud_postgresql/connection.options.yaml
   ```
   This file is gitignored. See [local-development-and-publishing.md](local-development-and-publishing.md) for credential format.

## Deploying

```sh
npm run deploy
```

This runs `build:production` (which runs `sources` → `evidence build` with `NODE_ENV=production`) then `firebase deploy --only hosting`.

Typical deploy time: 3–5 minutes (dominated by the `sources` step querying Cloud SQL).

### What `build:production` does differently from `build`

- Loads `.env.production` automatically (Vite picks this up when `NODE_ENV=production`)
- Sets `VITE_PUBLIC_SITE_BASE_URL=https://signals.fortisland.me`
- Sets `VITE_PUBLISHING_ENV=production`

## Freshness

The dashboard is a **static snapshot** built at deploy time. The `built_at` date shown on the page reflects the last build. Since 2026-06-11 the site refreshes itself nightly; `npm run deploy` remains the manual/rollback path.

## Automated nightly refresh (`daily-refresh` workflow)

`.github/workflows/daily-refresh.yml` rebuilds and redeploys the site once per day, targeting **midnight America/New_York**. Live since 2026-06-11 (Linear FOR-543; design history in the [automation plan doc](https://linear.app/fortisland/document/daily-dashboard-firebase-refresh-automation-plan-github-actions-088a02b5d8e0)).

How it runs:
1. Two crons fire at `04:23` and `05:23` UTC (≈ midnight ET under EDT/EST respectively, off-peak minute).
2. **GitHub cron is best-effort** — starts have been observed 4–5 hours late. The `guard` job makes this harmless: a scheduled run proceeds unless another scheduled run's `refresh` *job* already succeeded in the last **6 hours**, so the first cron to actually execute deploys (late beats never) and the second dedup-skips. Expected steady state: **exactly one deploy per night**; an occasional double-deploy is serialized by the `concurrency` group and harmless (static output).
3. The `refresh` job: checkout → `npm ci` → write `.env` → write `connection.options.yaml` from the `EVIDENCE_CONNECTION_OPTIONS_YAML` secret → auth to GCP via **Workload Identity Federation** (no stored key) → **Cloud SQL Auth Proxy** on `127.0.0.1:5432` (`--quota-project recently-sold-real-estate`) → `npm run sources` → re-apply the favicon patch → `evidence build` → `firebase deploy --only hosting` (firebase-tools pinned `@13`).
4. On failure: a **Linear issue** is auto-filed in Analytics Platform (step fails loudly if the API rejects it) and **GitHub emails** eric@fortisland.me (native failed-workflow notification — requires Settings → Notifications → Actions → "failed workflows only" to stay enabled).

### Manual on-demand refresh

Actions tab → `daily-refresh` → **Run workflow** (branch `main`), or:
```sh
gh workflow run daily-refresh --ref main
```
Manual dispatches bypass the guard and always deploy. They do **not** suppress the nightly run (the guard only dedupes against `schedule`-event runs).

### CI secrets & variables (repo → Settings → Secrets and variables → Actions)

| Kind | Name | Holds |
|---|---|---|
| Secret | `EVIDENCE_CONNECTION_OPTIONS_YAML` | proxy connection file: host `127.0.0.1` (b64), db `real_estate` (b64), user `recent_sales_reader` (b64), password (b64), `ssl: false` |
| Secret | `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource name (`projects/865507417479/.../github-provider`) |
| Secret | `GCP_SERVICE_ACCOUNT` | `analytics-refresh@fort-island-signals.iam.gserviceaccount.com` |
| Secret | `LINEAR_API_KEY` | Linear personal API key for failure-issue creation |
| Variable | `CLOUDSQL_INSTANCE_CONNECTION_NAME` | `recently-sold-real-estate:us-east1:recently-sold-postgres` |
| Variable | `VITE_HUBSPOT_FORM_BASE_URL` | CTA base URL (validator-gated env var; currently the repo placeholder) |

**⚠️ Password rotation coupling:** the CI DB password lives in **two places** — Secret Manager (`recent-sales-reader-db-password` in project `recently-sold-real-estate`, the source of truth, also used by other services) and base64-inside `EVIDENCE_CONNECTION_OPTIONS_YAML`. **If the password rotates in Secret Manager, the GitHub secret must be rebuilt too** or the nightly build fails at the proxy step.

**⚠️ Query-bound read access:** CI connects as `recent_sales_reader`, which is **SELECT-only on exactly the five tables** today's sources query (`properties`, `town_runs`, `property_detail_snapshots`, `property_renovation_scores`, `target_regions`). If a new table is added to `sources/google_cloud_postgresql/*.sql`, the nightly build will fail loudly with *permission denied* — that is expected, and the fix is a one-line **additive** `GRANT SELECT` run by Eric (never by an agent; see FOR-512 / `DATA_PROTECTION.md`). The owner role `real_estate_app` is deliberately excluded from CI.

**Known limitation (by design):** only the Cloud SQL-backed pages (Signals Overview family) and `built_at` refresh nightly. The contract/proof/campaign/briefing pages read static fixture CSVs from `data/contracts/csv/` and show the same numbers every day — matching the old manual-deploy behavior.

### Disabling / rollback

Disable the workflow in the Actions tab (or delete the file). No data or hosting state is affected; `npm run deploy` from a workstation remains fully functional.

## Firebase Hosting Configuration

Key settings in `firebase.json`:

- `"public": "build"` — serves from the `./build` output directory
- `"cleanUrls": true` — strips `.html` from URLs (matches Evidence's routing)
- **No `X-Frame-Options` header** — intentionally omitted so Squarespace can iframe embed pages
- `/_evidence/**` assets get 1-year immutable cache (content-hashed filenames)
- All other routes: 1-hour cache with stale-while-revalidate

## Squarespace Embedding

After deploy, embed any page on Squarespace using a Code Block:

```html
<iframe
  src="https://signals.fortisland.me/signals-overview"
  width="100%"
  style="min-height: 900px; border: none;"
  loading="lazy"
  title="Fort Island Signals Overview"
></iframe>
```

For a full-page link-out, use a Button block pointing to `https://signals.fortisland.me/signals-overview`.

## After `npm install` on a new machine

One manual favicon edit must be reapplied after a fresh install. **In CI this happens automatically** (the `daily-refresh` workflow patches it between `sources` and `build`); the notes below are for local/manual deploys.

The template Evidence actually builds from on a fresh checkout is `node_modules/@evidence-dev/evidence/template/src/app.html` — patch that one. (`.evidence/template/src/app.html` exists only on dev machines that have run Evidence locally; patch it too if present.)

**File:** `node_modules/@evidence-dev/evidence/template/src/app.html` (and `.evidence/template/src/app.html` if present)

Replace the default favicon links:
```html
<link rel="icon" href="%sveltekit.assets%/favicon.ico" sizes="32x32" />
<link rel="icon" href="%sveltekit.assets%/icon.svg" type="image/svg+xml" />
```
With the dark/light switching version:
```html
<link rel="icon" href="%sveltekit.assets%/favicon.ico" sizes="32x32" media="(prefers-color-scheme: light)" />
<link rel="icon" href="%sveltekit.assets%/favicon-dark.ico" sizes="32x32" media="(prefers-color-scheme: dark)" />
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `firebase: command not found` | CLI not installed | `npm install -g firebase-tools` |
| `Error: Project not found` | `.firebaserc` project ID wrong | Update `.firebaserc` or run `firebase use <project-id>` |
| Build fails with "connection error" | `connection.options.yaml` missing or wrong credentials | Verify file exists; check base64 encoding |
| Page shows stale data | Build ran against old snapshot | Re-run `npm run deploy` or dispatch `daily-refresh` |
| iframe blocked on Squarespace | `X-Frame-Options` or CSP header set | Check `firebase.json` headers; ensure no `X-Frame-Options` for the embedded path |
| Nightly run skipped (`refresh` job "skipped") on BOTH runs | Should no longer happen (dedup guard, 2026-06-10 incident was the old exact-hour guard) | Check guard step logs; a `workflow_dispatch` deploys immediately |
| CI sources step: `ECONNRESET` + proxy log shows 403 `Cloud SQL Admin API ... disabled` | SQL Admin calls attributed to wrong quota project | Proxy must keep `--quota-project recently-sold-real-estate`; SA needs `serviceusage.serviceUsageConsumer` there |
| CI sources step: `permission denied for table <x>` | New table added to sources; `recent_sales_reader` lacks SELECT on it | Eric runs an additive `GRANT SELECT ON public.<x> TO recent_sales_reader` (never an agent — FOR-512) |
| CI build fails at proxy after a DB password rotation | `EVIDENCE_CONNECTION_OPTIONS_YAML` still holds the old password | Rebuild the secret from Secret Manager `recent-sales-reader-db-password` (see rotation coupling above) |
| "Create Linear issue on failure" step itself fails | `LINEAR_API_KEY` invalid/revoked | Mint a new Linear personal API key; `gh secret set LINEAR_API_KEY` |
