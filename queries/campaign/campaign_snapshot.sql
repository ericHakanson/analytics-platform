-- Shared query template: campaign_snapshot
-- Contract:  campaign_snapshot v1
-- Source:    publishing_contracts.campaign_snapshot
--            (sources/publishing_contracts/campaign_snapshot.sql)
--
-- Usage: copy this block into a new campaign page .md file and replace
--        the market_slug literal with the target market.
--        Do NOT filter by any column not present in the contract schema.
--        Do NOT read from raw scrape tables (zillow_listings, redfin_listings, etc.).
--
-- Columns projected:
--   market_slug                  -- kebab-case market identifier
--   period_start                 -- date: campaign window start
--   period_end                   -- date: campaign window end (data_as_of date)
--   sale_events_30d              -- metric_key: sale_events_30d
--   enrichment_completion_rate   -- metric_key: enrichment_completion_rate
--   zillow_coverage_share        -- metric_key: source_coverage_share (source: zillow)
--   redfin_coverage_share        -- metric_key: source_coverage_share (source: redfin)
--   campaign_readiness_note      -- curated narrative note for campaign framing
--   data_as_of                   -- date: business-data currency date
--   last_updated_at              -- timestamp: when contract row was last written
--
-- :market_slug  replace with target market (e.g. 'middlesex-county-ma')

select *
from publishing_contracts.campaign_snapshot
where market_slug = '<<market_slug>>'   -- :market_slug  replace with target market
