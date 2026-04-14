# Asset Conventions

This document defines the folder structure, naming rules, and metadata contract for publishable assets.

Linear remains the canonical source of truth for scope and acceptance criteria. This file makes the implementation conventions explicit in-repo.

## Route groups

All publishable assets belong to one of three route groups:

- `pages/proof/`
- `pages/campaigns/`
- `pages/briefings/`

These route groups map to asset types as follows:

- `pages/proof/` -> `evergreen_proof`
- `pages/campaigns/` -> `campaign`
- `pages/briefings/` -> `client_briefing`

## Metadata file locations

Every publishable asset must have exactly one metadata file under `content/assets/`.

Path convention:

```text
content/assets/<asset_family>/<market_slug>/<asset_slug>.json
```

Examples:

- `content/assets/proof/essex-county-ma/renovation-candidate-overview.json`
- `content/assets/campaign/middlesex-county-ma/spring-seller-signal-q2-2026.json`
- `content/assets/briefing/essex-middlesex-ma/weekly-pipeline-briefing.json`

`asset_family` is the file-system grouping and must be one of:

- `proof`
- `campaign`
- `briefing`

## Slug conventions

All slugs must be lowercase kebab-case ASCII.

Allowed characters:

- `a-z`
- `0-9`
- `-`

Disallowed:

- spaces
- underscores
- uppercase letters
- raw dates in proof assets unless part of a genuine campaign name
- source-system names in public-facing asset slugs unless the comparison itself is the story

### Route and slug rules by asset family

#### Proof assets

Use durable, reusable nouns.

Pattern:

```text
slug: proof/<market_slug>/<asset_slug>
route_path: /proof/<market_slug>/<asset_slug>
```

Examples:

- `proof/essex-county-ma/renovation-candidate-overview`
- `proof/middlesex-county-ma/new-sale-trend-summary`

#### Campaign assets

Campaign assets may include time or campaign identifiers because they are intentionally time-bound.

Pattern:

```text
slug: campaigns/<market_slug>/<asset_slug>
route_path: /campaigns/<market_slug>/<asset_slug>
```

Examples:

- `campaigns/middlesex-county-ma/spring-seller-signal-q2-2026`
- `campaigns/greater-lowell-ma/recently-sold-home-services-april-2026`

#### Client briefing assets

Client briefing slugs should describe the briefing purpose, not expose unnecessary private details.

Pattern:

```text
slug: briefings/<market_slug>/<asset_slug>
route_path: /briefings/<market_slug>/<asset_slug>
```

Examples:

- `briefings/essex-middlesex-ma/weekly-pipeline-briefing`
- `briefings/greater-lowell-ma/county-coverage-operations-review`

## Required metadata fields

Each asset metadata file must define:

- `title`
- `slug`
- `route_path`
- `asset_type`
- `audience`
- `market`
- `date_range`
- `refresh_cadence`
- `primary_message`
- `why_it_matters`
- `supporting_metrics`
- `cta`
- `channel_suitability`
- `status`
- `owner`
- `freshness`
- `contract`

Important governance additions:

- `source_systems` in `freshness` ensures source awareness is explicit.
- `contract.version` prevents silent drift in publishing inputs.
- `freshness.last_updated_at` and `freshness.data_as_of` distinguish page update time from business-data currency.

## Lifecycle states

Allowed values for `status`:

- `draft`
- `in_review`
- `approved`
- `published`
- `deprecated`

Rules:

- `draft` means work-in-progress and not externally promoted.
- `in_review` means implementation exists and is waiting on Codex or human review.
- `approved` means accepted for release.
- `published` means live and externally referenceable.
- `deprecated` means retained for history but not promoted.

## Ownership and freshness rules

Every asset must name:

- a single `owner`
- `last_updated_at`
- `data_as_of`
- `refresh_notes`

Every asset must also declare:

- which curated contract it depends on
- which version of that contract it expects
- which source systems contribute to the dataset

## Validation expectations

Current expectation:

- every metadata file is valid JSON
- every metadata file satisfies `contracts/publishing/asset-metadata.schema.json`
- every metadata file passes `npm run validate:metadata`

Current scope of validation:

- file placement under the expected `content/assets/` family
- required fields
- enum values
- slug and route prefix alignment
- slug and folder naming consistency

Later issues may extend validation to:

- cross-check page existence
- verify contract names against actual contract specs
- ensure CTA patterns align with Squarespace and HubSpot rules
