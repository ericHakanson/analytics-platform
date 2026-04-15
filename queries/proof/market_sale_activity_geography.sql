-- Shared query template: market_sale_activity_geography
-- Contract:  market_sale_activity v1
-- Source:    publishing_contracts.market_sale_activity_geography
--            (sources/publishing_contracts/market_sale_activity_geography.sql)
--
-- Usage: copy this block into a new proof page .md file and replace
--        the market_slug literal with the target market.
--        Do NOT filter by any column not present in the contract schema.
--        Do NOT read from raw scrape tables (zillow_listings, redfin_listings, etc.).
--
-- Columns projected:
--   market_slug             -- kebab-case market identifier
--   geography_name          -- human-readable town or geography label
--   active_for_sale_count   -- metric_key: active_for_sale_count
--   median_sale_price_30d   -- metric_key: median_sale_price_30d
--   data_as_of              -- date: business-data currency date
--   last_updated_at         -- timestamp: when contract row was last written

select *
from publishing_contracts.market_sale_activity_geography
where market_slug = '<<market_slug>>'   -- :market_slug  replace with target market
