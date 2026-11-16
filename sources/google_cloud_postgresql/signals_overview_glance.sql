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

  -- Formatted server-side as text on purpose. This used to be `current_date`,
  -- which the page interpolated as a raw JS Date: the browser then re-rendered
  -- that UTC midnight in local time, so every viewer west of UTC saw the build
  -- date a day early. A string has no timezone for the client to shift.
  to_char(
    now() at time zone 'America/New_York',
    'FMMonth FMDD, YYYY "at" FMHH12:MI AM'
  ) as built_at
