-- Shared query template: geographic_coverage
-- Contract:  geographic_coverage v1
-- Source:    publishing_contracts.geographic_coverage
--            (sources/publishing_contracts/geographic_coverage.sql)
--
-- Usage: copy this block into a new proof page .md file and replace
--        the market_slug literal with the target market.
--        Do NOT filter by any column not present in the contract schema.
--        Do NOT read from raw scrape tables (zillow_listings, redfin_listings, etc.).
--
-- Columns projected:
--   contract_name              -- always 'geographic_coverage'
--   contract_version           -- always 'v1'
--   market_slug                -- kebab-case market identifier
--   market_name                -- human-readable market label
--   period_start               -- date: window start
--   period_end                 -- date: window end (data_as_of date)
--   zip_count_in_region        -- metric_key: zip_count_in_region
--   zip_count_with_properties  -- metric_key: zip_count_with_properties
--   data_as_of                 -- date: business-data currency date
--   last_updated_at            -- timestamp: when contract row was last written

select *
from publishing_contracts.geographic_coverage
where market_slug = '<<market_slug>>'   -- :market_slug  replace with target market
