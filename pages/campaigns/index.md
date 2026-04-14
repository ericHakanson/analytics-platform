---
title: Campaign Assets
---

# Campaign Assets

This route group holds time-bound campaign assets with explicit time context, market framing, and CTA handoff to HubSpot. Each page is driven by a curated publishing contract — not raw scrape tables — and follows the shared component pattern established in `PublishingPageShell`.

## Current assets

| Asset | Route | Campaign window |
|---|---|---|
| Spring Seller Signal — Middlesex County, MA | [/campaigns/middlesex-county-ma/spring-seller-signal-q2-2026](/campaigns/middlesex-county-ma/spring-seller-signal-q2-2026) | Q2 2026 |

## Adding new campaign pages

New campaign pages should follow the pattern in `queries/campaign/campaign_snapshot.sql`:

1. Create asset metadata under `content/assets/campaign/<market-slug>/<asset-slug>.json`.
2. Create the page at `pages/campaigns/<market-slug>/<asset-slug>.md`, importing the shared blocks and composing the HubSpot CTA URL from env vars and asset metadata UTM fields.
3. Use the SQL template in `queries/campaign/campaign_snapshot.sql` as the starting point — copy the `select *` block and replace the `market_slug` literal with the target market.
4. Run `npm run validate:metadata && npm run validate:contracts` before publishing.
