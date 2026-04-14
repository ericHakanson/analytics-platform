-- Shared query template: market_proof_overview
-- Contract:  market_proof_overview v1
-- Source:    publishing_contracts.market_proof_overview
--            (sources/publishing_contracts/market_proof_overview.sql)
--
-- Usage: copy this block into a new proof page .md file and replace
--        the market_slug literal with the target market.
--        Do NOT filter by any column not present in the contract schema.
--        Do NOT read from raw scrape tables (zillow_listings, redfin_listings, etc.).
--
-- Columns projected:
--   contract_name         -- always 'market_proof_overview'
--   contract_version      -- always 'v1'
--   market_slug           -- kebab-case market identifier
--   market_name           -- human-readable market label
--   period_start          -- date: window start (typically 90 days ago)
--   period_end            -- date: window end (data_as_of date)
--   new_sale_events       -- metric_key: new_sale_events
--   late_sale_events      -- metric_key: late_sale_events
--   scored_properties_count -- metric_key: scored_properties_count
--   high_band_candidate_count -- metric_key: high_band_candidate_count
--   high_band_candidate_rate  -- metric_key: high_band_candidate_rate
--   model_version         -- renovation scoring model version tag
--   data_as_of            -- date: business-data currency date
--   last_updated_at       -- timestamp: when contract row was last written

select *
from publishing_contracts.market_proof_overview
where market_slug = '<<market_slug>>'   -- :market_slug  replace with target market
