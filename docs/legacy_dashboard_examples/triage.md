# Legacy Dashboard Triage

This document classifies each legacy Evidence Studio dashboard example against the publishing platform's scope (public proof pages, campaign assets, client briefings) and identifies candidates for new backlog issues.

**Source material:** `docs/legacy_dashboard_examples/example_*.md`

**Platform scope:** pages intended for external audiences (website visitors, campaign targets, active clients and operators). Internal ops monitoring is out of scope for this repo.

---

## Classification

### Out of scope — internal operations tooling

These examples are operational monitoring dashboards. They query pipeline internals, run health metrics, and enrichment queues that have no external audience. They do not belong in the publishing platform.

| Example | Why out of scope |
|---|---|
| `example_executive_summary.md` | Internal ops portfolio rollup. Mailing send counts, scoring totals, candidate counts by city — these are operational, not publishable. |
| `example_pipeline_status.md` | Pipeline funnel, batch health, stage status, enrichment queue depth. Entirely internal. The `client_pipeline_briefing` contract already exposes the publishable subset of pipeline health (`town_runs_pass_rate`, `enrichment_completion_rate`). |
| `example_data_quality.md` | Record counts, field completeness gaps, duplicate patterns, freshness. Internal data quality monitoring with no external audience. |
| `example_mailing_operations.md` | DM campaign management, mail job delivery funnel, QR scan rates, PostGrid integration. Internal mailing ops. |

These examples should remain as reference documentation for the upstream data pipeline, not the publishing platform.

---

### Partially publishable — internal and external content mixed

These examples contain a mix of internal ops views and externally-relevant signal views. Only the external-facing sections have backlog potential.

| Example | Internal (keep internal) | External (backlog candidate) |
|---|---|---|
| `example_next_best_action.md` | Scoring coverage per geography, top unmailed candidates list, score component breakdown | "Properties For Sale" and "Properties Sold" sections: new listing volume per week, inventory by geography, sale event counts, median sale price by geography |
| `example_rennovation_funnel.md` | Mailing outreach section, city-level funnel with mailed counts, top unmailed candidates | Score distribution, candidate threshold framing, candidate economics (avg/median sale price comparison between candidates and non-candidates) |

---

### Directly publishable — designed for external audiences

These examples were built for external audiences and can be converted to Evidence publishing platform assets with minimal adaptation.

| Example | Notes |
|---|---|
| `example_singals_overview_marketing_site.md` | Explicitly designed for the marketing site. Shows listed count, sold count, scored count, candidates, active geographies, county coverage map, and renovation funnel — all framed for a general audience with no internal ops language. This is the strongest conversion candidate. |
| `example_geographic_coverage.md` (county coverage section only) | The county coverage section (ZIP coverage by county, properties per county map) is suitable for a public market-footprint proof page. The active geographies / scraping yield / coverage gaps sections are internal ops and should be excluded. |

---

## Backlog candidates

Three new Linear issues are recommended based on this triage.

### Candidate 1: Signals Overview proof page

**Recommended issue title:** Implement "Signals Overview" public proof page for the marketing site

**Source:** `example_singals_overview_marketing_site.md`

**Rationale:** This example was explicitly designed for the marketing site. It is the most direct conversion — the framing is already public-facing. A `signals_overview` contract would feed this page with portfolio-scale headline metrics and a county coverage map.

**Proposed contract:** `signals_overview` — portfolio-scale summary metrics (listed count, sold count, scored count, candidate count, active geographies) scoped to trailing 30 days. County coverage data (county → property count) for the map layer.

**Proposed route:** `/proof/massachusetts/signals-overview`

**Asset family:** `evergreen_proof`

---

### Candidate 2: Market Sale Activity proof page

**Recommended issue title:** Implement "Market Sale Activity" proof page for evergreen market signal

**Source:** `example_next_best_action.md` (Properties For Sale + Properties Sold sections)

**Rationale:** Sale event volume per week (NEW_SALE + LATE_SALE), inventory by geography, and median sale price by geography are strong externally-facing proof signals for market activity. These do not expose internal ops data.

**Proposed contract:** `market_sale_activity` — sale events by week and geography (trailing 12 weeks), active inventory by geography, median sale price by geography (trailing 30 days, minimum 3 sales).

**Proposed route:** `/proof/{market_slug}/market-sale-activity`

**Asset family:** `evergreen_proof`

**Note:** The "top unmailed candidates" section of this example is internal and must be excluded from any public page.

---

### Candidate 3: Geographic Coverage proof page

**Recommended issue title:** Implement "Geographic Coverage" proof page showing Fort Island market footprint

**Source:** `example_geographic_coverage.md` (county coverage section only)

**Rationale:** The county coverage map (properties per county, ZIP coverage per county) is a credible and shareable proof point about Fort Island's geographic reach. This would pair well with the Signals Overview page as a deeper footprint story.

**Proposed contract:** `geographic_coverage` — county-level summary (county name, state, ZIPs in target region, ZIPs with properties, total properties).

**Proposed route:** `/proof/massachusetts/geographic-coverage`

**Asset family:** `evergreen_proof`

**Scope boundary:** only the county coverage section. Active geography run counts, scraping yield, and coverage gaps are internal ops and must be excluded.

---

## Non-candidates

| Example | Disposition |
|---|---|
| `example_executive_summary.md` | Internal ops. No backlog issue. |
| `example_pipeline_status.md` | Internal ops. Already covered by `client_pipeline_briefing` contract for publishable subset. No new backlog issue. |
| `example_data_quality.md` | Internal ops. No backlog issue. |
| `example_mailing_operations.md` | Internal DM platform ops. No backlog issue. |
| `example_rennovation_funnel.md` | Score distribution and candidate economics have some proof potential but are closely related to what the existing `market_proof_overview` contract already exposes. No standalone backlog issue; consider as an enhancement to existing proof assets in a future pass. |
