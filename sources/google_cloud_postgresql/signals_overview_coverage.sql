select
  count(distinct geography) as active_geographies,
  sum(for_sale_obs_count) as for_sale_observed,
  sum(new_listing_count) as new_listings,
  sum(new_sale_count + late_sale_count) as sales_detected
from town_runs
where started_at >= now() - interval '30 days'
