select
  market_slug,
  geography_name,
  active_for_sale_count,
  median_sale_price_30d,
  cast(data_as_of as date) as data_as_of,
  cast(last_updated_at as timestamp) as last_updated_at
from read_csv_auto('${contract_root}/market_sale_activity_geography.csv', header = true)
