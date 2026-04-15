select
  contract_name,
  contract_version,
  portfolio_slug,
  state_county_id,
  fips_code,
  county,
  state_code,
  total_properties,
  cast(data_as_of as date) as data_as_of,
  cast(last_updated_at as timestamp) as last_updated_at
from read_csv_auto('${contract_root}/signals_overview_county.csv', header = true)
