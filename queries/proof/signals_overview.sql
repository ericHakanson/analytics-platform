-- Shared query template: signals_overview
-- Contract:  signals_overview v1
-- Source:    publishing_contracts.signals_overview
--            (sources/publishing_contracts/signals_overview.sql)
--
-- Usage: copy this block into a new proof page .md file and replace
--        the portfolio_slug literal with the target portfolio.
--        Do NOT filter by any column not present in the contract schema.
--        Do NOT read from raw scrape tables (zillow_listings, redfin_listings, etc.).
--
-- Columns projected:
--   contract_name             -- always 'signals_overview'
--   contract_version          -- always 'v1'
--   portfolio_slug            -- kebab-case portfolio identifier
--   portfolio_name            -- human-readable portfolio label
--   period_start              -- date: window start (trailing 30 days)
--   period_end                -- date: window end (data_as_of date)
--   sale_events_30d           -- metric_key: sale_events_30d
--   new_sale_events           -- metric_key: new_sale_events
--   late_sale_events          -- metric_key: late_sale_events
--   scored_properties_count   -- metric_key: scored_properties_count
--   high_band_candidate_count -- metric_key: high_band_candidate_count
--   high_band_candidate_rate  -- metric_key: high_band_candidate_rate
--   model_version             -- renovation scoring model version tag
--   data_as_of                -- date: business-data currency date
--   last_updated_at           -- timestamp: when contract row was last written

select *
from publishing_contracts.signals_overview
where portfolio_slug = '<<portfolio_slug>>'   -- :portfolio_slug  replace with target portfolio
