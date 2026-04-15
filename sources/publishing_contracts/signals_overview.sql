select
  contract_name,
  contract_version,
  portfolio_slug,
  portfolio_name,
  cast(period_start as date) as period_start,
  cast(period_end as date) as period_end,
  sale_events_30d,
  new_sale_events,
  late_sale_events,
  scored_properties_count,
  high_band_candidate_count,
  high_band_candidate_rate,
  model_version,
  cast(data_as_of as date) as data_as_of,
  cast(last_updated_at as timestamp) as last_updated_at
from read_csv_auto('${contract_root}/signals_overview.csv', header = true)
