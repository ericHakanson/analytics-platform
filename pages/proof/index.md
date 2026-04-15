---
title: Proof Assets
---

# Proof Assets

This route group holds reusable evergreen proof pages for website credibility, outbound proof points, and repeatable market signal narratives.

## Current assets

- [Essex County Renovation Candidate Overview](essex-county-ma/renovation-candidate-overview) — `market_proof_overview` v1
- [Essex County Geographic Coverage](essex-county-ma/geographic-coverage) — `geographic_coverage` v1
- [Essex County Market Sale Activity](essex-county-ma/market-sale-activity) — `market_sale_activity` v1
- [Massachusetts Signals Overview](massachusetts/signals-overview) — `signals_overview` v1
- [Massachusetts Geographic Coverage](massachusetts/geographic-coverage) — `geographic_coverage` v1

## Adding a new proof market

Follow the shared query template pattern established in `queries/proof/` (which now contains multiple templates including `market_proof_overview.sql`, `geographic_coverage.sql`, `market_sale_activity.sql`, and `signals_overview.sql`):

1. Create a new page at `pages/proof/<market_slug>/<asset_slug>.md`
2. Create a metadata file at `content/assets/proof/<market_slug>/<asset_slug>.json`
3. Copy the relevant SQL template from `queries/proof/` and adapt it for your target market — replace `<<market_slug>>` with your target market
4. Import the same shared blocks (`PublishingPageShell`, `WhyItMattersBlock`, `FreshnessBlock`, `CaveatsBlock`, `CtaFooterBlock`)
5. Run `npm run validate:metadata` and `npm run validate:contracts` to confirm the new asset passes

Proof slugs must be durable reusable nouns. See `docs/architecture/asset-conventions.md` for full naming rules.
