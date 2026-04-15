select
  (
    select count(*)
    from zillow_listings
    where scraped_at >= now() - interval '30 days'
  ) + (
    select count(*)
    from redfin_listings
    where scraped_at >= now() - interval '30 days'
  ) as listed_count,
  (
    select count(distinct property_id)
    from sales
    where sale_date >= (now() - interval '30 days')::date
  ) as sold_count,
  (
    select count(distinct property_id)
    from property_renovation_scores
    where computed_at >= now() - interval '30 days'
  ) as scored_count,
  (
    select count(*)
    from property_renovation_scores
    where is_renovation_candidate = true
      and computed_at >= now() - interval '30 days'
  ) as candidate_count
