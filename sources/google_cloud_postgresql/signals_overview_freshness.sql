select
  (
    select count(distinct property_id)
    from property_detail_snapshots
    where scraped_at >= now() - interval '24 hours'
  ) as scraped_24h,
  (
    select count(distinct property_id)
    from sales
    where created_at >= now() - interval '24 hours'
  ) as sales_identified_24h
