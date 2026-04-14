select
  contract_name,
  contract_version,
  market_slug,
  market_name,
  cast(cycle_start as date) as cycle_start,
  cast(cycle_end as date) as cycle_end,
  town_runs_pass_rate,
  new_sale_events,
  late_sale_events,
  enrichment_completion_rate,
  high_band_candidate_count,
  operational_note,
  cast(data_as_of as date) as data_as_of,
  cast(last_updated_at as timestamp) as last_updated_at
from read_csv_auto('${contract_root}/client_pipeline_briefing.csv', header = true)
