select
  contract_name,
  contract_version,
  market_slug,
  market_name,
  cast(period_start as date) as period_start,
  cast(period_end as date) as period_end,
  sale_events_30d,
  new_sale_events,
  late_sale_events,
  new_listing_events,
  active_for_sale_count,
  median_sale_price_30d,
  cast(data_as_of as date) as data_as_of,
  cast(last_updated_at as timestamp) as last_updated_at
from read_csv_auto('${contract_root}/market_sale_activity.csv', header = true)
