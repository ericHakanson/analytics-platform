-- Shared query template: market_proof_metrics (supporting bar chart)
-- Contract:  market_proof_overview v1
-- Source:    publishing_contracts.market_proof_overview
--
-- Usage: copy this UNION ALL block into a new proof page .md file and replace
--        the market_slug literals with the target market.
--        The metric labels below must stay aligned with metric-registry.json.
--        Do not invent new metric labels or add columns not in the contract.
--
-- Metric registry keys used:
--   new_sale_events       -- Count of NEW_SALE property_events in window
--   late_sale_events      -- Count of LATE_SALE property_events in window
--   high_band_candidate_count -- Properties with renovation_band = High

select 'New sale events'        as metric,
       new_sale_events          as value
from publishing_contracts.market_proof_overview
where market_slug = '<<market_slug>>'   -- :market_slug

union all

select 'Late sale events'       as metric,
       late_sale_events         as value
from publishing_contracts.market_proof_overview
where market_slug = '<<market_slug>>'   -- :market_slug

union all

select 'High-band candidates'   as metric,
       high_band_candidate_count as value
from publishing_contracts.market_proof_overview
where market_slug = '<<market_slug>>'   -- :market_slug
