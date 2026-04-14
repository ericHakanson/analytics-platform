-- Shared query template: client_pipeline_briefing
-- Contract:  client_pipeline_briefing v1
-- Source:    publishing_contracts.client_pipeline_briefing
--            (sources/publishing_contracts/client_pipeline_briefing.sql)
--
-- Usage: copy this block into a new briefing page .md file and replace
--        the market_slug literal with the target market.
--        Do NOT filter by any column not present in the contract schema.
--        Do NOT read from raw scrape tables (zillow_listings, redfin_listings, etc.).
--
-- Time boundary: this contract uses cycle_start / cycle_end (weekly cycle boundaries),
--                NOT period_start / period_end. When using FreshnessBlock, set
--                startField="cycle_start" and endField="cycle_end".
--
-- Columns projected:
--   market_slug                  -- kebab-case market identifier
--   cycle_start                  -- date: start of the reporting cycle (time boundary)
--   cycle_end                    -- date: end of the reporting cycle (time boundary)
--   town_runs_pass_rate          -- metric_key: town_runs_pass_rate  (ratio 0-1)
--   new_sale_events              -- metric_key: new_sale_events      (integer count)
--   late_sale_events             -- metric_key: late_sale_events     (integer count)
--   enrichment_completion_rate   -- metric_key: enrichment_completion_rate (ratio 0-1)
--   high_band_candidate_count    -- metric_key: high_band_candidate_count  (integer count)
--   operational_note             -- free-text note from the operator for this cycle
--   data_as_of                   -- date: business-data currency date
--   last_updated_at              -- timestamp: when contract row was last written
--
-- :market_slug  replace with target market (e.g. 'essex-middlesex-ma')

select *
from publishing_contracts.client_pipeline_briefing
where market_slug = '<<market_slug>>'   -- :market_slug  replace with target market
