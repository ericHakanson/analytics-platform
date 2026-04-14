# Publishing Contracts

This document defines the curated data boundary for the Evidence publishing layer.

## Contract stance

Evidence pages must consume curated publishing contracts, not unstable source-native tables.

Rejected as the default publishing interface:

- `zillow_listings`
- `redfin_listings`
- `discovery_snapshots`
- any page-local query that treats raw observations as business events

Allowed upstream layers for v1 publishing contracts:

- canonical property layer
- event layer
- derived commercial layer
- explicitly curated views or exported datasets built from those layers

## Why this matters

The operational system is event-driven, not scrape-row-driven.

Publishing must respect these truths:

- a scraped observation is not automatically a business event
- `NEW_SALE` and `LATE_SALE` are durable event semantics
- enrichment is targeted and not universal
- scoring is model-versioned
- source awareness matters because Zillow is primary and Redfin is continuity
- lineage matters for trust and auditability

## Contract packaging rules

Contract naming:

```text
<contract_name>.v<version>.schema.json
```

Sample fixture naming:

```text
data/contracts/<contract_name>/sample.v<version>.json
```

Contract versioning rules:

- additive, backward-compatible field changes may stay within the same major version
- semantic field meaning changes require a new version
- Evidence pages and asset metadata must reference the intended contract name and version explicitly

## Ownership

Default contract owner for v1:

- Fort Island operator / analytics publisher

Metric definitions are centralized in:

- `contracts/publishing/metric-registry.json`

Templates should consume metric keys from the registry rather than invent page-local labels or logic.

## Initial v1 contract set

### 1. `market_proof_overview` v1

Purpose:

- evergreen proof assets
- market-level credibility pages
- reusable website and outbound proof points

Primary source layers:

- `property_events`
- `property_renovation_scores`
- curated geography dimensions

Cadence:

- weekly by default

Core business question:

- is a market producing repeatable, commercially meaningful event and scoring activity?

### 2. `campaign_snapshot` v1

Purpose:

- time-bound campaign assets
- market-specific sales and outreach narratives
- source-aware comparison or coverage framing when needed

Primary source layers:

- `property_events`
- `enrichment_jobs`
- `town_runs`
- optional source-comparison marts

Cadence:

- campaign-bound or weekly during campaign windows

Core business question:

- does current event and enrichment activity support a specific outreach or demand-generation campaign?

Representation note for v1:

- `campaign_snapshot` exposes source coverage share as explicit per-source fields in the Evidence-facing contract rows: `zillow_coverage_share` and `redfin_coverage_share`
- those fields remain governed by the shared metric definition `source_coverage_share` in the metric registry
- templates must not invent new per-source coverage columns without a contract update

### 3. `client_pipeline_briefing` v1

Purpose:

- client briefings
- operator/client visibility into pipeline health and scored output
- recurring operational review pages

Primary source layers:

- `town_runs`
- `property_events`
- `enrichment_jobs`
- `property_renovation_scores`

Cadence:

- weekly or ad hoc

Core business question:

- what happened operationally, what was commercially useful, and where are the risks or caveats?

## Temporary exception rule

Raw-source reads are allowed only as an explicit temporary exception when:

- the curated layer does not yet expose the required field
- the issue documents the reason
- a follow-up debt issue is created to replace the raw dependency
- the page clearly labels the limitation if it affects interpretation

Without all four, direct raw-source reads are rejected.

## Initial metric ownership

Shared metric keys for v1:

- `new_sale_events`
- `late_sale_events`
- `new_listing_events`
- `sale_events_30d`
- `high_band_candidate_count`
- `high_band_candidate_rate`
- `enrichment_completion_rate`
- `town_runs_pass_rate`
- `scored_properties_count`
- `source_coverage_share`

These metric keys are defined in `contracts/publishing/metric-registry.json`.

For source-aware campaign contracts, `source_coverage_share` may be implemented as contract-specific columns such as `zillow_coverage_share` and `redfin_coverage_share`.

## Future FastAPI compatibility

Contracts should be treated as semantic interfaces, not file-format details.

In v1 they may arrive as curated exports.
Later the same contracts can be served by FastAPI without changing:

- asset metadata
- template assumptions
- contract names
- metric semantics
