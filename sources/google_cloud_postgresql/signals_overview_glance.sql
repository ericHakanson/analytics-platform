select
  -- Portfolio (all-time)
  (
    select count(distinct property_id)
    from properties
  ) as total_properties,
  (
    select count(distinct state)
    from properties
    where state is not null
  ) as states_covered,
  (
    select count(distinct geography)
    from town_runs
    where started_at >= now() - interval '30 days'
  ) as municipalities_covered,

  -- Market Activity (trailing 30 days)
  (
    select coalesce(sum(for_sale_obs_count), 0)
    from town_runs
    where started_at >= now() - interval '30 days'
  ) as for_sale_observed,
  (
    select coalesce(sum(new_listing_count), 0)
    from town_runs
    where started_at >= now() - interval '30 days'
  ) as new_listings,
  (
    select coalesce(sum(new_sale_count + late_sale_count), 0)
    from town_runs
    where started_at >= now() - interval '30 days'
  ) as sales_detected,

  -- Enrichment Pipeline (trailing 30 days)
  (
    select count(distinct property_id)
    from property_detail_snapshots
    where scraped_at >= now() - interval '30 days'
  ) as properties_scraped,
  (
    select count(distinct property_id)
    from property_renovation_scores
    where model_version = 'v2'
      and computed_at >= now() - interval '30 days'
  ) as properties_scored,
  (
    select count(distinct property_id)
    from property_renovation_scores
    where model_version = 'v2'
      and is_renovation_candidate = true
      and computed_at >= now() - interval '30 days'
  ) as renovation_candidates,

  current_date as built_at
