---
title: Proof Assets
---

# Proof Assets

This route group holds reusable evergreen proof pages for website credibility, outbound proof points, and repeatable market signal narratives.

## Current assets

- [Essex County Renovation Candidate Overview](essex-county-ma/renovation-candidate-overview) — `market_proof_overview` v1

## Adding a new proof market

Follow the shared query template pattern established in `queries/proof/`:

1. Create a new page at `pages/proof/<market_slug>/<asset_slug>.md`
2. Create a metadata file at `content/assets/proof/<market_slug>/<asset_slug>.json`
3. Copy the SQL from `queries/proof/market_proof_overview.sql` and `queries/proof/market_proof_metrics.sql` — replace `<<market_slug>>` with your target market
4. Import the same shared blocks (`PublishingPageShell`, `WhyItMattersBlock`, `FreshnessBlock`, `CaveatsBlock`, `CtaFooterBlock`)
5. Run `npm run validate:metadata` and `npm run validate:contracts` to confirm the new asset passes

Proof slugs must be durable reusable nouns. See `docs/architecture/asset-conventions.md` for full naming rules.
