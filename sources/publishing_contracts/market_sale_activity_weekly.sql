select
  contract_name,
  contract_version,
  market_slug,
  cast(week_start as date) as week_start,
  new_sale_events,
  late_sale_events,
  new_listing_events,
  cast(data_as_of as date) as data_as_of,
  cast(last_updated_at as timestamp) as last_updated_at
from read_csv_auto('${contract_root}/market_sale_activity_weekly.csv', header = true)
