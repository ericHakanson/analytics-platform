-- Shared query template: market_sale_activity
-- Contract:  market_sale_activity v1
-- Source:    publishing_contracts.market_sale_activity
--            (sources/publishing_contracts/market_sale_activity.sql)
--
-- Usage: copy this block into a new proof page .md file and replace
--        the market_slug literal with the target market.
--        Do NOT filter by any column not present in the contract schema.
--        Do NOT read from raw scrape tables (zillow_listings, redfin_listings, etc.).
--
-- Columns projected:
--   contract_name         -- always 'market_sale_activity'
--   contract_version      -- always 'v1'
--   market_slug           -- kebab-case market identifier
--   market_name           -- human-readable market label
--   period_start          -- date: window start (30 days ago)
--   period_end            -- date: window end (data_as_of date)
--   sale_events_30d       -- metric_key: sale_events_30d (new + late combined)
--   new_sale_events       -- metric_key: new_sale_events
--   late_sale_events      -- metric_key: late_sale_events
--   new_listing_events    -- metric_key: new_listing_events
--   active_for_sale_count -- metric_key: active_for_sale_count
--   median_sale_price_30d -- metric_key: median_sale_price_30d (null if <3 sales)
--   data_as_of            -- date: business-data currency date
--   last_updated_at       -- timestamp: when contract row was last written

select *
from publishing_contracts.market_sale_activity
where market_slug = '<<market_slug>>'   -- :market_slug  replace with target market
