# Evidence Analytics Briefing

## Purpose

This repo is the operational heart of the product. It discovers residential property signals, enriches sold listings, archives raw artifacts, and scores renovation candidates. The future Evidence.dev project should treat this system as the source-of-truth operational pipeline and commercial data engine.

The Evidence layer should not replace this repo. It should sit on top of it as:

- the analytics surface
- the reporting layer
- the commercial packaging layer
- the operator and customer visibility layer

## Current Production Scope

As of April 13, 2026, scheduled scraping covers:

- Essex County, MA: 34 municipalities
- Middlesex County, MA: 54 municipalities
- Total scheduled municipalities: 88

These run as 8 non-overlapping shards across a 24-hour period:

- `A` at 12:00 AM ET
- `B` at 3:00 AM ET
- `C` at 6:00 AM ET
- `D` at 9:00 AM ET
- `E` at 12:00 PM ET
- `F` at 3:00 PM ET
- `G` at 6:00 PM ET
- `H` at 9:00 PM ET

The shard definitions live in:

- [ema_shards.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/ema_shards.py)
- [FOR-241-essex-middlesex-shard-plan.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/runbooks/FOR-241-essex-middlesex-shard-plan.md)

## High-Level Data Flow

For each town in a shard, the current production town-cycle is:

1. scrape Zillow sold feed
2. scrape Zillow for-sale feed
3. diff observations against persistent property memory
4. classify events: `NEW_LISTING`, `NEW_SALE`, `LATE_SALE`, `NO_CHANGE`
5. enqueue enrichment for sale events only
6. run inline enrichment for eligible sold properties
7. archive raw HTML to GCS
8. score newly enriched properties for renovation potential

The canonical orchestrator is:

- [run_town_cycle.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/run_town_cycle.py)

The shard/batch wrapper is:

- [run_town_batch.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/run_town_batch.py)

## Source Strategy

### Zillow

Zillow is the primary production source today.

Current Zillow operational path:

- sold discovery
- for-sale discovery
- signal detection / diffing
- sold-only enrichment trigger logic
- detail scraping
- GCS archival
- renovation scoring

Core Zillow modules:

- [scrape_zillow_sold.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/scrape_zillow_sold.py)
- [discover_zillow_sold.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/discover_zillow_sold.py)
- [discover_zillow_for_sale.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/discover_zillow_for_sale.py)
- [parse_zillow_listings.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/parse_zillow_listings.py)
- [scrape_zillow_detail.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/scrape_zillow_detail.py)
- [parse_zillow_detail.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/parse_zillow_detail.py)
- [load_zillow_listings.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/load_zillow_listings.py)

### Redfin

Redfin exists as a business continuity / secondary source track, not the primary scheduled production path today.

Implemented or planned Redfin components exist in the repo:

- [scrape_redfin_sold.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/scrape_redfin_sold.py)
- [parse_redfin_listings.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/parse_redfin_listings.py)
- [load_redfin_listings.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/load_redfin_listings.py)
- [scrape_redfin_detail.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/scrape_redfin_detail.py)
- [parse_redfin_detail.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/parse_redfin_detail.py)

Redfin strategy and intended architecture are documented in:

- [redfin_coverage_business_continuity_plan.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/feature-specifications/redfin_coverage_business_continuity_plan.md)

Important current-state note:

- Zillow is the live scheduled engine
- Redfin is the continuity / second-source path
- the future analytics layer should be source-aware from day one

## Scraping, Ingestion, and Cadence

### Current scheduler model

The old Essex-only noon batch has been replaced by shard-based `launchd` jobs.

Current scheduling characteristics:

- local Mac mini host
- `launchd` driven
- one shard every 3 hours
- sequential town execution inside each shard
- no overlapping shards by default
- one town failure does not stop the remaining towns in the shard

Relevant docs:

- [FOR-213-scheduled-runner.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/runbooks/FOR-213-scheduled-runner.md)
- [FOR-241-sharded-scheduler-install.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/runbooks/FOR-241-sharded-scheduler-install.md)
- [FOR-216-batch-summary-alerting.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/runbooks/FOR-216-batch-summary-alerting.md)

### Run artifacts

Each shard writes:

- launchd stdout/stderr logs under `logs/launchd/`
- per-batch artifacts under `logs/town_batches/<batch_id>/`
- `summary.json`
- `summary.md`

Batch outcomes:

- `pass`
- `warn`
- `fail`

Town outcomes:

- `info`
- `warning`
- `blocker`

### Ingestion model

The system is not a simple append-only scraper. It is an operational event engine with persistent memory.

The ingestion flow is:

1. scrape raw pages
2. parse normalized observations
3. persist run metadata
4. persist raw/normalized snapshots
5. compare snapshots to prior state
6. emit state-transition events
7. create exactly one enrichment job per sale event version
8. enrich and score only where justified

This is the critical design choice that the Evidence layer must respect.

## Diffing and Event Semantics

The signal detection design is defined in:

- [ADR-001-signal-detection-engine.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/decisions/ADR-001-signal-detection-engine.md)
- [signal-detection-runbook.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/runbooks/signal-detection-runbook.md)

Persistent property memory lives in `property_state`.

Supported event types:

- `NEW_LISTING`
- `NEW_SALE`
- `LATE_SALE`
- `NO_CHANGE`

Core behavior:

- `NEW_SALE` and `LATE_SALE` trigger enrichment
- repeated sold observations do not trigger duplicate enrichment
- reruns are designed to be idempotent

Identity model:

- primary identity: `zpid`
- fallback identity: normalized address

This is one of the most important facts for the analytics project. Evidence should report on both:

- operational observations
- durable state transitions

It should not treat every scraped record as a new business event.

## Enrichment Model

The detail enrichment system is documented in:

- [PROPERTY_DETAIL_ENRICHMENT.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/PROPERTY_DETAIL_ENRICHMENT.md)

What enrichment does:

- fetch Zillow detail pages for sold properties that deserve deeper inspection
- store structured snapshot data
- preserve facts/features JSON
- optionally store price history rows
- create the material used for renovation scoring and future analytics

Important behavior:

- enrichment is targeted, not universal
- the scheduled pipeline performs inline enrichment for current sale events
- batch backfills are also supported
- listing-load success does not require detail enrichment success in every case

Important limitation:

- Zillow GraphQL price-history access is blocked through Bright Data in current form
- HTML/detail parsing is the reliable path today

## Renovation Scoring

The scoring model stores a renovation-candidate score, not just a yes/no flag.

Scoring persistence:

- `property_renovation_scores`

Stored outputs include:

- `renovation_score` (0-100)
- `renovation_band` (`High`, `Medium`, `Low`)
- `is_renovation_candidate`
- component scores
- JSON rationale
- `model_version`

This is one of the main commercial surfaces for the future analytics product.

The Evidence app should eventually expose:

- score distributions
- score lift by town/county/source
- candidate funnels
- explanation/rationale surfaces
- historical score movement

## GCS Archival

Raw HTML archival is a first-class part of the system, not an afterthought.

The current bucket is:

- `real_estate_recently_sold_zillow_raw`

GCS path convention:

- `gs://<bucket>/<source>/<location_slug>/<run_id>/<filename>`

Examples:

- listing discovery HTML
- detail HTML

Current implementation:

- [gcs_archiver.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/gcs_archiver.py)

Current auth model:

- dedicated service-account-backed scheduler path
- no dependence on personal `gcloud auth application-default login` for scheduled runs

Required IAM roles or equivalent permissions on the bucket:

- preferred: `roles/storage.objectAdmin`
- also workable: `roles/storage.admin`

Minimum practical permissions:

- `storage.objects.create`
- `storage.objects.delete`
- `storage.objects.list`

This matters for analytics because GCS is the raw evidence trail. Evidence.dev should eventually be able to link:

- metrics
- run records
- raw artifacts
- enriched outputs

## Database Schema

### Core operational tables

Defined in:

- [sql/migrations/schema.sql](/Users/erichakanson/projects/recently-sold-real-estate/sql/migrations/schema.sql)

Main base tables:

- `public.runs`
  - generic operational run metadata
- `public.properties`
  - canonical property entity keyed by normalized address components
- `public.sales`
  - sale events linked to `properties`
- `public.source_records`
  - provenance-preserving raw payload linkage

### Zillow and Redfin listing tables

- `zillow_listings`
  - [sql/schema/zillow_listings.sql](/Users/erichakanson/projects/recently-sold-real-estate/sql/schema/zillow_listings.sql)
- `redfin_listings`
  - [010_create_redfin_listings.sql](/Users/erichakanson/projects/recently-sold-real-estate/sql/migrations/010_create_redfin_listings.sql)

These are source-native staging/history tables, not the canonical business entity model.

### Signal detection tables

Defined in:

- [017_create_signal_detection_schema.sql](/Users/erichakanson/projects/recently-sold-real-estate/sql/migrations/017_create_signal_detection_schema.sql)

Main tables:

- `public.discovery_runs`
  - one row per discovery execution
  - fields include `source`, `feed_type`, `geography`, `status`, `record_count`, `error_count`
- `public.discovery_snapshots`
  - raw/normalized observations for a single run
  - includes `zpid`, `normalized_address`, `observed_state`, `raw_payload`
- `public.property_state`
  - durable per-property memory
  - includes `current_state`, `sale_event_version`, `enrichment_status`
- `public.property_events`
  - event history from diffing
  - includes `event_type`, `from_state`, `to_state`, `detected_at`
- `public.enrichment_jobs`
  - one-per-sale-event enrichment queue and audit trail
  - idempotency enforced by `(property_key, sale_event_version)`

### Town-run orchestration table

Defined in:

- [018_create_town_runs.sql](/Users/erichakanson/projects/recently-sold-real-estate/sql/migrations/018_create_town_runs.sql)
- [019_add_inline_enrichment_stage_to_town_runs.sql](/Users/erichakanson/projects/recently-sold-real-estate/sql/migrations/019_add_inline_enrichment_stage_to_town_runs.sql)

`public.town_runs` is the single source of truth for town-level completion tracking.

It tracks:

- geography
- cycle date
- overall run status
- stage-level statuses
- links to sold and for-sale run IDs
- aggregate counts
- resume support
- timestamps

Stages tracked in `town_runs`:

- `listing_discovery_status`
- `sold_discovery_status`
- `for_sale_discovery_status`
- `state_transition_status`
- `enrichment_enqueue_status`
- `enrichment_execute_status`
- `gcs_archive_status`
- `scoring_status`

### Detail enrichment tables

Defined in:

- [add_property_detail_enrichment.sql](/Users/erichakanson/projects/recently-sold-real-estate/sql/migrations/add_property_detail_enrichment.sql)

Main tables:

- `public.property_detail_snapshots`
  - full-history detail page snapshots
  - stores structured summary fields and `facts_features_json`
- `public.property_price_history`
  - append-only price history events

### Scoring table

Defined in:

- [009_create_property_renovation_scores.sql](/Users/erichakanson/projects/recently-sold-real-estate/sql/migrations/009_create_property_renovation_scores.sql)

Main table:

- `public.property_renovation_scores`

### County enrichment support

County enrichment exists and matters for reporting.

Relevant objects:

- `public.properties.county`
- `public.target_regions`
- `county_enrichment_audit_v1`

Doc:

- [county_enrichment.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/county_enrichment.md)

Important note:

- the target-regions lookup covers more than the currently scheduled counties
- current scheduled production scope is Essex + Middlesex
- the underlying county enrichment framework is broader

## Recommended Analytics Entity Model

For Evidence.dev, think in four layers:

### 1. Raw operational layer

Use for traceability and debugging:

- `runs`
- `discovery_runs`
- `discovery_snapshots`
- `source_records`
- GCS object paths

### 2. Canonical property layer

Use for customer-facing property intelligence:

- `properties`
- `property_state`
- latest `sales`
- county / town geography

### 3. Event layer

Use for business reporting:

- `property_events`
- `enrichment_jobs`
- `town_runs`

This is where the commercial signal really lives.

### 4. Derived commercial layer

Use for dashboards, outreach, and monetization:

- `property_detail_snapshots`
- `property_price_history`
- `property_renovation_scores`
- county/town summary views
- future marts for outreach, funnel, conversion, and inventory health

## Roles and Permissions

### What exists today

There is not yet a formal in-product RBAC system in this repo. This is an operational pipeline, not yet a multi-user analytics application.

So the current role model is operational:

- scheduler / scraper runtime
- database writer
- GCS archiver
- operator
- future analytics reader

### Operational roles that matter now

#### 1. Scheduler role

Current runtime:

- local `launchd` jobs on the Mac mini
- wrapper scripts source `.env`
- each shard executes a bounded town batch

#### 2. Database writer role

The scraper/orchestrator needs write access to:

- `runs`
- `properties`
- `sales`
- `source_records`
- `discovery_runs`
- `discovery_snapshots`
- `property_state`
- `property_events`
- `enrichment_jobs`
- `town_runs`
- `property_detail_snapshots`
- `property_price_history`
- `property_renovation_scores`

There is no evidence in the repo of a separate restricted DB role being enforced yet. Assume current runtime uses a broad-write application credential.

#### 3. GCS archiver role

The scheduler now uses a dedicated service account for GCS archival.

Practical requirements:

- upload HTML
- verify bucket access
- optionally delete local files after successful upload

#### 4. Operator role

Operators review:

- launchd logs
- batch summaries
- SQL health checks
- GCS success/failure

#### 5. Future analytics reader role

The Evidence.dev app should not use the writer credential.

It should ideally get:

- read-only database access
- access to curated views/materialized marts
- no mutation privileges
- no GCS write permissions

This is an important future hardening step.

## What Evidence.dev Should Assume

The future analytics app should assume:

- this repo is the operational system of record
- runs can be `pass`, `warn`, or `fail`
- town cycles can be `completed`, `partial`, or `failed`
- events are durable and idempotent
- raw observations are not the same thing as business events
- not every sold observation is a new sale
- not every property is enriched
- scoring is model-versioned
- source awareness matters
- GCS is part of lineage and auditability

## Important Business Truths

### 1. The product is event-driven, not listing-count-driven

The real value is not "how many rows were scraped."

It is:

- which properties changed state
- which sales are new or late sales
- which properties deserve enrichment
- which enriched properties score as renovation candidates

### 2. The operational engine and the analytics engine should stay decoupled

This repo should continue to:

- scrape
- detect
- enrich
- score
- archive

The Evidence app should:

- read
- aggregate
- explain
- commercialize

### 3. Lineage is part of the product

Commercial trust will depend on being able to explain:

- what was scraped
- when it was scraped
- what changed
- why a property was scored a certain way
- where the raw HTML lives

## Missing or Not Yet Formalized

These are important gaps to keep in mind:

- no formal app-level RBAC yet
- no explicit read-only analytics role documented yet
- no dedicated analytics marts or star schema yet
- no materialized-reporting layer designed specifically for Evidence.dev yet
- Redfin is not yet the primary production path
- commercial metrics, customer cohorts, and funnel tables do not exist yet

## Recommended Next-Step Analytics Marts

The Evidence project will likely want these derived models first:

- `fact_property_events_daily`
- `fact_enrichment_jobs_daily`
- `fact_town_runs_daily`
- `fact_scored_properties`
- `dim_property`
- `dim_geography`
- `dim_source`
- `mart_renovation_candidates_latest`
- `mart_county_town_pipeline_health`
- `mart_source_coverage_comparison`

## Files to Read First

If returning to this repo later, start here:

- [ADR-001-signal-detection-engine.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/decisions/ADR-001-signal-detection-engine.md)
- [run_town_cycle.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/run_town_cycle.py)
- [run_town_batch.py](/Users/erichakanson/projects/recently-sold-real-estate/scripts/run_town_batch.py)
- [PROPERTY_DETAIL_ENRICHMENT.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/PROPERTY_DETAIL_ENRICHMENT.md)
- [017_create_signal_detection_schema.sql](/Users/erichakanson/projects/recently-sold-real-estate/sql/migrations/017_create_signal_detection_schema.sql)
- [018_create_town_runs.sql](/Users/erichakanson/projects/recently-sold-real-estate/sql/migrations/018_create_town_runs.sql)
- [009_create_property_renovation_scores.sql](/Users/erichakanson/projects/recently-sold-real-estate/sql/migrations/009_create_property_renovation_scores.sql)
- [FOR-241-essex-middlesex-shard-plan.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/runbooks/FOR-241-essex-middlesex-shard-plan.md)
- [redfin_coverage_business_continuity_plan.md](/Users/erichakanson/projects/recently-sold-real-estate/docs/feature-specifications/redfin_coverage_business_continuity_plan.md)

## Bottom Line

This repo is already more than a scraper.

It is:

- a property signal-detection engine
- a town/county operational scheduler
- a targeted detail-enrichment system
- a renovation-candidate scoring engine
- a provenance and archive pipeline

The future Evidence.dev app should be built as the commercial analytics layer on top of this engine, not as a replacement for it.
