select
  contract_name,
  contract_version,
  market_slug,
  market_name,
  cast(period_start as date) as period_start,
  cast(period_end as date) as period_end,
  zip_count_in_region,
  zip_count_with_properties,
  cast(data_as_of as date) as data_as_of,
  cast(last_updated_at as timestamp) as last_updated_at
from read_csv_auto('${contract_root}/geographic_coverage.csv', header = true)
