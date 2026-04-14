select
  contract_name,
  contract_version,
  market_slug,
  market_name,
  cast(period_start as date) as period_start,
  cast(period_end as date) as period_end,
  sale_events_30d,
  enrichment_completion_rate,
  zillow_coverage_share,
  redfin_coverage_share,
  campaign_readiness_note,
  cast(data_as_of as date) as data_as_of,
  cast(last_updated_at as timestamp) as last_updated_at
from read_csv_auto('${contract_root}/campaign_snapshot.csv', header = true)
