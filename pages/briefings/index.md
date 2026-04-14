---
title: Client Briefings
---

# Client Briefings

This route group holds client pipeline briefing pages designed for operational review by active clients and operators. These pages are not intended for public distribution, outbound, or social channels.

## Current assets

- **Weekly Pipeline Briefing — Essex and Middlesex Counties**
  Route: `/briefings/essex-middlesex-ma/weekly-pipeline-briefing`
  Contract: `client_pipeline_briefing v1`
  Audience: active clients and operators only

## Adding a new briefing page

New briefing pages follow the pattern established in `queries/briefing/client_pipeline_briefing.sql`. Steps:

1. Copy the shared SQL template from `queries/briefing/client_pipeline_briefing.sql` and substitute the target `market_slug`.
2. Create a new asset metadata file under `content/assets/briefing/<market-slug>/`.
3. Create a new page at `pages/briefings/<market-slug>/<briefing-slug>.md` following the structure of `pages/briefings/essex-middlesex-ma/weekly-pipeline-briefing.md`.
4. Use `FreshnessBlock` with `startField="cycle_start"` and `endField="cycle_end"` — the briefing contract uses cycle boundaries, not period boundaries.
5. Run `npm run validate:metadata && npm run validate:contracts` before merging.
